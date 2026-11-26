# Lecture 04 - LLM APIs, Multi-SDK, Prompt Caching & Reasoning Models

> **Phase:** 2 · Application Layer & Harness Velocity · **Level:** 🟢 Beginner
> **Source:** `FDE L03 · GAC D01, D03 · roadmap-v1.md (S01)`

---

## 📍 Where this lecture sits

See **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 04 — LLM APIs, Multi-SDK, Prompt Caching & Reasoning Models"* for the **complete topic list**,
the **goal**, the **build task** and the **release gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 04 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ✅ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 04 - LLM APIs and Multi-SDK/
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

1. [01 — GenAI Applications vs Raw LLMs: The Engine vs Car Model](./notes/01_GenAI_Applications_vs_Raw_LLMs_The_Engine_vs_Car_Model.md)
2. [02 — The LLM API Protocol: HTTP, the Four Invariant Components & Postman](./notes/02_The_LLM_API_Protocol_HTTP_Components_and_Postman.md)
3. [03 — Message Roles & Prompt Hygiene](./notes/03_Message_Roles_and_Prompt_Hygiene.md)
4. [04 — Token Economics: Prefill vs Decode, Usage Metadata, Latency & Cost](./notes/04_Token_Economics_Prefill_Decode_Metadata_and_Cost.md)
5. [05 — Token Counting & Context Budgeting with Tokenizers](./notes/05_Token_Counting_and_Context_Budgeting_with_Tokenizers.md)
6. [06 — Rate Limits, Quotas, Throttling & Retry/Backoff](./notes/06_Rate_Limits_Quotas_Throttling_and_Retry_Backoff.md)
7. [07 — Multi-SDK Integration: OpenAI, Gemini, Groq, Mistral, Anthropic & Ollama](./notes/07_Multi_SDK_Integration_OpenAI_Gemini_Groq_Mistral_Anthropic_Ollama.md)
8. [08 — Building the Service: Express, TypeScript/ESM, Zod Config, Singletons & Telemetry](./notes/08_Building_the_Service_Express_TypeScript_Config_Singletons_and_Telemetry.md)
9. [09 — AI Slop & Model Collapse](./notes/09_AI_Slop_and_Model_Collapse.md)
10. [10 — Reasoning Models & Prompt Prefix Caching](./notes/10_Reasoning_Models_and_Prompt_Prefix_Caching.md)
- **Complete consolidation:** [notes/Lecture_04_Complete_Notes.md](./notes/Lecture_04_Complete_Notes.md) · **Index:** [index.md](./index.md)

## 🔗 Source references

`FDE L03 · GAC D01, D03` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
