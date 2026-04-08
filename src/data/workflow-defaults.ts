import type { CnsEventRow, ShutdownRow } from "@/types/decom";

/**
 * Built-in sample data so the workflow runs without uploads.
 * DEMO-01 is designed to flag under default thresholds (pre/post window vs June 15, 2024 shutdown).
 */
export function getDefaultShutdowns(): ShutdownRow[] {
  return [
    {
      fuzeSiteId: "FZ-DEMO-01",
      shutdownDate: new Date("2024-06-15T12:00:00.000Z"),
      naEngineerEmail: "na.engineer@example.com",
      naEngineerName: "Taylor Chen",
    },
    {
      fuzeSiteId: "FZ-DEMO-02",
      shutdownDate: new Date("2024-07-01T12:00:00.000Z"),
      naEngineerEmail: "na.backup@example.com",
      naEngineerName: "Jordan Lee",
    },
  ];
}

export function getDefaultCnsEvents(): CnsEventRow[] {
  const rows: CnsEventRow[] = [];

  // FZ-DEMO-01: pre-window pins then post spike → flags with defaults
  rows.push(
    {
      fuzeSiteId: "FZ-DEMO-01",
      eventDate: new Date("2024-05-20T12:00:00.000Z"),
      kind: "CNS",
      externalId: "P-pre-1",
    },
    {
      fuzeSiteId: "FZ-DEMO-01",
      eventDate: new Date("2024-06-10T12:00:00.000Z"),
      kind: "CNS",
      externalId: "P-pre-2",
    }
  );
  for (const d of [16, 17, 18, 19, 20, 21]) {
    rows.push({
      fuzeSiteId: "FZ-DEMO-01",
      eventDate: new Date(`2024-06-${String(d).padStart(2, "0")}T12:00:00.000Z`),
      kind: "CNS",
      externalId: `P-post-${d}`,
    });
  }
  rows.push({
    fuzeSiteId: "FZ-DEMO-01",
    eventDate: new Date("2024-06-22T12:00:00.000Z"),
    kind: "NRB",
    externalId: "NRB-1",
  });

  // FZ-DEMO-02: no pins (stays quiet)
  // Unmatched row (not in decom list) — counted in summary
  rows.push({
    fuzeSiteId: "FZ-ORPHAN-DEMO",
    eventDate: new Date("2024-06-05T12:00:00.000Z"),
    kind: "CNS",
    externalId: "orphan-1",
  });

  return rows;
}
