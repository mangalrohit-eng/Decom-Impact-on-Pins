/**
 * Smoke test: POST /api/decom/llm-analyze and assert real LLM path (not demo).
 * Requires Next dev or start with .env.local (OPENAI_API_KEY).
 * Usage: node scripts/smoke-llm-analyze.mjs
 */

const PORTS = [3000, 3001];

async function findBase() {
  for (const port of PORTS) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return `http://127.0.0.1:${port}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function waitForServer(maxMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const b = await findBase();
    if (b) return b;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

const body = JSON.stringify({
  shutdowns: [
    {
      fuzeSiteId: "6165310432",
      shutdownDate: "2026-03-30T04:00:00.000Z",
      region: "SCAL",
      market: "269",
    },
  ],
  events: [
    {
      fuzeSiteId: "6165310432",
      eventDate: "2026-03-28T04:00:00.000Z",
      kind: "CNS",
    },
  ],
  rollups: [
    {
      fuzeSiteId: "6165310432",
      rptDt: "2026-03-27T04:00:00.000Z",
      market: "Central Gulf",
      totalPinCount: 2,
      nidPinCount: 0,
      internalPinCount: 0,
      totalNrbTickets: 0,
    },
  ],
  preDays: 30,
  postDays: 30,
  analystNotes: "Smoke test run.",
});

function parseSse(text) {
  const lines = text.split("\n").filter((l) => l.startsWith("data: "));
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line.slice(6)));
    } catch {
      /* skip */
    }
  }
  return events;
}

async function main() {
  const base = await waitForServer();
  if (!base) {
    console.error(
      "No Next server on ports 3000/3001 (GET /api/health). Run: npm run dev"
    );
    process.exit(1);
  }

  console.log("Using", base);

  const res = await fetch(`${base}/api/decom/llm-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await res.text();
  const events = parseSse(text);
  const done = events.find((e) => e.type === "done");
  const err = events.find((e) => e.type === "error");
  const reasoningChunks = events.filter((e) => e.type === "reasoning").length;

  const report = {
    base,
    httpStatus: res.status,
    sseDataLines: events.length,
    reasoningChunks,
    error: err ?? null,
    demoMode: done?.analysis?.demoMode,
    llmModel: done?.analysis?.appliedConfig?.llmModel,
    siteCount: done?.analysis?.sites?.length,
    flaggedCount: done?.analysis?.summary?.flaggedCount,
    hasLlmOverview: Boolean(done?.analysis?.llmOverview),
    hasLlmReasoning: Boolean(done?.analysis?.llmReasoning),
  };

  console.log(JSON.stringify(report, null, 2));

  const failures = [];
  if (res.status !== 200) failures.push(`HTTP ${res.status}`);
  if (err) failures.push(`SSE error: ${err.message}`);
  if (!done) failures.push("No done event");
  if (done?.analysis?.demoMode !== false)
    failures.push("Expected demoMode false (real LLM path)");
  if (done?.analysis?.appliedConfig?.llmModel === "heuristic-fallback")
    failures.push("Unexpected heuristic-fallback model");
  if (!done?.analysis?.appliedConfig?.llmModel)
    failures.push("Missing llmModel on analysis");
  if (done?.analysis?.sites?.length !== 1)
    failures.push(`Expected 1 site, got ${done?.analysis?.sites?.length}`);

  if (failures.length) {
    console.error("FAILED:", failures.join("; "));
    process.exit(2);
  }

  console.log("OK: LLM route returned merged analysis (non-demo).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
