import type { A2AClientRegistry, DelegationRequest } from "./a2a.js";
import { BudgetGuard } from "./budgets.js";
import { StuckDetector } from "./stuck-detector.js";
import type {
  LoopBudgetConfig,
  OrchestratorResult,
  PlanStep,
  ToolExecutionResult,
} from "./types.js";

export type ToolExecutor = (step: PlanStep) => Promise<ToolExecutionResult>;

/**
 * Bounded Plan-Act-Verify orchestrator with stuck detection, strategy pivoting,
 * permission checks, and optional parallel A2A delegation.
 */
export async function runPlanActVerify(params: {
  goal: string;
  budgetConfig: LoopBudgetConfig;
  createPlan: (bannedSignatures: Set<string>, pivotCount: number) => PlanStep[];
  executeTool: ToolExecutor;
  a2aRegistry?: A2AClientRegistry;
  a2aDelegations?: DelegationRequest[];
}): Promise<OrchestratorResult> {
  const budget = new BudgetGuard(params.budgetConfig);
  const stuck = new StuckDetector(params.budgetConfig.maxPivots);
  const banned = new Set<string>();
  const completedSteps: string[] = [];

  let plan = params.createPlan(banned, 0);
  let stepIndex = 0;
  let lastError = "";

  while (stepIndex < plan.length) {
    const step = plan[stepIndex];
    const sig = StuckDetector.buildSignature(step.toolName, step.args);

    if (stuck.isBanned(sig)) {
      stepIndex += 1;
      continue;
    }

    const budgetCheck = budget.canStartStep(500);
    if (!budgetCheck.allowed) {
      return {
        status: "BUDGET_EXCEEDED",
        completedSteps,
        pivotsUsed: stuck.getPivotsUsed(),
        budget: budget.snapshot(),
        escalation: {
          reason: "BUDGET_EXCEEDED",
          goal: params.goal,
          completedSteps,
          lastError: budgetCheck.reason,
          suggestedHumanAction: "Increase token/step budget or resume from completedSteps.",
        },
      };
    }

    try {
      budget.checkPermission(step.toolName, step.permission);
    } catch (err) {
      return {
        status: "ESCALATED",
        completedSteps,
        pivotsUsed: stuck.getPivotsUsed(),
        budget: budget.snapshot(),
        escalation: {
          reason: "APPROVAL_REQUIRED",
          goal: params.goal,
          completedSteps,
          lastError: (err as Error).message,
          suggestedHumanAction: `Approve or deny tool '${step.toolName}'.`,
        },
      };
    }

    // ACT + VERIFY
    const res = await params.executeTool(step);
    budget.recordUsage(res.tokensUsed, res.costUsd);

    if (res.ok) {
      completedSteps.push(`${step.id}:${step.toolName}`);
      stuck.observe(step.toolName, step.args, true);
      stepIndex += 1;
      continue;
    }

    lastError = res.error ?? "Unknown tool error";
    const decision = stuck.observe(step.toolName, step.args, false, res.errorClass);

    if (decision.action === "RETRY" || decision.action === "CONTINUE") {
      continue; // re-attempt same step
    }

    if (decision.action === "PIVOT") {
      banned.add(decision.bannedSignature);
      plan = params.createPlan(banned, stuck.getPivotsUsed());
      stepIndex = 0; // restart with pivoted plan
      continue;
    }

    // ESCALATE
    return {
      status: "ESCALATED",
      completedSteps,
      pivotsUsed: stuck.getPivotsUsed(),
      budget: budget.snapshot(),
      escalation: {
        reason: "STUCK_MAX_PIVOTS",
        goal: params.goal,
        completedSteps,
        lastError: `${decision.reason} (${lastError})`,
        suggestedHumanAction: "Inspect banned tool signatures and provide manual override.",
      },
    };
  }

  // Optional parallel A2A delegation phase
  let a2aSummary: OrchestratorResult["a2aSummary"];
  if (params.a2aRegistry && params.a2aDelegations && params.a2aDelegations.length > 0) {
    const syn = await params.a2aRegistry.delegateParallelAndSynthesize(params.a2aDelegations);
    budget.recordUsage(syn.totalTokensUsed, syn.totalCostUsd);
    a2aSummary = {
      overallVerdict: syn.overallVerdict,
      results: syn.results,
      warnings: syn.warnings,
    };
  }

  return {
    status: "COMPLETED",
    completedSteps,
    pivotsUsed: stuck.getPivotsUsed(),
    budget: budget.snapshot(),
    a2aSummary,
  };
}

