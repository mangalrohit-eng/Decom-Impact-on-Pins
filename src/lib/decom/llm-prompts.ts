import type { AggregatedAnalyzeResponse } from "@/lib/decom/aggregate-windows";

/**
 * Used with OpenAI `response_format: { type: "json_object" }` — entire model output must be one JSON object.
 */
export const LLM_ANALYSIS_SYSTEM = `You are a senior wireless network operations analyst. You review mmWave site decommission dates and customer-reported signals (CNS pins and NRB tickets) in pre- vs post-shutdown time windows.

You MUST respond with a single JSON object only (no markdown, no prose outside JSON). The JSON must have exactly these top-level keys:
- "reasoning": string — multi-paragraph professional narrative: what you examined, how you read pre/post patterns, caveats about correlation vs causation, and how you applied judgment.
- "overview": string — one or two sentences suitable as an executive headline.
- "sites": array — one object per site from the user data, in any order, with this shape per element:
  {"fuzeSiteId":"string","flagged":boolean,"rationale":"short justification","concernLevel":"high"|"medium"|"low"|"none"}

Rules:
- "fuzeSiteId" must match the user payload exactly as a JSON string (e.g. "6165310432"). You may use quoted strings even if the id looks numeric.
- Include EVERY fuzeSiteId from the user "sites" list with no omissions and no extra ids.
- "flagged" true means the pattern suggests this decommission may be associated with a meaningful post-shutdown customer signal increase worth NA/engineering review for possible reinstatement or exceptions — use judgment, not a fixed formula.
- Be conservative when data is thin or ambiguous; set flagged false and explain in rationale.
- concernLevel must be "none" when not flagged.`;

export function buildAnalysisUserPrompt(
  agg: AggregatedAnalyzeResponse,
  analystNotes: string
): string {
  const compactSites = agg.sites.map((s) => ({
    fuzeSiteId: s.fuzeSiteId,
    shutdownDate: s.shutdownDate,
    preTotal: s.preTotal,
    postTotal: s.postTotal,
    preCns: s.preCns,
    postCns: s.postCns,
    preNrb: s.preNrb,
    postNrb: s.postNrb,
    naEngineerEmail: s.naEngineerEmail ?? null,
  }));

  const feedNote =
    agg.appliedConfig.cnsFeedKind === "rollup"
      ? "CNS feed is a warehouse rollup: pre/post CNS totals sum TOTAL_PIN_COUNT from rows whose RPT_DT falls in each window; NRB totals sum TOTAL_NRB_TICKETS the same way (not per-pin row counts)."
      : "CNS feed is per-pin / per-ticket rows: pre/post totals count rows in each window by type.";

  const payload = {
    timeZone: agg.appliedConfig.timeZone,
    preWindowDays: agg.appliedConfig.preDays,
    postWindowDays: agg.appliedConfig.postDays,
    postWindowClampedToYmd: agg.appliedConfig.postWindowClampYmd,
    cnsFeedKind: agg.appliedConfig.cnsFeedKind ?? "events",
    summary: agg.summary,
    sites: compactSites,
    analystNotes: analystNotes.trim() || null,
  };

  return `Analyze the following aggregated data (counts are facts; you decide which decommissions merit follow-up). Return your answer as the JSON object described in the system message.

${feedNote}

${JSON.stringify(payload, null, 2)}`;
}

export const LLM_EMAIL_SYSTEM = `You draft professional internal emails for NA network engineers about mmWave decommission sites that may need exceptions or reinstatement review.

Return ONLY valid JSON (no markdown) with this exact shape:
{"emails":[{"to":"email or placeholder","subject":"...","textBody":"plain text","htmlBody":"minimal HTML table or paragraphs, safe tags only"}]}

Group sites by recipient email when the same engineer owns multiple sites. Use a courteous, concise Network Engineering tone. State clearly that the body is a draft and must be sent manually from the recipient's mail client. Do not invent policy commitments.`;

export function buildEmailUserPrompt(
  sites: Array<{
    fuzeSiteId: string;
    shutdownDate: string;
    preTotal: number;
    postTotal: number;
    flagReason: string | null;
    naEngineerEmail?: string;
    naEngineerName?: string;
    concernLevel?: string;
  }>
): string {
  return `Draft outreach email(s) for these sites selected for reinstatement / exceptions consideration:

${JSON.stringify(sites, null, 2)}`;
}
