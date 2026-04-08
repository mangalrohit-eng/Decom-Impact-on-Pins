/** Normalize header for comparison */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
}

export function findColumnIndex(
  headers: string[],
  candidates: string[]
): number {
  const norm = headers.map((h) => normalizeHeader(h));
  for (const c of candidates) {
    const want = normalizeHeader(c);
    const idx = norm.indexOf(want);
    if (idx >= 0) return idx;
  }
  for (const c of candidates) {
    const want = normalizeHeader(c).replace(/ /g, "");
    const idx = norm.findIndex((n) => n.replace(/ /g, "") === want);
    if (idx >= 0) return idx;
  }
  return -1;
}

export const FUZE_ID_HEADERS = [
  "Fuze Site ID",
  "FUZE_SITE_ID",
  "Fuze Site Id",
  "FuzeSiteId",
  "FUZE SITE ID",
  "Fuze ID",
];

export const SHUTDOWN_DATE_HEADERS = [
  "Shutdown Date",
  "Date of mmWave Shutdown",
  "mmWave Shutdown Date",
  "Decom Date",
  "Decommission Date",
  "Shutdown",
];

export const ENGINEER_EMAIL_HEADERS = [
  "NA Engineer Email",
  "Engineer Email",
  "NA Engineer E-mail",
  "Responsible Engineer Email",
];

export const ENGINEER_NAME_HEADERS = [
  "NA Engineer Name",
  "Engineer Name",
  "Responsible Engineer Name",
];

export const EVENT_DATE_HEADERS = [
  "Pin Date",
  "Event Date",
  "Created Date",
  "Ticket Date",
  "Date",
  "Open Date",
];

export const EVENT_TYPE_HEADERS = [
  "Type",
  "Ticket Type",
  "Pin Type",
  "Source",
];

export const EVENT_ID_HEADERS = [
  "Pin ID",
  "Ticket ID",
  "ID",
  "NRB ID",
  "CNS ID",
  "Ticket Number",
];
