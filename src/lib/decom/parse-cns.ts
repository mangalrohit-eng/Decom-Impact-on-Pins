import type { CnsEventRow, EventKind } from "@/types/decom";
import { parseExcelCellToDate } from "./parse-dates";
import {
  findCnsTableInWorkbook,
  getCellByIndex,
  padRowStrings,
  workbookToRows,
} from "./xlsx-helpers";

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

  const table = findCnsTableInWorkbook(buffer);
  if (!table) {
    warnings.push(
      "CNS workbook: could not find a header row with Fuze site ID and event/pin date in the first 40 rows of any sheet."
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
    return { events: [], warnings };
  }

  warnings.push(...table.warnings);

  const events: CnsEventRow[] = [];
  for (let i = 0; i < table.dataRows.length; i++) {
    const dr = table.dataRows[i] ?? [];
    const fuze = String(getCellByIndex(dr, table.colFuze) ?? "").trim();
    const ed = parseExcelCellToDate(getCellByIndex(dr, table.colDate));
    if (!fuze) {
      if (padRowStrings(dr, table.maxCols).some(Boolean)) {
        warnings.push(
          `CNS row ${table.headerRowIndex + i + 2}: missing Fuze site ID, skipped.`
        );
      }
      continue;
    }
    if (!ed) {
      warnings.push(
        `CNS row ${table.headerRowIndex + i + 2}: invalid event date for ${fuze}, skipped.`
      );
      continue;
    }

    const kind =
      table.colType >= 0
        ? inferKind(getCellByIndex(dr, table.colType))
        : "CNS";
    let externalId: string | undefined;
    if (table.colId >= 0) {
      const idCell = getCellByIndex(dr, table.colId);
      if (idCell != null && String(idCell).trim()) {
        externalId = String(idCell).trim();
      }
    }

    events.push({
      fuzeSiteId: fuze,
      eventDate: ed,
      kind,
      externalId,
    });
  }

  return { events, warnings };
}
