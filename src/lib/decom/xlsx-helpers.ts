import * as XLSX from "xlsx";

export type SheetRow = Record<string, unknown>;

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
