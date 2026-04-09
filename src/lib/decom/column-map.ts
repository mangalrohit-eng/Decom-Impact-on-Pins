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
  "FUZE ID",
  "FuzeSite ID",
  "Site ID (Fuze)",
  "Fuze Site",
];

export const SHUTDOWN_DATE_HEADERS = [
  "Shutdown Date",
  "Date of mmWave Shutdown",
  "mmWave Shutdown Date",
  "Decom Date",
  "Decommission Date",
  /** Omit bare "Shutdown" — workbooks often use it for a Y/N flag next to a "Date" column. */
  "Actual Shutdown Date",
  "Target Shutdown Date",
  "Off Air Date",
  "Decom Complete Date",
  /** Last-column style headers in mmWave shutdown extracts */
  "Date",
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

/** Score how likely a header cell is the Fuze / site ID column (pick max). */
export function resolveFuzeColumnIndex(cells: string[]): number {
  if (!cells.length) return -1;
  let bestI = -1;
  let bestS = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]?.trim() ?? "";
    if (!c) continue;
    const n = normalizeHeader(c);
    const compact = n.replace(/ /g, "");
    let s = 0;
    if (FUZE_ID_HEADERS.some((h) => normalizeHeader(h) === n)) s = 100;
    else if (compact === "fuszesiteid" || compact === "fuzeid") s = 95;
    else if (n.includes("fuze") && n.includes("site")) s = 85;
    else if (n.includes("fuze") && n.includes("id")) s = 80;
    else if (n === "site id" && cells.filter((x) => x?.trim()).length <= 6) s = 45;
    if (s > bestS) {
      bestS = s;
      bestI = i;
    }
  }
  return bestS >= 45 ? bestI : -1;
}

/** Score shutdown / decom date column. */
export function resolveShutdownDateColumnIndex(cells: string[]): number {
  if (!cells.length) return -1;
  let bestI = -1;
  let bestS = 0;
  const dateLike = (n: string) =>
    n.includes("date") || n.includes("shutdown") || n.includes("decom");

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]?.trim() ?? "";
    if (!c) continue;
    const n = normalizeHeader(c);
    let s = 0;
    if (SHUTDOWN_DATE_HEADERS.some((h) => normalizeHeader(h) === n)) s = 100;
    else if (n.includes("shutdown") && n.includes("date")) s = 92;
    else if (n.includes("mmwave") && n.includes("date")) s = 90;
    else if (n.includes("decom") && n.includes("date")) s = 88;
    else if (n.includes("off air")) s = 85;
    /** Bare "Shutdown" / "SHUTDOWN" is often a yes-no flag, not the calendar column. */
    else if (n === "shutdown") s = 28;
    else if (n.includes("shutdown")) s = 75;
    else if (n.includes("decom") || n.includes("decommission")) s = 72;
    /** Plain "Date" is a strong signal when the sheet has several columns (tabular export). */
    else if (n === "date" && cells.filter((x) => x?.trim()).length >= 3) s = 65;
    else if (n === "date" && cells.filter((x) => x?.trim()).length >= 2) s = 40;
    else if (dateLike(n) && n !== "update date") s = 35;
    if (s > bestS) {
      bestS = s;
      bestI = i;
    }
  }
  if (bestS >= 35) return bestI;

  const dateCols = cells
    .map((c, i) => ({ i, n: normalizeHeader(c ?? "") }))
    .filter(({ n }) => n === "date" || n.endsWith(" date"));
  if (dateCols.length === 1) return dateCols[0].i;

  return -1;
}

/** CNS / NRB event date column. */
export function resolveEventDateColumnIndex(cells: string[]): number {
  if (!cells.length) return -1;
  let bestI = -1;
  let bestS = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]?.trim() ?? "";
    if (!c) continue;
    const n = normalizeHeader(c);
    let s = 0;
    if (EVENT_DATE_HEADERS.some((h) => normalizeHeader(h) === n)) s = 100;
    else if (n.includes("pin") && n.includes("date")) s = 90;
    else if (n.includes("event") && n.includes("date")) s = 88;
    else if (n.includes("ticket") && n.includes("date")) s = 85;
    else if (n.includes("created") && n.includes("date")) s = 82;
    else if (n === "open date") s = 80;
    else if (n === "date") s = 50;
    if (s > bestS) {
      bestS = s;
      bestI = i;
    }
  }
  if (bestS >= 50) return bestI;

  const onlyDate = cells
    .map((c, i) => ({ i, n: normalizeHeader(c ?? "") }))
    .filter(({ n }) => n === "date");
  if (onlyDate.length === 1) return onlyDate[0].i;

  return -1;
}

export function resolveEngineerEmailColumnIndex(cells: string[]): number {
  for (let i = 0; i < cells.length; i++) {
    const single = [cells[i] ?? ""];
    if (findColumnIndex(single, ENGINEER_EMAIL_HEADERS) === 0) return i;
  }
  const norm = cells.map((c) => normalizeHeader(c ?? ""));
  const idx = norm.findIndex(
    (n) =>
      (n.includes("engineer") && n.includes("email")) ||
      (n.includes("na") && n.includes("email"))
  );
  return idx;
}

export function resolveEngineerNameColumnIndex(cells: string[]): number {
  for (let i = 0; i < cells.length; i++) {
    const single = [cells[i] ?? ""];
    if (findColumnIndex(single, ENGINEER_NAME_HEADERS) === 0) return i;
  }
  const norm = cells.map((c) => normalizeHeader(c ?? ""));
  const idx = norm.findIndex(
    (n) =>
      (n.includes("engineer") && n.includes("name")) ||
      (n.includes("na") && n.includes("engineer") && !n.includes("email"))
  );
  return idx;
}

export function resolveEventTypeColumnIndex(cells: string[]): number {
  for (let i = 0; i < cells.length; i++) {
    const single = [cells[i] ?? ""];
    if (findColumnIndex(single, EVENT_TYPE_HEADERS) === 0) return i;
  }
  const norm = cells.map((c) => normalizeHeader(c ?? ""));
  return norm.findIndex((n) => n === "type" || n.includes("ticket type"));
}

export function resolveEventIdColumnIndex(cells: string[]): number {
  for (let i = 0; i < cells.length; i++) {
    const single = [cells[i] ?? ""];
    if (findColumnIndex(single, EVENT_ID_HEADERS) === 0) return i;
  }
  return -1;
}
