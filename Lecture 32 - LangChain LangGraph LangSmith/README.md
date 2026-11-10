# Lecture 32 - LangChain, LangGraph & LangSmith

> **Phase:** 6 · Agent Orchestration · **Level:** 🟡 Intermediate  
> **Topic:** LangChain provider delivery, LangGraph orchestration, LangSmith observability — all in TypeScript / JavaScript.

---

## 📍 Where this lecture sits

This lecture pulls together the three pillars of the LangChain ecosystem as delivered for **TypeScript / JavaScript**:

1. **LangChain** — the orchestration framework and its **provider delivery model** (one unified API, `initChatModel`, provider packages such as `@langchain/openai`, chat models, embeddings, streaming, tool binding, and the fundamental $\text{Agent} = \text{Model} + \text{Harness}$ architecture).
2. **LangGraph** — stateful, cyclic agent orchestration (`StateGraph`, `StateSchema`, nodes, edges, `compile`, `invoke`/`stream`, checkpoints, runtime context, Pregel super-steps, Notion & Calendar workflows).
3. **LangSmith** — tracing, debugging, and offline evaluation for LangChain/LangGraph apps (env vars `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, trace waterfall, custom spans with `traceable`, and golden dataset evals).

Source references: [docs.langchain.com](https://docs.langchain.com/) (JavaScript/TypeScript section) and the reference repo [Aestheticsuraj234/langchain_langgraph](https://github.com/Aestheticsuraj234/langchain_langgraph) (`/home/aminul/Downloads/langchain_langgraph-main/`).

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read the LangChain.js providers & models docs | ☑ |
| Read the LangGraph.js Graph API docs | ☑ |
| Read the LangSmith.js observability/tracing docs | ☑ |
| Write comprehensive chapter notes in `notes/` | ☑ |
| Build / run the code in `code/` | ☐ |
| Pass the lecture's completion gate (Assignment) | ☐ |

---

## 📁 Layout

```text
Lecture 32 - LangChain LangGraph LangSmith/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index
├── prompt.md          # generation prompt (git-ignored)
├── .gitignore         # ignores prompt.md, node_modules, .env
├── notes/
│   ├── 01_langchain_providers_ts.md   # LangChain architecture, harness & provider delivery
│   ├── 02_langgraph_ts.md             # LangGraph stateful orchestration & workflows
│   ├── 03_langsmith_ts.md             # LangSmith observability, tracing & evaluation
│   └── Lecture_32_Complete_Notes.md   # Complete consolidated master notes
├── code/
│   ├── package.json          # deps from reference repo (@langchain/*)
│   ├── .env.example          # env var template
│   └── src/
│       ├── providers.ts      # LangChain provider delivery examples
│       ├── langgraph.ts      # LangGraph StateGraph example
│       ├── langsmith.ts      # LangSmith tracing setup
│       └── index.ts          # combined runner
└── Assignment/
    └── task.md               # lecture assignment / completion gate
```

---

## 🔗 Source references

- [LangChain.js — Providers and models](https://docs.langchain.com/oss/javascript/concepts/providers-and-models.md)
- [LangChain.js — Component architecture](https://docs.langchain.com/oss/javascript/langchain/component-architecture.md)
- [LangGraph.js — Graph API overview](https://docs.langchain.com/oss/javascript/langgraph/graph-api.md)
- [LangSmith — Tracing quickstart](https://docs.langchain.com/langsmith/observability-quickstart)
- [LangChain.js — Observability](https://docs.langchain.com/oss/javascript/langchain/observability)
- Reference code: [Aestheticsuraj234/langchain_langgraph](https://github.com/Aestheticsuraj234/langchain_langgraph) (local: `/home/aminul/Downloads/langchain_langgraph-main/`)
