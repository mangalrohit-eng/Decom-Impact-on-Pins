/**
 * Chart-ready aggregates for the operations dashboard (from current default feeds).
 * NRB series is labeled “NID pins” in UI to align with NE reporting vocabulary.
 */
import { addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getDefaultCnsEvents, getDefaultShutdowns } from "@/data/workflow-defaults";
import type { CnsEventRow, ShutdownRow } from "@/types/decom";
import { aggregateDecomWindows } from "./aggregate-windows";
import { heuristicSpikeCandidate } from "./demo-llm-analysis";

const TZ = "America/New_York";
const PRE_DAYS = 30;
const POST_DAYS = 30;

/** Market / region codes (representative NE footprint). */
export const NE_MARKET_REGIONS = [
  "CATN",
  "CGC",
  "CTX",
  "FL",
  "GAAL",
  "GP",
  "ILWI",
  "MINKY",
  "MTPL",
  "NCAL",
  "NE",
  "NYM",
  "OPW",
  "PNW",
  "SCAL",
  "SW",
  "TriSt",
  "UPNY",
  "WBV",
] as const;

export type DailyPinPoint = {
  /** Short label for axis, e.g. 03/25 */
  label: string;
  isoDate: string;
  totalPins: number;
  nidPins: number;
};

export type RelativeNidPoint = {
  dayOffset: number;
  avgNidPins: number;
};

export type RegionalNidPoint = {
  region: string;
  avgPreNid: number;
  avgPostNid: number;
  siteCount: number;
};

export type OperationsDashboardPayload = {
  kpis: {
    decomSiteCount: number;
    pinRowCount: number;
    sitesWithPins: number;
    reversalCandidates: number;
    unmatchedPinRows: number;
  };
  dailyPins: DailyPinPoint[];
  relativeNid: RelativeNidPoint[];
  regionalNid: RegionalNidPoint[];
  generatedAtIso: string;
  windowNote: string;
};

function regionForShutdownIndex(i: number): string {
  return NE_MARKET_REGIONS[i % NE_MARKET_REGIONS.length]!;
}

function buildDailyPins(events: CnsEventRow[]): DailyPinPoint[] {
  const byDay = new Map<string, { total: number; nid: number }>();
  for (const e of events) {
    const iso = formatInTimeZone(e.eventDate, TZ, "yyyy-MM-dd");
    const cur = byDay.get(iso) ?? { total: 0, nid: 0 };
    cur.total += 1;
    if (e.kind === "NRB") cur.nid += 1;
    byDay.set(iso, cur);
  }
  if (byDay.size === 0) return [];

  const sortedKeys = [...byDay.keys()].sort();
  const endStr = sortedKeys[sortedKeys.length - 1]!;
  const endAnchor = fromZonedTime(`${endStr}T12:00:00`, TZ);

  const out: DailyPinPoint[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = addDays(endAnchor, -i);
    const iso = formatInTimeZone(d, TZ, "yyyy-MM-dd");
    const row = byDay.get(iso) ?? { total: 0, nid: 0 };
    out.push({
      label: formatInTimeZone(d, TZ, "MM/dd/yyyy"),
      isoDate: iso,
      totalPins: row.total,
      nidPins: row.nid,
    });
  }
  return out;
}

function buildRelativeNid(shutdowns: ShutdownRow[], events: CnsEventRow[]): RelativeNidPoint[] {
  const eventsByFuze = new Map<string, CnsEventRow[]>();
  for (const e of events) {
    const list = eventsByFuze.get(e.fuzeSiteId) ?? [];
    list.push(e);
    eventsByFuze.set(e.fuzeSiteId, list);
  }

  const DAY_MIN = -10;
  const DAY_MAX = 6;
  const bucketSum = new Map<number, number>();
  for (let d = DAY_MIN; d <= DAY_MAX; d++) bucketSum.set(d, 0);

  const nSites = Math.max(1, shutdowns.length);

  for (const s of shutdowns) {
    const list = eventsByFuze.get(s.fuzeSiteId) ?? [];
    for (const e of list) {
      if (e.kind !== "NRB") continue;
      const rel = differenceInCalendarDays(
        fromZonedTime(
          `${formatInTimeZone(e.eventDate, TZ, "yyyy-MM-dd")}T12:00:00`,
          TZ
        ),
        fromZonedTime(
          `${formatInTimeZone(s.shutdownDate, TZ, "yyyy-MM-dd")}T12:00:00`,
          TZ
        )
      );
      if (rel < DAY_MIN || rel > DAY_MAX) continue;
      bucketSum.set(rel, (bucketSum.get(rel) ?? 0) + 1);
    }
  }

  const out: RelativeNidPoint[] = [];
  for (let d = DAY_MIN; d <= DAY_MAX; d++) {
    const sum = bucketSum.get(d) ?? 0;
    out.push({ dayOffset: d, avgNidPins: sum / nSites });
  }
  return out;
}

function buildRegionalNid(
  shutdowns: ShutdownRow[],
  sites: Array<{
    fuzeSiteId: string;
    preNrb: number;
    postNrb: number;
  }>
): RegionalNidPoint[] {
  const byRegion = new Map<
    string,
    { preSum: number; postSum: number; n: number }
  >();

  const siteByFuze = new Map(sites.map((s) => [s.fuzeSiteId, s]));

  shutdowns.forEach((sh, idx) => {
    const region = regionForShutdownIndex(idx);
    const row = siteByFuze.get(sh.fuzeSiteId);
    if (!row) return;
    const cur = byRegion.get(region) ?? { preSum: 0, postSum: 0, n: 0 };
    cur.preSum += row.preNrb;
    cur.postSum += row.postNrb;
    cur.n += 1;
    byRegion.set(region, cur);
  });

  return [...byRegion.entries()]
    .map(([region, v]) => ({
      region,
      avgPreNid: v.n ? v.preSum / v.n : 0,
      avgPostNid: v.n ? v.postSum / v.n : 0,
      siteCount: v.n,
    }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

export function getOperationsDashboardPayload(
  shutdowns: ShutdownRow[] = getDefaultShutdowns(),
  events: CnsEventRow[] = getDefaultCnsEvents()
): OperationsDashboardPayload {
  const analysisRunDate = new Date("2027-06-01T12:00:00.000Z");
  const agg = aggregateDecomWindows({
    shutdowns,
    events,
    timeZone: TZ,
    preDays: PRE_DAYS,
    postDays: POST_DAYS,
    analysisRunDate,
  });

  let reversalCandidates = 0;
  for (const s of agg.sites) {
    if (heuristicSpikeCandidate({ preTotal: s.preTotal, postTotal: s.postTotal })) {
      reversalCandidates += 1;
    }
  }

  const dailyPins = buildDailyPins(events);
  const relativeNid = buildRelativeNid(shutdowns, events);
  const regionalNid = buildRegionalNid(shutdowns, agg.sites);

  return {
    kpis: {
      decomSiteCount: agg.summary.decomSiteCount,
      pinRowCount: events.length,
      sitesWithPins: agg.summary.sitesWithEvents,
      reversalCandidates,
      unmatchedPinRows: agg.summary.unmatchedEventCount,
    },
    dailyPins,
    relativeNid,
    regionalNid,
    generatedAtIso: new Date().toISOString(),
    windowNote: `Pre/post windows: ${PRE_DAYS}d / ${POST_DAYS}d (${TZ}). NID = NRB pin records in feed.`,
  };
}
