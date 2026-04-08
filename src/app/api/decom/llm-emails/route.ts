import OpenAI from "openai";
import { buildEmailUserPrompt, LLM_EMAIL_SYSTEM } from "@/lib/decom/llm-prompts";
import { buildSimulatedEmails } from "@/lib/decom/simulate-email";
import type { SiteAnalysisRow } from "@/types/decom";

export const maxDuration = 60;

type SimEmail = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

function parseEmailsJson(raw: string): SimEmail[] | null {
  try {
    const o = JSON.parse(raw) as { emails?: unknown };
    if (!Array.isArray(o.emails)) return null;
    const out: SimEmail[] = [];
    for (const item of o.emails) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const to = typeof r.to === "string" ? r.to : "";
      const subject = typeof r.subject === "string" ? r.subject : "";
      const textBody = typeof r.textBody === "string" ? r.textBody : "";
      const htmlBody = typeof r.htmlBody === "string" ? r.htmlBody : "";
      if (!to || !subject) continue;
      const html = htmlBody || textBody;
      out.push({ to, subject, textBody, htmlBody: html });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let sites: SiteAnalysisRow[];
  try {
    const body = (await req.json()) as { sites?: SiteAnalysisRow[] };
    sites = Array.isArray(body.sites) ? body.sites : [];
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (sites.length === 0) {
    return Response.json(
      { error: "Select at least one site." },
      { status: 422 }
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    const fallback = buildSimulatedEmails(sites, {
      appName: "mmWave reinstatement / exceptions review",
    });
    return Response.json({
      emails: fallback,
      demoMode: true,
    });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const compact = sites.map((s) => ({
    fuzeSiteId: s.fuzeSiteId,
    shutdownDate: s.shutdownDate,
    preTotal: s.preTotal,
    postTotal: s.postTotal,
    flagReason: s.flagReason,
    concernLevel: s.concernLevel,
    naEngineerEmail: s.naEngineerEmail,
    naEngineerName: s.naEngineerName,
  }));

  try {
    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: LLM_EMAIL_SYSTEM },
        { role: "user", content: buildEmailUserPrompt(compact) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const text = res.choices[0]?.message?.content?.trim() ?? "";
    let emails = parseEmailsJson(text);
    if (!emails) {
      emails = buildSimulatedEmails(sites, {
        appName: "mmWave reinstatement / exceptions review",
      });
      return Response.json({
        emails,
        demoMode: false,
        warning:
          "LLM response was not valid JSON; standard structured template was applied for this run.",
      });
    }

    return Response.json({ emails, demoMode: false });
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Email generation failed.",
      },
      { status: 500 }
    );
  }
}
