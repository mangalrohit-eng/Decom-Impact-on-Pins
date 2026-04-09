/**
 * Chart-ready aggregates for the operations dashboard (from current default feeds).
 * Default feeds mirror the bundled sample workbooks (rollup CNS + mmWave shutdown extract).
 */
import { addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  getDefaultCnsRollups,
  getDefaultShutdowns,
} from "@/data/workflow-defaults";
import type { CnsEventRow, CnsRollupRow, ShutdownRow } from "@/types/decom";
import { aggregateDecomWindows } from "./aggregate-windows";
import { heuristicSpikeCandidate } from "./demo-llm-analysis";

const TZ = "America/New_York";
const PRE_DAYS = 30;
const POST_DAYS = 30;

/** Market / region codes (representative NE footprint) when decom row has no region. */
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

function regionForShutdown(sh: ShutdownRow, idx: number): string {
  const r = sh.region?.trim();
  if (r) return r;
  return NE_MARKET_REGIONS[idx % NE_MARKET_REGIONS.length]!;
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

/** Rollup: sum pin counts and NRB tickets by report date. */
function buildDailyPinsFromRollups(rollups: CnsRollupRow[]): DailyPinPoint[] {
  const byDay = new Map<string, { total: number; nid: number }>();
  for (const r of rollups) {
    const iso = formatInTimeZone(r.rptDt, TZ, "yyyy-MM-dd");
    const cur = byDay.get(iso) ?? { total: 0, nid: 0 };
    cur.total += r.totalPinCount;
    cur.nid += r.totalNrbTickets;
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

function buildRelativeNidFromRollups(
  shutdowns: ShutdownRow[],
  rollups: CnsRollupRow[]
): RelativeNidPoint[] {
  const byFuze = new Map<string, CnsRollupRow[]>();
  for (const r of rollups) {
    const list = byFuze.get(r.fuzeSiteId) ?? [];
    list.push(r);
    byFuze.set(r.fuzeSiteId, list);
  }

  const DAY_MIN = -10;
  const DAY_MAX = 6;
  const bucketSum = new Map<number, number>();
  for (let d = DAY_MIN; d <= DAY_MAX; d++) bucketSum.set(d, 0);

  const nSites = Math.max(1, shutdowns.length);

  for (const s of shutdowns) {
    const list = byFuze.get(s.fuzeSiteId) ?? [];
    for (const r of list) {
      const nrb = r.totalNrbTickets;
      if (nrb <= 0) continue;
      const rel = differenceInCalendarDays(
        fromZonedTime(
          `${formatInTimeZone(r.rptDt, TZ, "yyyy-MM-dd")}T12:00:00`,
          TZ
        ),
        fromZonedTime(
          `${formatInTimeZone(s.shutdownDate, TZ, "yyyy-MM-dd")}T12:00:00`,
          TZ
        )
      );
      if (rel < DAY_MIN || rel > DAY_MAX) continue;
      bucketSum.set(rel, (bucketSum.get(rel) ?? 0) + nrb);
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
    const region = regionForShutdown(sh, idx);
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
  events: CnsEventRow[] = [],
  rollups: CnsRollupRow[] = getDefaultCnsRollups()
): OperationsDashboardPayload {
  const useRollup = rollups.length > 0;
  const analysisRunDate = new Date("2027-06-01T12:00:00.000Z");
  const agg = aggregateDecomWindows({
    shutdowns,
    events: useRollup ? [] : events,
    rollups: useRollup ? rollups : [],
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

  const dailyPins = useRollup
    ? buildDailyPinsFromRollups(rollups)
    : buildDailyPins(events);
  const relativeNid = useRollup
    ? buildRelativeNidFromRollups(shutdowns, rollups)
    : buildRelativeNid(shutdowns, events);
  const regionalNid = buildRegionalNid(shutdowns, agg.sites);

  const pinRowCount = useRollup ? rollups.length : events.length;

  return {
    kpis: {
      decomSiteCount: agg.summary.decomSiteCount,
      pinRowCount,
      sitesWithPins: agg.summary.sitesWithEvents,
      reversalCandidates,
      unmatchedPinRows: agg.summary.unmatchedEventCount,
    },
    dailyPins,
    relativeNid,
    regionalNid,
    generatedAtIso: new Date().toISOString(),
    windowNote: useRollup
      ? `Pre/post windows: ${PRE_DAYS}d / ${POST_DAYS}d (${TZ}). CNS feed is EDW rollup — daily chart sums TOTAL_PIN_COUNT / TOTAL_NRB_TICKETS by RPT_DT.`
      : `Pre/post windows: ${PRE_DAYS}d / ${POST_DAYS}d (${TZ}). NID series counts NRB rows in feed.`,
  };
}
