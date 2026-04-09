/**
 * Offline fallback when the LLM API is not configured (correlation-style merge only).
 * Produces narrative + structured decisions from the same aggregated facts (not rule thresholds).
 */
import type { AggregatedAnalyzeResponse } from "@/lib/decom/aggregate-windows";
import type { LlmAnalysisPayload } from "@/lib/decom/merge-llm-analysis";

/** Shared with operations dashboard KPIs — heuristic spike / reinstatement candidate. */
export function heuristicSpikeCandidate(s: {
  preTotal: number;
  postTotal: number;
}): boolean {
  if (s.postTotal >= 6 && s.postTotal > s.preTotal + 1) return true;
  if (s.preTotal > 0 && s.postTotal >= 4 && s.postTotal / s.preTotal >= 1.75) return true;
  if (s.preTotal === 0 && s.postTotal >= 8) return true;
  return false;
}

function concernFor(flagged: boolean, post: number): "high" | "medium" | "low" | "none" {
  if (!flagged) return "none";
  if (post >= 12) return "high";
  if (post >= 6) return "medium";
  return "low";
}

export function buildDemoLlmPayload(
  agg: AggregatedAnalyzeResponse
): LlmAnalysisPayload {
  const sites = agg.sites.map((s) => {
    const flagged = heuristicSpikeCandidate(s);
    return {
      fuzeSiteId: s.fuzeSiteId,
      flagged,
      rationale: flagged
        ? `Post-shutdown customer signals (${s.postTotal} vs ${s.preTotal} pre) suggest a material change worth NA review for exceptions / reinstatement.`
        : `Activity is flat or modest relative to pre-shutdown (${s.preTotal} → ${s.postTotal}); no strong spike pattern.`,
      concernLevel: concernFor(flagged, s.postTotal),
    };
  });
  const flagged = sites.filter((x) => x.flagged);
  const overview =
    flagged.length === 0
      ? "No sites met the correlation spike criteria in this run."
      : `${flagged.length} site(s) show elevated post-decom customer signals under the correlation engine.`;
  return { overview, sites };
}

export function buildDemoPlanningText(agg: AggregatedAnalyzeResponse): string {
  const lines = [
    "Plan (correlation path — model service unavailable for this session):",
    "",
    "1. Compare pre- vs post-shutdown totals (CNS + NRB) for each Fuze site using the configured calendar windows.",
    "2. Treat warehouse rollup feeds as summed TOTAL_PIN_COUNT / TOTAL_NRB_TICKETS by RPT_DT; per-pin feeds as row counts.",
    "3. Apply conservative spike heuristics when post-shutdown volume materially exceeds baseline.",
    "4. Flag sites only where the pattern suggests NA review for exceptions or reinstatement; otherwise document flat or modest change.",
    "5. Summarize unmatched pin rows separately; they do not drive per-site flags.",
    "",
    "Next: structured findings.",
  ];
  return lines.join("\n");
}

/** Findings-only narrative (after plan); pairs with buildDemoPlanningText. */
export function buildDemoReasoningText(agg: AggregatedAnalyzeResponse): string {
  const lines = [
    `Working set: ${agg.summary.decomSiteCount} decommissioned sites; ${agg.summary.sitesWithEvents} with CNS/NRB activity in the extract.`,
    `Unmatched pin rows (no Fuze match in decom file): ${agg.summary.unmatchedEventCount}.`,
    "",
    "Per site I compared pre-window vs post-window totals. Elevated post-shutdown customer signals relative to baseline are surfaced in the table below as flagged sites.",
    "",
    "Site-level signal summary:",
    ...agg.sites.slice(0, 12).map(
      (s) =>
        `- ${s.fuzeSiteId}: shutdown ${s.shutdownDate} — pre ${s.preTotal} / post ${s.postTotal} (CNS ${s.preCns}→${s.postCns}, NRB ${s.preNrb}→${s.postNrb})`
    ),
    agg.sites.length > 12 ? `…and ${agg.sites.length - 12} more sites.` : "",
    "",
    "Structured flags and rationales follow in the site list.",
  ];
  return lines.filter(Boolean).join("\n");
}
