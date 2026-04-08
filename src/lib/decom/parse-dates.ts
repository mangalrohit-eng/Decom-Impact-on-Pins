import { parse, isValid } from "date-fns";

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MMM-yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "yyyy/MM/dd",
];

/** Parse Excel / workbook cell values into a Date (local interpretation). */
export function parseExcelCellToDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1 && value < 100000) {
      const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!Number.isNaN(utc.getTime())) return utc;
    }
  }

  const s = String(value).trim();
  if (!s) return null;

  const isoTry = new Date(s);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;

  for (const fmt of DATE_FORMATS) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const dUs = new Date(y, a - 1, b);
    if (!Number.isNaN(dUs.getTime())) return dUs;
    const dEu = new Date(y, b - 1, a);
    if (!Number.isNaN(dEu.getTime())) return dEu;
  }

  return null;
}
