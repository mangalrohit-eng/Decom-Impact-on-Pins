import type { CnsRollupRow, ShutdownRow } from "@/types/decom";
import {
  SAMPLE_CNS_WORKBOOK_FILENAME,
  SAMPLE_DECOM_WORKBOOK_FILENAME,
} from "@/lib/decom/sample-workbook-names";
import defaultCnsRollups from "./default-cns-rollups.json";
import defaultShutdowns from "./default-shutdowns.json";

/** Scheduled inventory feed when no file upload is present. */
export const DECOM_FEED_SNAPSHOT = {
  sourceLabel: "Verizon Network Inventory — mmWave decommission feed",
  syncJobId: "VZ-NI-MMV-2847193",
  pulledAtIso: "2026-04-07T23:45:00.000Z",
} as const;

export const CNS_FEED_SNAPSHOT = {
  sourceLabel: "Verizon CNS/NRB — customer signal warehouse (EDW rollup)",
  syncJobId: "VZ-CNS-EDW-9182044",
  pulledAtIso: "2026-04-08T06:12:00.000Z",
} as const;

export { SAMPLE_CNS_WORKBOOK_FILENAME, SAMPLE_DECOM_WORKBOOK_FILENAME };

/**
 * Default decom rows (bundled snapshot). Column layout matches the mmWave shutdown
 * sample workbook filename exported as SAMPLE_DECOM_WORKBOOK_FILENAME.
 */
export function getDefaultShutdowns(): ShutdownRow[] {
  return (defaultShutdowns as Array<Record<string, string>>).map((row) => ({
    fuzeSiteId: String(row.fuzeSiteId),
    shutdownDate: new Date(row.shutdownDate),
    region: row.region || undefined,
    market: row.market || undefined,
    standAlone: row.standAlone || undefined,
    allMmw: row.allMmw || undefined,
    shutdownFlag: row.shutdownFlag || undefined,
  }));
}

/**
 * Default CNS rollup rows (bundled snapshot). Layout matches the CNS sample workbook filename
 * exported as SAMPLE_CNS_WORKBOOK_FILENAME.
 */
export function getDefaultCnsRollups(): CnsRollupRow[] {
  return (defaultCnsRollups as Array<Record<string, string | number>>).map(
    (row) => ({
      fuzeSiteId: String(row.fuzeSiteId),
      rptDt: new Date(String(row.rptDt)),
      market: row.market != null ? String(row.market) : undefined,
      lteMarketId:
        row.lteMarketId != null ? String(row.lteMarketId) : undefined,
      lteMarketName:
        row.lteMarketName != null ? String(row.lteMarketName) : undefined,
      totalPinCount: Number(row.totalPinCount) || 0,
      nidPinCount: Number(row.nidPinCount) || 0,
      internalPinCount: Number(row.internalPinCount) || 0,
      totalNrbTickets: Number(row.totalNrbTickets) || 0,
      networkNrbCount: Number(row.networkNrbCount) || 0,
      dataRelatedNrbCount: Number(row.dataRelatedNrbCount) || 0,
    })
  );
}
