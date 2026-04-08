export type EventKind = "CNS" | "NRB";

export type CnsEventRow = {
  fuzeSiteId: string;
  eventDate: Date;
  kind: EventKind;
  externalId?: string;
};

export type ShutdownRow = {
  fuzeSiteId: string;
  shutdownDate: Date;
  naEngineerEmail?: string;
  naEngineerName?: string;
};

export type SiteEventDetail = {
  id?: string;
  date: string;
  type: EventKind;
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

export type AppliedConfig = {
  timeZone: string;
  preDays: number;
  postDays: number;
  minPostWhenPrePositive: number;
  minRatioWhenPrePositive: number;
  minPostWhenPreZero: number;
  analysisRunIso: string;
  postWindowClampYmd: string;
  maxEventsPerSite: number;
};

export type AnalyzeResponse = {
  summary: AnalyzeSummary;
  sites: SiteAnalysisRow[];
  warnings: string[];
  appliedConfig: AppliedConfig;
};
