# Lecture 04 — Index

> **Lecture 04 — LLM APIs, Multi-SDK, Prompt Caching & Reasoning Models**
> Phase 2 · Application Layer & Harness Velocity · Level: 🟢 Beginner · **Roadmap:** [../roadmap-v1.md](../roadmap-v1.md) (S01)

---

## 📚 Chapter Notes (`notes/`)

| # | Chapter | File |
| :---: | :--- | :--- |
| 01 | GenAI Applications vs Raw LLMs — The Engine vs Car Model | [01_GenAI_Applications_vs_Raw_LLMs_The_Engine_vs_Car_Model.md](./notes/01_GenAI_Applications_vs_Raw_LLMs_The_Engine_vs_Car_Model.md) |
| 02 | The LLM API Protocol — HTTP, the Four Invariant Components & Postman | [02_The_LLM_API_Protocol_HTTP_Components_and_Postman.md](./notes/02_The_LLM_API_Protocol_HTTP_Components_and_Postman.md) |
| 03 | Message Roles & Prompt Hygiene | [03_Message_Roles_and_Prompt_Hygiene.md](./notes/03_Message_Roles_and_Prompt_Hygiene.md) |
| 04 | Token Economics — Prefill vs Decode, Usage Metadata, Latency & Cost | [04_Token_Economics_Prefill_Decode_Metadata_and_Cost.md](./notes/04_Token_Economics_Prefill_Decode_Metadata_and_Cost.md) |
| 05 | Token Counting & Context Budgeting with Tokenizers | [05_Token_Counting_and_Context_Budgeting_with_Tokenizers.md](./notes/05_Token_Counting_and_Context_Budgeting_with_Tokenizers.md) |
| 06 | Rate Limits, Quotas, Throttling & Retry/Backoff | [06_Rate_Limits_Quotas_Throttling_and_Retry_Backoff.md](./notes/06_Rate_Limits_Quotas_Throttling_and_Retry_Backoff.md) |
| 07 | Multi-SDK Integration — OpenAI, Gemini, Groq, Mistral, Anthropic & Ollama | [07_Multi_SDK_Integration_OpenAI_Gemini_Groq_Mistral_Anthropic_Ollama.md](./notes/07_Multi_SDK_Integration_OpenAI_Gemini_Groq_Mistral_Anthropic_Ollama.md) |
| 08 | Building the Service — Express, TypeScript/ESM, Zod Config, Singletons & Telemetry | [08_Building_the_Service_Express_TypeScript_Config_Singletons_and_Telemetry.md](./notes/08_Building_the_Service_Express_TypeScript_Config_Singletons_and_Telemetry.md) |
| 09 | AI Slop & Model Collapse | [09_AI_Slop_and_Model_Collapse.md](./notes/09_AI_Slop_and_Model_Collapse.md) |
| 10 | Reasoning Models & Prompt Prefix Caching | [10_Reasoning_Models_and_Prompt_Prefix_Caching.md](./notes/10_Reasoning_Models_and_Prompt_Prefix_Caching.md) |
| — | **Complete Notes (Consolidation)** | [Lecture_04_Complete_Notes.md](./notes/Lecture_04_Complete_Notes.md) |

---

## 💻 Code (`code/`)

- [Basic Code](./code/Basic%20Code/README.md) — Express + TypeScript multi-provider gateway with Zod validation, token budgeting, retry/backoff, slop guard, and a per-call cost ledger tracking cached vs. uncached input tokens and reasoning tokens.
- [Implementation Guides](./code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) — 10-part walkthrough (00 → 09).

---

## 📝 Assignment (`Assignment/`)

- [Assignment Tasks](./Assignment/task.md) — Chapter-wise practice (A1–A10), code extensions (Part B), Support Ticket Summarizer & three-provider conformance report (Part C), and the completion gate (Part D) including cached-prefix ≥50% input-cost reduction verification.

