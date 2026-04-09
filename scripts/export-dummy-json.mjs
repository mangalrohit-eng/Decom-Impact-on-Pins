/**
 * One-off: reads public dummy .xlsx files and writes src/data JSON for client-safe defaults.
 * Run: node scripts/export-dummy-json.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pub = path.join(root, "public");
const outDir = path.join(root, "src", "data");

function parseDateCell(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// —— Decom ——
const decomBuf = fs.readFileSync(
  path.join(pub, "Dummy data - Date of mmWave Shutdowns by Site.xlsx")
);
const decomWb = XLSX.read(decomBuf, { type: "buffer", cellDates: true, raw: false });
const decomAoa = XLSX.utils.sheet_to_json(decomWb.Sheets[decomWb.SheetNames[0]], {
  header: 1,
  defval: null,
  raw: false,
});
const dh = decomAoa[0].map((c) => String(c ?? "").trim());
const idx = (name) => dh.findIndex((h) => h.toLowerCase() === name.toLowerCase());
const iFuze = idx("Fuze Site ID");
const iDate = idx("Date");
const iRegion = idx("region");
const iMarket = idx("market");
const iStand = idx("StandAlon");
const iMMw = idx("ALL MMw");
const iShut = idx("Shutdown");

const shutdowns = [];
for (let r = 1; r < decomAoa.length; r++) {
  const row = decomAoa[r] ?? [];
  const fuze = String(row[iFuze] ?? "").trim();
  const iso = parseDateCell(row[iDate]);
  if (!fuze || !iso) continue;
  shutdowns.push({
    fuzeSiteId: fuze,
    shutdownDate: iso,
    region: iRegion >= 0 ? String(row[iRegion] ?? "").trim() || undefined : undefined,
    market: iMarket >= 0 ? String(row[iMarket] ?? "").trim() || undefined : undefined,
    standAlone: iStand >= 0 ? String(row[iStand] ?? "").trim() || undefined : undefined,
    allMmw: iMMw >= 0 ? String(row[iMMw] ?? "").trim() || undefined : undefined,
    shutdownFlag: iShut >= 0 ? String(row[iShut] ?? "").trim() || undefined : undefined,
  });
}

// —— CNS rollup ——
const cnsBuf = fs.readFileSync(
  path.join(pub, "Dummy data - CNS Pins and NRB Tix Near Decom Sites.xlsx")
);
const cnsWb = XLSX.read(cnsBuf, { type: "buffer", cellDates: true, raw: false });
const cnsAoa = XLSX.utils.sheet_to_json(cnsWb.Sheets[cnsWb.SheetNames[0]], {
  header: 1,
  defval: null,
  raw: false,
});
const ch = cnsAoa[0].map((c) => String(c ?? "").trim());
const cidx = (name) => ch.findIndex((h) => h.replace(/\s+/g, " ").toUpperCase() === name.toUpperCase());
const cf = cidx("FUZE_SITE_ID");
const cr = cidx("RPT_DT");
const cmkt = cidx("MARKET");
const clte = cidx("LTE_MARKET_ID");
const cltn = cidx("LTE_MARKET_NAME");
const ctp = cidx("TOTAL_PIN_COUNT");
const cnid = cidx("NID_PIN_COUNT");
const cint = cidx("INTERNAL_PIN_COUNT");
const ctnrb = cidx("TOTAL_NRB_TICKETS");
const cnnrb = cidx("NETWORK_NRB_COUNT");
const cdnrb = cidx("DATA_RELATED_NRB_COUNT");

const rollups = [];
for (let r = 1; r < cnsAoa.length; r++) {
  const row = cnsAoa[r] ?? [];
  const fuze = String(row[cf] ?? "").trim();
  const iso = parseDateCell(row[cr]);
  if (!fuze || !iso) continue;
  rollups.push({
    fuzeSiteId: fuze,
    rptDt: iso,
    market: cmkt >= 0 ? String(row[cmkt] ?? "").trim() || undefined : undefined,
    lteMarketId: clte >= 0 ? String(row[clte] ?? "").trim() || undefined : undefined,
    lteMarketName: cltn >= 0 ? String(row[cltn] ?? "").trim() || undefined : undefined,
    totalPinCount: ctp >= 0 ? num(row[ctp]) : 0,
    nidPinCount: cnid >= 0 ? num(row[cnid]) : 0,
    internalPinCount: cint >= 0 ? num(row[cint]) : 0,
    totalNrbTickets: ctnrb >= 0 ? num(row[ctnrb]) : 0,
    networkNrbCount: cnnrb >= 0 ? num(row[cnnrb]) : 0,
    dataRelatedNrbCount: cdnrb >= 0 ? num(row[cdnrb]) : 0,
  });
}

// Pair each rollup row with the shutdown row at the same index so default feeds share Fuze IDs
// (workbooks alone use disjoint ID sets; demos need overlap for correlation).
for (let i = 0; i < rollups.length; i++) {
  const s = shutdowns[i % shutdowns.length];
  if (s) rollups[i].fuzeSiteId = s.fuzeSiteId;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "dummy-shutdowns.json"),
  JSON.stringify(shutdowns, null, 0),
  "utf8"
);
fs.writeFileSync(
  path.join(outDir, "dummy-cns-rollups.json"),
  JSON.stringify(rollups, null, 0),
  "utf8"
);

console.log("Wrote", shutdowns.length, "shutdowns,", rollups.length, "rollups");
