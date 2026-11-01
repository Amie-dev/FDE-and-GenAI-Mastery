# Lecture 30 - Evals and Testing

> **Phase:** 9 · Quality & Safety · **Level:** 🟠 Advanced
> **Source:** `FDE L17, L18`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 30 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 30 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ☐ |
| Pass the lecture's completion gate | ☐ |

---

## 📁 Layout

```text
Lecture 30 - Evals and Testing/
├── README.md                    # this file — objectives · phase · level · source mapping · checklist
├── index.md                     # chapter index (filled by prompt.md → Block 6)
├── prompt.md                    # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore                   # ignores prompt.md
├── notes/                       # chapter notes, written from the source notes
│   ├── 01_Why_AI_Needs_Evals.md
│   ├── 02_Anatomy_Of_An_Eval.md
│   ├── 03_Evaluation_Datasets_And_Golden_Data.md
│   ├── 04_Deterministic_Evaluation.md
│   ├── 05_AI_Quality_Metrics.md
│   ├── 06_LLM_as_a_Judge.md
│   ├── 07_Rubrics_Pointwise_Pairwise_Human.md
│   ├── 08_RAG_and_System-Level_Evaluation.md
│   └── 09_Offline_and_Online_Evaluation.md
├── code/                        # the rebuilt codebase (Basic Code · Production Code + implementation guides)
└── Assignment/
    └── task.md                  # the lecture assignment (filled by prompt.md → Block 5)
```

---

## 🧠 My notes

The nine chapters in `notes/` cover the complete evaluation lifecycle for AI systems:

1. **Why AI Needs Evals** – The fundamental testing problem: AI breaks deterministic `Expected == Actual` testing
2. **Anatomy of an Eval** – Four required components: Test Input, Expected Behaviour, Evaluator, Score
3. **Evaluation Datasets and Golden Data** – Building versioned test cases with metadata for slicing
4. **Deterministic Evaluation** – Code checks for facts, structure, tool calls, latency (80% of regressions)
5. **AI Quality Metrics** – Relevance, correctness, faithfulness, completeness, tone, citation quality, safety
6. **LLM-as-a-Judge** – Semantic evaluation with calibrated LLM judges; structured output; cost control
7. **Rubrics, Pointwise vs Pairwise, Human Evaluation** – Rubric design, evaluation styles, human calibration
8. **RAG and System-Level Evaluation** – Pipeline decomposition, component evals, four-layer pipeline
9. **Offline and Online Evaluation** – CI gates, production monitoring, drift detection, alerting, rollback

**Complete synthesis:** [`Lecture_30_Complete_Notes.md`](./Lecture_30_Complete_Notes.md)

---

## 🔗 Source references

`FDE L17, L18` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.

---

## 📋 Notes on format

- **All diagrams:** mermaid (rendered in VS Code / GitHub / Notion)
- **All pseudo-code:** TypeScript‑style only (no runnable code, no dependencies)
- **No external libraries assumed** – examples are self‑contained
- **No runnable code in notes** – implementation goes in `code/`