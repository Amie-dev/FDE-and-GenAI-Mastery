# Chapter 05: Plan-Act-Verify Orchestrator, Demo & Release Gate Tests

> **Chapter goal:** wire all components together in `src/orchestrator.ts`, run the end-to-end demo (`src/index.ts`), and verify the 5 release gates (`src/release-gate.test.ts`).
> **Notes chapters covered:** 01–07.

---

## 5.1 Full code: `src/orchestrator.ts`

File path: `code/Basic Code/src/orchestrator.ts`

```ts
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
      continue;
    }

    if (decision.action === "PIVOT") {
      banned.add(decision.bannedSignature);
      plan = params.createPlan(banned, stuck.getPivotsUsed());
      stepIndex = 0;
      continue;
    }

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
```

### Explanation
- **Pre-Act Gates:** Checks `stuck.isBanned(sig)`, `budget.canStartStep()`, and `budget.checkPermission()` before every tool execution.
- **Pivot Loop:** When `StuckDetector` emits `PIVOT`, the orchestrator bans the failing signature, regenerates the plan via `createPlan(banned, pivotsUsed)`, and resets `stepIndex = 0`.
- **A2A Budget Roll-up:** Parallel A2A delegation tokens and cost are added to the parent `BudgetGuard` via `budget.recordUsage()`.

---

## 5.2 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { A2AClientRegistry } from "./a2a.js";
import { runPlanActVerify } from "./orchestrator.js";
import { ProactiveTriggerGate } from "./triggers.js";
import type { PlanStep } from "./types.js";

