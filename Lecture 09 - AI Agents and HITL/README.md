# Lecture 09 - AI Agents and HITL

> **Phase:** 3 · Agency & Contracts · **Level:** 🟡 Intermediate
> **Source:** `FDE L05 (ch4-7) · GAC D02`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 09 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 09 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ✅ |
| Pass the lecture's completion gate | ☐ |

**Notes status.** All **9 chapter notes** are written in [`notes/`](./notes) (within the 5–10 chapter
limit), each with **mermaid** diagrams, JS/TS **pseudo-code** only (no runnable code), and a closing
*Common mistakes* + *Key takeaways* section. The consolidated
**[Lecture_09_Complete_Notes.md](./notes/Lecture_09_Complete_Notes.md)** adds an executive summary, a master
diagram, a cheat sheet, seven decision tables, 20 misconceptions, a glossary and 20 self-check questions.

| Piece | State |
| :--- | :--- |
| `notes/01…09_*.md` | ✅ 9 chapters |
| `notes/Lecture_09_Complete_Notes.md` | ✅ consolidated revision layer |
| `index.md` | ✅ chapter index with reading paths |
| `code/` (Basic + Production) | 🟡 Basic Code ✅ · Production 🔜 |
| `Assignment/task.md` | ✅ written (9 chapter parts · 172 questions · 48 checks · capstone · gate) |
| `Assignment/answers-template.md` | ✅ 172 answer slots + Parts B–D templates |
| The gate | ☐ describe the blast radius of your agent and the exact control that limits it |

**Code status.** [`code/Basic Code`](./code/Basic%20Code) is a **sandboxed autonomous agent runtime**:
**15 TypeScript files**, **9 endpoints**, a **7-tool registry** across the **three authorization tiers**
(`read` · `write` · `critical`), a **3-role** RBAC layer with **object-level + ABAC** checks, a **`safePath`**
sandbox with two mandatory containment checks and five quotas, a **durable HITL pause/resume** with two-layer
idempotency, a **defensive wrapper** with a 0–100 risk score and an output gate, a per-run **trace + token ledger**,
and a deterministic **offline stub** so every claim is reproducible with **no API key** — plus a
**10-chapter implementation guide** (`00` → `09`).

## 📁 Layout

```text
Lecture 09 - AI Agents and HITL/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index (filled by prompt.md → Block 6)
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # chapter notes, written from the source notes
├── code/              # the rebuilt codebase (Basic Code · Production Code + implementation guides)
└── Assignment/
    ├── task.md        # the lecture assignment (filled by prompt.md → Block 5)
    └── answers-template.md  # the answer sheet to copy to answers.md
```

## 🧠 My notes

Chapter notes live in [`notes/`](./notes) — see the **[chapter index](./index.md)** for the full list
(9 chapters), or read the consolidated **[Lecture_09_Complete_Notes.md](./notes/Lecture_09_Complete_Notes.md)**.

| # | Chapter |
| :---: | :--- |
| 01 | [First Principles of AI Agents & the Agency Spectrum](./notes/01_First_Principles_of_AI_Agents_and_the_Agency_Spectrum.md) |
| 02 | [Agent Architecture: Components & the Request Lifecycle](./notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) |
| 03 | [The Agent Loop: Perceive → Decide → Act & State Machines](./notes/03_The_Agent_Loop_Perceive_Decide_Act_and_State_Machines.md) |
| 04 | [Loop Engineering & Harness Engineering](./notes/04_Loop_Engineering_and_Harness_Engineering.md) |
| 05 | [Workspace Sandboxing & Agent Security](./notes/05_Workspace_Sandboxing_and_Agent_Security.md) |
| 06 | [Building an Autonomous Website-Builder Agent](./notes/06_Building_an_Autonomous_Website_Builder_Agent.md) |
| 07 | [Human-in-the-Loop & the 3-Tier Tool Authorization Matrix](./notes/07_Human_in_the_Loop_and_Tool_Authorization_Tiers.md) |
| 08 | [RBAC, the Defensive Wrapper & Platform Guardrails](./notes/08_RBAC_Defensive_Wrapper_and_Platform_Guardrails.md) |
| 09 | [Enterprise Agent Patterns, Failure Modes & the 25 Cardinal Principles](./notes/09_Enterprise_Agent_Patterns_Failure_Modes_and_the_25_Principles.md) |

## 🔗 Source references

`FDE L05 (ch4-7) · GAC D02` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.

- `Forward-Deployed-Engineer/Lecture 05/notes/04…07`
  (`04_Agency_Spectrum…` · `05_Workspace_Sandboxing…` · `06_Building_an_Autonomous_Website_Builder_Agent.md` ·
  `07_Human_In_The_Loop…`)
- `gen-ai-cohort/week01/learning/day02/notes/05 agent-architecture-and-loops.md`
- `gen-ai-cohort/week02/learning/day03/notes/01-ai-agent-architecture.md`
- `gen-ai-cohort/week02/learning/day03/notes/3.1/3.2-Defensive Wrapper.md`
- `gen-ai-cohort/week02/learning/day03/notes/3.1/3.3-Role-Based Access Control (RBAC) + Platform-Level Guardrails.md`

