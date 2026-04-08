import type { ShutdownRow } from "@/types/decom";
import {
  ENGINEER_EMAIL_HEADERS,
  ENGINEER_NAME_HEADERS,
  findColumnIndex,
  FUZE_ID_HEADERS,
  SHUTDOWN_DATE_HEADERS,
} from "./column-map";
import { workbookToRows } from "./xlsx-helpers";

function cellToDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    // Excel serial — approximate via xlsx often already converted with cellDates
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(utc.getTime()) ? null : utc;
  }
  const s = String(value).trim();
  if (!s) return null;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function normalizeFuzeId(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export type ParseShutdownsResult = {
  rows: ShutdownRow[];
  warnings: string[];
};

export function parseShutdownsBuffer(buffer: Buffer): ParseShutdownsResult {
  const warnings: string[] = [];
  const { headers, rows: sheetRows } = workbookToRows(buffer);
  if (headers.length === 0) {
    warnings.push("Decom workbook: no rows found.");
    return { rows: [], warnings };
  }

  const iFuze = findColumnIndex(headers, FUZE_ID_HEADERS);
  const iDate = findColumnIndex(headers, SHUTDOWN_DATE_HEADERS);
  if (iFuze < 0) {
    warnings.push(
      `Decom workbook: could not find Fuze Site ID column. Headers: ${headers.slice(0, 12).join(", ")}`
    );
    return { rows: [], warnings };
  }
  if (iDate < 0) {
    warnings.push(
      `Decom workbook: could not find shutdown date column. Headers: ${headers.slice(0, 12).join(", ")}`
    );
    return { rows: [], warnings };
  }

  const hFuze = headers[iFuze];
  const hDate = headers[iDate];
  const iEmail = findColumnIndex(headers, ENGINEER_EMAIL_HEADERS);
  const iName = findColumnIndex(headers, ENGINEER_NAME_HEADERS);
  const hEmail = iEmail >= 0 ? headers[iEmail] : null;
  const hName = iName >= 0 ? headers[iName] : null;

  const raw: ShutdownRow[] = [];
  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    const fuze = normalizeFuzeId(r[hFuze]);
    const sd = cellToDate(r[hDate]);
    if (!fuze) {
      warnings.push(`Decom row ${i + 2}: missing Fuze Site ID, skipped.`);
      continue;
    }
    if (!sd) {
      warnings.push(`Decom row ${i + 2}: invalid shutdown date for ${fuze}, skipped.`);
      continue;
    }
    const emailRaw = hEmail ? r[hEmail] : undefined;
    const nameRaw = hName ? r[hName] : undefined;
    raw.push({
      fuzeSiteId: fuze,
      shutdownDate: sd,
      naEngineerEmail:
        emailRaw != null && String(emailRaw).trim()
          ? String(emailRaw).trim()
          : undefined,
      naEngineerName:
        nameRaw != null && String(nameRaw).trim()
          ? String(nameRaw).trim()
          : undefined,
    });
  }

  const byFuze = new Map<string, ShutdownRow[]>();
  for (const row of raw) {
    const list = byFuze.get(row.fuzeSiteId) ?? [];
    list.push(row);
    byFuze.set(row.fuzeSiteId, list);
  }

  const rows: ShutdownRow[] = [];
  for (const [fuze, list] of byFuze) {
    if (list.length > 1) {
      warnings.push(
        `Decom: Fuze Site ID ${fuze} appears ${list.length} times; using latest shutdown date.`
      );
    }
    const latest = list.reduce((a, b) =>
      a.shutdownDate.getTime() >= b.shutdownDate.getTime() ? a : b
    );
    rows.push(latest);
  }

  return { rows, warnings };
}
