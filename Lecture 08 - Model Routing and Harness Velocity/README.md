# Lecture 08 - Model Routing and Harness Velocity

> **Stage 1: Build** · **Phase:** 2 · Application Layer & Harness Velocity · **Level:** 🟡 Intermediate
> **Source:** `FDE S01 & S02` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Route requests dynamically between fast (System-1) and deliberative (System-2) models, optimize prompt prefix caching, and accelerate agentic engineering velocity using `AGENTS.md`, `Pi`, `Superpowers`, and SDD/TDD.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 04](../Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/) · [Lecture 06](../Lecture%2006%20-%20Chatbots%20and%20Context/) |
| **Unlocks** | [Lecture 09](../Lecture%2009%20-%20Tool%20Calling/) · [Lecture 14](../Lecture%2014%20-%20Loop%20Engineering%20and%20A2A%20Protocol/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_08_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Fast vs. Deliberative Reasoning Models** | System-1 (GPT-4o-mini, Gemini Flash) vs. System-2 (o1/o3, R1, Claude thinking) latency, cost, and reasoning budgets. |
| **02** | **Dynamic Complexity-Based Model Routing** | Rule-based, classifier-based, and semantic routers; fallback cascades and confidence-based escalation. |
| **03** | **Prompt Prefix Caching & Cost Engineering** | Static prefix ordering, cache breakpoints, TTLs, and input-token cost reduction math. |
| **04** | **AGENTS.md & Repository Context Standards** | Writing machine-readable AGENTS.md files, progressive disclosure, and preventing context bloat. |
| **05** | **Pi Harness & Superpowers Composable Workflows** | Structuring reusable agent skills, plugins, and multi-step engineering workflows. |
| **06** | **Spec-Driven (SDD) & Test-Driven (TDD) Agent Velocity** | Writing specs and failing tests before code generation so agents self-verify deterministically. |
| **07** | **Independent Automated Review & Sandboxed Execution** | Running secondary reviewer agents, linters, and isolated test sandboxes before merging. |

---

## 🛠️ What You Will Build (`code/`)

A TypeScript **Model Router + Harness Velocity Starter** (`code/`): (1) a complexity classifier routing simple queries to fast models and multi-step queries to deliberative models with prompt-cache hit tracking, and (2) an `AGENTS.md` + SDD/TDD harness runner that verifies generated patches against failing unit tests in an isolated sandbox.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 08** complete, verify all of the following:

1. Dynamic router achieves `>= 40%` cost reduction on a mixed 20-query benchmark with zero accuracy drop.
2. `AGENTS.md` + TDD loop automatically rejects a broken patch and iterates until all tests pass.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ✅ |
| Write all chapter notes + `Lecture_08_Complete_Notes.md` in `notes/` | ✅ |
| Update `index.md` with links to every chapter | ✅ |
| Build & test the runnable implementation in `code/` | ✅ |
| Write & pass the completion gate in `Assignment/task.md` | ✅ |

---

## 📁 Layout

```text
Lecture 08 - Model Routing and Harness Velocity/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_08_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [AGENTS.md Open Standard](https://agents.md/)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [OpenAI Reasoning Models Guide](https://platform.openai.com/docs/guides/reasoning)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 08**.
