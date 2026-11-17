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
│   ├── 01_What_is_AI_and_LLM.md
│   ├── 02_What_is_an_AI_Agent_Model_and_Harness.md
│   ├── 03_What_is_a_Harness_Deep_Dive.md
│   ├── 04_Introduction_to_LangChain.md
│   ├── 05_Build_a_CLI_Chat_Agent_System_Prompt.md
│   ├── 06_Message_Objects_Roles_Content_Metadata.md
│   ├── 07_Tool_Calling_Web_Search_and_Extraction.md
│   ├── 08_Streaming_Output_Tokens_and_Updates.md
│   ├── 09_Structured_Output_with_Zod.md
│   ├── 10_What_is_LangGraph_and_Why_Use_It.md
│   ├── 11_StateGraph_StateSchema_and_Channels.md
│   ├── 12_Nodes_Edges_and_Conditional_Routing.md
│   ├── 13_Checkpointers_Persistence_and_HITL.md
│   ├── 14_Production_Workflows_Notion_and_Google_Calendar.md
│   ├── 15_LangSmith_Observability_Tracing_and_Evals.md
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
