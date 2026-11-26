import type { AgentActionPlan, TrajectoryScore } from "./types.js";

/**
 * Evaluates an agent's intermediate tool-call trajectory (not just final output)
 * across tool recall, precondition ordering, argument accuracy, and step efficiency.
 */
export function scoreTrajectory(params: {
  plan: AgentActionPlan;
  requiredTools: string[];
  expectedRefundUsd: number;
  goldenStepsCount: number;
}): TrajectoryScore {
  const calledTools = params.plan.steps.map((s) => s.tool);
  const uniqueCalled = new Set(calledTools);

  const hits = params.requiredTools.filter((t) => uniqueCalled.has(t as AgentActionPlan["steps"][number]["tool"])).length;
  const toolRecall = params.requiredTools.length > 0 ? hits / params.requiredTools.length : 1;

  const verifyIdx = calledTools.indexOf("verifyPolicy");
  const refundIdx = calledTools.indexOf("refundOrder");
  const preconditionOrderOk = refundIdx === -1 || (verifyIdx !== -1 && verifyIdx < refundIdx);

  const refundStep = params.plan.steps.find((s) => s.tool === "refundOrder");
  const argumentAccuracy = refundStep && refundStep.amountUsd === params.expectedRefundUsd ? 1 : 0;

  const actualSteps = Math.max(1, params.plan.steps.length);
  const stepEfficiency = Math.min(1, params.goldenStepsCount / actualSteps);

  const overallScore = Number(
    (
      0.3 * toolRecall +
      0.3 * (preconditionOrderOk ? 1 : 0) +
      0.25 * argumentAccuracy +
      0.15 * stepEfficiency
    ).toFixed(3)
  );

  return {
    toolRecall: Number(toolRecall.toFixed(3)),
    preconditionOrderOk,
    argumentAccuracy,
    stepEfficiency: Number(stepEfficiency.toFixed(3)),
    overallScore,
  };
}

