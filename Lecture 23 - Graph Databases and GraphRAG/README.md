# Lecture 20 — Graph Databases, Cypher, Neo4j & GraphRAG

> **Phase:** 5 · RAG & Knowledge · **Level:** 🟠 Advanced
> **Source:** `GAC D11, D12`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 20 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 20 | ✅ |
| Write my own chapter notes in `notes/` | ✅ (01-08) |
| Build / rebuild the code in `code/` | ✅ (Basic Code + Production Code) |
| Pass the lecture's completion gate | ☐ (run integration test) |

## 📁 Layout

```text
Lecture 20 - Graph Databases and GraphRAG/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index (filled by prompt.md → Block 6)
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # chapter notes, written from the source notes
│   ├── 01_Graph_Database_Fundamentals.md
│   ├── 02_Cypher_Query_Language.md
│   ├── 03_Neo4j_Architecture_Deployment_LLM_Cypher.md
│   ├── 04_Neo4j_NodeJS_Driver.md
│   ├── 05_Advanced_Graph_Modeling_GraphRAG_Memory.md
│   ├── 06_GraphRAG_Hybrid_Retrieval.md
│   ├── 07_AI_Agent_Memory_Systems.md
│   └── 08_End_to_End_Cognitive_Memory_App.md
│   └── Lecture_20_Complete_Notes.md
├── code/
│   ├── Basic Code/     # Minimal Express + TS service with driver, GraphRAG, memory endpoints
│   └── Production Code/ # Production-hardened version with observability, retries, secrets
└── Assignment/
    └── task.md        # the lecture assignment (filled by prompt.md → Block 5)
```

## 🧠 My notes

All 8 chapter notes are written in `notes/` — each includes:
- Mermaid diagrams for every concept
- JS/TS pseudo code for service patterns
- Common mistakes section
- Key takeaways section
- Self-check questions linking to `Lecture_20_Complete_Notes.md`

## 🔗 Source references

`GAC D11, D12` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.