# Lecture 30 — Chapter Index

**Enterprise APIs, OpenAPI-to-MCP, Idempotency & Computer-Use Fallback**
Phase 7 · Connectors, Code Mode & Proactive Workflows · 🟠 Advanced · **7 chapters**

> Source of truth for topics, goal, build task and gate: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 30"*.
> Source mapping: `FDE S15`.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Evaluating Enterprise APIs for Agent Readiness** | Noisy payloads, pagination traps, unsafe side effects, and the API $\rightarrow$ Playwright $\rightarrow$ Computer-Use ladder | [01_Evaluating_Enterprise_APIs_for_Agent_Readiness.md](./notes/01_Evaluating_Enterprise_APIs_for_Agent_Readiness.md) |
| 02 | **Automated OpenAPI-to-MCP Adaptation** | Compiling OpenAPI 3.1 into typed MCP tools, dropping `DELETE`, and injecting `idempotencyKey` | [02_Automated_OpenAPI_to_MCP_Adaptation.md](./notes/02_Automated_OpenAPI_to_MCP_Adaptation.md) |
| 03 | **Idempotency Keys & Safe Retries on Mutations** | Preventing double refunds, `Idempotency-Key` replay caching, and `409 Conflict` mismatch checks | [03_Idempotency_Keys_and_Safe_Retries_on_Mutations.md](./notes/03_Idempotency_Keys_and_Safe_Retries_on_Mutations.md) |
| 04 | **Approval-Bound Actions & Connector Governance** | Scoped OAuth credentials, HITL dollar thresholds (`> $50`), rate limits, and audit logs | [04_Approval_Bound_Actions_and_Connector_Governance.md](./notes/04_Approval_Bound_Actions_and_Connector_Governance.md) |
| 05 | **Browser Automation Fallback (Playwright)** | Wrapping legacy UI-only ERP portals as typed, domain-locked, idempotent Playwright MCP tools | [05_Browser_Automation_Fallback_Playwright.md](./notes/05_Browser_Automation_Fallback_Playwright.md) |
| 06 | **Computer-Use Agents & Visual Grounding** | Screenshot-to-coordinate loops for Canvas/Citrix, screen-text injection defence, and HITL pauses | [06_Computer_Use_Agents_and_Visual_Grounding.md](./notes/06_Computer_Use_Agents_and_Visual_Grounding.md) |
| 07 | **Production Connector Testing & Contract Evals** | Offline CI testing for OpenAPI compilation, idempotency replay, `409` conflicts, and Playwright mocks | [07_Production_Connector_Testing_and_Contract_Evals.md](./notes/07_Production_Connector_Testing_and_Contract_Evals.md) |

---

## 📄 Complete notes

A single consolidated document with the executive summary, architecture diagram, cheat sheet, and self-check questions:

👉 **[Lecture_30_Complete_Notes.md](./notes/Lecture_30_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript OpenAPI-to-MCP Adapter + Idempotency Store + Playwright Fallback, release-gate tests, and chapter-wise `implementations guide/`
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — lecture objectives, phase, level, source mapping and checklist
- **[../roadmap-v1.md](../roadmap-v1.md)** — complete topic list, goal, build task and completion gate

---

## 🧭 Reading order

```mermaid
flowchart LR
    C1["01 API Readiness"] --> C2["02 OpenAPI-to-MCP"]
    C2 --> C3["03 Idempotency"]
    C3 --> C4["04 Governance"]
    C4 --> C5["05 Playwright Fallback"]
    C5 --> C6["06 Computer-Use"]
    C6 --> C7["07 Connector Tests"]
    C7 --> N["Complete Notes"]
```

