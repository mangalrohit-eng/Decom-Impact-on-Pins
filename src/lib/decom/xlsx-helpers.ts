import * as XLSX from "xlsx";
import {
  resolveEngineerEmailColumnIndex,
  resolveEngineerNameColumnIndex,
  resolveEventDateColumnIndex,
  resolveEventIdColumnIndex,
  resolveEventTypeColumnIndex,
  resolveFuzeColumnIndex,
  resolveShutdownDateColumnIndex,
} from "./column-map";

export type SheetRow = Record<string, unknown>;

export function rowMaxLen(aoa: unknown[][]): number {
  return aoa.reduce((m, r) => Math.max(m, (r ?? []).length), 0);
}

export function padRowStrings(row: unknown[], len: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(String(row[i] ?? "").trim());
  }
  return out;
}

export function getCellByIndex(row: unknown[], idx: number): unknown {
  if (idx < 0) return null;
  const r = row ?? [];
  return idx < r.length ? r[idx] : null;
}

/** Legacy: first row = headers (fails if title row exists above headers). */
export function workbookToRows(buffer: Buffer): {
  headers: string[];
  rows: SheetRow[];
} {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    defval: null,
    raw: false,
  });
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = Object.keys(data[0] ?? {}).filter(
    (k) => k != null && String(k).trim() !== ""
  );
  return { headers, rows: data };
}

export function findShutdownTableInWorkbook(buffer: Buffer): {
  sheetName: string;
  headerRowIndex: number;
  colFuze: number;
  colDate: number;
  colEmail: number;
  colName: number;
  maxCols: number;
  dataRows: unknown[][];
  warnings: string[];
} | null {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const warnings: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: false,
    });
    if (!aoa.length) continue;

    const maxC = rowMaxLen(aoa);

    for (let r = 0; r < Math.min(40, aoa.length); r++) {
      const row = padRowStrings(aoa[r] ?? [], maxC);
      const colFuze = resolveFuzeColumnIndex(row);
      const colDate = resolveShutdownDateColumnIndex(row);
      if (colFuze < 0 || colDate < 0 || colFuze === colDate) continue;

      const colEmail = resolveEngineerEmailColumnIndex(row);
      const colName = resolveEngineerNameColumnIndex(row);

      warnings.push(
        `Decom: using sheet "${sheetName}", header row ${r + 1} (columns: Fuze #${colFuze + 1}, shutdown date #${colDate + 1}).`
      );

      return {
        sheetName,
        headerRowIndex: r,
        colFuze,
        colDate,
        colEmail,
        colName,
        maxCols: maxC,
        dataRows: aoa.slice(r + 1),
        warnings,
      };
    }
  }

  return null;
}

export function findCnsTableInWorkbook(buffer: Buffer): {
  sheetName: string;
  headerRowIndex: number;
  colFuze: number;
  colDate: number;
  colType: number;
  colId: number;
  maxCols: number;
  dataRows: unknown[][];
  warnings: string[];
} | null {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const warnings: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: false,
    });
    if (!aoa.length) continue;

    const maxC = rowMaxLen(aoa);

    for (let r = 0; r < Math.min(40, aoa.length); r++) {
      const row = padRowStrings(aoa[r] ?? [], maxC);
      const colFuze = resolveFuzeColumnIndex(row);
      const colDate = resolveEventDateColumnIndex(row);
      if (colFuze < 0 || colDate < 0 || colFuze === colDate) continue;

      const colType = resolveEventTypeColumnIndex(row);
      const colId = resolveEventIdColumnIndex(row);

      warnings.push(
        `CNS: using sheet "${sheetName}", header row ${r + 1} (columns: Fuze #${colFuze + 1}, event date #${colDate + 1}).`
      );

      return {
        sheetName,
        headerRowIndex: r,
        colFuze,
        colDate,
        colType,
        colId,
        maxCols: maxC,
        dataRows: aoa.slice(r + 1),
        warnings,
      };
    }
  }

  return null;
}
