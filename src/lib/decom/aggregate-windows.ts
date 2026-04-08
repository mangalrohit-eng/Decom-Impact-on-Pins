/**
 * Time-window aggregation of CNS/NRB events per decom site (facts only).
 * Used to feed the LLM; flagging is decided by the model, not by thresholds here.
 */
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type {
  AppliedConfig,
  AnalyzeSummary,
  CnsEventRow,
  ShutdownRow,
  SiteAnalysisRow,
  SiteEventDetail,
} from "@/types/decom";

const DEFAULT_TZ = "America/New_York";
const MAX_EVENTS_PER_SITE = 500;

export type AggregateParams = {
  shutdowns: ShutdownRow[];
  events: CnsEventRow[];
  timeZone?: string;
  preDays: number;
  postDays: number;
  analysisRunDate: Date;
};

function ymdInTz(d: Date, tz: string): string {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

function addCalendarDaysYmd(ymd: string, deltaDays: number, tz: string): string {
  const anchor = fromZonedTime(`${ymd}T12:00:00`, tz);
  const shifted = addDays(anchor, deltaDays);
  return formatInTimeZone(shifted, tz, "yyyy-MM-dd");
}

function ymdMin(a: string, b: string): string {
  return a <= b ? a : b;
}

function eventInPreWindow(
  eventYmd: string,
  preStartYmd: string,
  shutdownYmd: string
): boolean {
  return eventYmd >= preStartYmd && eventYmd < shutdownYmd;
}

function eventInPostWindow(
  eventYmd: string,
  shutdownYmd: string,
  postEndYmd: string
): boolean {
  return eventYmd >= shutdownYmd && eventYmd <= postEndYmd;
}

export type AggregatedAnalyzeResponse = {
  summary: AnalyzeSummary;
  sites: SiteAnalysisRow[];
  warnings: string[];
  appliedConfig: AppliedConfig;
};

export function aggregateDecomWindows(p: AggregateParams): AggregatedAnalyzeResponse {
  const tz = p.timeZone ?? DEFAULT_TZ;
  const analysisClampYmd = ymdInTz(p.analysisRunDate, tz);

  const shutdownFuze = new Set(p.shutdowns.map((s) => s.fuzeSiteId));
  let unmatchedEventCount = 0;
  for (const e of p.events) {
    if (!shutdownFuze.has(e.fuzeSiteId)) unmatchedEventCount += 1;
  }

  const eventsByFuze = new Map<string, CnsEventRow[]>();
  for (const e of p.events) {
    if (!shutdownFuze.has(e.fuzeSiteId)) continue;
    const list = eventsByFuze.get(e.fuzeSiteId) ?? [];
    list.push(e);
    eventsByFuze.set(e.fuzeSiteId, list);
  }

  const warnings: string[] = [];
  const sites: SiteAnalysisRow[] = [];
  let flaggedCount = 0;
  let sitesWithEvents = 0;

  for (const s of p.shutdowns) {
    const shutdownYmd = ymdInTz(s.shutdownDate, tz);
    const preStartYmd = addCalendarDaysYmd(shutdownYmd, -p.preDays, tz);
    const rawPostEnd = addCalendarDaysYmd(shutdownYmd, p.postDays, tz);
    const postEndYmd = ymdMin(rawPostEnd, analysisClampYmd);

    const list = eventsByFuze.get(s.fuzeSiteId) ?? [];
    if (list.length > 0) sitesWithEvents += 1;

    let preCns = 0;
    let postCns = 0;
    let preNrb = 0;
    let postNrb = 0;

    for (const e of list) {
      const eventYmd = ymdInTz(e.eventDate, tz);

      if (eventInPreWindow(eventYmd, preStartYmd, shutdownYmd)) {
        if (e.kind === "CNS") preCns += 1;
        else preNrb += 1;
      } else if (eventInPostWindow(eventYmd, shutdownYmd, postEndYmd)) {
        if (e.kind === "CNS") postCns += 1;
        else postNrb += 1;
      }
    }

    const preTotal = preCns + preNrb;
    const postTotal = postCns + postNrb;

    const sortedEvents = [...list].sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
    );
    const truncated = sortedEvents.length > MAX_EVENTS_PER_SITE;
    const slice = truncated
      ? sortedEvents.slice(-MAX_EVENTS_PER_SITE)
      : sortedEvents;
    if (truncated) {
      warnings.push(
        `Fuze ${s.fuzeSiteId}: event list truncated to ${MAX_EVENTS_PER_SITE} (newest) for payload size.`
      );
    }

    const details: SiteEventDetail[] = slice.map((e) => ({
      id: e.externalId,
      date: e.eventDate.toISOString(),
      type: e.kind,
    }));

    sites.push({
      fuzeSiteId: s.fuzeSiteId,
      shutdownDate: shutdownYmd,
      preTotal,
      postTotal,
      preCns,
      postCns,
      preNrb,
      postNrb,
      flagged: false,
      flagReason: null,
      naEngineerEmail: s.naEngineerEmail,
      naEngineerName: s.naEngineerName,
      events: details,
      eventsTruncated: truncated,
    });
  }

  const relevantEvents = p.events.filter((e) => shutdownFuze.has(e.fuzeSiteId));
  const sortedYmd = relevantEvents
    .map((e) => ymdInTz(e.eventDate, tz))
    .sort();
  const pinDateMin = sortedYmd.length ? sortedYmd[0]! : null;
  const pinDateMax = sortedYmd.length ? sortedYmd[sortedYmd.length - 1]! : null;

  const shutdownsWithNoEvents = sites.filter((x) => x.preTotal + x.postTotal === 0)
    .length;

  const appliedConfig: AppliedConfig = {
    timeZone: tz,
    preDays: p.preDays,
    postDays: p.postDays,
    analysisMode: "llm",
    analysisRunIso: p.analysisRunDate.toISOString(),
    postWindowClampYmd: analysisClampYmd,
    maxEventsPerSite: MAX_EVENTS_PER_SITE,
  };

  return {
    summary: {
      decomSiteCount: p.shutdowns.length,
      sitesWithEvents,
      flaggedCount,
      unmatchedEventCount,
      shutdownsWithNoEvents,
      pinDateMin,
      pinDateMax,
    },
    sites,
    warnings,
    appliedConfig,
  };
}
