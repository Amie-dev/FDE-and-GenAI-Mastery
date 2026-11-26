# Lecture 26 - Semantic Text-to-SQL and Analytical Python

> **Stage 2: Connect** · **Phase:** 6 · Enterprise Data, Semantics & SQL · **Level:** 🔴 Expert
> **Source:** `FDE S13 & S14` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Build safe, semantic-layer-grounded Text-to-SQL agents protected by SQL AST validation and column authorization, paired with sandboxed Python analytical reasoning and numerical reconciliation.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 24](../Lecture%2024%20-%20Enterprise%20Data%20Discovery%20and%20Apache%20Ossie/) · [Lecture 25](../Lecture%2025%20-%20AI%20Data%20Contracts%20and%20Lakehouse%20Lifecycle/) |
| **Unlocks** | [Lecture 37](../Lecture%2037%20-%20Agent%20UIs%20K8s%20and%20KEDA%20Scaling/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_26_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Why Naive Text-to-SQL Fails in Production** | Schema bloat, ambiguous business metrics, and dangerous generated SQL. |
| **02** | **Metadata-Guided Schema Discovery & Semantic Layers** | Retrieving only relevant tables/metrics using semantic layer definitions. |
| **03** | **Query Decomposition & SQL Generation** | Breaking multi-part business questions into CTEs and sub-queries. |
| **04** | **SQL AST Validation & Read-Only Guardrails** | Parsing SQL into an AST to block DDL/DML (`DROP`, `UPDATE`) and enforce row limits. |
| **05** | **Schema & Column-Level Authorization + Query Budgets** | Stripping unauthorized PII columns and capping scanned bytes/execution timeout. |
| **06** | **Sandboxed Python Analytical Intelligence** | Running multi-step statistical computations in isolated Python sandboxes. |
| **07** | **Cross-Modal Reasoning (SQL + Vector + Graph)** | Combining warehouse aggregates with unstructured ticket notes and entity graphs. |
| **08** | **Numerical Reconciliation & Execution-Accuracy Evals** | Verifying every number in the final narrative matches exact SQL/Python outputs. |

---

## 🛠️ What You Will Build (`code/`)

A **Guarded Text-to-SQL + Sandboxed Python Analyst Agent** (`code/`): uses an AST parser to validate generated SQL against an allow-listed read-only schema, runs Python stats in a sandbox, and reconciles final numbers.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 26** complete, verify all of the following:

1. AST guardrail blocks 100% of injected `DROP`/`UPDATE`/unauthorized-column queries.
2. Agent passes a 10-question execution-accuracy benchmark with zero numerical hallucinations.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_26_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 26 - Semantic Text-to-SQL and Analytical Python/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_26_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [node-sql-parser (AST Validation)](https://github.com/taozhi8833998/node-sql-parser)
- [Cube / dbt Semantic Layer Concepts](https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-semantic-layer)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 26**.
