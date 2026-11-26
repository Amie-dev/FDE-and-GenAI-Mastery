import test from "node:test";
import assert from "node:assert/strict";
import {
  createOTelHarness,
  runInstrumentedAgentTask,
  toOpenObserveOtlpPayload,
} from "./otel.js";
import {
  calculateModelCostUsd,
  computeCpstMetrics,
  TenantBudgetGuard,
  toFocusRecords,
} from "./finops.js";

test("Release Gate 1: OTel agent -> model -> tool spans link to same traceId with gen_ai & tenant attributes", async () => {
  const harness = createOTelHarness("test-agent");
  try {
    const run = runInstrumentedAgentTask(harness.tracer, {
      agentName: "triage_agent",
      tenantId: "tenant_acme",
      featureId: "support_triage",
      costCenter: "cs-automation",
      modelCalls: [
        {
          provider: "openai",
          model: "gpt-4o",
          inputTokens: 1000,
          cacheReadInputTokens: 500,
          outputTokens: 200,
        },
      ],
      toolCalls: [{ toolName: "kb_search", callId: "call_1", costUsd: 0.0005 }],
      taskSuccess: true,
    });

    const spans = harness.exporter.getFinishedSpans();
    assert.equal(spans.length, 3);

    const modelSpan = spans.find((s) => s.name === "chat gpt-4o");
    const toolSpan = spans.find((s) => s.name === "execute_tool kb_search");
    const rootSpan = spans.find((s) => s.name === "agent.triage_agent");

    assert.ok(rootSpan && modelSpan && toolSpan);
    assert.equal(modelSpan.spanContext().traceId, run.traceId);
    assert.equal(toolSpan.spanContext().traceId, run.traceId);
    assert.equal(modelSpan.parentSpanId, run.rootSpanId);
    assert.equal(toolSpan.parentSpanId, run.rootSpanId);

    assert.equal(rootSpan.attributes["tenant.id"], "tenant_acme");
    assert.equal(rootSpan.attributes["feature.id"], "support_triage");
    assert.equal(rootSpan.attributes["task.success"], true);
    assert.equal(modelSpan.attributes["gen_ai.usage.input_tokens"], 1000);
    assert.equal(modelSpan.attributes["gen_ai.usage.cache_read_input_tokens"], 500);
    assert.equal(toolSpan.attributes["gen_ai.tool.name"], "kb_search");

    const otlp = toOpenObserveOtlpPayload(spans, "test-gateway");
    assert.equal(otlp.resourceSpans[0].scopeSpans[0].spans.length, 3);
  } finally {
    await harness.shutdown();
  }
});

test("Release Gate 2: CPST includes failed runs in numerator and tracks Failure Tax", async () => {
  const harness = createOTelHarness("cpst-test");
  try {
    const okRun = runInstrumentedAgentTask(harness.tracer, {
      agentName: "a1",
      tenantId: "t1",
      featureId: "f1",
      costCenter: "cc1",
      modelCalls: [
        { provider: "openai", model: "gpt-4o", inputTokens: 1_000_000, outputTokens: 0 },
      ],
      toolCalls: [],
      taskSuccess: true,
    });
    const failedRun = runInstrumentedAgentTask(harness.tracer, {
      agentName: "a1",
      tenantId: "t1",
      featureId: "f1",
      costCenter: "cc1",
      modelCalls: [
        { provider: "openai", model: "gpt-4o", inputTokens: 1_000_000, outputTokens: 0 },
      ],
      toolCalls: [],
      taskSuccess: false,
    });

    const cpst = computeCpstMetrics([okRun, failedRun]);
    assert.equal(cpst.successfulTasks, 1);
    assert.equal(cpst.failedTasks, 1);
    assert.equal(cpst.totalSpendUsd, 5.0);
    assert.equal(cpst.cpstUsd, 5.0);
    assert.equal(cpst.failureTaxRatio, 0.5);
  } finally {
    await harness.shutdown();
  }
});

test("Release Gate 3: TenantBudgetGuard warns at >=80% and blocks at 100%", () => {
  const guard = new TenantBudgetGuard();
  guard.setTenantBudget("tenant_x", 10.0);

  const r1 = guard.checkAndReserve("tenant_x", 5.0);
  assert.equal(r1.allowed, true);
  assert.equal(r1.status, "ALLOW");

  const r2 = guard.checkAndReserve("tenant_x", 3.5);
  assert.equal(r2.allowed, true);
  assert.equal(r2.status, "WARN");

  const r3 = guard.checkAndReserve("tenant_x", 2.0);
  assert.equal(r3.allowed, false);
  assert.equal(r3.status, "BLOCK");
});

test("Release Gate 4: FOCUS v1.0 reporter links EffectiveCost to x_TraceId and tenant/feature tags", async () => {
  const harness = createOTelHarness("focus-test");
  try {
    const cost = calculateModelCostUsd("gpt-4o-mini", 1_000_000, 0, 0);
    assert.equal(cost, 0.15);

    const run = runInstrumentedAgentTask(harness.tracer, {
      agentName: "triage",
      tenantId: "tenant_acme",
      featureId: "support_triage",
      costCenter: "cs-ops",
      modelCalls: [
        { provider: "openai", model: "gpt-4o-mini", inputTokens: 1_000_000, outputTokens: 0 },
      ],
      toolCalls: [],
      taskSuccess: true,
    });

    const rows = toFocusRecords(
      [run],
      "acct_1",
      "2026-11-01T00:00:00Z",
      "2026-12-01T00:00:00Z",
      0.9,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ProviderName, "OpenAI");
    assert.equal(rows[0].ServiceCategory, "AI and Machine Learning");
    assert.equal(rows[0].ListCost, 0.15);
    assert.equal(rows[0].EffectiveCost, 0.135);
    assert.equal(rows[0].Tags.tenant_id, "tenant_acme");
    assert.equal(rows[0].Tags.feature_id, "support_triage");
    assert.equal(rows[0].x_TraceId, run.traceId);
    assert.equal(rows[0].x_TaskSuccess, true);
  } finally {
    await harness.shutdown();
  }
});

