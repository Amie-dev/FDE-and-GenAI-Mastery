<div align="center">

# 🧭 FDE &amp; GEN-AI — Merged Learning Repository

### 🧠 One Curriculum, Two Repositories — From *"What Is a Token?"* to Production-Grade Enterprise AI

*Forward Deployed Engineering · LLM internals · Agents &amp; Tools · RAG &amp; Knowledge Systems · MCP · Multimodal · Evals · Security*

[![Lectures](https://img.shields.io/badge/Lectures-31-blueviolet?style=for-the-badge)](#-curriculum-navigation)
[![Phases](https://img.shields.io/badge/Phases-10-2ea44f?style=for-the-badge)](#-learning-path)
[![Source Lectures Merged](https://img.shields.io/badge/Source_Lectures_Merged-35-orange?style=for-the-badge)](#-where-this-came-from)
[![Topic Coverage](https://img.shields.io/badge/Topic_Coverage-35%2F35-success?style=for-the-badge)](#-verification-appendices)
[![Duplicates](https://img.shields.io/badge/Duplicated_Topics-0-critical?style=for-the-badge)](#-verification-appendices)

[![Indexed Topics](https://img.shields.io/badge/Indexed_Sub--Topics-454%2B-informational?style=for-the-badge)](#-repository-at-a-glance)
[![Code](https://img.shields.io/badge/Code-TypeScript_%7C_Node.js-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#-technology-stack)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](#-roadmap)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](#-contributing)

### 👤 Connect

[![GitHub](https://img.shields.io/badge/GitHub-Amie--dev-181717?style=for-the-badge&logo=github)](https://github.com/Amie-dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Aminul-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/aminul-dev/)
[![Twitter](https://img.shields.io/badge/Twitter-@AminulIsla65775-000000?style=for-the-badge&logo=x)](https://x.com/AminulIsla65775)

**[📖 Start the Curriculum](#-curriculum-navigation)** · **[🗺️ Learning Path](#-learning-path)** · **[🚀 Quick Start](#-quick-start)** · **[📑 Master Roadmap](./roadmap.md)** · **[📚 Chapter Index](./index.md)** · **[✅ Verification](#-verification-appendices)**

</div>

---

## 🧭 Table of Contents

| | Section | What's inside |
| :---: | :--- | :--- |
| 🎯 | **[Repository Overview](#-repository-overview)** | What this repository is and who it is for |
| 📊 | **[Repository at a Glance](#-repository-at-a-glance)** | Hard numbers: lectures, phases, topics, files, coverage |
| 🗺️ | **[Learning Path](#-learning-path)** | The ten-phase route, from foundations to security |
| 📚 | **[Curriculum Navigation](#-curriculum-navigation)** | All 31 lectures with folder links, level and phase |
| 📑 | **[Chapter Index](./index.md)** | Every written lecture's chapters — number, title, one-line summary and a link to each `notes/` file |
| 📖 | **[Phase Highlights](#-phase-highlights)** | Collapsible deep-dive per phase, with topic chips |
| 🔀 | **[Where This Came From](#-where-this-came-from)** | The two source repositories and how they were merged |
| ✅ | **[Verification Appendices](#-verification-appendices)** | The six artefacts that prove completeness |
| 🧰 | **[Technology Stack](#-technology-stack)** | Languages, frameworks, services and SDKs used |
| 🚀 | **[Quick Start](#-quick-start)** | How to read, how to build, how to pass a gate |
| 🗂️ | **[Repository Structure](#-repository-structure)** | Directory map |
| 📐 | **[Conventions](#-conventions)** | The contract every lecture follows |
| 🛣️ | **[Roadmap](#-roadmap)** | Where this repository is heading |
| 🤝 | **[Contributing](#-contributing)** | How to add or improve a lecture |
| 📄 | **[License &amp; Attribution](#-license--attribution)** | Usage terms |

---

## 🎯 Repository Overview

> **The thesis of this repository:** the model proposes; your architecture disposes. Everything after Lecture 01 is about building the seam between the two — and then proving, with numbers, that the seam holds.

This repository is a **single merged learning path** built by reading, comparing and de-duplicating two independent AI note repositories. It is **not** a copy of either: it is the **map** — it tells you *what* to learn, *in what order*, *from which source file*, and *what to build* to prove you learned it.

| Theme | What it covers |
| :--- | :--- |
| 🧭 **Role &amp; Mindset** | Moving from client-requested *"chatbots"* to true business-problem discovery — the Forward Deployed Engineer way. |
| 📐 **Mathematical Depth** | Step-by-step intuition: scaled dot-product attention $\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$, $O(N^2)$ context bloat, recall@k / MRR / nDCG, the ANN recall–latency bargain. |
| 📑 **Paper &amp; Protocol Deep-Dives** | *"Attention Is All You Need"*, RAG, vector ANN families, MCP (JSON-RPC 2.0), the Agent Skills standard. |
| 🏗️ **Systems Engineering** | Streaming pipelines, sandboxed agents, structured-output contracts, durable execution, multi-tenant platforms. |
| 🛡️ **Quality &amp; Safety** | Golden datasets, deterministic evals, LLM-as-a-judge, release gates, prompt injection &amp; capability routing. |
| 🔁 **Zero Duplication** | Every topic from both sources appears **once**, with both sources listed as depth tiers. |

---

## 📊 Repository at a Glance

| Metric | Value |
| :--- | ---: |
| 🎓 Merged lectures | **31** |
| 🧭 Learning phases | **10** (Phase 0 → 9) |
| 📚 Source lectures/days merged | **35** (19 `Forward-Deployed-Engineer` + 16 `gen-ai-cohort`) |
| 📓 Source note files mapped | **235** (152 FDE chapters + 83 cohort note files) |
| 🧾 Indexed sub-topics | **454+** |
| 🗂️ Lecture workspace folders | **31** (each with `notes/` + `code/`) |
| ✍️ Roadmap volume | **1,467 lines** |
| ✅ Source coverage | **35 / 35** lectures &amp; days mapped |
| 🔁 Duplicated topics | **0** |
| 🧩 Verification appendices | **6** (A → F) |
| 🏁 Capstone | **1** end-to-end system brief |

> 💡 Every number above is derived from the repository contents — the lecture count and topic count come from `roadmap.md`, and the coverage figures come from [Appendix B](./roadmap.md#-appendix-b--full-source-coverage-checklist) and [Appendix F](./roadmap.md#-appendix-f--source-chapter-coverage-ledger).

---

## 🗺️ Learning Path

Follow the phases **in order** — each one assumes only the phase before it. Colour squares match the **[Phase Highlights](#-phase-highlights)** below.

| Phase | Lectures | Colour | You leave able to… |
| :---: | :--- | :---: | :--- |
| **0 · Orientation** | 01 | ⬜ | Discover the *real* business problem, and narrate rules → ML → n-grams → RNN → Transformer |
| **1 · Foundations** | 02 · 03 | 🟦 | Explain how an LLM actually produces a token: tokens → vectors → attention → logits → sampling |
| **2 · Application Layer** | 04 · 05 · 06 · 07 | 🟩 | Call a model from a real service, engineer a prompt, budget tokens, and stream to a browser correctly |
| **3 · Agency &amp; Contracts** | 08 · 09 · 10 · 11 | 🟨 | Give a model typed tools, sandbox it, add human-in-the-loop, enforce schema contracts, and build the agent runtime yourself |
| **4 · Embeddings** | 12 · 13 · 14 · 15 | 🟧 | Represent meaning as vectors, then store and search billions of them with ANN indexes — and know the internals |
| **5 · RAG &amp; Knowledge** | 16 · 17 · 18 · 19 · 20 | 🟥 | Build grounded answering end to end, then prove which control fixes a wrong answer — including vectorless retrieval, agent memory and graphs |
| **6 · Integration** | 21 · 22 · 23 | 🟪 | Give a program standard access to the outside world through MCP, with all three primitives under the right owner, then package workflow knowledge as a skill |
| **7 · Multimodality** | 24 | 🟫 | Let a model read an image — and decide between OCR and an MLLM on cost evidence |
| **8 · Production Infrastructure** | 25 · 26 · 27 · 28 · 29 | 🟦 | Run inference economically, orchestrate durable workflows, ship a full-stack multi-tenant AI product, and deploy an autonomous bot |
| **9 · Quality &amp; Safety** | 30 · 31 | 🟥 | **Prove** the system works with a release gate — and **survive being attacked**, naming the layer that stopped each attack |

> 🧭 **Cross-cutting note:** Phase 9 is not "last" in spirit — security and evaluation apply to every system you build from Phase 2 onwards. Read Phase 9 as the **certification layer**.

---

## 📚 Curriculum Navigation

| # | Lecture | Phase | Level | Workspace | Roadmap |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **01** | ⬜ Introduction to FDE and AI History | 0 | 🟢 | [📂](./Lecture%2001%20-%20Introduction%20to%20FDE%20and%20AI%20History/) | [📄](./roadmap.md#lecture-01--introduction-to-forward-deployed-engineering--the-history-of-ai) |
| **02** | 🟦 LLM Foundations | 1 | 🟢 | [📂](./Lecture%2002%20-%20LLM%20Foundations/) | [📄](./roadmap.md#lecture-02--llm-foundations-next-token-prediction-tokenization--embeddings) |
| **03** | 🟦 Attention and Decoding | 1 | 🟢 | [📂](./Lecture%2003%20-%20Attention%20and%20Decoding/) | [📄](./roadmap.md#lecture-03--attention-transformer-architecture--decoding-strategies) |
| **04** | 🟩 LLM APIs and Multi-SDK | 2 | 🟢 | [📂](./Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/) | [📄](./roadmap.md#lecture-04--calling-llms-from-your-application-apis-multi-sdk--token-economics) |
| **05** | 🟩 Prompt Engineering | 2 | 🟢 | [📂](./Lecture%2005%20-%20Prompt%20Engineering/) | [📄](./roadmap.md#lecture-05--prompt-engineering-zerofew-shot-cot-persona--prompt-hygiene) |
| **06** | 🟩 Chatbots and Context | 2 | 🟡 | [📂](./Lecture%2006%20-%20Chatbots%20and%20Context/) | [📄](./roadmap.md#lecture-06--chatbots-statelessness-context-memory--hallucination) |
| **07** | 🟩 AI Streaming | 2 | 🟡 | [📂](./Lecture%2007%20-%20AI%20Streaming/) | [📄](./roadmap.md#lecture-07--ai-streaming-from-llm-tokens-to-a-live-chat-experience) |
| **08** | 🟨 Tool Calling | 3 | 🟡 | [📂](./Lecture%2008%20-%20Tool%20Calling/) | [📄](./roadmap.md#lecture-08--tool-calling--function-execution-loops) |
| **09** | 🟨 AI Agents and HITL | 3 | 🟡 | [📂](./Lecture%2009%20-%20AI%20Agents%20and%20HITL/) | [📄](./roadmap.md#lecture-09--ai-agents-from-first-principles-agency-sandboxing--hitl) |
| **10** | 🟨 Structured Outputs | 3 | 🟡 | [📂](./Lecture%2010%20-%20Structured%20Outputs/) | [📄](./roadmap.md#lecture-10--structured-outputs-schema-enforcement-validation--repair) |
| **11** | 🟨 Agent SDK from Scratch | 3 | 🟠 | [📂](./Lecture%2011%20-%20Agent%20SDK%20from%20Scratch/) | [📄](./roadmap.md#lecture-11--building-an-agent-sdk-from-scratch-harness--builder--react-loop) |
| **12** | 🟧 Vector Embeddings | 4 | 🟢 | [📂](./Lecture%2012%20-%20Vector%20Embeddings/) | [📄](./roadmap.md#lecture-12--vector-embeddings-from-first-principles) |
| **13** | 🟧 Semantic Search Project | 4 | 🟡 | [📂](./Lecture%2013%20-%20Semantic%20Search%20Project/) | [📄](./roadmap.md#lecture-13--embeddings-project-semantic-search--movie-recommendation) |
| **14** | 🟧 Vector Search and Storage | 4 | 🟡 | [📂](./Lecture%2014%20-%20Vector%20Search%20and%20Storage/) | [📄](./roadmap.md#lecture-14--vector-search--storage-scale-knn--the-curse-of-dimensionality) |
| **15** | 🟧 Vector Databases and ANN | 4 | 🟠 | [📂](./Lecture%2015%20-%20Vector%20Databases%20and%20ANN/) | [📄](./roadmap.md#lecture-15--vector-databases--ann-algorithms-ivf-hnsw--product-quantization) |
| **16** | 🟥 RAG | 5 | 🟡 | [📂](./Lecture%2016%20-%20RAG/) | [📄](./roadmap.md#lecture-16--rag-the-open-book-architecture-ingestion--grounded-generation) |
| **17** | 🟥 Advanced RAG | 5 | 🟠 | [📂](./Lecture%2017%20-%20Advanced%20RAG/) | [📄](./roadmap.md#lecture-17--advanced-rag-chunking-hybrid-retrieval-reranking--context-engineering) |
| **18** | 🟥 Vectorless RAG and LLM Wiki | 5 | 🟠 | [📂](./Lecture%2018%20-%20Vectorless%20RAG%20and%20LLM%20Wiki/) | [📄](./roadmap.md#lecture-18--vectorless-rag-hierarchical-tree-indexing--llm-wiki-engines) |
| **19** | 🟥 Agent Memory Systems | 5 | 🟠 | [📂](./Lecture%2019%20-%20Agent%20Memory%20Systems/) | [📄](./roadmap.md#lecture-19--agent-memory-systems-stm-ltm-graph-memory-dreaming--mem0) |
| **20** | 🟥 Graph Databases and GraphRAG | 5 | 🟠 | [📂](./Lecture%2020%20-%20Graph%20Databases%20and%20GraphRAG/) | [📄](./roadmap.md#lecture-20--graph-databases-cypher-neo4j--graphrag) |
| **21** | 🟪 MCP Core | 6 | 🟡 | [📂](./Lecture%2021%20-%20MCP%20Core/) | [📄](./roadmap.md#lecture-21--mcp-from-first-principles-host-client-server--tools) |
| **22** | 🟪 MCP Resources Prompts and Gateway | 6 | 🟠 | [📂](./Lecture%2022%20-%20MCP%20Resources%20Prompts%20and%20Gateway/) | [📄](./roadmap.md#lecture-22--mcp-resources-prompts--production-gateway-architecture) |
| **23** | 🟪 Claude Skills | 6 | 🟠 | [📂](./Lecture%2023%20-%20Claude%20Skills/) | [📄](./roadmap.md#lecture-23--claude-skills--the-agent-skills-open-standard) |
| **24** | 🟫 Multimodal AI | 7 | 🟠 | [📂](./Lecture%2024%20-%20Multimodal%20AI/) | [📄](./roadmap.md#lecture-24--multimodal-ai-how-llms-understand-images) |
| **25** | 🟦 vLLM and PagedAttention | 8 | 🔴 | [📂](./Lecture%2025%20-%20vLLM%20and%20PagedAttention/) | [📄](./roadmap.md#lecture-25--high-performance-inference-gpu-mechanics-vllm--pagedattention) |
| **26** | 🟦 Durable Execution with Inngest | 8 | 🟠 | [📂](./Lecture%2026%20-%20Durable%20Execution%20with%20Inngest/) | [📄](./roadmap.md#lecture-26--durable-execution--event-driven-multi-agent-workflows-inngest) |
| **27** | 🟦 Full-Stack AI Platform | 8 | 🔴 | [📂](./Lecture%2027%20-%20Full-Stack%20AI%20Platform/) | [📄](./roadmap.md#lecture-27--enterprise-full-stack-ai-platform-architecture-db-auth--ingestion) |
| **28** | 🟦 Async Indexing and RAG Chat | 8 | 🔴 | [📂](./Lecture%2028%20-%20Async%20Indexing%20and%20RAG%20Chat/) | [📄](./roadmap.md#lecture-28--async-vector-indexing-streaming-rag-chat--learning-artifacts) |
| **29** | 🟦 GitHub PR Reviewer Bot | 8 | 🟠 | [📂](./Lecture%2029%20-%20GitHub%20PR%20Reviewer%20Bot/) | [📄](./roadmap.md#lecture-29--hands-on-autonomous-github-pr-reviewer-bot) |
| **30** | 🟥 Evals and Testing | 9 | 🟠 | [📂](./Lecture%2030%20-%20Evals%20and%20Testing/) | [📄](./roadmap.md#lecture-30--genai-evaluation--testing-golden-data-deterministic-evals--llm-as-a-judge) |
| **31** | 🟥 Security and Guardrails | 9 | 🔴 | [📂](./Lecture%2031%20-%20Security%20and%20Guardrails/) | [📄](./roadmap.md#lecture-31--genai-security--guardrails-prompt-injection-jailbreaks--safe-tool-use) |
| **★** | 🏁 Capstone | — | 🔴 | ➖ | [📄](./roadmap.md#-capstone--prove-the-whole-path) |

**Legend:** 🟢 Beginner · 🟡 Intermediate · 🟠 Advanced · 🔴 Expert

> 🧭 **Every workspace folder follows the same layout:** `README.md` (objectives · phase · level · source mapping · checklist) · `notes/` (your own notes) · `code/` (your rebuild). The **complete topic list, build task and gate** for each lecture live in **[`roadmap.md`](./roadmap.md)** — the single source of truth, so no topic is ever duplicated.

---

## 📖 Phase Highlights

Each phase below is summarised twice: a one-line thesis and a lecture chip list for scanning, plus a collapsible **full breakdown** naming what each lecture in that phase actually teaches. Colour squares match the **[Learning Path](#-learning-path)**.

---

### ⬜ Phase 0 — Orientation

> **Thesis** — The job is not to build the chatbot the client asked for; it is to find the business problem underneath it, and the history of AI explains why today's tools look the way they do.

`Lecture 01`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**01 · Introduction to FDE and AI History** — the FDE role and discovery workflow; the e-commerce case study (50k daily queries); the three iterative attempts (rules → ML classifier → naïve LLM); Symbolic AI and expert systems (fact base + rule base + inference engine); ELIZA and the illusion of understanding; the combinatorial explosion of handwritten rules; the ML paradigm shift $Y = f(X; \Theta)$; feature-engineering bottleneck and representation learning; statistical n-grams and the sparsity problem; RNN hidden-state decay; the Attention breakthrough; and the four properties of a production AI system — **grounded · observable · secure · actionable**.

</details>

**[📂 Lecture 01 workspace](./Lecture%2001%20-%20Introduction%20to%20FDE%20and%20AI%20History/)** · **[📄 Roadmap: Phase 0](./roadmap.md#-phase-0--orientation)**

---

### 🟦 Phase 1 — Foundations: How LLMs Actually Work

> **Thesis** — An LLM is a next-token probability machine: text → tokens → vectors → attention → logits → softmax → one token, appended and repeated.

`Lecture 02 — LLM Foundations` · `Lecture 03 — Attention &amp; Decoding`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**02 · LLM Foundations: Next-Token Prediction, Tokenization &amp; Embeddings** — autoregressive next-token prediction; why text must become numbers; token IDs are *labels, not measurements*; word-level vs character-level vs **subword (BPE/WordPiece)** tokenization; `tiktoken` and tokenizer comparison; dense embeddings $\mathbb{R}^{d_{\text{model}}}$; positional encodings; the complete tokenization → embedding → input pipeline; training vs inference phase.

**03 · Attention, Transformer Architecture &amp; Decoding Strategies** — the problem attention solves; the **Q, K, V** framework; scaled dot-product attention $\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$ and *why* $\frac{1}{\sqrt{d_k}}$; multi-head attention; self-attention vs recurrent vs convolutional; residual streams and the abstraction hierarchy; hidden state → logits; softmax, temperature, top-p/top-k, greedy vs stochastic sampling and beam search; the complete LLM pipeline.

</details>

**[📂 Lecture 02 workspace](./Lecture%2002%20-%20LLM%20Foundations/)** · **[📂 Lecture 03 workspace](./Lecture%2003%20-%20Attention%20and%20Decoding/)** · **[📄 Roadmap: Phase 1](./roadmap.md#-phase-1--foundations-how-llms-actually-work)**

---

### 🟩 Phase 2 — The Application Layer: Talking to Models

> **Thesis** — A raw model is an engine, not a car: your application supplies the keys, the dashboard, the fuel budget and the guardrails — and the browser is part of the system.

`Lecture 04 — LLM APIs &amp; Multi-SDK` · `Lecture 05 — Prompt Engineering` · `Lecture 06 — Chatbots &amp; Context` · `Lecture 07 — AI Streaming`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**04 · LLM APIs and Multi-SDK** — GenAI apps vs raw LLMs; the 4 invariant request components; chat roles; token economics and `usage` metadata; rate limits and throttling; **OpenAI · Gemini · Groq · Mistral · Claude · Ollama** in one interface; SDK vs direct REST; Node + Express + TypeScript + Zod setup; client singletons; telemetry and audit; API-key hygiene; **AI slop** and model collapse.

**05 · Prompt Engineering** — zero-shot, few-shot and in-context learning; Chain-of-Thought and when it *hurts*; role-play/persona; model-specific formats (**ChatML · Alpaca · INST · FLAN-T5**); prompt hygiene and delimiters; GIGO; direct vs indirect prompt injection (first contact); distillation and extraction attacks; moderation APIs; prompt versioning.

**06 · Chatbots and Context** — statelessness as an application problem; context-window budget; $O(N^2)$ token accumulation; lost-in-the-middle; sliding window and rolling summaries; parametric vs in-context working memory; hallucination mechanics; **sycophancy**; calibrated refusal engineering; the 7-layer defence-in-depth architecture.

**07 · AI Streaming** — generation vs delivery; TTFT and ITL; token/chunk/byte granularity; chunked encoding, **SSE** and WebSockets; the 7 pipeline invariants; backpressure and flow control; `Flux`-style operators; history buffering during a stream; `fetch` + `ReadableStream` + `TextDecoder` on the client; cancellation; production hardening.

</details>

**[📂 Lecture 04](./Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/)** · **[📂 Lecture 05](./Lecture%2005%20-%20Prompt%20Engineering/)** · **[📂 Lecture 06](./Lecture%2006%20-%20Chatbots%20and%20Context/)** · **[📂 Lecture 07](./Lecture%2007%20-%20AI%20Streaming/)** · **[📄 Roadmap: Phase 2](./roadmap.md#-phase-2--the-application-layer-talking-to-models)**

---

### 🟨 Phase 3 — Agency: Tools, Agents &amp; Output Contracts

> **Thesis** — A tool call is a *proposal* from an untrusted party, not an instruction to the runtime. The architecture **is** the seam between them.

`Lecture 08 — Tool Calling` · `Lecture 09 — Agents, Sandboxing &amp; HITL` · `Lecture 10 — Structured Outputs` · `Lecture 11 — Agent SDK from Scratch`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**08 · Tool Calling &amp; Function Execution Loops** — from token prediction to tool augmentation; tool definitions as an **OpenAPI / JSON Schema contract**; the 5-step HTTP wire-protocol lifecycle; multi-step chaining and **double-turn** tool calling; multi-tool routing and `tool_choice`; the **ReAct** paradigm; self-healing error recovery; token accumulation and the economic ledger; tool = capability + permission.

**09 · AI Agents from First Principles: Agency, Sandboxing &amp; HITL** — the agency spectrum (4 progressive levels); the 6-component agent model (LLM + memory + tools + guardrails + planning); loop and harness engineering; threat modelling for filesystem agents; the hierarchy of isolation tiers; workspace sandboxing; the **3-tier tool authorization policy matrix**; asynchronous durable pause/resume; enterprise agent patterns.

**10 · Structured Outputs: Schema, Enforcement, Validation &amp; Repair** — the integration gap; "a schema is a form the application writes and the model fills"; why "just ask for JSON" fails; JSON Schema design for LLMs; the strict-mode subset and its silent limits; the three layers of enforcement (prompt → decoder → validation); **Outlines / Guidance** and grammar compilation; structural vs semantic validation; `block` vs `review` severities; repair loops and the fallback ladder; first-pass validity and issue distribution.

**11 · Building an Agent SDK from Scratch** — stateful SDK vs stateless API; the core triad; the fluent `AgentBuilder` pattern; harness prompting and the 5-stage ReAct pipeline (`INITIAL → THINK → TOOL_REQUEST → ANALYSE → OUTPUT`); `ITool` and dynamic schema auto-generation; the tool registry; stateful `messageHistory`; the event-driven interceptor pattern; `MAX_LOOP` bounds; multi-agent swarms; packaging for OpenAI and Gemini.

</details>

**[📂 Lecture 08](./Lecture%2008%20-%20Tool%20Calling/)** · **[📂 Lecture 09](./Lecture%2009%20-%20AI%20Agents%20and%20HITL/)** · **[📂 Lecture 10](./Lecture%2010%20-%20Structured%20Outputs/)** · **[📂 Lecture 11](./Lecture%2011%20-%20Agent%20SDK%20from%20Scratch/)** · **[📄 Roadmap: Phase 3](./roadmap.md#-phase-3--agency-tools-agents--output-contracts)**

---

### 🟧 Phase 4 — Meaning &amp; Retrieval: Embeddings

> **Thesis** — Represent → store → compare → rank. Meaning becomes geometry, and scale turns geometry into an engineering bargain.

`Lecture 12 — Vector Embeddings` · `Lecture 13 — Semantic Search Project` · `Lecture 14 — Vector Search &amp; Storage` · `Lecture 15 — Vector Databases &amp; ANN`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**12 · Vector Embeddings from First Principles** — the problem of meaning in computers; why numbers at all; **cosine, dot product, Euclidean and Manhattan** similarity; why direction sometimes matters more than distance; the failure of hand-crafted features (one-hot, bag-of-words, TF-IDF); what embeddings actually learn; identity matching vs semantic similarity; embedding model vs generative LLM; the interpretability trap.

**13 · Embeddings Project: Semantic Search &amp; Movie Recommendation** — why not just use an LLM (cost, latency, determinism, scale); **precomputation** as the key insight; the REPRESENT–STORE–COMPARE–RANK mental model; cosine similarity and normalisation in practice; a complete system design with catalog build, index, query, rank and respond.

**14 · Vector Search &amp; Storage** — the scale wall; why relational databases are not enough (and when they *are*); brute-force KNN as the correct baseline; why scalar indexes fail for vectors; the curse of dimensionality; the **ANN family tree**; the recall/latency/memory/cost spectrum; when you do not need ANN.

**15 · Vector Databases &amp; ANN Algorithms** — **IVF** (centroids, `nlist`/`nprobe`, IVF-Flat/PQ/SQ); **HNSW** (`M`/`M0`/`efConstruction`/`efSearch`, layer sampling, tombstones, filtered-search weakness); **Product Quantization** (codebooks, ADC, rescoring); **DiskANN** and the disk-resident family; the five layers of a vector database; hybrid search and RRF; **Qdrant** and **pgvector** hands-on; the wider vendor landscape; sharding, replication, pruning and selectivity; re-indexing, versioning and model migration with rollback.

</details>

**[📂 Lecture 12](./Lecture%2012%20-%20Vector%20Embeddings/)** · **[📂 Lecture 13](./Lecture%2013%20-%20Semantic%20Search%20Project/)** · **[📂 Lecture 14](./Lecture%2014%20-%20Vector%20Search%20and%20Storage/)** · **[📂 Lecture 15](./Lecture%2015%20-%20Vector%20Databases%20and%20ANN/)** · **[📄 Roadmap: Phase 4](./roadmap.md#-phase-4--meaning--retrieval-embeddings)**

---

### 🟥 Phase 5 — RAG &amp; Knowledge Systems

> **Thesis** — Retrieval sets the ceiling; the prompt can only use what arrived. A wrong answer is never just "the model".

`Lecture 16 — RAG` · `Lecture 17 — Advanced RAG` · `Lecture 18 — Vectorless RAG &amp; LLM Wiki` · `Lecture 19 — Agent Memory` · `Lecture 20 — Graphs &amp; GraphRAG`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**16 · RAG: The Open-Book Architecture** — parametric vs non-parametric memory; the two pipelines (offline ingestion, online serving); PDF extraction hazards, cleaning, chunking, metadata and deterministic ids; embeddings at query time (Matryoshka dimensions, symmetric vs asymmetric encoding); the vector index (namespaces, score calibration, top-K, filters, MMR); grounded generation (four-clause contract, the exact refusal sentence, U-shaped attention, citation markers); conversation state and query condensation; evaluation and debugging (recall@K, MRR, nDCG, faithfulness, citation validity, the retrieval-vs-generation 2×2).

**17 · Advanced RAG** — why basic RAG breaks (query mismatch, distance mismatch); three families of chunking; fixed-size overlap arithmetic; structural, semantic and parent-child chunking; text splitters; score floors calibrated per model and corpus; metadata filtering; hybrid search with **RRF** and **BM25/lexical** retrieval; cross-encoder **rerankers** vs bi-encoders; query translation (rewriting, step-back, sub-queries, **HyDE**); intent routing and multi-source adapters (Postgres · Qdrant · MongoDB · S3); **CRAG** self-reflective evaluation; context engineering; PII masking and jailbreak defence; BullMQ + Redis async indexing.

**18 · Vectorless RAG, Hierarchical Tree Indexing &amp; LLM Wiki Engines** — the abrupt-chunking problem; $\text{Vector Similarity} \neq \text{Relevance}$; tree-structured indexing (the **PageIndex** model); `Root → Chapter → Section → Page` node summaries; AlphaGo-inspired agentic tree traversal; Karpathy's **LLM Wiki** vault paradigm; two-pass retrieval with lazy loading; the four-way architecture comparison.

**19 · Agent Memory Systems** — context-window failure points; **STM** sliding windows; **LTM taxonomy** (semantic · episodic · temporal · graph); dynamic context assembly $\text{STM} + \text{LTM\_RAG} + \text{Query}$; fact extraction; eviction, deduplication and contradiction resolution; **memory dreaming**; `mem0`; eager loading and hit-score tracking; context inflation; multi-tenant isolation and deletion.

**20 · Graph Databases, Cypher, Neo4j &amp; GraphRAG** — nodes, edges, properties, labels; the cognitive-memory model; SQL (junction tables) vs NoSQL (embedded refs) vs native graph (**index-free adjacency**); property-graph schema design; **Cypher** syntax and CRUD; variable-length paths (BFS vs DFS); Neo4j architecture and the **Bolt** protocol; the Node.js `neo4j-driver`; **GraphRAG** and text-to-Cypher.

</details>

**[📂 Lecture 16](./Lecture%2016%20-%20RAG/)** · **[📂 Lecture 17](./Lecture%2017%20-%20Advanced%20RAG/)** · **[📂 Lecture 18](./Lecture%2018%20-%20Vectorless%20RAG%20and%20LLM%20Wiki/)** · **[📂 Lecture 19](./Lecture%2019%20-%20Agent%20Memory%20Systems/)** · **[📂 Lecture 20](./Lecture%2020%20-%20Graph%20Databases%20and%20GraphRAG/)** · **[📄 Roadmap: Phase 5](./roadmap.md#-phase-5--rag--knowledge-systems)**

---

### 🟪 Phase 6 — Integration &amp; Interoperability

> **Thesis** — Replace N×M bespoke integrations with one open protocol — then package *workflow knowledge*, not connectivity, as a portable skill.

`Lecture 21 — MCP Core` · `Lecture 22 — MCP Resources, Prompts &amp; Gateway` · `Lecture 23 — Claude Skills`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**21 · MCP from First Principles** — the integration problem and why standards win; what MCP is (protocol, server, standard interface); MCP vs tool calling as complementary layers; **host / client / server**; the Tools primitive; discovery, invocation and lifecycle; **JSON-RPC 2.0**; **STDIO** vs **HTTP streaming / SSE / streamable HTTP**; tool context poisoning; gateway architecture; anatomy of a resource; the six questions every integration must answer; one host → many servers.

**22 · MCP: Resources, Prompts &amp; Production Gateway Architecture** — the three primitives and the **control model** (who decides: model, application or user); why resources are a first-class primitive; resource discovery, reading and anatomy (URIs, MIME types, templates); static · dynamic · templated resources; application-chosen context; **MCP Prompts** as reusable interaction templates; prompt arguments and client wiring; gateway filtering, routing, auth and audit; the rule that *discovery is not permission*.

**23 · Claude Skills &amp; the Agent Skills Open Standard** — Skills vs MCP (connectivity vs workflow knowledge); **progressive disclosure** (frontmatter → body → resources); the `SKILL.md` spec (YAML frontmatter, description formulas, security rules); `assets/`, `references/` and `scripts/`; **deterministic code execution** over probabilistic instructions; the testing spectrum (manual · CLI · API · `skill-creator`); validation and packaging; distribution and the `/v1/skills` API.

</details>

**[📂 Lecture 21](./Lecture%2021%20-%20MCP%20Core/)** · **[📂 Lecture 22](./Lecture%2022%20-%20MCP%20Resources%20Prompts%20and%20Gateway/)** · **[📂 Lecture 23](./Lecture%2023%20-%20Claude%20Skills/)** · **[📄 Roadmap: Phase 6](./roadmap.md#-phase-6--integration--interoperability)**

---

### 🟫 Phase 7 — Multimodality

> **Thesis** — Images are numbers too: pixels → patches → visual embeddings → projection → language.

`Lecture 24 — Multimodal AI`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**24 · Multimodal AI: How LLMs Understand Images** — why text-only AI is not enough; what multimodal models understand; **OCR vs MLLM** and when OCR still wins; the text pipeline revisited; pixels, patches and visual embeddings; connecting vision to language (projection layers, positional handling, cross-attention); how models learn **vision–language alignment**; the end-to-end multimodal pipeline; **multimodal vs multi-model**; what a *modality* is and the combinations you will meet; multimodal data ingestion (audio, video, PDF, images, web); screenshots and UI understanding; production concerns — cost, latency, security and evaluation; multimodal RAG.

</details>

**[📂 Lecture 24 workspace](./Lecture%2024%20-%20Multimodal%20AI/)** · **[📄 Roadmap: Phase 7](./roadmap.md#-phase-7--multimodality)**

---

### 🟦 Phase 8 — Production Infrastructure

> **Thesis** — Inference is memory-bandwidth-bound, long AI work must be durable, and a real product needs a database, auth and a release process.

`Lecture 25 — vLLM &amp; PagedAttention` · `Lecture 26 — Durable Execution` · `Lecture 27 — Full-Stack Platform` · `Lecture 28 — Async Indexing &amp; RAG Chat` · `Lecture 29 — PR Reviewer Bot`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**25 · High-Performance Inference: GPU Mechanics, vLLM &amp; PagedAttention** — GPU VRAM and HBM; **compute-bound training vs memory-bandwidth-bound inference**; the inference engine as "the Nginx of LLMs"; **prefill vs decode**; UC Berkeley **vLLM**; **PagedAttention** and KV-cache fragmentation; continuous batching; prefix caching; chunked prefill; MoE kernels; data locality; speculative decoding and quantization families (GGUF/GPTQ/AWQ); the roofline view; self-hosting vs managed APIs.

**26 · Durable Execution &amp; Event-Driven Multi-Agent Workflows (Inngest)** — async vs sync multi-agent architectures; the failure modes of long AI work (gateway timeouts, duplicate tokens, partial writes, crashes); **durable execution** and **state checkpointing**; traditional queues (RabbitMQ · Redis · BullMQ) vs serverless durable engines; the Steps API (`step.run` · `sleep` · `waitForEvent` · `invoke` · `sendEvent`); memoisation and deterministic replay; fan-out/fan-in; concurrency control and rate limiting; `onFailure` and dead-letter flows; workflow versioning.

**27 · Enterprise Full-Stack AI Platform** — client/server separation and REST + SSE API design; Express + TypeScript ESM and Next.js App Router; PostgreSQL + Prisma schema design; **Better Auth** (sessions, Google OAuth); multi-layer workspaces CRUD and access control; **multi-channel ingestion** (text, markdown, Firecrawl, YouTube transcripts, Cloudinary PDFs); source lifecycle and idempotent re-ingestion; monorepo layout and shared types.

**28 · Async Vector Indexing, Streaming RAG Chat &amp; Learning Artifacts** — Inngest background indexing; sliding-window chunking and embeddings; **Pinecone** upserts and namespaces; streaming RAG chat with **interactive citations**; `mem0` memory across a workspace; **Tavily** live web search; structured **learning artifacts** (flashcards, quizzes, summaries, audio overviews); job status and partial-failure UX; cost control and quotas; re-indexing and model migration for live workspaces.

**29 · Hands-On: Autonomous GitHub PR Reviewer Bot** — bot architecture and the Inngest event pipeline; **Octokit** REST integration and PAT auth; paginated PR diffs; diff token-window optimisation (filtering lockfiles, minified and binary files); structured review output with the OpenAI Agents SDK + Zod; prompt design for review (severity, file/line anchoring); webhook routes and signature verification; posting reviews back; rate limits and abuse protection.

</details>

**[📂 25](./Lecture%2025%20-%20vLLM%20and%20PagedAttention/)** · **[📂 26](./Lecture%2026%20-%20Durable%20Execution%20with%20Inngest/)** · **[📂 27](./Lecture%2027%20-%20Full-Stack%20AI%20Platform/)** · **[📂 28](./Lecture%2028%20-%20Async%20Indexing%20and%20RAG%20Chat/)** · **[📂 29](./Lecture%2029%20-%20GitHub%20PR%20Reviewer%20Bot/)** · **[📄 Roadmap: Phase 8](./roadmap.md#-phase-8--production-infrastructure)**

---

### 🟥 Phase 9 — Quality, Evaluation &amp; Safety

> **Thesis** — Assume the model **will** be persuaded, and make persuasion insufficient to move anything that matters. Then prove it with a gate that can block a release.

`Lecture 30 — Evals &amp; Testing` · `Lecture 31 — Security &amp; Guardrails`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**30 · GenAI Evaluation &amp; Testing** — why AI testing is different; the **attribution problem** (an app is a pipeline, not a function); traditional testing vs AI evaluation; why a satisfying answer is not evidence; the anatomy of an eval; observability as the data layer (`AgentResponse` as the second output, `traceId`, `promptVersion`); golden datasets and the six coverage classes; a dataset is a **versioned file, not a generator**; **deterministic evaluation** (JSON validity, schema conformance, tool selection and arguments, refusal behaviour, required facts, forbidden claims, latency/cost budgets); quality as a **vector not a scalar**; **LLM-as-a-judge** and its biases; rubrics, pointwise vs pairwise, human calibration; RAG and system-level metrics (hit · recall@k · precision@k · MRR · nDCG) and the attribution classifier; offline vs online evaluation and the promotion loop; the four-layer pipeline and release gating; component vs end-to-end evals; dataset contamination and regression bugs.

**31 · GenAI Security &amp; Guardrails** — why GenAI breaks traditional security; threat modelling (assets, trust boundaries, blast radius); the **risk equation**; "an LLM is not business logic"; **prompt injection** as a fundamental problem; delivery channels; jailbreaks and why prompts are not controls; why tools change the risk model; **least privilege and capability routing**; never trust, always verify; **guardrails as layers** (input · instruction · **action** · output) that **fail closed**; why filters are not controls; approval **fingerprints**; bidirectional **PII masking** and pseudonymisation; moderation APIs; RBAC at the agent boundary; red-teaming and security regression suites; audit ledger, governance and incident triage.

</details>

**[📂 Lecture 30](./Lecture%2030%20-%20Evals%20and%20Testing/)** · **[📂 Lecture 31](./Lecture%2031%20-%20Security%20and%20Guardrails/)** · **[📄 Roadmap: Phase 9](./roadmap.md#-phase-9--quality-evaluation--safety)**

---

### 🏁 Capstone — Prove the Whole Path

> **Thesis** — One system, every phase, with numbers attached.

Build **one** system that exercises all ten phases: multi-provider client with token accounting · streaming chat with correct UTF-8 framing · typed tools with a sandboxed loop and HITL approval · hybrid retrieval with rerank · agent memory plus a graph entity store · an MCP server with a gateway · multimodal ingestion · durable background indexing · a golden dataset with deterministic checks, an LLM judge and a CI release gate · a threat model, capability routing, canary check and red-team suite.

**Deliverable:** a public repo, an architecture diagram, a metrics table (recall@k · faithfulness · p95 latency · cost per 1k requests) and a one-page incident/limitations statement.

**[📄 Roadmap: Capstone brief](./roadmap.md#-capstone--prove-the-whole-path)**

---

## 🔀 Where This Came From

This repository was assembled by reading, comparing and **de-duplicating** two independent note repositories:

| Source repository | Format | Volume |
| :--- | :--- | :--- |
| 🧭 **`Forward-Deployed-Engineer`** | 19 Lectures → `notes/` (chapter notes + complete notes + PDF + Excalidraw) and `code/` (TypeScript/Node.js codebases + implementation guides) | 19 lectures · **152 chapter notes** |
| 🧪 **`gen-ai-cohort`** | 8 Weeks → 16 Days → `notes/` (chapter notes + completed notes + interview notes) and `code/` (JS/TS codebases + implementation guides) | 16 days · **83 note files** |

**Neither repository is copied here.** This repository is the **map**: it tells you *what* to learn, *in what order*, *from which source file*, and *what to build* to prove you learned it.

### The three merge rules

| # | Rule | Consequence |
| :---: | :--- | :--- |
| 1 | **Basic → Advanced, one thing after another** | Every lecture assumes *only* the lectures before it |
| 2 | **No topic missed** | All **35** source lectures/days and all **235** source note files are mapped to a target lecture |
| 3 | **No topic duplicated** | When both sources teach the same subject it appears **once**, with both listed as depth tiers (e.g. *"FDE L10 = internals, GAC D04 = vendor landscape"*) |

**Result: 35 source lectures/days → 31 merged lectures.**

---

## ✅ Verification Appendices

Six artefacts inside **[`roadmap.md`](./roadmap.md)** exist purely so you can *verify* the claims above rather than trust them.

| Appendix | What it proves | Link |
| :--- | :--- | :--- |
| **A — De-duplication Map** | How each source lecture merged or split, so nothing is taught twice | [📄](./roadmap.md#-appendix-a--de-duplication-map) |
| **B — Coverage Checklist** | **19/19** FDE lectures + **16/16** cohort days mapped ✅ | [📄](./roadmap.md#-appendix-b--full-source-coverage-checklist) |
| **C — Tech Stack, Prerequisites &amp; Study Plan** | What tooling you need, what you must already know, and a 32-week schedule | [📄](./roadmap.md#-appendix-c--tech-stack-prerequisites--study-plan) |
| **D — Progress Tracker** | Tick-off table for all 31 lectures + the capstone | [📄](./roadmap.md#-appendix-d--progress-tracker) |
| **E — Structural Learning Design** | The prerequisite → objective → unlocks chain, plus the capability ladder (which phase maps to which job title) | [📄](./roadmap.md#-appendix-e--structural-learning-design) |
| **F — Source Chapter Coverage Ledger** | **Every chapter file of every source lecture**, mapped to its target lecture | [📄](./roadmap.md#-appendix-f--source-chapter-coverage-ledger) |

> 🔎 **How coverage was verified:** every `##` heading was extracted from all 235 source note files (**2,689 headings**), reduced to **1,470** distinct terms, and machine-checked against `roadmap.md`. The genuine gaps that surfaced — sycophancy, calibrated refusal engineering, `tool_choice` policies, OpenAPI/JSON-Schema tool contracts, Manhattan distance, DiskANN, BM25/lexical retrieval, temporal memory, data locality, dataset contamination, approval fingerprints and ~30 more — were added to the lecture topic lists. The re-run leaves only spelling and inflection variants unmatched.

---

## 🧰 Technology Stack

| Layer | What the curriculum uses |
| :--- | :--- |
| **Languages** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) ![SQL](https://img.shields.io/badge/SQL-4479A1?style=flat-square&logo=postgresql&logoColor=white) ![Cypher](https://img.shields.io/badge/Cypher-008CC1?style=flat-square&logo=neo4j&logoColor=white) ![Bash](https://img.shields.io/badge/Bash-4EAA25?style=flat-square&logo=gnubash&logoColor=white) |
| **Runtime &amp; server** | ![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![SSE](https://img.shields.io/badge/SSE%20%2F%20chunked-FF6F00?style=flat-square) |
| **Validation &amp; typing** | ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white) ![JSON Schema](https://img.shields.io/badge/JSON%20Schema-000000?style=flat-square) ![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white) |
| **Model providers** | ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white) ![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white) ![Anthropic](https://img.shields.io/badge/Claude-D97757?style=flat-square&logo=anthropic&logoColor=white) ![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square) ![Mistral](https://img.shields.io/badge/Mistral-FA520F?style=flat-square&logo=mistralai&logoColor=white) ![Ollama](https://img.shields.io/badge/Ollama-000000?style=flat-square&logo=ollama&logoColor=white) |
| **Vector &amp; search** | ![Qdrant](https://img.shields.io/badge/Qdrant-DC244C?style=flat-square&logo=qdrant&logoColor=white) ![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=flat-square) ![pgvector](https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Tavily](https://img.shields.io/badge/Tavily-4C51BF?style=flat-square) |
| **Data &amp; storage** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) ![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=flat-square&logo=neo4j&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white) ![S3](https://img.shields.io/badge/S3-569A31?style=flat-square&logo=amazons3&logoColor=white) |
| **Orchestration &amp; memory** | ![Inngest](https://img.shields.io/badge/Inngest-000000?style=flat-square) ![BullMQ](https://img.shields.io/badge/BullMQ-DC382D?style=flat-square) ![mem0](https://img.shields.io/badge/mem0-6B46C1?style=flat-square) |
| **Protocols &amp; serving** | ![MCP](https://img.shields.io/badge/MCP%20%2F%20JSON--RPC%202.0-1F6FEB?style=flat-square) ![Skills](https://img.shields.io/badge/Agent%20Skills-D97757?style=flat-square) ![vLLM](https://img.shields.io/badge/vLLM%20%2F%20PagedAttention-FF6F00?style=flat-square) |
| **Auth, media &amp; infra** | ![Better Auth](https://img.shields.io/badge/Better%20Auth-000000?style=flat-square) ![Firecrawl](https://img.shields.io/badge/Firecrawl-FA5C1E?style=flat-square) ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white) |

---

## 🚀 Quick Start

### 1 · Reading the roadmap (no setup required)

```text
1. Open  roadmap.md                              → the master map: 31 lectures · 10 phases
2. Open  roadmap.md → "Lecture NN — …"           → goal · topics · build · source · gate
3. Open  Lecture NN - <Title>/README.md          → that lecture's workspace stub
4. Open  Forward-Deployed-Engineer/ or gen-ai-cohort/  → the source notes listed under "Source"
```

### 2 · Working a lecture (the reading contract)

```text
READ   → the source notes named in the lecture's "Source" line
WRITE  → your own chapter notes into  Lecture NN - <Title>/notes/
BUILD  → the artefact named in the lecture's "Build" line into  Lecture NN - <Title>/code/
TEST   → run it; capture the numbers (latency, cost, recall, validity)
GATE   → answer the lecture's "Gate" question out loud, without notes
RECORD → tick Appendix D and write down the number you measured
```

> ⚠️ If you cannot answer the **Gate** question, the lecture is **not finished**. Re-read; do not move on. That rule is what makes this a curriculum rather than a reading list.

### 3 · Checking you are on track

```text
✅  Appendix E1  → am I allowed to start this lecture? (prerequisites)
✅  Appendix E2  → what job-ready capability does this phase give me?
✅  Appendix F   → where exactly does this topic come from in the sources?
✅  Appendix D   → what have I actually finished?
```

---

## 🗂️ Repository Structure

```text
FDE-and-GenAI-Mastery/
├── README.md                     # ← you are here (orientation, navigation, verification)
├── index.md                      # 📚 chapter index — every written lecture's chapters + notes links
├── roadmap.md                    # ⭐ THE MASTER MAP
│   ├── Design rules · How to use · 31 lectures at a glance · Phase graph
│   ├── Detailed breakdown        # 31 lecture cards: Goal · Topics · Build · Source · Gate
│   ├── Capstone brief
│   └── Appendices A → F          # de-duplication · coverage · stack · tracker · sequence · ledger
│
├── Lecture 01 - Introduction to FDE and AI History/
│   ├── README.md                 # objectives · phase · level · source mapping · checklist
│   ├── index.md                  # chapter index (filled by prompt.md → Block 6)
│   ├── prompt.md                 # generation prompt — git-ignored
│   ├── .gitignore                # ignores prompt.md
│   ├── notes/                    # your own chapter notes
│   ├── code/                     # your rebuilt codebase (Basic Code · Production Code)
│   └── Assignment/
│       └── task.md               # the lecture assignment (filled by prompt.md → Block 5)
├── Lecture 02 - LLM Foundations/
├── Lecture 03 - Attention and Decoding/
├── …
└── Lecture 31 - Security and Guardrails/

Forward-Deployed-Engineer/        # source repository 1  (19 lectures · 152 chapter notes)
gen-ai-cohort/                    # source repository 2  (16 days · 83 note files)
```

> 🛠️ **Every lecture ships a `prompt.md`** — the generation prompt for that lecture. Open it, change only the **chapter number** in Block 1, and run the blocks in order: chapters → complete notes → basic code → production code → assignment → index. `prompt.md` is **git-ignored** (it is your personal working file), and the generated output lands in `notes/`, `code/`, `index.md` and `Assignment/task.md`.

> 📌 The two source repositories sit **beside** this folder — they are the *inputs*, never edited here. All 31 lecture folders are your **workspaces**.

---

## 📐 Conventions

Every lecture in this repository follows the same four-part contract, so you can move between phases without relearning the layout:

| # | Convention | What it means |
| :---: | :--- | :--- |
| 1 | **One lecture = one workspace** | `Lecture NN - <Title>/` with `README.md` + `notes/` + `code/`. |
| 2 | **The roadmap is the single source of truth** | Topics, build task and gate live in `roadmap.md`; the workspace stub links to it and never restates it — so nothing is duplicated. |
| 3 | **Notes are yours, not a copy** | You write your own chapter notes from the source files. Copying the source defeats the purpose. |
| 4 | **Claims are measured** | Any number you quote — latency, cost, recall@k, first-pass validity — must come from a command you can re-run. |

---

## 🛣️ Roadmap

| Status | Item |
| :---: | :--- |
| ✅ | All **31 lectures** defined across **10 phases**, ordered basic → advanced |
| ✅ | **31 workspace folders** scaffolded with `README.md` + `notes/` + `code/` |
| ✅ | Master roadmap with per-lecture **Goal · Topics · Build · Source · Gate** |
| ✅ | **6 verification appendices** (de-duplication · coverage · stack · tracker · sequence · ledger) |
| ✅ | **35/35** source lectures/days and **235** source note files mapped — **0 duplicates** |
| ✅ | **Lectures 01–06 notes written** — 8 + 8 + 9 + 9 + 9 + 8 chapters with consolidated notes, a [chapter index](./index.md) and an assignment each · *(6 of 31 lectures)* |
| ✅ | **Lecture 02 code built** — [Basic Code](./Lecture%2002%20-%20LLM%20Foundations/code/Basic%20Code/) with the real `tiktoken` tokenizer and a 10-chapter implementation guide |
| ✅ | **Lecture 03 code built** — [Basic Code](./Lecture%2003%20-%20Attention%20and%20Decoding/code/Basic%20Code/) with 15 attention, block, logits, decoding and position endpoints and an 11-chapter implementation guide |
| ✅ | **Lecture 04 code built** — [Basic Code](./Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/code/Basic%20Code/) calling a **real** provider: 3 endpoints, one `Provider` interface across 5 providers, a context-budget guard, retry with backoff + jitter, a cost/slop/telemetry ledger per call and a 10-chapter implementation guide |
| ✅ | **Lecture 05 code built** — [Basic Code](./Lecture%2005%20-%20Prompt%20Engineering/code/Basic%20Code/) as a **prompt-pattern lab**: 7 endpoints, four patterns built from one assembler, delimiters with escaping, an enforceable output contract, input/output/tool guardrails, and a prompt registry with a golden set, six metrics and a regression gate — plus a 10-chapter implementation guide |
| ✅ | **Lecture 06 code built** — [Basic Code](./Lecture%2006%20-%20Chatbots%20and%20Context/code/Basic%20Code/) as a **stateless chatbot microservice**: 9 endpoints, a session store the model lacks, a **derived** token budget, a seven-layer context manager (anchor · summary · recall · token-budgeted window), durable user memory with erasure, SSE streaming with TTFT/ITL and cancellation, and grounded refusal with a deterministic citation verifier — runnable with **no API key** — plus a 14-chapter implementation guide |
| 🔜 | Your own chapter notes landing in each `notes/` folder as you progress |
| 🔜 | Your rebuilt codebases landing in each `code/` folder as you progress |
| 🔜 | The **capstone** system, with a metrics table and an incident/limitations statement |

> 🟢 This repository is a **living workspace** — it is meant to be filled in lecture by lecture.

---

## 🤝 Contributing

1. **Read the [Conventions](#-conventions) table** and the [reading contract](#2--working-a-lecture-the-reading-contract).
2. **Keep the four-part contract:** workspace stub → your notes → your code → measured numbers.
3. **Update the roadmap first:** if you add a topic, add it to `roadmap.md` (and Appendix A if it changes a mapping) **before** writing notes — never fork the source of truth.
4. **Prove your numbers:** any metric you quote should be reproducible from a command in your codebase.
5. **Encode links correctly:** paths contain spaces, so use `%20` (e.g. `./Lecture%2012%20-%20Vector%20Embeddings/`).

Pull requests that improve depth, fix a wrong claim, or add a missing failure mode are especially welcome. 🎉

---

## 📄 License &amp; Attribution

This repository is an **educational curriculum**. Lecture content, notes and diagrams are derived from the two source repositories listed under **[Where This Came From](#-where-this-came-from)** and from the referenced papers — notably *"Attention Is All You Need"* (Vaswani et al., 2017) — which remain the property of their respective authors. Code samples are provided for learning and reference; verify against your own security, licensing and compliance requirements before production use.

---

<div align="center">

### ⭐ If this curriculum helps you, star the repository — it makes the next lecture easier to find.

[![GitHub](https://img.shields.io/badge/GitHub-Amie--dev-181717?style=for-the-badge&logo=github)](https://github.com/Amie-dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Aminul-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/aminul-dev/)
[![Twitter](https://img.shields.io/badge/Twitter-@AminulIsla65775-000000?style=for-the-badge&logo=x)](https://x.com/AminulIsla65775)

**[📑 Master Roadmap](./roadmap.md)** · **[📖 Curriculum Navigation](#-curriculum-navigation)** · **[🚀 Quick Start](#-quick-start)** · **[✅ Verification](#-verification-appendices)**

*Built for Forward Deployed Engineers who measure what they ship.*

</div>
