# Lecture 30 - Enterprise APIs OpenAPI-to-MCP and Computer-Use

> **Stage 2: Connect** · **Phase:** 7 · Connectors, Code Mode & Proactive Workflows · **Level:** 🟠 Advanced
> **Source:** `FDE S15` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Convert legacy enterprise REST/GraphQL APIs into safe, idempotent, approval-bound MCP capabilities—with browser and computer-use fallback when APIs do not exist.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 27](../Lecture%2027%20-%20MCP%20Core/) · [Lecture 28](../Lecture%2028%20-%20MCP%20Resources%20Prompts%20and%20Gateway/) |
| **Unlocks** | [Lecture 31](../Lecture%2031%20-%20Cloudflare%20Code%20Mode%20MCP/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_30_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Evaluating Enterprise APIs for Agent Readiness** | Why raw REST endpoints make poor agent tools (pagination, side effects, noisy payloads). |
| **02** | **Automated OpenAPI-to-MCP Adaptation** | Parsing OpenAPI 3.1 specs into typed, scoped MCP tools with clean descriptions. |
| **03** | **Idempotency Keys & Safe Retries on Mutations** | Preventing duplicate charges, emails, or tickets when agents retry failed calls. |
| **04** | **Approval-Bound Actions & Connector Governance** | Enforcing HITL sign-off and rate limits on state-changing connectors. |
| **05** | **Browser Automation Fallback (Playwright)** | Deterministic and LLM-guided browser flows when legacy systems lack APIs. |
| **06** | **Computer-Use Agents & Visual Grounding** | Screen-coordinate actions, guardrails, and handling dynamic UI failures. |
| **07** | **Production Connector Testing & Contract Evals** | Mocking upstream SaaS APIs and testing connector resilience. |

---

## 🛠️ What You Will Build (`code/`)

An **OpenAPI-to-MCP Adapter + Playwright Fallback Service** (`code/`): converts a sample OpenAPI spec into governed MCP tools with `Idempotency-Key` enforcement on `POST` routes and a Playwright fallback tool for a UI-only legacy form.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 30** complete, verify all of the following:

Replaying the same mutating tool call twice with the same idempotency key executes the underlying state change exactly once.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_30_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 30 - Enterprise APIs OpenAPI-to-MCP and Computer-Use/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_30_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Playwright Browser Automation](https://playwright.dev/)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 30**.
