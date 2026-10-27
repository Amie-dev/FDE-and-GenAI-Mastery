# Lecture 08 - Tool Calling

> **Phase:** 3 · Agency & Contracts · **Level:** 🟡 Intermediate
> **Source:** `FDE L05 (ch1-3) · GAC D03`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 08 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 08 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ☐ |
| Pass the lecture's completion gate | ☐ |

**Notes status.** All **8 chapter notes** are written in [`notes/`](./notes) (within the 5–10 chapter
limit), each with **mermaid** diagrams, JS/TS **pseudo-code** only (no runnable code), and a closing
*Common mistakes* + *Key takeaways* section. The consolidated
**[Lecture_08_Complete_Notes.md](./notes/Lecture_08_Complete_Notes.md)** adds an executive summary, a master
diagram, a cheat sheet, decision tables, 20 misconceptions, a glossary and 20 self-check questions.

| Piece | State |
| :--- | :--- |
| `notes/01…08_*.md` | ✅ 8 chapters |
| `notes/Lecture_08_Complete_Notes.md` | ✅ consolidated revision layer |
| `index.md` | ✅ chapter index with reading paths |
| `code/` (Basic + Production) | 🔜 to build |
| `Assignment/task.md` | 🔜 to write |
| The gate | ☐ show a 3-hop tool chain and point at the exact message that caused each hop |

## 📁 Layout

```text
Lecture 08 - Tool Calling/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index (filled by prompt.md → Block 6)
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # chapter notes, written from the source notes
├── code/              # the rebuilt codebase (Basic Code · Production Code + implementation guides)
└── Assignment/
    └── task.md        # the lecture assignment (filled by prompt.md → Block 5)
```

## 🧠 My notes

Chapter notes live in [`notes/`](./notes) — see the **[chapter index](./index.md)** for the full list
(8 chapters), or read the consolidated **[Lecture_08_Complete_Notes.md](./notes/Lecture_08_Complete_Notes.md)**.

| # | Chapter |
| :---: | :--- |
| 01 | [From Token Prediction to Tool Augmentation](./notes/01_From_Token_Prediction_to_Tool_Augmentation.md) |
| 02 | [Tool Contracts: JSON Schema, OpenAPI & Parameter Typing](./notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) |
| 03 | [The 5-Step Wire Protocol & Double-Turn Tool Calling](./notes/03_The_Five_Step_Wire_Protocol_and_Double_Turn_Calling.md) |
| 04 | [Tool Taxonomy: Deterministic, Informative & Action Tools](./notes/04_Tool_Taxonomy_Deterministic_and_Live_Information_Tools.md) |
| 05 | [Multi-Step Chaining & the ReAct Execution Loop](./notes/05_Multi_Step_Chaining_and_the_ReAct_Execution_Loop.md) |
| 06 | [Error Handling, Self-Healing & Result Re-injection](./notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) |
| 07 | [Routing, `tool_choice` & Testing Tool Selection](./notes/07_Routing_Tool_Choice_and_Testing_Tool_Selection.md) |
| 08 | [Security, Permissions & the Token Economy](./notes/08_Security_Permissions_and_the_Token_Economy.md) |

## 🔗 Source references

`FDE L05 (ch1-3) · GAC D03` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.

- `Forward-Deployed-Engineer/Lecture 05/notes/01_From_Token_Prediction_to_Tool_Augmentation.md`
- `Forward-Deployed-Engineer/Lecture 05/notes/02_The_Tool_Calling_Protocol_and_Wire_Architecture.md`
- `Forward-Deployed-Engineer/Lecture 05/notes/03_Multi_Step_Tool_Chaining_and_Execution_Loops.md`
- `gen-ai-cohort/week02/learning/day03/notes/04-structured-output-and-function-calling.md`
  (structured output · Zod · function calling · LangChain · AI slop · model collapse)
