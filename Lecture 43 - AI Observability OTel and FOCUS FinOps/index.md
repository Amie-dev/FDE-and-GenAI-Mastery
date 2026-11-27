# Lecture 43 — AI Observability (`OpenTelemetry`, `OpenObserve`) & FOCUS FinOps: Course Index

> **Goal:** Instrument AI agents with vendor-neutral OpenTelemetry GenAI semantic conventions, ship traces/metrics/logs to OpenObserve, monitor drift and AI SLOs, enforce tenant/feature hard budgets, and compute Cost per Successful Task in FOCUS-aligned reports.

---

## Chapter Notes (`notes/`)

| # | Chapter | Focus | Link |
| :---: | :--- | :--- | :--- |
| 01 | **OpenTelemetry GenAI Semantic Conventions** | Standard `agent -> model -> tool` spans (`gen_ai.*`), context propagation, and privacy | [01_OpenTelemetry_GenAI_Semantic_Conventions.md](./notes/01_OpenTelemetry_GenAI_Semantic_Conventions.md) |
| 02 | **Shipping Traces, Metrics & Logs to OpenObserve** | OTLP HTTP/gRPC export, 3-signal correlation by `trace_id`, batching & tail sampling | [02_Shipping_Traces_Metrics_and_Logs_to_OpenObserve.md](./notes/02_Shipping_Traces_Metrics_and_Logs_to_OpenObserve.md) |
| 03 | **Continuous Quality Monitoring & Drift Detection** | Input/embedding drift, refusal/format drift, online judge sampling & baselines | [03_Continuous_Quality_Monitoring_and_Drift_Detection.md](./notes/03_Continuous_Quality_Monitoring_and_Drift_Detection.md) |
| 04 | **AI SLOs & Error Budgets** | Task success, `p95` latency/TTFT, hallucination SLIs, and burn-rate alerts | [04_AI_SLOs_and_Error_Budgets.md](./notes/04_AI_SLOs_and_Error_Budgets.md) |
| 05 | **AI FinOps: Cost per Successful Task** | True CPST formula, Failure Tax, token rate cards, and caching optimization | [05_AI_FinOps_Cost_per_Successful_Task.md](./notes/05_AI_FinOps_Cost_per_Successful_Task.md) |
| 06 | **Tenant & Feature Attribution and Hard Budgets** | Mandatory attribution tags, shared GPU allocation, tiered caps & atomic reservations | [06_Tenant_and_Feature_Attribution_and_Hard_Budgets.md](./notes/06_Tenant_and_Feature_Attribution_and_Hard_Budgets.md) |
| 07 | **FOCUS-Aligned Cost Reporting** | FinOps FOCUS v1.0 schema, `EffectiveCost` amortization, and `x_TraceId` lineage | [07_FOCUS_Aligned_Cost_Reporting.md](./notes/07_FOCUS_Aligned_Cost_Reporting.md) |
| — | **Complete Notes** | End-to-end summary & release-gate checklist | [Lecture_43_Complete_Notes.md](./notes/Lecture_43_Complete_Notes.md) |

---

## Code & Implementation (`code/Basic Code/`)

| Artifact | Description | Link |
| :--- | :--- | :--- |
| **Basic Code Project** | OTel-instrumented agent (`agent -> model -> tool`), OpenObserve OTLP formatter, Hard Budget guard, CPST & FOCUS reporter | [code/Basic Code/](./code/Basic%20Code/package.json) |
| **Implementation Guide** | Chapter-by-chapter walkthrough with full source code and explanations | [implementations guide/](./code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) |
| **Assignment & Release Gate** | Acceptance criteria, verification commands, and self-check rubric | [Assignment/task.md](./Assignment/task.md) |

