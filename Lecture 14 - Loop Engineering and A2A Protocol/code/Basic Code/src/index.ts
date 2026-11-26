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
        // Initial plan uses broken legacy_fetch tool -> triggers stuck detection + pivot
        return [
          { id: "s1", toolName: "legacy_fetch", args: { pr: "42" }, permission: "READ_ONLY", expectedPostCondition: "non-empty diff" },
        ];
      }
      // Pivoted plan switches to reliable git_diff tool
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

