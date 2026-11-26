import { PrefixCacheTracker } from "./cache.js";
import { runSddTddLoop } from "./harness.js";
import { runBenchmark } from "./router.js";

function main(): void {
  const benchmarkOnly = process.argv.includes("--benchmark-only");

  console.log("=== 1. Dynamic Model Router (20-Query Mixed Benchmark) ===");
  const report = runBenchmark();
  console.log(JSON.stringify(report, null, 2));
  console.log(
    `Result: ${report.costSavingsPct}% cost reduction (gate >= 40%), Accuracy: ${report.routedAccuracyPct}% vs ${report.baselineAccuracyPct}% baseline.\n`
  );

  if (benchmarkOnly) return;

  console.log("=== 2. Prompt Prefix Caching (10-Turn Agent Session) ===");
  const staticPrefix = "SYSTEM_PROMPT + SORTED_TOOLS + AGENTS_MD :: ".repeat(120); // > 1024 tokens
  const tracker = new PrefixCacheTracker(3.0);
  const turns = Array.from({ length: 10 }, (_, i) => ({
    staticPrefix,
    staticPrefixTokens: 10_000,
    dynamicSuffix: `Turn ${i + 1} user query and diff`,
    dynamicSuffixTokens: 500,
  }));
  const cacheSummary = tracker.runSession(turns);
  console.log(
    `Uncached: $${cacheSummary.totalUncachedCostUsd} | Cached: $${cacheSummary.totalCachedCostUsd} | Savings: ${cacheSummary.savingsPct}% | Hit Rate: ${cacheSummary.cacheHitRatePct}%\n`
  );

  console.log("=== 3. SDD/TDD + Independent Review Harness Loop ===");
  const harnessResult = runSddTddLoop({
    specPrompt: "Implement calculateDiscount(price, pct) with negative-input validation.",
    verifyRedFirst: () => ({ passed: false, exitCode: 1, stderr: "AssertionError: expected error on negative pct" }),
    generatePatch: (tier) => {
      if (tier === "system1") {
        // Simulated broken System-1 patch (misses negative validation)
        return {
          authorTier: "system1",
          changedFiles: ["src/discount.ts"],
          code: "export function calculateDiscount(p: number, pct: number): number { return p * (1 - pct); }",
          explanation: "Fast initial patch",
        };
      }
      // Escalated System-2 patch fixes validation cleanly
      return {
        authorTier: "system2",
        changedFiles: ["src/discount.ts"],
        code: "export function calculateDiscount(p: number, pct: number): number { if (pct < 0 || pct > 1) throw new RangeError('Invalid pct'); return p * (1 - pct); }",
        explanation: "Added RangeError guard per spec",
      };
    },
    runInSandbox: (patch) => {
      const hasGuard = patch.code.includes("RangeError");
      return hasGuard
        ? { passed: true, exitCode: 0, stderr: "" }
        : { passed: false, exitCode: 1, stderr: "FAIL: calculateDiscount(100, -0.2) did not throw RangeError" };
    },
  });

  console.log(`Harness Status: ${harnessResult.status}`);
  console.log(JSON.stringify(harnessResult.iterations, null, 2));
}

main();

