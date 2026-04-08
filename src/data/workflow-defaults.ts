import type { CnsEventRow, ShutdownRow } from "@/types/decom";

const ENGINEERS: { email: string; name: string }[] = [
  { email: "taylor.chen@network.example.com", name: "Taylor Chen" },
  { email: "jordan.lee@network.example.com", name: "Jordan Lee" },
  { email: "samira.okonkwo@network.example.com", name: "Samira Okonkwo" },
  { email: "marcus.vega@network.example.com", name: "Marcus Vega" },
  { email: "priya.nair@network.example.com", name: "Priya Nair" },
];

/** Sites with elevated post-shutdown signal in the reference extract (often surfaced in analysis). */
const SPIKE_INDICES = new Set([3, 7, 11, 14, 17]);

function ymd(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 14, 0, 0));
}

/**
 * Populated “live-style” feed: many decom rows + rich CNS/NRB history.
 * Upload still replaces the full working set.
 */
export function getDefaultShutdowns(): ShutdownRow[] {
  const rows: ShutdownRow[] = [];
  const year = 2024;
  let m = 3;
  let d = 5;
  for (let i = 1; i <= 22; i++) {
    const eng = ENGINEERS[i % ENGINEERS.length]!;
    d += 2 + (i % 4);
    if (d > 28) {
      d = 4;
      m += 1;
    }
    rows.push({
      fuzeSiteId: `FZ-NAM-${String(i).padStart(3, "0")}`,
      shutdownDate: ymd(year, Math.min(m, 11), Math.min(d, 27)),
      naEngineerEmail: eng.email,
      naEngineerName: eng.name,
    });
  }
  return rows;
}

export function getDefaultCnsEvents(): CnsEventRow[] {
  const shutdowns = getDefaultShutdowns();
  const rows: CnsEventRow[] = [];
  let seq = 1;

  const add = (e: Pick<CnsEventRow, "fuzeSiteId" | "eventDate" | "kind">) => {
    rows.push({
      ...e,
      externalId: `${e.kind}-${String(seq++).padStart(5, "0")}`,
    });
  };

  for (let i = 0; i < shutdowns.length; i++) {
    const s = shutdowns[i]!;
    const idx = i + 1;
    const sd = s.shutdownDate;
    const spike = SPIKE_INDICES.has(idx);

    const preStart = new Date(sd);
    preStart.setUTCDate(preStart.getUTCDate() - 28);

    // Baseline scatter pre-window
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

    // Post window — stronger lift on spike sites
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

  // Cross-market noise + orphan rows (unmatched Fuze)
  for (let k = 0; k < 12; k++) {
    add({
      fuzeSiteId: "FZ-EXT-ORPHAN",
      eventDate: ymd(2024, 5, 3 + k),
      kind: k % 2 === 0 ? "CNS" : "NRB",
    });
  }

  return rows;
}
