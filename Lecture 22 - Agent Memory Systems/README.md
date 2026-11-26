# Lecture 19 - Agent Memory Systems

> **Phase:** 5 · RAG & Knowledge · **Level:** 🟠 Advanced
> **Source:** `GAC D07 · FDE L11 (ch7)`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 19 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 19 | ☑ |
| Write my own chapter notes in `notes/` | ☑ |
| Build / rebuild the code in `code/` | ☑ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 19 - Agent Memory Systems/
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

### Chapter Index

| # | Title | File |
|---|-------|------|
| 01 | Stateless LLM APIs & Context-Window Limitations | [notes/01_Stateless_LLM_APIs_and_Context_Window_Limitations.md](notes/01_Stateless_LLM_APIs_and_Context_Window_Limitations.md) |
| 02 | Short-Term Memory (STM) & Sliding Windows | [notes/02_Short_Term_Memory_and_Sliding_Windows.md](notes/02_Short_Term_Memory_and_Sliding_Windows.md) |
| 03 | Long-Term Memory (LTM) Taxonomy & Fact Extraction | [notes/03_Long_Term_Memory_Taxonomy_and_Fact_Extraction.md](notes/03_Long_Term_Memory_Taxonomy_and_Fact_Extraction.md) |
| 04 | Dynamic Context Assembly (STM + LTM_RAG + Query) | [notes/04_Dynamic_Context_Assembly_Stm_Ltm_Rag_Query.md](notes/04_Dynamic_Context_Assembly_Stm_Ltm_Rag_Query.md) |
| 05 | Memory Eviction, Contradiction Resolution & Decay | [notes/05_Memory_Eviction_Contradiction_Resolution_and_Decay.md](notes/05_Memory_Eviction_Contradiction_Resolution_and_Decay.md) |
| 06 | Claude-Style Memory Dreaming & Background Reflection | [notes/06_Claude_Style_Memory_Dreaming_and_Background_Reflection.md](notes/06_Claude_Style_Memory_Dreaming_and_Background_Reflection.md) |
| 07 | Managed Memory (mem0) + Multi-tenancy, Privacy & Compliance | [notes/07_Managed_Memory_mem0_Multi_Tenancy_Privacy_Compliance.md](notes/07_Managed_Memory_mem0_Multi_Tenancy_Privacy_Compliance.md) |
| 08 | Production Memory System Architecture | [notes/08_Production_Memory_System_Architecture.md](notes/08_Production_Memory_System_Architecture.md) |

### Complete Notes

- [Lecture_19_Complete_Notes.md](notes/Lecture_19_Complete_Notes.md) — Combined reference with executive summary, cheat sheets, decision tables, and self-check questions

## 🔗 Source references

`GAC D07 · FDE L11 (ch7)` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.

**Primary sources used:**
- `gen-ai-cohort/week04/learning/day07/notes/01-application-level-memory-and-context-limits.md`
- `gen-ai-cohort/week04/learning/day07/notes/02-short-term-memory-and-sliding-windows.md`
- `gen-ai-cohort/week04/learning/day07/notes/03-long-term-memory-taxonomy-and-rag.md`
- `gen-ai-cohort/week04/learning/day07/notes/04-memory-eviction-and-dreaming-reflection.md`
- `gen-ai-cohort/week04/learning/day07/notes/05-agent-memory-system-design-and-mem0.md`
- `Forward-Deployed-Engineer/Lecture 11/notes/07_Conversation_State_and_Memory.md`
- `gen-ai-cohort/week04/learning/day07/notes/completed notes.md`