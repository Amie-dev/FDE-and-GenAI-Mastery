import {
  createOTelHarness,
  runInstrumentedAgentTask,
  toOpenObserveOtlpPayload,
  type TracedAgentRun,
} from "./otel.js";
import {
  computeCpstMetrics,
  TenantBudgetGuard,
  toFocusRecords,
} from "./finops.js";

async function main() {
  const harness = createOTelHarness("support-copilot");
  const budgetGuard = new TenantBudgetGuard();

  budgetGuard.setTenantBudget("tenant_acme", 1.0);
  budgetGuard.setTenantBudget("tenant_startup", 0.012);

  const runs: TracedAgentRun[] = [];

  // 1. tenant_acme: successful run on gpt-4o
  const acmeCheck1 = budgetGuard.checkAndReserve("tenant_acme", 0.02);
  console.log("[Budget]", acmeCheck1.tenantId, acmeCheck1.status);
  const acmeRun1 = runInstrumentedAgentTask(harness.tracer, {
    agentName: "triage_agent",
    tenantId: "tenant_acme",
    featureId: "support_triage",
    costCenter: "cs-automation",
    modelCalls: [
      {
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 2000,
        cacheReadInputTokens: 1000,
        outputTokens: 450,
      },
    ],
    toolCalls: [{ toolName: "kb_vector_search", callId: "call_01", costUsd: 0.0002 }],
    taskSuccess: true,
  });
  budgetGuard.reconcile("tenant_acme", 0.02, acmeRun1.totalCostUsd);
  runs.push(acmeRun1);

  // 2. tenant_acme: failed run (counts in CPST numerator!)
  const acmeCheck2 = budgetGuard.checkAndReserve("tenant_acme", 0.02);
  console.log("[Budget]", acmeCheck2.tenantId, acmeCheck2.status);
  const acmeRun2 = runInstrumentedAgentTask(harness.tracer, {
    agentName: "contract_agent",
    tenantId: "tenant_acme",
    featureId: "contract_review",
    costCenter: "legal-ops",
    modelCalls: [
      {
        provider: "anthropic",
        model: "claude-3-5-sonnet",
        inputTokens: 4000,
        outputTokens: 800,
      },
    ],
    toolCalls: [
      {
        toolName: "clause_validator",
        callId: "call_02",
        succeeds: false,
        errorMessage: "Schema validation failed",
      },
    ],
    taskSuccess: false,
  });
  budgetGuard.reconcile("tenant_acme", 0.02, acmeRun2.totalCostUsd);
  runs.push(acmeRun2);

  // 3. tenant_startup: triggers WARN at >=80% and BLOCK at 100%
  const startupCheck1 = budgetGuard.checkAndReserve("tenant_startup", 0.01);
  console.log("[Budget]", startupCheck1.tenantId, startupCheck1.status);
  if (startupCheck1.allowed) {
    const startupRun = runInstrumentedAgentTask(harness.tracer, {
      agentName: "triage_agent",
      tenantId: "tenant_startup",
      featureId: "support_triage",
      costCenter: "growth",
      modelCalls: [
        {
          provider: "openai",
          model: "gpt-4o",
          inputTokens: 1500,
          outputTokens: 500,
        },
      ],
      toolCalls: [],
      taskSuccess: true,
    });
    budgetGuard.reconcile("tenant_startup", 0.01, startupRun.totalCostUsd);
    runs.push(startupRun);
  }

  const startupCheck2 = budgetGuard.checkAndReserve("tenant_startup", 0.005);
  console.log("[Budget]", startupCheck2.tenantId, startupCheck2.status, "allowed=", startupCheck2.allowed);

  // 4. Inspect OpenObserve OTLP export
  const spans = harness.exporter.getFinishedSpans();
  const otlpPayload = toOpenObserveOtlpPayload(spans, "ai-agent-gateway");
  console.log(
    `\n[OpenObserve OTLP] Exported ${otlpPayload.resourceSpans[0].scopeSpans[0].spans.length} spans across ${runs.length} agent runs.`,
  );

  // 5. Compute CPST & Failure Tax
  const cpst = computeCpstMetrics(runs);
  console.log("\n[CPST Metrics]", JSON.stringify(cpst, null, 2));

  // 6. Generate FOCUS v1.0 Cost Report
  const focusRows = toFocusRecords(
    runs,
    "org_ai_prod_001",
    "2026-11-01T00:00:00Z",
    "2026-12-01T00:00:00Z",
  );
  console.log("\n[FOCUS v1.0 Sample Row]", JSON.stringify(focusRows[0], null, 2));

  await harness.shutdown();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

