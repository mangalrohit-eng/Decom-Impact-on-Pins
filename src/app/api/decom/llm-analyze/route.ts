import OpenAI from "openai";
import { aggregateDecomWindows } from "@/lib/decom/aggregate-windows";
import {
  buildDemoLlmPayload,
  buildDemoReasoningText,
} from "@/lib/decom/demo-llm-analysis";
import { buildAnalysisUserPrompt, LLM_ANALYSIS_SYSTEM } from "@/lib/decom/llm-prompts";
import {
  mergeLlmIntoAggregate,
  parseLlmJsonModeResponse,
} from "@/lib/decom/merge-llm-analysis";
import type {
  AnalyzeResponse,
  CnsEventRow,
  CnsRollupRow,
  ShutdownRow,
} from "@/types/decom";

export const maxDuration = 120;

type Body = {
  shutdowns: Array<{
    fuzeSiteId: string;
    shutdownDate: string;
    naEngineerEmail?: string;
    naEngineerName?: string;
    region?: string;
    market?: string;
    standAlone?: string;
    allMmw?: string;
    shutdownFlag?: string;
  }>;
  events: Array<{
    fuzeSiteId: string;
    eventDate: string;
    kind: "CNS" | "NRB";
    externalId?: string;
  }>;
  rollups?: Array<{
    fuzeSiteId: string;
    rptDt: string;
    market?: string;
    lteMarketId?: string;
    lteMarketName?: string;
    totalPinCount?: number;
    nidPinCount?: number;
    internalPinCount?: number;
    totalNrbTickets?: number;
    networkNrbCount?: number;
    dataRelatedNrbCount?: number;
  }>;
  preDays?: number;
  postDays?: number;
  timeZone?: string;
  analystNotes?: string;
};

function parseBody(body: Body): {
  shutdowns: ShutdownRow[];
  events: CnsEventRow[];
  rollups: CnsRollupRow[];
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
    region: s.region,
    market: s.market,
    standAlone: s.standAlone,
    allMmw: s.allMmw,
    shutdownFlag: s.shutdownFlag,
  }));

  const events: CnsEventRow[] = (body.events ?? []).map((e) => ({
    fuzeSiteId: String(e.fuzeSiteId ?? "").trim(),
    eventDate: new Date(e.eventDate),
    kind: e.kind === "NRB" ? "NRB" : "CNS",
    externalId: e.externalId,
  }));

  const rollups: CnsRollupRow[] = (body.rollups ?? []).map((r) => ({
    fuzeSiteId: String(r.fuzeSiteId ?? "").trim(),
    rptDt: new Date(r.rptDt),
    market: r.market,
    lteMarketId: r.lteMarketId,
    lteMarketName: r.lteMarketName,
    totalPinCount: Number(r.totalPinCount) || 0,
    nidPinCount: Number(r.nidPinCount) || 0,
    internalPinCount: Number(r.internalPinCount) || 0,
    totalNrbTickets: Number(r.totalNrbTickets) || 0,
    networkNrbCount: Number(r.networkNrbCount) || 0,
    dataRelatedNrbCount: Number(r.dataRelatedNrbCount) || 0,
  }));

  const preDays = Math.max(1, Math.min(365, Number(body.preDays) || 30));
  const postDays = Math.max(1, Math.min(365, Number(body.postDays) || 30));
  const timeZone =
    typeof body.timeZone === "string" && body.timeZone.trim()
      ? body.timeZone.trim()
      : "America/New_York";
  const analystNotes =
    typeof body.analystNotes === "string" ? body.analystNotes : "";

  return { shutdowns, events, rollups, preDays, postDays, timeZone, analystNotes };
}

async function streamReasoningChunks(
  send: (obj: unknown) => void,
  reasoning: string,
  chunkSize: number,
  delayMs: number
) {
  for (let i = 0; i < reasoning.length; i += chunkSize) {
    send({
      type: "reasoning",
      text: reasoning.slice(i, i + chunkSize),
    });
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { shutdowns, events, rollups, preDays, postDays, timeZone, analystNotes } =
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
    rollups,
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
        send({ type: "activity", phase: "thinking" });

        if (!process.env.OPENAI_API_KEY?.trim()) {
          const reasoning = buildDemoReasoningText(agg);
          const payload = buildDemoLlmPayload(agg);
          send({ type: "activity", phase: "reasoning" });
          await streamReasoningChunks(send, reasoning, 4, 12);
          send({ type: "activity", phase: "sites" });
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
          response_format: { type: "json_object" },
          temperature: 0.25,
          max_tokens: 16384,
        });

        const choice = completion.choices[0];
        const finish = choice?.finish_reason;
        const text = choice?.message?.content?.trim() ?? "";

        if (finish === "length") {
          send({
            type: "error",
            message:
              "Model response was truncated (output limit). Reduce the number of sites or try again.",
          });
          controller.close();
          return;
        }

        const { payload, reasoning } = parseLlmJsonModeResponse(text);

        if (!payload) {
          send({
            type: "error",
            message:
              "Model returned JSON that could not be read as site decisions. Check API logs or retry with fewer sites.",
          });
          controller.close();
          return;
        }

        const narrative = reasoning || payload.overview || "";
        send({ type: "activity", phase: "reasoning" });
        await streamReasoningChunks(send, narrative, 6, 6);
        send({ type: "activity", phase: "sites" });

        const merged = mergeLlmIntoAggregate(base, payload, {
          analystNotes,
          llmModel: model,
          reasoning: narrative || undefined,
        });

        const expectedIds = new Set(base.sites.map((s) => s.fuzeSiteId));
        const returnedIds = new Set(payload.sites.map((s) => s.fuzeSiteId));
        const missing = [...expectedIds].filter((id) => !returnedIds.has(id)).length;
        const extraWarnings =
          missing > 0
            ? [
                `LLM JSON omitted ${missing} Fuze site id(s) from "sites"; those sites were left unflagged.`,
              ]
            : [];

        send({
          type: "done",
          analysis: {
            ...merged,
            demoMode: false,
            warnings: [...merged.warnings, ...extraWarnings],
          },
        });
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Analysis failed.";
        send({
          type: "error",
          message: msg.includes("response_format")
            ? `${msg} (Try gpt-4o-mini or another model that supports JSON mode.)`
            : msg,
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
