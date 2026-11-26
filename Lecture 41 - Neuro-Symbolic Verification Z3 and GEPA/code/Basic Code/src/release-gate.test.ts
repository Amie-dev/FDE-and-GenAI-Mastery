import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runGepaOptimization } from "./gepa.js";
import { scoreTrajectory } from "./trajectory-eval.js";
import { verifyPlanWithZ3 } from "./z3-verifier.js";

describe("Lecture 41 Release Gate", () => {
  it("Gate 1: Z3 verifier rejects 100% of policy-violating action plans pre-execution", async () => {
    // 1. Missing verifyPolicy before refundOrder
    const missingVerify = await verifyPlanWithZ3({
      goal: "Skip verify",
      steps: [{ tool: "getOrder" }, { tool: "refundOrder", amountUsd: 30 }],
      hasHitlApproval: false,
    });
    assert.equal(missingVerify.sat, false);

    // 2. Refund > $50 without HITL approval
    const missingHitl = await verifyPlanWithZ3({
      goal: "Over $50 without HITL",
      steps: [{ tool: "getOrder" }, { tool: "verifyPolicy" }, { tool: "refundOrder", amountUsd: 75 }],
      hasHitlApproval: false,
    });
    assert.equal(missingHitl.sat, false);

    // 3. Cumulative refund > $100 budget
    const overBudget = await verifyPlanWithZ3({
      goal: "Over $100 cap",
      steps: [{ tool: "verifyPolicy" }, { tool: "refundOrder", amountUsd: 120 }],
      hasHitlApproval: true,
    });
    assert.equal(overBudget.sat, false);

    // 4. Compliant plan passes SAT
    const valid = await verifyPlanWithZ3({
      goal: "Compliant $75 refund",
      steps: [{ tool: "getOrder" }, { tool: "verifyPolicy" }, { tool: "requestHitlApproval" }, { tool: "refundOrder", amountUsd: 75 }],
      hasHitlApproval: true,
    });
    assert.equal(valid.sat, true);
  });

  it("Gate 2: Property-based invariant check across 50 randomized refund amounts", async () => {
    for (let i = 0; i < 50; i++) {
      const amount = i * 5 - 10; // spans negative (-10) to over-budget (235)
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

