/**
 * Runs aggregation + LLM-merge (demo payload) and rule-based analysis on embedded defaults.
 * Usage: npx --yes tsx --tsconfig tsconfig.json scripts/test-analysis-defaults.ts
 */
import { getDefaultCnsRollups, getDefaultShutdowns } from "../src/data/workflow-defaults";
import { aggregateDecomWindows } from "../src/lib/decom/aggregate-windows";
import { analyzeDecomImpact } from "../src/lib/decom/analyze";
import { buildDemoLlmPayload } from "../src/lib/decom/demo-llm-analysis";
import { mergeLlmIntoAggregate } from "../src/lib/decom/merge-llm-analysis";

const TZ = "America/New_York";
const runAt = new Date("2026-06-15T12:00:00.000Z");

function main() {
  const shutdowns = getDefaultShutdowns();
  const rollups = getDefaultCnsRollups();

  console.log("Defaults:", shutdowns.length, "shutdowns,", rollups.length, "rollups");

  const agg = aggregateDecomWindows({
    shutdowns,
    events: [],
    rollups,
    timeZone: TZ,
    preDays: 30,
    postDays: 30,
    analysisRunDate: runAt,
  });

  if (agg.sites.length === 0) {
    console.error("FAIL: aggregate returned zero sites");
    process.exit(1);
  }

  const withSignal = agg.sites.filter((s) => s.preTotal + s.postTotal > 0).length;
  console.log("Aggregate summary:", agg.summary);
  console.log("Sites with any pre+post signal:", withSignal, "/", agg.sites.length);

  const demoPayload = buildDemoLlmPayload(agg);
  const base = { ...agg };
  const merged = mergeLlmIntoAggregate(base, demoPayload, {
    analystNotes: "",
    llmModel: "heuristic-fallback",
    reasoning: "test harness",
  });

  console.log("After merge (demo LLM payload): flaggedCount =", merged.summary.flaggedCount);
  const flagged = merged.sites.filter((s) => s.flagged).slice(0, 5);
  console.log("Sample flagged sites:", flagged.map((s) => ({ id: s.fuzeSiteId, pre: s.preTotal, post: s.postTotal })));

  const rules = analyzeDecomImpact({
    shutdowns,
    events: [],
    rollups,
    timeZone: TZ,
    preDays: 30,
    postDays: 30,
    minPostWhenPrePositive: 3,
    minRatioWhenPrePositive: 2,
    minPostWhenPreZero: 5,
    analysisRunDate: runAt,
  });

  console.log("Rule-based analysis: flaggedCount =", rules.summary.flaggedCount);

  if (withSignal === 0) {
    console.error("FAIL: no site had pre/post totals; defaults may not overlap or dates out of windows");
    process.exit(1);
  }

  if (merged.summary.flaggedCount === 0) {
    console.error("FAIL: demo LLM merge produced zero flagged sites (expected >0 on default feeds)");
    process.exit(1);
  }

  if (rules.summary.flaggedCount === 0) {
    console.error("FAIL: rule-based analysis produced zero flags (expected >0 on default feeds)");
    process.exit(1);
  }

  console.log("OK: analysis pipeline returned results.");
}

main();
