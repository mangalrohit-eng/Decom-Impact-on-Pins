import type { CnsEventRow, EventKind } from "@/types/decom";
import {
  EVENT_DATE_HEADERS,
  EVENT_ID_HEADERS,
  EVENT_TYPE_HEADERS,
  findColumnIndex,
  FUZE_ID_HEADERS,
} from "./column-map";
import { workbookToRows } from "./xlsx-helpers";

function cellToDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(utc.getTime()) ? null : utc;
  }
  const s = String(value).trim();
  if (!s) return null;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function inferKind(typeCell: unknown): EventKind {
  const s = String(typeCell ?? "").toUpperCase();
  if (s.includes("NRB")) return "NRB";
  if (s.includes("CNS")) return "CNS";
  return "CNS";
}

export type ParseCnsResult = {
  events: CnsEventRow[];
  warnings: string[];
};

export function parseCnsBuffer(buffer: Buffer): ParseCnsResult {
  const warnings: string[] = [];
  const { headers, rows: sheetRows } = workbookToRows(buffer);
  if (headers.length === 0) {
    warnings.push("CNS workbook: no rows found.");
    return { events: [], warnings };
  }

  const iFuze = findColumnIndex(headers, FUZE_ID_HEADERS);
  const iDate = findColumnIndex(headers, EVENT_DATE_HEADERS);
  if (iFuze < 0) {
    warnings.push(
      `CNS workbook: could not find Fuze Site ID column. Headers: ${headers.slice(0, 12).join(", ")}`
    );
    return { events: [], warnings };
  }
  if (iDate < 0) {
    warnings.push(
      `CNS workbook: could not find event date column. Headers: ${headers.slice(0, 12).join(", ")}`
    );
    return { events: [], warnings };
  }

  const hFuze = headers[iFuze];
  const hDate = headers[iDate];
  const iType = findColumnIndex(headers, EVENT_TYPE_HEADERS);
  const iId = findColumnIndex(headers, EVENT_ID_HEADERS);
  const hType = iType >= 0 ? headers[iType] : null;
  const hId = iId >= 0 ? headers[iId] : null;

  const events: CnsEventRow[] = [];
  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    const fuze = String(r[hFuze] ?? "").trim();
    const ed = cellToDate(r[hDate]);
    if (!fuze) {
      warnings.push(`CNS row ${i + 2}: missing Fuze Site ID, skipped.`);
      continue;
    }
    if (!ed) {
      warnings.push(`CNS row ${i + 2}: invalid event date for ${fuze}, skipped.`);
      continue;
    }
    const kind = hType ? inferKind(r[hType]) : "CNS";
    const ext =
      hId && r[hId] != null && String(r[hId]).trim()
        ? String(r[hId]).trim()
        : undefined;
    events.push({
      fuzeSiteId: fuze,
      eventDate: ed,
      kind,
      externalId: ext,
    });
  }

  return { events, warnings };
}
