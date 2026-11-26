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

