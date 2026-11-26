# Lecture 42 Assignment — AI Observability (`OTel`, `OpenObserve`) & FOCUS FinOps

> **Goal:** Instrument a multi-tenant AI agent using OpenTelemetry GenAI semantic conventions, format OTLP payloads for OpenObserve, enforce tenant hard budgets, and generate FOCUS-aligned cost-per-successful-task reports.

---

## Part A: Conceptual Mastery
1. Explain why `agent -> model -> tool` spans must share a single `traceId` and carry `tenant.id`, `feature.id`, and `task.success`.
2. Why does raw "cost per 1M tokens" mislead engineering and finance teams compared to **Cost per Successful Task (CPST)**?
3. Explain the difference between `ListCost`, `EffectiveCost`, and `BilledCost` in the **FinOps FOCUS v1.0** schema.

---

## Part B: Implementation & Architecture
Review and extend `code/Basic Code/`:
- `src/otel.ts`: Emits `agent.<name>`, `chat <model>`, and `execute_tool <toolName>` spans and builds an OpenObserve OTLP JSON payload.
- `src/finops.ts`: Implements `MODEL_RATE_CARD`, `TenantBudgetGuard` (`ALLOW` / `WARN` / `BLOCK`), `computeCpstMetrics` (with Failure Tax), and `toFocusRecords` (FOCUS v1.0).

---

## Part C: Verification Commands
Run all four checks inside `code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

---

## Part D: Release Gate Rubric (4/4 Must Pass)
- [ ] **Gate 1 (OTel Trace Lineage):** `agent`, `model`, and `tool` spans share the same `traceId`, child spans reference `parentSpanId = rootSpanId`, and `toOpenObserveOtlpPayload` emits valid `resourceSpans`.
- [ ] **Gate 2 (CPST & Failure Tax):** Failed runs are included in `totalSpendUsd` and divided only by `successfulTasks`.
- [ ] **Gate 3 (Tenant Hard Budget):** `TenantBudgetGuard` returns `ALLOW` (<80%), `WARN` (80–99%), and `BLOCK` (>=100%).
- [ ] **Gate 4 (FOCUS v1.0 Attribution):** `toFocusRecords` outputs `ProviderName`, `ServiceCategory = "AI and Machine Learning"`, `EffectiveCost`, `Tags`, and `x_TraceId` linking back to the OTel trace.

