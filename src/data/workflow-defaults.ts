import type { CnsEventRow, ShutdownRow } from "@/types/decom";

/** Scheduled inventory feed when no file upload is present. */
export const DECOM_FEED_SNAPSHOT = {
  sourceLabel: "Verizon Network Inventory — mmWave decommission feed",
  syncJobId: "VZ-NI-MMV-2847193",
  pulledAtIso: "2026-04-07T23:45:00.000Z",
} as const;

export const CNS_FEED_SNAPSHOT = {
  sourceLabel: "Verizon CNS/NRB — customer signal warehouse",
  syncJobId: "VZ-CNS-EDW-9182044",
  pulledAtIso: "2026-04-08T06:12:00.000Z",
} as const;

const ENGINEERS: { email: string; name: string }[] = [
  { email: "alex.morrison@verizon.com", name: "Alex Morrison" },
  { email: "jordan.patel@verizon.com", name: "Jordan Patel" },
  { email: "samira.okonkwo@verizon.com", name: "Samira Okonkwo" },
  { email: "marcus.vega@verizon.com", name: "Marcus Vega" },
  { email: "priya.nair@verizon.com", name: "Priya Nair" },
];

/** Sites where post-window signal is intentionally elevated (surfaced in analysis). */
const SPIKE_INDICES = new Set([3, 7, 11, 14, 17]);

function ymd(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 14, 0, 0));
}

/**
 * Default decom rows: same logical fields as workbook import
 * (Fuze Site ID, Shutdown Date, NA Engineer Email, NA Engineer Name).
 */
export function getDefaultShutdowns(): ShutdownRow[] {
  const rows: ShutdownRow[] = [];
  const year = 2026;
  let m = 1;
  let d = 8;
  for (let i = 1; i <= 22; i++) {
    const eng = ENGINEERS[i % ENGINEERS.length]!;
    d += 2 + (i % 4);
    if (d > 27) {
      d = 5;
      m += 1;
    }
    const fuzeNum = 880 + i;
    rows.push({
      fuzeSiteId: `FZ-204${String(fuzeNum).padStart(3, "0")}`,
      shutdownDate: ymd(year, Math.min(m, 4), Math.min(d, 26)),
      naEngineerEmail: eng.email,
      naEngineerName: eng.name,
    });
  }
  return rows;
}

/**
 * Default CNS/NRB rows: same logical fields as workbook import
 * (Fuze Site ID, Pin Date, Type, Pin ID).
 */
export function getDefaultCnsEvents(): CnsEventRow[] {
  const shutdowns = getDefaultShutdowns();
  const rows: CnsEventRow[] = [];
  let seq = 1;

  const add = (e: Pick<CnsEventRow, "fuzeSiteId" | "eventDate" | "kind">) => {
    rows.push({
      ...e,
      externalId: `P-${e.fuzeSiteId.replace(/[^0-9]/g, "")}-${String(seq++).padStart(4, "0")}`,
    });
  };

  for (let i = 0; i < shutdowns.length; i++) {
    const s = shutdowns[i]!;
    const idx = i + 1;
    const sd = s.shutdownDate;
    const spike = SPIKE_INDICES.has(idx);

    const preStart = new Date(sd);
    preStart.setUTCDate(preStart.getUTCDate() - 28);

    const preCount = spike ? 3 + (idx % 3) : 1 + (idx % 2);
    for (let p = 0; p < preCount; p++) {
      const t = new Date(preStart);
      t.setUTCDate(t.getUTCDate() + p * 5 + (idx % 4));
      add({
        fuzeSiteId: s.fuzeSiteId,
        eventDate: t,
        kind: p % 3 === 0 ? "NRB" : "CNS",
      });
    }

    const postBurst = spike ? 8 + (idx % 5) : 1 + (idx % 3);
    for (let p = 0; p < postBurst; p++) {
      const t = new Date(sd);
      t.setUTCDate(t.getUTCDate() + 1 + p * 2 + (idx % 2));
      add({
        fuzeSiteId: s.fuzeSiteId,
        eventDate: t,
        kind: p % 4 === 0 ? "NRB" : "CNS",
      });
    }
  }

  for (let k = 0; k < 12; k++) {
    add({
      fuzeSiteId: "FZ-204000",
      eventDate: ymd(2026, 3, 4 + k),
      kind: k % 2 === 0 ? "CNS" : "NRB",
    });
  }

  return rows;
}
