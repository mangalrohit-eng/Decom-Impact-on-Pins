/**
 * End-to-end smoke test against a running Next.js server.
 * Usage: node scripts/smoke-test.mjs
 * Env: BASE_URL (default http://localhost:3000)
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

async function main() {
  console.log("Smoke test against", BASE);

  // --- GET /api/health ---
  const healthRes = await fetch(`${BASE}/api/health`);
  if (!healthRes.ok) fail(`/api/health status ${healthRes.status}`);
  const health = await healthRes.json();
  if (!health.ok) fail(`/api/health body missing ok: ${JSON.stringify(health)}`);
  console.log("OK  GET /api/health");

  // --- GET / (welcome HTML) ---
  const pageRes = await fetch(BASE + "/");
  if (!pageRes.ok) fail(`GET / status ${pageRes.status}`);
  const html = await pageRes.text();
  if (!html.includes("SignalSpan") && !html.includes("mmWave"))
    fail("GET / HTML missing expected home content");
  if (!html.includes("Capabilities")) fail("GET / missing capabilities section");
  console.log("OK  GET / (home)");

  // --- GET /introduction (redirects to /) ---
  const introRes = await fetch(BASE + "/introduction", { redirect: "manual" });
  if (introRes.status !== 307 && introRes.status !== 308)
    fail(`GET /introduction expected redirect, got ${introRes.status}`);
  console.log("OK  GET /introduction → redirect");

  // --- GET /overview ---
  const ovRes = await fetch(BASE + "/overview");
  if (!ovRes.ok) fail(`GET /overview status ${ovRes.status}`);
  const ovHtml = await ovRes.text();
  if (!ovHtml.includes("SignalSpan") || !ovHtml.includes("Daily CNS"))
    fail("GET /overview missing dashboard content");
  console.log("OK  GET /overview");

  const dashRes = await fetch(BASE + "/dashboard");
  if (!dashRes.ok) fail(`GET /dashboard status ${dashRes.status}`);
  const dashHtml = await dashRes.text();
  if (!dashHtml.includes("SignalSpan") || !dashHtml.includes("Step"))
    fail("GET /dashboard missing analysis shell");
  console.log("OK  GET /dashboard");

  // --- Build minimal .xlsx fixtures ---
  const tmp = os.tmpdir();
  const decomPath = path.join(tmp, "smoke-decom.xlsx");
  const cnsPath = path.join(tmp, "smoke-cns.xlsx");

  // FZ-1001: shutdown 2024-06-15; pre pins in May, many post pins after -> should flag with defaults
  const decomSheet = XLSX.utils.json_to_sheet([
    {
      "Fuze Site ID": "FZ-1001",
      "Shutdown Date": "2024-06-15",
      "NA Engineer Email": "na1@example.com",
      "NA Engineer Name": "Eng One",
    },
    {
      "Fuze Site ID": "FZ-1002",
      "Shutdown Date": "2024-07-01",
      "NA Engineer Email": "na2@example.com",
    },
  ]);
  const wbDecom = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbDecom, decomSheet, "Sheet1");
  XLSX.writeFile(wbDecom, decomPath);

  const cnsRows = [
    // pre-window for FZ-1001: 30d pre starts ~2024-05-16; must be < 2024-06-15
    {
      "Fuze Site ID": "FZ-1001",
      "Pin Date": "2024-05-20",
      Type: "CNS",
      "Pin ID": "P-pre-1",
    },
    {
      "Fuze Site ID": "FZ-1001",
      "Pin Date": "2024-06-10",
      Type: "CNS",
      "Pin ID": "P-pre-2",
    },
    // post-window for FZ-1001
    ...[16, 17, 18, 19, 20, 21].map((d) => ({
      "Fuze Site ID": "FZ-1001",
      "Pin Date": `2024-06-${String(d).padStart(2, "0")}`,
      Type: "CNS",
      "Pin ID": `P-post-${d}`,
    })),
    // NRB sample
    {
      "Fuze Site ID": "FZ-1001",
      "Pin Date": "2024-06-22",
      Type: "NRB",
      "Ticket ID": "NRB-1",
    },
    // unmatched Fuze (not in decom file)
    {
      "Fuze Site ID": "FZ-ORPHAN",
      "Pin Date": "2024-06-01",
      Type: "CNS",
      "Pin ID": "orphan-1",
    },
  ];
  const cnsSheet = XLSX.utils.json_to_sheet(cnsRows);
  const wbCns = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCns, cnsSheet, "Sheet1");
  XLSX.writeFile(wbCns, cnsPath);

  const decomBuf = fs.readFileSync(decomPath);
  const cnsBuf = fs.readFileSync(cnsPath);

  const form = new FormData();
  form.append(
    "decomFile",
    new Blob([decomBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "decom.xlsx"
  );
  form.append(
    "cnsFile",
    new Blob([cnsBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "cns.xlsx"
  );
  form.append("preDays", "30");
  form.append("postDays", "30");
  form.append("minPostWhenPrePositive", "3");
  form.append("minRatioWhenPrePositive", "2");
  form.append("minPostWhenPreZero", "5");
  form.append("timeZone", "America/New_York");

  const analyzeRes = await fetch(`${BASE}/api/decom/analyze`, {
    method: "POST",
    body: form,
  });
  if (!analyzeRes.ok) {
    const errText = await analyzeRes.text();
    fail(`/api/decom/analyze ${analyzeRes.status}: ${errText}`);
  }
  const analysis = await analyzeRes.json();

  if (typeof analysis.summary?.decomSiteCount !== "number")
    fail("analyze: missing summary.decomSiteCount");
  if (analysis.summary.decomSiteCount !== 2)
    fail(`expected 2 decom sites, got ${analysis.summary.decomSiteCount}`);
  if (analysis.summary.unmatchedEventCount !== 1)
    fail(`expected unmatchedEventCount 1, got ${analysis.summary.unmatchedEventCount}`);
  if (!Array.isArray(analysis.sites) || analysis.sites.length !== 2)
    fail("analyze: expected 2 site rows");

  const s1 = analysis.sites.find((s) => s.fuzeSiteId === "FZ-1001");
  if (!s1) fail("missing FZ-1001");
  if (!s1.flagged) fail(`FZ-1001 should be flagged, pre=${s1.preTotal} post=${s1.postTotal}`);
  if (s1.preTotal < 2 || s1.postTotal < 6)
    fail(`unexpected counts FZ-1001 pre=${s1.preTotal} post=${s1.postTotal}`);

  const s2 = analysis.sites.find((s) => s.fuzeSiteId === "FZ-1002");
  if (!s2) fail("missing FZ-1002");
  if (s2.preTotal + s2.postTotal !== 0)
    fail("FZ-1002 should have zero pins in fixture");

  console.log("OK  POST /api/decom/analyze (join, windows, flagging, unmatched)");

  // --- POST simulate-email ---
  const flagged = analysis.sites.filter((s) => s.flagged);
  const simRes = await fetch(`${BASE}/api/decom/simulate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sites: flagged }),
  });
  if (!simRes.ok) {
    const t = await simRes.text();
    fail(`/api/decom/simulate-email ${simRes.status}: ${t}`);
  }
  const sim = await simRes.json();
  if (!Array.isArray(sim.emails) || sim.emails.length < 1)
    fail("simulate-email: expected emails[]");
  const em = sim.emails[0];
  if (!em.subject || !em.textBody || !em.htmlBody)
    fail("simulate-email: missing subject/text/html");
  if (!em.textBody.includes("FZ-1001")) fail("simulate-email body should mention FZ-1001");
  console.log("OK  POST /api/decom/simulate-email");

  console.log("\nAll smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
