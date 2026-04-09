import type { ShutdownRow } from "@/types/decom";
import { findColumnIndex } from "./column-map";
import { parseExcelCellToDate } from "./parse-dates";
import {
  getCellByIndex,
  findShutdownTableInWorkbook,
  padRowStrings,
  workbookToRows,
} from "./xlsx-helpers";

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

  const table = findShutdownTableInWorkbook(buffer);
  if (!table) {
    warnings.push(
      "Decom workbook: could not find a header row with Fuze site ID and shutdown/decom date in the first 40 rows of any sheet."
    );
    const legacy = workbookToRows(buffer);
    if (legacy.headers.length) {
      warnings.push(
        `If your headers are on row 1 only, detected columns: ${legacy.headers.slice(0, 20).join(" | ")}`
      );
    } else {
      warnings.push(
        "No tabular data found. Confirm the file is .xlsx and the table is not entirely empty."
      );
    }
    return { rows: [], warnings };
  }

  warnings.push(...table.warnings);

  const labels = table.headerLabels;
  const colRegion = findColumnIndex(labels, ["region", "REGION"]);
  const colMarket = findColumnIndex(labels, ["market", "MARKET"]);
  const colStand = findColumnIndex(labels, ["StandAlon", "Standalone", "STANDALON"]);
  const colMmw = findColumnIndex(labels, ["ALL MMw", "ALL MMwave", "ALL MMW"]);
  const colShutFlag = findColumnIndex(labels, ["Shutdown", "SHUTDOWN"]);

  const raw: ShutdownRow[] = [];
  for (let i = 0; i < table.dataRows.length; i++) {
    const dr = table.dataRows[i] ?? [];
    const fuze = normalizeFuzeId(getCellByIndex(dr, table.colFuze));
    const sd = parseExcelCellToDate(getCellByIndex(dr, table.colDate));
    if (!fuze) {
      const rowLabel = padRowStrings(dr, table.maxCols).some(Boolean)
        ? `row ${table.headerRowIndex + i + 2}`
        : null;
      if (rowLabel) {
        warnings.push(`Decom ${rowLabel}: missing Fuze site ID, skipped.`);
      }
      continue;
    }
    if (!sd) {
      warnings.push(
        `Decom row ${table.headerRowIndex + i + 2}: invalid shutdown date for ${fuze}, skipped.`
      );
      continue;
    }

    let naEngineerEmail: string | undefined;
    let naEngineerName: string | undefined;
    if (table.colEmail >= 0) {
      const e = getCellByIndex(dr, table.colEmail);
      if (e != null && String(e).trim()) naEngineerEmail = String(e).trim();
    }
    if (table.colName >= 0) {
      const n = getCellByIndex(dr, table.colName);
      if (n != null && String(n).trim()) naEngineerName = String(n).trim();
    }

    const cellStr = (col: number) => {
      if (col < 0) return undefined;
      const v = getCellByIndex(dr, col);
      const t = v != null ? String(v).trim() : "";
      return t || undefined;
    };

    raw.push({
      fuzeSiteId: fuze,
      shutdownDate: sd,
      naEngineerEmail,
      naEngineerName,
      region: cellStr(colRegion),
      market: cellStr(colMarket),
      standAlone: cellStr(colStand),
      allMmw: cellStr(colMmw),
      shutdownFlag: cellStr(colShutFlag),
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
