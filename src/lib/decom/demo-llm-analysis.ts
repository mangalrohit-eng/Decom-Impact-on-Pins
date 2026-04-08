/**
 * Offline fallback when no OpenAI key is configured.
 * Produces narrative + structured decisions from the same aggregated facts (not rule thresholds).
 */
import type { AggregatedAnalyzeResponse } from "@/lib/decom/aggregate-windows";
import type { LlmAnalysisPayload } from "@/lib/decom/merge-llm-analysis";

function demoFlagSite(s: {
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
    const flagged = demoFlagSite(s);
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
      ? "No sites met the heuristic spike criteria in this run. Configure the production LLM service (OPENAI_API_KEY) for full generative analysis."
      : `${flagged.length} site(s) show elevated post-decom customer signals under the heuristic engine. For full LLM reasoning, configure OPENAI_API_KEY.`;
  return { overview, sites };
}

export function buildDemoReasoningText(agg: AggregatedAnalyzeResponse): string {
  const lines = [
    "Analysis engine: heuristic fallback (LLM service credentials not configured).",
    "",
    `Reviewing ${agg.summary.decomSiteCount} decommissioned sites with ${agg.summary.sitesWithEvents} sites carrying CNS/NRB activity.`,
    `Unmatched pin rows (no matching Fuze in decom file): ${agg.summary.unmatchedEventCount}.`,
    "",
    "Per site, I compared pre-window vs post-window totals (CNS + NRB) using the calendar windows you set.",
    "Sites where post-shutdown volume clearly steps up relative to baseline are candidates for reinstatement discussion.",
    "",
    "Key observations:",
    ...agg.sites.slice(0, 12).map(
      (s) =>
        `- ${s.fuzeSiteId}: shutdown ${s.shutdownDate} — pre ${s.preTotal} / post ${s.postTotal} (CNS ${s.preCns}→${s.postCns}, NRB ${s.preNrb}→${s.postNrb})`
    ),
    agg.sites.length > 12 ? `…and ${agg.sites.length - 12} more sites.` : "",
    "",
    "See structured result below for flagged recommendations.",
  ];
  return lines.filter(Boolean).join("\n");
}
