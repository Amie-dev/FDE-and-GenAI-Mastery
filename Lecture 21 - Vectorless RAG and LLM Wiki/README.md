# Lecture 18 - Vectorless RAG and LLM Wiki

> **Phase:** 5 · RAG & Knowledge · **Level:** 🟠 Advanced
> **Source:** `GAC D06`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 18 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 18 | ☑ |
| Write my own chapter notes in `notes/` | ☑ |
| Build / rebuild the code in `code/` | ☑ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 18 - Vectorless RAG and LLM Wiki/
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

Completed chapters (all written from source notes `GAC D06`):

| # | Chapter | File |
|---|---------|------|
| 1 | Limitations of Vector RAG & the Abrupt Chunking Problem | [`notes/01_limitations_vector_rag_chunking.md`](notes/01_limitations_vector_rag_chunking.md) |
| 2 | Vectorless RAG & Tree-Structured Indexing | [`notes/02_vectorless_rag_tree_indexing.md`](notes/02_vectorless_rag_tree_indexing.md) |
| 3 | Agentic Tree Search & LLM Relevance Retrieval | [`notes/03_agentic_tree_search_llm_relevance.md`](notes/03_agentic_tree_search_llm_relevance.md) |
| 4 | LLM Wiki Architecture (Andrej Karpathy) | [`notes/04_llm_wiki_librarian_architecture.md`](notes/04_llm_wiki_librarian_architecture.md) |
| 5 | Two-Pass Retrieval & Lazy Loading | [`notes/05_two_pass_retrieval_lazy_loading.md`](notes/05_two_pass_retrieval_lazy_loading.md) |
| 6 | System Comparison & Hybrid RAG | [`notes/06_system_comparison_hybrid_rag.md`](notes/06_system_comparison_hybrid_rag.md) |
| 7 | Decision Framework, Benchmarks & Production Architecture | [`notes/07_decision_framework_production_architecture.md`](notes/07_decision_framework_production_architecture.md) |

Complete consolidated notes: [`Lecture_18_Complete_Notes.md`](Lecture_18_Complete_Notes.md)

## 🔗 Source references

`GAC D06` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
