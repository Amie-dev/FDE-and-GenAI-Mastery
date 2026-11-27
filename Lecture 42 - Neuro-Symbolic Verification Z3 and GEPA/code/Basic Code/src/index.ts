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

