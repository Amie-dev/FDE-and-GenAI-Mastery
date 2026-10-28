# Lecture 11 - Agent SDK from Scratch

> **Phase:** 3 · Agency & Contracts · **Level:** 🟠 Advanced
> **Source:** `GAC D08`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 11 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 11 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ☐ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 11 - Agent SDK from Scratch/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index linking to chapter notes and summary
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # chapter notes + consolidated summary (written from the source notes)
│   ├── 01-introduction-to-agent-sdk-and-architecture.md
│   ├── 02-builder-pattern-and-agent-configuration.md
│   ├── 03-harness-prompting-and-react-pipeline.md
│   ├── 04-tool-execution-engine-and-registry.md
│   ├── 05-message-state-execution-and-interceptors.md
│   ├── 06-structured-output-and-defensive-parsing.md
│   ├── 07-guardrails-safety-and-production-hardening.md
│   ├── 08-multi-agent-swarms-providers-packaging.md
│   └── Lecture_11_Complete_Notes.md     # executive summary, architecture diagram, cheat sheet, glossary, 20 self-check questions
├── code/              # the rebuilt codebase (Basic Code · Production Code + implementation guides)
└── Assignment/
    └── task.md        # the lecture assignment (filled by prompt.md → Block 5)
```

## 🧠 My notes

Chapter notes live in [`notes/`](./notes/) : 01 through 08, plus
[`Lecture_11_Complete_Notes.md`](./notes/Lecture_11_Complete_Notes.md) for the
executive summary, architecture diagram, cheat sheet, decision tables, misconceptions,
glossary, and 20 self-check questions.

## 🔗 Source references

`GAC D08` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
Primary source material:
`gen-ai-cohort/week04/learning/day08/notes/01…05`
(`completed notes.md`, `Interview.md`),
plus parallel code worktrees
`agent-sdk/`, `agent-sdk-advanced/`, `agent-sdk-complete/`, `agent-sdk-gemini/`.
