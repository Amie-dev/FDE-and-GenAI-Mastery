# Chapter 04: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run the demo (`src/index.ts`) and verify all 4 release-gate suites (`src/release-gate.test.ts`).
> **Notes chapter covered:** 07 (Integrating Symbolic Gates into CI/CD).

---

## 4.1 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { runGepaOptimization } from "./gepa.js";
import { scoreTrajectory } from "./trajectory-eval.js";
import { verifyPlanWithZ3 } from "./z3-verifier.js";

async function main(): Promise<void> {
  console.log("=== 1. Z3 SMT Pre-Execution Policy Verification ===");
  const unsafePlan = {
    goal: "Refund $80 without policy check or HITL",
    steps: [{ tool: "getOrder" as const }, { tool: "refundOrder" as const, amountUsd: 80 }],
    hasHitlApproval: false,
  };
  console.log("Unsafe Plan Z3 Result:", await verifyPlanWithZ3(unsafePlan));

  const safePlan = {
    goal: "Refund $80 with policy check + HITL",
    steps: [
      { tool: "getOrder" as const },
      { tool: "verifyPolicy" as const },
      { tool: "requestHitlApproval" as const },
      { tool: "refundOrder" as const, amountUsd: 80 },
    ],
    hasHitlApproval: true,
  };
  console.log("Safe Plan Z3 Result:", await verifyPlanWithZ3(safePlan));

  console.log("\n=== 2. Trajectory Evaluation ===");
  console.log(
    "Safe Plan Trajectory Score:",
    scoreTrajectory({
      plan: safePlan,
      requiredTools: ["getOrder", "verifyPolicy", "refundOrder"],
      expectedRefundUsd: 80,
      goldenStepsCount: 4,
    })
  );

  console.log("\n=== 3. GEPA Reflective Prompt Evolution ===");
  const gepa = await runGepaOptimization([
    { id: "c1", goal: "Refund $30", expectedAmountUsd: 30 },
    { id: "c2", goal: "Refund $75", expectedAmountUsd: 75 },
    { id: "c3", goal: "Refund $45", expectedAmountUsd: 45 },
    { id: "c4", goal: "Refund $90", expectedAmountUsd: 90 },
  ]);
  console.log("GEPA Report:", gepa);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runGepaOptimization } from "./gepa.js";
import { scoreTrajectory } from "./trajectory-eval.js";
import { verifyPlanWithZ3 } from "./z3-verifier.js";

describe("Lecture 41 Release Gate", () => {
  it("Gate 1: Z3 verifier rejects 100% of policy-violating action plans pre-execution", async () => {
    const missingVerify = await verifyPlanWithZ3({
      goal: "Skip verify",
      steps: [{ tool: "getOrder" }, { tool: "refundOrder", amountUsd: 30 }],
      hasHitlApproval: false,
    });
    assert.equal(missingVerify.sat, false);

    const missingHitl = await verifyPlanWithZ3({
      goal: "Over $50 without HITL",
      steps: [{ tool: "getOrder" }, { tool: "verifyPolicy" }, { tool: "refundOrder", amountUsd: 75 }],
      hasHitlApproval: false,
    });
    assert.equal(missingHitl.sat, false);

    const overBudget = await verifyPlanWithZ3({
      goal: "Over $100 cap",
      steps: [{ tool: "verifyPolicy" }, { tool: "refundOrder", amountUsd: 120 }],
      hasHitlApproval: true,
    });
    assert.equal(overBudget.sat, false);

    const valid = await verifyPlanWithZ3({
      goal: "Compliant $75 refund",
      steps: [{ tool: "getOrder" }, { tool: "verifyPolicy" }, { tool: "requestHitlApproval" }, { tool: "refundOrder", amountUsd: 75 }],
      hasHitlApproval: true,
    });
    assert.equal(valid.sat, true);
  });

  it("Gate 2: Property-based invariant check across 50 randomized refund amounts", async () => {
    for (let i = 0; i < 50; i++) {
      const amount = i * 5 - 10;
      const hasHitl = i % 2 === 0;
      const res = await verifyPlanWithZ3({
        goal: `PBT amount=${amount}`,
        steps: [{ tool: "verifyPolicy" }, { tool: "refundOrder", amountUsd: amount }],
        hasHitlApproval: hasHitl,
      });

      const shouldBeSat = amount >= 0 && amount <= 100 && (amount <= 50 || hasHitl);
      assert.equal(res.sat, shouldBeSat, `Invariant mismatch for amount=${amount}, hitl=${hasHitl}`);
    }
  });

  it("Gate 3: Trajectory evaluator penalizes skipped preconditions even if final tool runs", () => {
    const score = scoreTrajectory({
      plan: {
        goal: "Refund",
        steps: [{ tool: "getOrder" }, { tool: "refundOrder", amountUsd: 45 }],
        hasHitlApproval: false,
      },
      requiredTools: ["getOrder", "verifyPolicy", "refundOrder"],
      expectedRefundUsd: 45,
      goldenStepsCount: 3,
    });
    assert.equal(score.preconditionOrderOk, false);
    assert.ok(score.overallScore < 0.7);
  });

  it("Gate 4: GEPA optimization improves benchmark pass rate measurably over baseline", async () => {
    const report = await runGepaOptimization([
      { id: "c1", goal: "Refund $30", expectedAmountUsd: 30 },
      { id: "c2", goal: "Refund $75", expectedAmountUsd: 75 },
      { id: "c3", goal: "Refund $45", expectedAmountUsd: 45 },
      { id: "c4", goal: "Refund $90", expectedAmountUsd: 90 },
    ]);
    assert.equal(report.baselinePassRate, 0);
    assert.equal(report.optimizedPassRate, 1);
    assert.ok(report.evolvedInstructions.length >= 2);
  });
});
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

