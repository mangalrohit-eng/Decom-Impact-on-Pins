import OpenAI from "openai";
import { aggregateDecomWindows } from "@/lib/decom/aggregate-windows";
import {
  buildDemoLlmPayload,
  buildDemoReasoningText,
} from "@/lib/decom/demo-llm-analysis";
import { buildAnalysisUserPrompt, LLM_ANALYSIS_SYSTEM } from "@/lib/decom/llm-prompts";
import {
  mergeLlmIntoAggregate,
  parseLlmAnalysisJson,
} from "@/lib/decom/merge-llm-analysis";
import type { AnalyzeResponse, CnsEventRow, ShutdownRow } from "@/types/decom";

export const maxDuration = 60;

const RESULT_MARK = "###RESULT###";

type Body = {
  shutdowns: Array<{
    fuzeSiteId: string;
    shutdownDate: string;
    naEngineerEmail?: string;
    naEngineerName?: string;
  }>;
  events: Array<{
    fuzeSiteId: string;
    eventDate: string;
    kind: "CNS" | "NRB";
    externalId?: string;
  }>;
  preDays?: number;
  postDays?: number;
  timeZone?: string;
  analystNotes?: string;
};

function parseBody(body: Body): {
  shutdowns: ShutdownRow[];
  events: CnsEventRow[];
  preDays: number;
  postDays: number;
  timeZone: string;
  analystNotes: string;
} {
  const shutdowns: ShutdownRow[] = (body.shutdowns ?? []).map((s) => ({
    fuzeSiteId: String(s.fuzeSiteId ?? "").trim(),
    shutdownDate: new Date(s.shutdownDate),
    naEngineerEmail: s.naEngineerEmail,
    naEngineerName: s.naEngineerName,
  }));

  const events: CnsEventRow[] = (body.events ?? []).map((e) => ({
    fuzeSiteId: String(e.fuzeSiteId ?? "").trim(),
    eventDate: new Date(e.eventDate),
    kind: e.kind === "NRB" ? "NRB" : "CNS",
    externalId: e.externalId,
  }));

  const preDays = Math.max(1, Math.min(365, Number(body.preDays) || 30));
  const postDays = Math.max(1, Math.min(365, Number(body.postDays) || 30));
  const timeZone =
    typeof body.timeZone === "string" && body.timeZone.trim()
      ? body.timeZone.trim()
      : "America/New_York";
  const analystNotes =
    typeof body.analystNotes === "string" ? body.analystNotes : "";

  return { shutdowns, events, preDays, postDays, timeZone, analystNotes };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { shutdowns, events, preDays, postDays, timeZone, analystNotes } =
    parseBody(body);

  if (shutdowns.length === 0) {
    return Response.json(
      { error: "At least one decommissioned site is required." },
      { status: 422 }
    );
  }

  const agg = aggregateDecomWindows({
    shutdowns,
    events,
    timeZone,
    preDays,
    postDays,
    analysisRunDate: new Date(),
  });

  const base: AnalyzeResponse = { ...agg };
  const encoder = new TextEncoder();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        if (!process.env.OPENAI_API_KEY?.trim()) {
          const reasoning = buildDemoReasoningText(agg);
          const payload = buildDemoLlmPayload(agg);
          const chunkSize = 4;
          for (let i = 0; i < reasoning.length; i += chunkSize) {
            send({
              type: "reasoning",
              text: reasoning.slice(i, i + chunkSize),
            });
            await new Promise((r) => setTimeout(r, 12));
          }
          const merged = mergeLlmIntoAggregate(base, payload, {
            analystNotes,
            llmModel: "heuristic-fallback",
            reasoning,
          });
          send({
            type: "done",
            analysis: { ...merged, demoMode: true },
          });
          controller.close();
          return;
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: LLM_ANALYSIS_SYSTEM },
            {
              role: "user",
              content: buildAnalysisUserPrompt(agg, analystNotes),
            },
          ],
          stream: true,
          temperature: 0.25,
        });

        let full = "";
        let pastDelimiter = false;

        for await (const part of completion) {
          const d = part.choices[0]?.delta?.content ?? "";
          if (!d) continue;
          full += d;
          if (!pastDelimiter) {
            const i = full.indexOf(RESULT_MARK);
            if (i < 0) {
              send({ type: "reasoning", text: d });
            } else {
              pastDelimiter = true;
              const chunkStart = full.length - d.length;
              if (i > chunkStart) {
                send({ type: "reasoning", text: full.slice(chunkStart, i) });
              }
            }
          }
        }

        const jsonPart = full.split(RESULT_MARK)[1]?.trim() ?? "";
        let payload: ReturnType<typeof parseLlmAnalysisJson> = parseLlmAnalysisJson(
          jsonPart
        );
        if (!payload) {
          const alt = full.indexOf("{");
          if (alt >= 0) {
            payload = parseLlmAnalysisJson(full.slice(alt));
          }
        }

        const reasoningOnly =
          full.indexOf(RESULT_MARK) >= 0
            ? full.slice(0, full.indexOf(RESULT_MARK)).trim()
            : full.trim();

        const merged = mergeLlmIntoAggregate(base, payload, {
          analystNotes,
          llmModel: model,
          reasoning: reasoningOnly || undefined,
        });

        const parseFailed = !payload;
        send({
          type: "done",
          analysis: {
            ...merged,
            demoMode: false,
            ...(parseFailed
              ? {
                  warnings: [
                    ...merged.warnings,
                    "Model output could not be parsed as JSON; all sites left unflagged. Try again or shorten data.",
                  ],
                }
              : {}),
          },
        });
        controller.close();
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Analysis failed.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
