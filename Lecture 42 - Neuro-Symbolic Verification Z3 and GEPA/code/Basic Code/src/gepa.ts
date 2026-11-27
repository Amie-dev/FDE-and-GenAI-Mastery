import { scoreTrajectory } from "./trajectory-eval.js";
import type { AgentActionPlan, GepaEvalCase, GepaOptimizationReport } from "./types.js";
import { verifyPlanWithZ3 } from "./z3-verifier.js";

/**
 * Simulates a stochastic planner whose trajectory quality depends on prompt instructions.
 */
function simulatePlannerWithPrompt(prompt: string, evalCase: GepaEvalCase): AgentActionPlan {
  const enforcesVerify = prompt.includes("MUST call verifyPolicy before refundOrder");
  const enforcesHitl = prompt.includes("MUST requestHitlApproval when amountUsd > 50");

  const steps: AgentActionPlan["steps"] = [{ tool: "getOrder" }];
  if (enforcesVerify) {
    steps.push({ tool: "verifyPolicy" });
  }
  const needsHitl = evalCase.expectedAmountUsd > 50;
  const hasHitlApproval = needsHitl && enforcesHitl;
  if (hasHitlApproval) {
    steps.push({ tool: "requestHitlApproval" });
  }
  steps.push({ tool: "refundOrder", amountUsd: evalCase.expectedAmountUsd });

  return {
    goal: evalCase.goal,
    steps,
    hasHitlApproval,
  };
}

async function evaluatePrompt(prompt: string, cases: GepaEvalCase[]) {
  let passed = 0;
  const failureTraces: string[] = [];

  for (const c of cases) {
    const plan = simulatePlannerWithPrompt(prompt, c);
    const z3 = await verifyPlanWithZ3(plan);
    const traj = scoreTrajectory({
      plan,
      requiredTools: ["getOrder", "verifyPolicy", "refundOrder"],
      expectedRefundUsd: c.expectedAmountUsd,
      goldenStepsCount: c.expectedAmountUsd > 50 ? 4 : 3,
    });

    if (z3.sat && traj.overallScore >= 0.9) {
      passed += 1;
    } else {
      failureTraces.push(`[${c.id}] Z3=${z3.violatedPolicies.join("; ")} | Traj=${traj.overallScore}`);
    }
  }

  return {
    passRate: Number((passed / cases.length).toFixed(2)),
    failureTraces,
    tokens: Math.ceil(prompt.length / 4),
  };
}

/**
 * GEPA (Reflective Prompt Evolution) loop:
 * Evaluates baseline prompt -> reflects on failure traces -> mutates instructions -> verifies improvement.
 */
export async function runGepaOptimization(cases: GepaEvalCase[]): Promise<GepaOptimizationReport> {
  const baselinePrompt = "You are a helpful support agent. Process customer refunds.";
  const baselineEval = await evaluatePrompt(baselinePrompt, cases);

  const evolvedInstructions: string[] = [];
  if (baselineEval.failureTraces.some((f) => f.includes("PreconditionViolation"))) {
    evolvedInstructions.push("Rule 1: You MUST call verifyPolicy before refundOrder.");
  }
  if (baselineEval.failureTraces.some((f) => f.includes("HitlViolation"))) {
    evolvedInstructions.push("Rule 2: You MUST requestHitlApproval when amountUsd > 50.");
  }

  const optimizedPrompt = `${baselinePrompt}\n${evolvedInstructions.join("\n")}`;
  const optimizedEval = await evaluatePrompt(optimizedPrompt, cases);

  return {
    baselinePassRate: baselineEval.passRate,
    optimizedPassRate: optimizedEval.passRate,
    baselineTokens: baselineEval.tokens,
    optimizedTokens: optimizedEval.tokens,
    evolvedInstructions,
  };
}

