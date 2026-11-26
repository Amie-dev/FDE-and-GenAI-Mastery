import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PrefixCacheTracker } from "./cache.js";
import { reviewPatch, runSddTddLoop } from "./harness.js";
import { routeRequest, runBenchmark } from "./router.js";

describe("Lecture 08 Release Gate", () => {
  it("Gate 1: Dynamic router achieves >= 40% cost reduction with zero accuracy drop", () => {
    const report = runBenchmark();
    assert.ok(report.costSavingsPct >= 40, `Expected >= 40% savings, got ${report.costSavingsPct}%`);
    assert.equal(report.routedAccuracyPct, report.baselineAccuracyPct);
    assert.ok(report.routedToS1 >= 10, "Routine queries should route to System-1");
    assert.ok(report.routedToS2 >= 5, "Complex queries should route to System-2");
  });

  it("Gate 2: Router enforces priorAttemptFailed escalation to System-2", () => {
    const first = routeRequest("Format JSON", 200);
    assert.equal(first.tier, "system1");

    const escalated = routeRequest("Format JSON", 200, { priorAttemptFailed: true });
    assert.equal(escalated.tier, "system2");
  });

  it("Gate 3: Prefix cache achieves > 70% savings on static prefixes and detects 1-byte invalidation", () => {
    const tracker = new PrefixCacheTracker(3.0);
    const stablePrefix = "STATIC_AGENTS_MD_AND_TOOLS_".repeat(60);
    const summary = tracker.runSession(
      Array.from({ length: 10 }, (_, i) => ({
        staticPrefix: stablePrefix,
        staticPrefixTokens: 10_000,
        dynamicSuffix: `Turn ${i}`,
        dynamicSuffixTokens: 500,
      }))
    );
    assert.ok(summary.savingsPct > 70, `Expected > 70% cache savings, got ${summary.savingsPct}%`);
    assert.equal(summary.cacheHitRatePct, 90);

    // Injecting a 1-byte mutation in the prefix must cause a cache WRITE (miss)
    const mutated = tracker.recordTurn(11, {
      staticPrefix: stablePrefix + " ",
      staticPrefixTokens: 10_000,
      dynamicSuffix: "Turn 11",
      dynamicSuffixTokens: 500,
    });
    assert.equal(mutated.cacheStatus, "WRITE");
  });

  it("Gate 4: SDD/TDD harness rejects broken System-1 patch, escalates to System-2, and approves", () => {
    const result = runSddTddLoop({
      specPrompt: "Implement safeDivide(a, b) throwing on b === 0.",
      verifyRedFirst: () => ({ passed: false, exitCode: 1, stderr: "FAIL: safeDivide(1, 0) returned Infinity" }),
      generatePatch: (tier) => ({
        authorTier: tier,
        changedFiles: ["src/math.ts"],
        code:
          tier === "system1"
            ? "export const safeDivide = (a: number, b: number) => a / b;"
            : "export const safeDivide = (a: number, b: number) => { if (b === 0) throw new Error('div0'); return a / b; };",
        explanation: `Patch from ${tier}`,
      }),
      runInSandbox: (patch) =>
        patch.code.includes("throw new Error('div0')")
          ? { passed: true, exitCode: 0, stderr: "" }
          : { passed: false, exitCode: 1, stderr: "FAIL: expected Error on b === 0" },
    });

    assert.equal(result.status, "APPROVED");
    assert.equal(result.iterations.length, 2);
    assert.equal(result.iterations[0].dispatchedTier, "system1");
    assert.equal(result.iterations[0].sandboxPassed, false);
    assert.equal(result.iterations[1].dispatchedTier, "system2");
    assert.equal(result.iterations[1].sandboxPassed, true);
    assert.equal(result.iterations[1].reviewApproved, true);
  });

  it("Gate 5: Reward-hacking guard blocks test tampering & independent reviewer rejects `any`", () => {
    const tamperedResult = runSddTddLoop({
      specPrompt: "Fix bug without editing tests.",
      verifyRedFirst: () => ({ passed: false, exitCode: 1, stderr: "FAIL" }),
      generatePatch: () => ({
        authorTier: "system1",
        changedFiles: ["src/release-gate.test.ts"],
        code: "// deleted failing test",
        explanation: "Cheating",
      }),
      runInSandbox: () => ({ passed: true, exitCode: 0, stderr: "" }),
    });
    assert.equal(tamperedResult.status, "BLOCKED_REWARD_HACKING");

    const verdict = reviewPatch({
      authorTier: "system2",
      changedFiles: ["src/foo.ts"],
      code: "export function foo(x: any) { return x; }",
      explanation: "Uses any",
    });
    assert.equal(verdict.approved, false);
    assert.equal(verdict.findings[0].rule, "AGENTS.md#invariants");
  });
});