async function main(): Promise<void> {
  console.log("=== 1. Proactive Trigger Gate ($0 Pre-Flight + Idempotency) ===");
  const gate = new ProactiveTriggerGate(60_000);
  console.log("Idle tick:", gate.shouldTrigger({ triggerType: "heartbeat", entityId: "pr-42", eventVersion: "v1", hasActionableDelta: false }));
  console.log("Active event:", gate.shouldTrigger({ triggerType: "webhook", entityId: "pr-42", eventVersion: "v2", hasActionableDelta: true }));
  console.log("Duplicate event:", gate.shouldTrigger({ triggerType: "webhook", entityId: "pr-42", eventVersion: "v2", hasActionableDelta: true }));

  console.log("\n=== 2. A2A Registry & Parallel Delegation ===");
  const a2a = new A2AClientRegistry();
  a2a.registerPeer(
    {
      name: "SecurityAuditAgent",
      url: "https://agents.internal/security",
      version: "1.0.0",
      skills: [{ id: "cve-scan", name: "CVE Scan", tags: ["security"] }],
    },
    async () => ({ verdict: "APPROVE", summary: "Zero CVEs or leaked secrets.", tokensUsed: 850, costUsd: 0.0025 })
  );
  a2a.registerPeer(
    {
      name: "FinOpsCostAgent",
      url: "https://agents.internal/finops",
      version: "1.0.0",
      skills: [{ id: "cost-check", name: "Cost Check", tags: ["finops"] }],
    },
    async () => ({ verdict: "APPROVE", summary: "Projected monthly spend within budget.", tokensUsed: 420, costUsd: 0.0008 })
  );

  console.log("\n=== 3. Plan-Act-Verify with Stuck Detection & Pivot ===");
  const result = await runPlanActVerify({
    goal: "Fetch PR diff, run tests, and obtain A2A specialist sign-off.",
    budgetConfig: {
      maxSteps: 12,
      maxTokens: 10_000,
      maxCostUsd: 0.50,
      maxDurationMs: 10_000,
      maxPivots: 2,
    },
    createPlan: (_banned, pivotCount): PlanStep[] => {
      if (pivotCount === 0) {
        return [
          { id: "s1", toolName: "legacy_fetch", args: { pr: "42" }, permission: "READ_ONLY", expectedPostCondition: "non-empty diff" },
        ];
      }
      return [
        { id: "s1_pivoted", toolName: "git_diff", args: { pr: "42" }, permission: "READ_ONLY", expectedPostCondition: "non-empty diff" },
      ];
    },
    executeTool: async (step) => {
      if (step.toolName === "legacy_fetch") {
        return { ok: false, error: "400 Bad Request: endpoint deprecated", errorClass: "structural", tokensUsed: 400, costUsd: 0.0012 };
      }
      return { ok: true, output: "diff --git a/app.ts b/app.ts", tokensUsed: 350, costUsd: 0.001 };
    },
    a2aRegistry: a2a,
    a2aDelegations: [
      { requiredTag: "security", payload: "PR #42 diff", required: true, timeoutMs: 2000 },
      { requiredTag: "finops", payload: "PR #42 diff", required: false, timeoutMs: 2000 },
    ],
  });

  console.log(JSON.stringify(result, null, 2));
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
import { A2AClientRegistry } from "./a2a.js";
import { runPlanActVerify } from "./orchestrator.js";
import { ProactiveTriggerGate } from "./triggers.js";
import type { PlanStep } from "./types.js";

describe("Lecture 14 Release Gate", () => {
  it("Gate 1: Injected infinite tool-failure loop is detected <= 3 iterations and pivots to recovery", async () => {
    const result = await runPlanActVerify({
      goal: "Recover from broken tool by pivoting.",
      budgetConfig: { maxSteps: 10, maxTokens: 5000, maxCostUsd: 0.2, maxDurationMs: 5000, maxPivots: 2 },
      createPlan: (_banned, pivotCount): PlanStep[] =>
        pivotCount === 0
          ? [{ id: "s1", toolName: "broken_tool", args: { id: "1" }, permission: "READ_ONLY", expectedPostCondition: "ok" }]
          : [{ id: "s1_alt", toolName: "healthy_tool", args: { id: "1" }, permission: "READ_ONLY", expectedPostCondition: "ok" }],
      executeTool: async (step) =>
        step.toolName === "broken_tool"
          ? { ok: false, error: "400 Bad Request", errorClass: "structural", tokensUsed: 300, costUsd: 0.001 }
          : { ok: true, output: "recovered", tokensUsed: 250, costUsd: 0.001 },
    });

    assert.equal(result.status, "COMPLETED");
    assert.equal(result.pivotsUsed, 1);
    assert.ok(result.budget.stepsUsed <= 4, `Expected <= 4 steps before recovery, got ${result.budget.stepsUsed}`);
    assert.ok(result.budget.tokensUsed <= 5000);
  });

  it("Gate 2: Unrecoverable infinite failure escalates after maxPivots without blowing token budget", async () => {
    const result = await runPlanActVerify({
      goal: "Always-failing tool test.",
      budgetConfig: { maxSteps: 20, maxTokens: 4000, maxCostUsd: 0.5, maxDurationMs: 5000, maxPivots: 1 },
      createPlan: (_banned, pivotCount): PlanStep[] => [
        { id: `s_${pivotCount}`, toolName: `fail_${pivotCount}`, args: { x: "1" }, permission: "READ_ONLY", expectedPostCondition: "ok" },
      ],
      executeTool: async () => ({
        ok: false,
        error: "500 Structural Failure",
        errorClass: "structural",
        tokensUsed: 400,
        costUsd: 0.002,
      }),
    });

    assert.equal(result.status, "ESCALATED");
    assert.equal(result.escalation?.reason, "STUCK_MAX_PIVOTS");
    assert.ok(result.budget.tokensUsed <= 4000);
  });

  it("Gate 3: Hard token budget cap halts loop before overspending", async () => {
    const result = await runPlanActVerify({
      goal: "Exceed tight token budget.",
      budgetConfig: { maxSteps: 10, maxTokens: 600, maxCostUsd: 0.5, maxDurationMs: 5000, maxPivots: 2 },
      createPlan: (): PlanStep[] => [
        { id: "s1", toolName: "read", args: { a: "1" }, permission: "READ_ONLY", expectedPostCondition: "ok" },
        { id: "s2", toolName: "read", args: { a: "2" }, permission: "READ_ONLY", expectedPostCondition: "ok" },
      ],
      executeTool: async () => ({ ok: true, output: "ok", tokensUsed: 500, costUsd: 0.001 }),
    });

    assert.equal(result.status, "BUDGET_EXCEEDED");
    assert.ok(result.budget.tokensUsed <= 600);
  });

  it("Gate 4: Proactive trigger gate enforces $0 pre-flight, idempotency, and cooldown", () => {
    const gate = new ProactiveTriggerGate(10_000);
    const idle = gate.shouldTrigger({ triggerType: "heartbeat", entityId: "svc-1", eventVersion: "v1", hasActionableDelta: false, nowMs: 1000 });
    assert.equal(idle.run, false);

    const first = gate.shouldTrigger({ triggerType: "webhook", entityId: "svc-1", eventVersion: "v2", hasActionableDelta: true, nowMs: 2000 });
    assert.equal(first.run, true);

    const dup = gate.shouldTrigger({ triggerType: "webhook", entityId: "svc-1", eventVersion: "v2", hasActionableDelta: true, nowMs: 3000 });
    assert.equal(dup.run, false);
  });

  it("Gate 5: A2A parallel delegation handles partial timeout & enforces veto precedence", async () => {
    const a2a = new A2AClientRegistry();
    a2a.registerPeer(
      { name: "SecAgent", url: "http://sec", version: "1.0", skills: [{ id: "s", name: "Sec", tags: ["sec"] }] },
      async () => ({ verdict: "REJECT", summary: "Hardcoded secret found", tokensUsed: 200, costUsd: 0.001 })
    );
    a2a.registerPeer(
      { name: "SlowDocsAgent", url: "http://docs", version: "1.0", skills: [{ id: "d", name: "Docs", tags: ["docs"] }] },
      async () => new Promise((resolve) => setTimeout(() => resolve({ verdict: "APPROVE", summary: "ok", tokensUsed: 100, costUsd: 0.001 }), 200))
    );

    const syn = await a2a.delegateParallelAndSynthesize([
      { requiredTag: "sec", payload: "diff", required: true, timeoutMs: 500 },
      { requiredTag: "docs", payload: "diff", required: false, timeoutMs: 30 },
    ]);

    assert.equal(syn.overallVerdict, "REJECT");
    assert.equal(syn.results[1].state, "failed");
    assert.ok(syn.warnings.length >= 1);
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

