import type { CnsEventRow, CnsFeedKind, CnsRollupRow, EventKind } from "@/types/decom";
import { findColumnIndex } from "./column-map";
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

function parseCountCell(value: unknown): number {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isRollupLayout(headerLabels: string[]): boolean {
  const pinCol = findColumnIndex(headerLabels, [
    "TOTAL_PIN_COUNT",
    "Total Pin Count",
    "TOTAL PINS",
  ]);
  return pinCol >= 0;
}

export type ParseCnsResult = {
  feedKind: CnsFeedKind;
  events: CnsEventRow[];
  rollups: CnsRollupRow[];
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
    return { feedKind: "events", events: [], rollups: [], warnings };
  }

  warnings.push(...table.warnings);

  const labels = table.headerLabels;

  if (isRollupLayout(labels)) {
    const colMarket = findColumnIndex(labels, ["MARKET", "Market"]);
    const colLteId = findColumnIndex(labels, ["LTE_MARKET_ID", "LTE Market ID"]);
    const colLteName = findColumnIndex(labels, ["LTE_MARKET_NAME", "LTE Market Name"]);
    const colPins = findColumnIndex(labels, ["TOTAL_PIN_COUNT", "Total Pin Count"]);
    const colNid = findColumnIndex(labels, ["NID_PIN_COUNT", "NID Pin Count"]);
    const colInt = findColumnIndex(labels, ["INTERNAL_PIN_COUNT", "Internal Pin Count"]);
    const colTnrb = findColumnIndex(labels, ["TOTAL_NRB_TICKETS", "Total NRB Tickets"]);
    const colNnrb = findColumnIndex(labels, ["NETWORK_NRB_COUNT", "Network NRB Count"]);
    const colDnrb = findColumnIndex(labels, ["DATA_RELATED_NRB_COUNT", "Data Related NRB Count"]);

    const rollups: CnsRollupRow[] = [];
    for (let i = 0; i < table.dataRows.length; i++) {
      const dr = table.dataRows[i] ?? [];
      const fuze = String(getCellByIndex(dr, table.colFuze) ?? "").trim();
      const rpt = parseExcelCellToDate(getCellByIndex(dr, table.colDate));
      if (!fuze) {
        if (padRowStrings(dr, table.maxCols).some(Boolean)) {
          warnings.push(
            `CNS row ${table.headerRowIndex + i + 2}: missing Fuze site ID, skipped.`
          );
        }
        continue;
      }
      if (!rpt) {
        warnings.push(
          `CNS row ${table.headerRowIndex + i + 2}: invalid RPT_DT for ${fuze}, skipped.`
        );
        continue;
      }

      const cellStr = (col: number) => {
        if (col < 0) return undefined;
        const v = getCellByIndex(dr, col);
        const t = v != null ? String(v).trim() : "";
        return t || undefined;
      };

      rollups.push({
        fuzeSiteId: fuze,
        rptDt: rpt,
        market: cellStr(colMarket),
        lteMarketId: cellStr(colLteId),
        lteMarketName: cellStr(colLteName),
        totalPinCount: colPins >= 0 ? parseCountCell(getCellByIndex(dr, colPins)) : 0,
        nidPinCount: colNid >= 0 ? parseCountCell(getCellByIndex(dr, colNid)) : 0,
        internalPinCount: colInt >= 0 ? parseCountCell(getCellByIndex(dr, colInt)) : 0,
        totalNrbTickets: colTnrb >= 0 ? parseCountCell(getCellByIndex(dr, colTnrb)) : 0,
        networkNrbCount: colNnrb >= 0 ? parseCountCell(getCellByIndex(dr, colNnrb)) : 0,
        dataRelatedNrbCount: colDnrb >= 0 ? parseCountCell(getCellByIndex(dr, colDnrb)) : 0,
      });
    }

    warnings.push(
      "CNS file detected as warehouse rollup: pre/post totals sum TOTAL_PIN_COUNT and TOTAL_NRB_TICKETS by rows whose RPT_DT falls in each window."
    );
    return { feedKind: "rollup", events: [], rollups, warnings };
  }

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

  return { feedKind: "events", events, rollups: [], warnings };
}
