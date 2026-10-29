# Lecture 17 — Advanced RAG: Chapter Index

> **Total chapters:** 8 (within 5–10 range)  
> **Source:** `Forward-Deployed-Engineer/Lecture 12/notes/` + `gen-ai-cohort/week03/learning/day05/notes/`

---

## Chapter Notes

| # | File | Title | Key Focus |
|---|------|-------|-----------|
| 01 | [`01_Why_Basic_RAG_Breaks.md`](notes/01_Why_Basic_RAG_Breaks.md) | Why Basic RAG Breaks — The Two Failure Classes | Retrieval vs generation failure distinction; the single assumption basic RAG relies on; failure taxonomy |
| 02 | [`02_Chunking_Strategies.md`](notes/02_Chunking_Strategies.md) | Chunking Strategies — Fixed, Structural, Semantic, Parent-Child | Why chunking is the first irreversibility; fixed-size vs structural vs semantic; parent-child & contextual enrichment |
| 03 | [`03_Retrieval_Controls.md`](notes/03_Retrieval_Controls.md) | Retrieval Controls — Top-K, Thresholds, Filters | The five-field retrieval request; K_ret vs K_ctx; similarity threshold calibration; metadata filtering & security |
| 04 | [`04_Hybrid_Search_and_RRF.md`](notes/04_Hybrid_Search_and_RRF.md) | Hybrid Search & RRF — Dense + Lexical Fusion | Why embeddings lose exact identifiers; BM25 mechanics; Reciprocal Rank Fusion; per-class evaluation |
| 05 | [`05_Reranking_Two_Stage_Retrieval.md`](notes/05_Reranking_Two_Stage_Retrieval.md) | Reranking — Two-Stage Retrieval | Bi-encoder vs cross-encoder; retrieve-wide rerank-narrow; N/K selection; hosted reranker integration |
| 06 | [`06_Query_Processing.md`](notes/06_Query_Processing.md) | Query Processing — Translation, Routing, Decomposition, HyDE | Query rewriting, step-back prompting, sub-query decomposition, HyDE; multi-source routing & adapters; CRAG |
| 07 | [`07_Context_Engineering.md`](notes/07_Context_Engineering.md) | Context Engineering — Ordering, Budget, Framing | Lost-in-the-middle; precedence rules; labelled chunks; citation validation; budgeting; injection defence |
| 08 | [`08_Production_RAG.md`](notes/08_Production_RAG.md) | Production RAG — The Playbook | Golden set design; ablation matrix; versioning/fingerprints; latency/cost budgets; re-indexing; observability; runbook; maturity ladder |

---

## Complete Notes

| File | Description |
|------|-------------|
| [`Lecture_17_Complete_Notes.md`](notes/Lecture_17_Complete_Notes.md) | Consolidated one-page map: executive summary, cheat sheet, decision tables, misconceptions, glossary, 20 self-check questions, chapter reference |

---

## Code & Assignment

| Path | Description |
|------|-------------|
| `code/Basic Code/` | Basic implementation (to be built per prompt.md Block 3) |
| `code/Production Code/` | Production-ready implementation (to be built per prompt.md Block 4) |
| `Assignment/task.md` | Lecture assignment (to be built per prompt.md Block 5) |

---

## Quick Navigation

- **Start here:** [Chapter 01](notes/01_Why_Basic_RAG_Breaks.md) → follow "Where This Goes Next" links
- **Reference:** [Complete Notes](notes/Lecture_17_Complete_Notes.md) for cheat sheet and self-check
- **Source:** `../../Forward-Deployed-Engineer/Lecture 12/notes/` (9 chapters + complete) · `../../gen-ai-cohort/week03/learning/day05/notes/` (6 files + completed notes)