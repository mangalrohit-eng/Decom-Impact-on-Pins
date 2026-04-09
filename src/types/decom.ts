export type EventKind = "CNS" | "NRB";

export type CnsEventRow = {
  fuzeSiteId: string;
  eventDate: Date;
  kind: EventKind;
  externalId?: string;
};

/** EDW-style rollup: one row per Fuze per report date with counts (not per-pin events). */
export type CnsRollupRow = {
  fuzeSiteId: string;
  rptDt: Date;
  market?: string;
  lteMarketId?: string;
  lteMarketName?: string;
  totalPinCount: number;
  nidPinCount: number;
  internalPinCount: number;
  totalNrbTickets: number;
  networkNrbCount: number;
  dataRelatedNrbCount: number;
};

export type CnsFeedKind = "events" | "rollup";

export type ShutdownRow = {
  fuzeSiteId: string;
  shutdownDate: Date;
  naEngineerEmail?: string;
  naEngineerName?: string;
  /** Columns from mmWave shutdown extract (when present). */
  region?: string;
  market?: string;
  standAlone?: string;
  allMmw?: string;
  shutdownFlag?: string;
};

export type SiteEventDetail = {
  id?: string;
  date: string;
  type: EventKind;
  /** Rollup snapshot description when feed is warehouse rollup. */
  note?: string;
};

export type SiteAnalysisRow = {
  fuzeSiteId: string;
  shutdownDate: string;
  preTotal: number;
  postTotal: number;
  preCns: number;
  postCns: number;
  preNrb: number;
  postNrb: number;
  flagged: boolean;
  flagReason: string | null;
  /** LLM-only: qualitative severity */
  concernLevel?: "high" | "medium" | "low" | "none";
  naEngineerEmail?: string;
  naEngineerName?: string;
  events?: SiteEventDetail[];
  eventsTruncated?: boolean;
};

export type AnalyzeSummary = {
  decomSiteCount: number;
  sitesWithEvents: number;
  flaggedCount: number;
  unmatchedEventCount: number;
  shutdownsWithNoEvents: number;
  pinDateMin: string | null;
  pinDateMax: string | null;
};

export type AnalysisMode = "llm" | "rules";

export type AppliedConfig = {
  timeZone: string;
  preDays: number;
  postDays: number;
  analysisMode: AnalysisMode;
  analysisRunIso: string;
  postWindowClampYmd: string;
  maxEventsPerSite: number;
  /** Optional user hints passed to the LLM */
  analystNotes?: string;
  llmModel?: string;
  /** Rule-based (`analyzeDecomImpact`) only */
  minPostWhenPrePositive?: number;
  minRatioWhenPrePositive?: number;
  minPostWhenPreZero?: number;
  /** How CNS/NRB signal rows were interpreted for aggregation */
  cnsFeedKind?: CnsFeedKind;
};

export type AnalyzeResponse = {
  summary: AnalyzeSummary;
  sites: SiteAnalysisRow[];
  warnings: string[];
  appliedConfig: AppliedConfig;
  /** Full streamed reasoning text (LLM path) */
  llmReasoning?: string;
  /** Short headline from the model (LLM path) */
  llmOverview?: string;
  /** True when the LLM API was unavailable and the correlation-engine path was used */
  demoMode?: boolean;
};
