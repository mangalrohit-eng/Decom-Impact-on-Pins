import type {
  AnalyzeResponse,
  AppliedConfig,
  CnsEventRow,
  CnsRollupRow,
  ShutdownRow,
  SiteAnalysisRow,
} from "@/types/decom";
import { aggregateDecomWindows } from "./aggregate-windows";

export type AnalyzeParams = {
  shutdowns: ShutdownRow[];
  events: CnsEventRow[];
  rollups?: CnsRollupRow[];
  timeZone?: string;
  preDays: number;
  postDays: number;
  /** Minimum post-window total when preTotal > 0 */
  minPostWhenPrePositive: number;
  /** Ratio post/pre required when preTotal > 0 */
  minRatioWhenPrePositive: number;
  /** Minimum post-window total when preTotal === 0 */
  minPostWhenPreZero: number;
  analysisRunDate: Date;
};

function computeFlag(
  preTotal: number,
  postTotal: number,
  p: AnalyzeParams
): { flagged: boolean; reason: string | null } {
  if (preTotal > 0) {
    const ratio = postTotal / preTotal;
    if (
      postTotal >= p.minPostWhenPrePositive &&
      ratio >= p.minRatioWhenPrePositive
    ) {
      return {
        flagged: true,
        reason: `Post total ${postTotal} ≥ ${p.minPostWhenPrePositive} and ratio ${ratio.toFixed(2)} ≥ ${p.minRatioWhenPrePositive} vs pre ${preTotal}.`,
      };
    }
    return { flagged: false, reason: null };
  }
  if (postTotal >= p.minPostWhenPreZero) {
    return {
      flagged: true,
      reason: `No pre-window activity; post total ${postTotal} ≥ ${p.minPostWhenPreZero}.`,
    };
  }
  return { flagged: false, reason: null };
}

export function analyzeDecomImpact(p: AnalyzeParams): AnalyzeResponse {
  const agg = aggregateDecomWindows({
    shutdowns: p.shutdowns,
    events: p.events,
    rollups: p.rollups,
    timeZone: p.timeZone,
    preDays: p.preDays,
    postDays: p.postDays,
    analysisRunDate: p.analysisRunDate,
  });

  let flaggedCount = 0;
  const sites: SiteAnalysisRow[] = agg.sites.map((s) => {
    const { flagged, reason } = computeFlag(s.preTotal, s.postTotal, p);
    if (flagged) flaggedCount += 1;
    return {
      ...s,
      flagged,
      flagReason: reason,
    };
  });

  const appliedConfig: AppliedConfig = {
    ...agg.appliedConfig,
    analysisMode: "rules",
    minPostWhenPrePositive: p.minPostWhenPrePositive,
    minRatioWhenPrePositive: p.minRatioWhenPrePositive,
    minPostWhenPreZero: p.minPostWhenPreZero,
  };

  return {
    summary: {
      ...agg.summary,
      flaggedCount,
    },
    sites,
    warnings: agg.warnings,
    appliedConfig,
  };
}
