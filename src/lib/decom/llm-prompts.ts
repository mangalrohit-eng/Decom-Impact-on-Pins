import type { AggregatedAnalyzeResponse } from "@/lib/decom/aggregate-windows";

export const LLM_ANALYSIS_SYSTEM = `You are a senior wireless network operations analyst. Your job is to review mmWave site decommission dates and customer-reported signals (CNS pins and NRB tickets) in pre- vs post-shutdown time windows.

You must:
1. Write clear, professional reasoning first (what you looked at, how you interpret spikes, caveats about correlation vs causation).
2. Then output a machine-readable JSON block after the exact delimiter line: ###RESULT###
3. After the delimiter, output ONLY valid JSON (no markdown fences) with this shape:
{"overview":"one or two sentences","sites":[{"fuzeSiteId":"string","flagged":true|false,"rationale":"short justification","concernLevel":"high"|"medium"|"low"|"none"}]}

Rules:
- You MUST include one object in "sites" for EVERY fuzeSiteId listed in the user data (same ids, no extras).
- "flagged" means: the pattern suggests this decommission may be associated with a meaningful post-shutdown customer signal increase worth NA/engineering review for possible reinstatement or exceptions — use judgment, not a fixed formula.
- Be conservative: if data is thin or ambiguous, set flagged false and explain.
- concernLevel "none" when not flagged.`;

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

  const payload = {
    timeZone: agg.appliedConfig.timeZone,
    preWindowDays: agg.appliedConfig.preDays,
    postWindowDays: agg.appliedConfig.postDays,
    postWindowClampedToYmd: agg.appliedConfig.postWindowClampYmd,
    summary: agg.summary,
    sites: compactSites,
    analystNotes: analystNotes.trim() || null,
  };

  return `Analyze the following aggregated data (counts are facts; you decide which decommissions merit follow-up).

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
