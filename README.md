<div align="center">

# 🧭 FDE &amp; GEN-AI — Merged Learning Repository

### 🧠 One Curriculum, Two Repositories — From *"What Is a Token?"* to Production-Grade Enterprise AI

*Forward Deployed Engineering · LLM internals · Agents &amp; Tools · RAG &amp; Knowledge Systems · MCP · Multimodal · Evals · Security*

[![Lectures](https://img.shields.io/badge/Lectures-46-blueviolet?style=for-the-badge)](#-curriculum-navigation)
[![Phases](https://img.shields.io/badge/Phases-11_(Build_%E2%86%92_Connect_%E2%86%92_Ship)-2ea44f?style=for-the-badge)](#-learning-path)
[![Source Lectures Merged](https://img.shields.io/badge/FDE_Sessions_Covered-24%2F24_%2B_Code_Mode-orange?style=for-the-badge)](#-where-this-came-from)
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

**[📖 Start the Curriculum](#-curriculum-navigation)** · **[🗺️ Learning Path](#-learning-path)** · **[🚀 Quick Start](#-quick-start)** · **[📑 Master Roadmap v1](./roadmap-v1.md)** · **[📚 Chapter Index](./index%20v1.md)** · **[✅ Verification](#-verification-appendices)**

</div>

---

## 🧭 Table of Contents

| | Section | What's inside |
| :---: | :--- | :--- |
| 🎯 | **[Repository Overview](#-repository-overview)** | What this repository is and who it is for |
| 📊 | **[Repository at a Glance](#-repository-at-a-glance)** | Hard numbers: lectures, phases, topics, files, coverage |
| 🗺️ | **[Learning Path](#-learning-path)** | The 11-phase route across 3 Macro Stages (Build → Connect → Ship) |
| 📚 | **[Curriculum Navigation](#-curriculum-navigation)** | All 46 lectures with folder links, stage, level and phase |
| 📑 | **[Chapter Index](./index%20v1.md)** | Every written lecture's chapters — number, title, one-line summary and a link to each `notes/` file |
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
| 🎓 Merged lectures | **46** (`Build: L01–L23` · `Connect: L24–L32` · `Ship: L33–L46`) |
| 🧭 Learning phases | **11** (Phase 0 → 10 across 3 Macro Stages) |
| 📚 Source lectures/days merged | **35** (19 `Forward-Deployed-Engineer` + 16 `gen-ai-cohort`) |
| 📓 Source note files mapped | **235** (152 FDE chapters + 83 cohort note files) |
| 🧾 Indexed sub-topics | **454+** |
| 🗂️ Lecture workspace folders | **46** (each with `notes/` + `code/` + `Assignment/`) |
| ✍️ Roadmap volume | **649 lines** (`roadmap-v1.md`) |
| ✅ Source coverage | **35 / 35** lectures &amp; days mapped + **24 / 24** FDE sessions + Code Mode |
| 🔁 Duplicated topics | **0** |
| 🧩 Verification appendices | **5** (A → E in `roadmap-v1.md`) |
| 🏁 Capstone | **1** end-to-end system brief |

> 💡 Every number above is derived from the repository contents — the 45-lecture curriculum and topic map live in [`roadmap-v1.md`](./roadmap-v1.md), and the chapter index lives in [`index v1.md`](./index%20v1.md).

---

## 🗺️ Learning Path

Follow the phases **in order** — each one assumes only the phase before it. Colour squares match the **[Phase Highlights](#-phase-highlights)** below.

| Phase | Stage | Lectures | Colour | You leave able to… |
| :---: | :---: | :--- | :---: | :--- |
| **0 · Orientation** | Build | 01 | ⬜ | Discover the *real* business problem, and narrate rules → ML → n-grams → RNN → Transformer |
| **1 · Foundations** | Build | 02 · 03 | 🟦 | Explain how an LLM actually produces a token: tokens → vectors → attention → logits → sampling |
| **2 · Application Layer &amp; Harness** | Build | 04 · 05 · 06 · 07 · 08 | 🟩 | Call models across SDKs, engineer prompts, budget tokens, stream SSE, route dynamically, and govern coding harnesses (`AGENTS.md`, `Pi`, SDD/TDD) |
| **3 · Agency, Graphs &amp; Loops** | Build | 09 · 10 · 11 · 12 · 13 · 14 | 🟨 | Give a model typed tools, sandbox it, add HITL, enforce Zod schemas, build an Agent SDK, orchestrate LangGraph/LangSmith, and run bounded Plan-Act-Verify &amp; A2A loops |
| **4 · Embeddings &amp; ANN** | Build | 15 · 16 · 17 · 18 | 🟧 | Represent meaning as vectors, then store and search billions of them with ANN indexes (IVF, HNSW, PQ, DiskANN) |
| **5 · RAG, Memory &amp; Graphs** | Build | 19 · 20 · 21 · 22 · 23 | 🟥 | Build grounded RAG end-to-end, prove retrieval quality, add vectorless trees, agent memory with poisoning defence, and ontology-driven temporal GraphRAG |
| **6 · Enterprise Data &amp; SQL** | Connect | 24 · 25 · 26 | 🟣 | Map enterprise data catalogues &amp; Apache Ossie, enforce AI data contracts &amp; GDPR cascades, and run AST-validated semantic Text-to-SQL + sandboxed Python |
| **7 · Connectors, Code Mode &amp; CDC** | Connect | 27 · 28 · 29 · 30 · 31 · 32 | 🟪 | Connect systems via MCP &amp; Gateways, package Skills, adapt OpenAPI-to-MCP, collapse 2,500+ APIs with Cloudflare Code Mode, and sync via Inngest + CDC/DLQ |
| **8 · Multimodality &amp; Agent Apps** | Ship | 33 · 34 · 35 · 36 · 37 · 38 | 🟫 | Parse multimodal docs, ship full-stack RAG &amp; PR reviewer apps, stream `AG-UI` / `MCP Apps`, scale on K8s + KEDA, and isolate agents in MicroVM/Docker/Cloudflare/AIO sandboxes |
| **9 · Distributed &amp; Sovereign Inference** | Ship | 39 · 40 | 🟦 | Serve models economically with vLLM, quantization &amp; Indic/sovereign models, and scale multi-node disaggregated prefill/decode (`SGLang`, `llm-d`, `Dynamo`) |
| **10 · Quality, FinOps, Identity &amp; Security** | Ship | 41 · 42 · 43 · 44 · 45 · 46 | 🟥 | Gate releases with evals, Z3 neuro-symbolic invariants, OTel/FOCUS FinOps, `flagd` canaries, OIDC/SCIM/ReBAC identity, OWASP Agentic/MCP guardrails &amp; AI BOM |

> 🧭 **Cross-cutting note:** Phase 10 is not "last" in spirit — security, identity, observability and evaluation apply to every system you build from Phase 2 onwards. Read Phase 10 as the **certification layer**.

---

## 📚 Curriculum Navigation

| # | Lecture | Stage / Phase | Level | Workspace | Roadmap |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **01** | ⬜ Introduction to FDE and AI History | Build · 0 | 🟢 | [📂](./Lecture%2001%20-%20Introduction%20to%20FDE%20and%20AI%20History/) | [📄](./roadmap-v1.md#-phase-0--orientation-stage-1-build) |
| **02** | 🟦 LLM Foundations | Build · 1 | 🟢 | [📂](./Lecture%2002%20-%20LLM%20Foundations/) | [📄](./roadmap-v1.md#-phase-1--llm-foundations-stage-1-build) |
| **03** | 🟦 Attention and Decoding | Build · 1 | 🟢 | [📂](./Lecture%2003%20-%20Attention%20and%20Decoding/) | [📄](./roadmap-v1.md#-phase-1--llm-foundations-stage-1-build) |
| **04** | 🟩 LLM APIs, Multi-SDK, Caching &amp; Reasoning Models | Build · 2 | 🟢 | [📂](./Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/) | [📄](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build) |
| **05** | 🟩 Prompt Engineering | Build · 2 | 🟢 | [📂](./Lecture%2005%20-%20Prompt%20Engineering/) | [📄](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build) |
| **06** | 🟩 Chatbots, Context Budgeting &amp; Compaction | Build · 2 | 🟡 | [📂](./Lecture%2006%20-%20Chatbots%20and%20Context/) | [📄](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build) |
| **07** | 🟩 AI Streaming | Build · 2 | 🟡 | [📂](./Lecture%2007%20-%20AI%20Streaming/) | [📄](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build) |
| **08** | 🟩 Model Routing &amp; Agent Harness Velocity (`AGENTS.md`, SDD/TDD) | Build · 2 | 🟡 | [📂](./Lecture%2008%20-%20Model%20Routing%20and%20Harness%20Velocity/) | [📄](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build) |
| **09** | 🟨 Tool Calling | Build · 3 | 🟡 | [📂](./Lecture%2009%20-%20Tool%20Calling/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **10** | 🟨 AI Agents, Sandboxing &amp; HITL | Build · 3 | 🟡 | [📂](./Lecture%2010%20-%20AI%20Agents%20and%20HITL/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **11** | 🟨 Structured Outputs | Build · 3 | 🟡 | [📂](./Lecture%2011%20-%20Structured%20Outputs/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **12** | 🟨 Agent SDK from Scratch | Build · 3 | 🟠 | [📂](./Lecture%2012%20-%20Agent%20SDK%20from%20Scratch/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **13** | 🟨 LangChain, LangGraph &amp; LangSmith | Build · 3 | 🟡 | [📂](./Lecture%2013%20-%20LangChain%20LangGraph%20LangSmith/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **14** | 🟨 Loop Engineering &amp; A2A Protocol | Build · 3 | 🟠 | [📂](./Lecture%2014%20-%20Loop%20Engineering%20and%20A2A%20Protocol/) | [📄](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build) |
| **15** | 🟧 Vector Embeddings | Build · 4 | 🟢 | [📂](./Lecture%2015%20-%20Vector%20Embeddings/) | [📄](./roadmap-v1.md#-phase-4--vector-meaning--ann-retrieval-stage-1-build) |
| **16** | 🟧 Semantic Search Project | Build · 4 | 🟡 | [📂](./Lecture%2016%20-%20Semantic%20Search%20Project/) | [📄](./roadmap-v1.md#-phase-4--vector-meaning--ann-retrieval-stage-1-build) |
| **17** | 🟧 Vector Search and Storage | Build · 4 | 🟡 | [📂](./Lecture%2017%20-%20Vector%20Search%20and%20Storage/) | [📄](./roadmap-v1.md#-phase-4--vector-meaning--ann-retrieval-stage-1-build) |
| **18** | 🟧 Vector Databases and ANN | Build · 4 | 🟠 | [📂](./Lecture%2018%20-%20Vector%20Databases%20and%20ANN/) | [📄](./roadmap-v1.md#-phase-4--vector-meaning--ann-retrieval-stage-1-build) |
| **19** | 🟥 RAG | Build · 5 | 🟡 | [📂](./Lecture%2019%20-%20RAG/) | [📄](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build) |
| **20** | 🟥 Advanced RAG *(+ Provenance &amp; Abstention)* | Build · 5 | 🟠 | [📂](./Lecture%2020%20-%20Advanced%20RAG/) | [📄](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build) |
| **21** | 🟥 Vectorless RAG and LLM Wiki | Build · 5 | 🟠 | [📂](./Lecture%2021%20-%20Vectorless%20RAG%20and%20LLM%20Wiki/) | [📄](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build) |
| **22** | 🟥 Agent Memory Systems *(+ TTL &amp; Poisoning Defence)* | Build · 5 | 🟠 | [📂](./Lecture%2022%20-%20Agent%20Memory%20Systems/) | [📄](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build) |
| **23** | 🟥 Graph Databases &amp; Temporal GraphRAG | Build · 5 | 🟠 | [📂](./Lecture%2023%20-%20Graph%20Databases%20and%20GraphRAG/) | [📄](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build) |
| **24** | 🟣 Enterprise Data Discovery &amp; Apache Ossie | Connect · 6 | 🟠 | [📂](./Lecture%2024%20-%20Enterprise%20Data%20Discovery%20and%20Apache%20Ossie/) | [📄](./roadmap-v1.md#-phase-6--enterprise-data-semantics--sql-stage-2-connect) |
| **25** | 🟣 AI Data Contracts &amp; Lakehouse Lifecycle | Connect · 6 | 🟠 | [📂](./Lecture%2025%20-%20AI%20Data%20Contracts%20and%20Lakehouse%20Lifecycle/) | [📄](./roadmap-v1.md#-phase-6--enterprise-data-semantics--sql-stage-2-connect) |
| **26** | 🟣 Semantic Text-to-SQL &amp; Analytical Python | Connect · 6 | 🔴 | [📂](./Lecture%2026%20-%20Semantic%20Text-to-SQL%20and%20Analytical%20Python/) | [📄](./roadmap-v1.md#-phase-6--enterprise-data-semantics--sql-stage-2-connect) |
| **27** | 🟪 MCP Core | Connect · 7 | 🟡 | [📂](./Lecture%2027%20-%20MCP%20Core/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **28** | 🟪 MCP Resources, Prompts and Gateway | Connect · 7 | 🟠 | [📂](./Lecture%2028%20-%20MCP%20Resources%20Prompts%20and%20Gateway/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **29** | 🟪 Claude Skills | Connect · 7 | 🟠 | [📂](./Lecture%2029%20-%20Claude%20Skills/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **30** | 🟪 Enterprise APIs, OpenAPI-to-MCP &amp; Computer-Use | Connect · 7 | 🟠 | [📂](./Lecture%2030%20-%20Enterprise%20APIs%20OpenAPI-to-MCP%20and%20Computer-Use/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **31** | 🟪 Cloudflare Code Mode MCP | Connect · 7 | 🟠 | [📂](./Lecture%2031%20-%20Cloudflare%20Code%20Mode%20MCP/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **32** | 🟪 Durable Execution (Inngest) &amp; CDC Workflows | Connect · 7 | 🟠 | [📂](./Lecture%2032%20-%20Durable%20Execution%20with%20Inngest/) | [📄](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect) |
| **33** | 🟫 Multimodal AI | Ship · 8 | 🟠 | [📂](./Lecture%2033%20-%20Multimodal%20AI/) | [📄](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship) |
| **34** | 🟫 Full-Stack AI Platform | Ship · 8 | 🔴 | [📂](./Lecture%2034%20-%20Full-Stack%20AI%20Platform/) | [📄](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship) |
| **35** | 🟫 Async Indexing and RAG Chat | Ship · 8 | 🔴 | [📂](./Lecture%2035%20-%20Async%20Indexing%20and%20RAG%20Chat/) | [📄](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship) |
| **36** | 🟫 GitHub PR Reviewer Bot | Ship · 8 | 🟠 | [📂](./Lecture%2036%20-%20GitHub%20PR%20Reviewer%20Bot/) | [📄](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship) |
| **37** | 🟫 Agent UIs (`AG-UI`, `MCP Apps`), K8s &amp; KEDA | Ship · 8 | 🔴 | [📂](./Lecture%2037%20-%20Agent%20UIs%20K8s%20and%20KEDA%20Scaling/) | [📄](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship) |
| **38** | 🟫 AI Agent Sandboxes All-in-One (`MicroVMs`, `Docker`, `Cloudflare`, `E2B`, `AIO`) | Ship · 8 | 🔴 | [📂](./Lecture%2038%20-%20AI%20Agent%20Sandboxes%20All-in-One/) | [📄](./roadmap-v1.md#-phase-8--multimodality-fullstack-apps--agent-scaling-stage-3-ship) |
| **39** | 🟦 vLLM, PagedAttention, Quantization &amp; Indic Models | Ship · 9 | 🔴 | [📂](./Lecture%2039%20-%20vLLM%20and%20PagedAttention/) | [📄](./roadmap-v1.md#-phase-9--distributed--sovereign-inference-stage-3-ship) |
| **40** | 🟦 Distributed Inference (`SGLang`, `llm-d`, `Dynamo`) | Ship · 9 | 🔴 | [📂](./Lecture%2040%20-%20Distributed%20Inference%20SGLang%20llm-d%20and%20Dynamo/) | [📄](./roadmap-v1.md#-phase-9--distributed--sovereign-inference-stage-3-ship) |
| **41** | 🟥 Evals and Testing | Ship · 10 | 🟡 | [📂](./Lecture%2041%20-%20Evals%20and%20Testing/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **42** | 🟥 Neuro-Symbolic Verification (`Z3`, `GEPA`) | Ship · 10 | 🔴 | [📂](./Lecture%2042%20-%20Neuro-Symbolic%20Verification%20Z3%20and%20GEPA/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **43** | 🟥 AI Observability (`OTel`, `OpenObserve`) &amp; FOCUS FinOps | Ship · 10 | 🟠 | [📂](./Lecture%2043%20-%20AI%20Observability%20OTel%20and%20FOCUS%20FinOps/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **44** | 🟥 Progressive Autonomy (`flagd`) &amp; Safe Releases | Ship · 10 | 🟠 | [📂](./Lecture%2044%20-%20Progressive%20Autonomy%20flagd%20and%20Safe%20Releases/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **45** | 🟥 Enterprise Identity (`OIDC`, `SCIM`, `authentik`, `ReBAC`) | Ship · 10 | 🔴 | [📂](./Lecture%2045%20-%20Enterprise%20Identity%20OIDC%20SCIM%20and%20ReBAC/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **46** | 🟥 Security, Guardrails, OWASP Agentic/MCP &amp; AI BOM | Ship · 10 | 🔴 | [📂](./Lecture%2046%20-%20Security%20and%20Guardrails/) | [📄](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship) |
| **★** | 🏁 Single-Engagement Capstone | All | 🔴 | ➖ | [📄](./roadmap-v1.md#-capstone--single-engagement-proving-ground) |

**Legend:** 🟢 Beginner · 🟡 Intermediate · 🟠 Advanced · 🔴 Expert

> 🧭 **Every workspace folder follows the same layout:** `README.md` (objectives · phase · level · source mapping · checklist) · `notes/` (your own notes) · `code/` (your rebuild) · `Assignment/task.md`. The **complete topic list, build task and gate** for each lecture live in **[`roadmap-v1.md`](./roadmap-v1.md)** — the single source of truth, so no topic is ever duplicated.

---

## 📖 Phase Highlights

Each phase below is summarised twice: a one-line thesis and a lecture chip list for scanning, plus a collapsible **full breakdown** naming what each lecture in that phase actually teaches. Colour squares match the **[Learning Path](#-learning-path)**.

---

### ⬜ Phase 0 — Orientation *(Stage 1: Build)*

> **Thesis** — The job is not to build the chatbot the client asked for; it is to find the business problem underneath it, and the history of AI explains why today's tools look the way they do.

`Lecture 01`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**01 · Introduction to FDE and AI History** — the FDE role and discovery workflow; the e-commerce case study (50k daily queries); the three iterative attempts (rules → ML classifier → naïve LLM); Symbolic AI and expert systems (fact base + rule base + inference engine); ELIZA and the illusion of understanding; the combinatorial explosion of handwritten rules; the ML paradigm shift $Y = f(X; \Theta)$; feature-engineering bottleneck and representation learning; statistical n-grams and the sparsity problem; RNN hidden-state decay; the Attention breakthrough; and the four properties of a production AI system — **grounded · observable · secure · actionable**.

</details>

**[📂 Lecture 01 workspace](./Lecture%2001%20-%20Introduction%20to%20FDE%20and%20AI%20History/)** · **[📄 Roadmap: Phase 0](./roadmap-v1.md#-phase-0--orientation-stage-1-build)**

---

### 🟦 Phase 1 — LLM Foundations *(Stage 1: Build)*

> **Thesis** — An LLM is a next-token probability machine: text → tokens → vectors → attention → logits → softmax → one token, appended and repeated.

`Lecture 02 — LLM Foundations` · `Lecture 03 — Attention &amp; Decoding`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**02 · LLM Foundations: Next-Token Prediction, Tokenization &amp; Embeddings** — autoregressive next-token prediction; why text must become numbers; token IDs are *labels, not measurements*; word-level vs character-level vs **subword (BPE/WordPiece)** tokenization; `tiktoken` and tokenizer comparison; dense embeddings $\mathbb{R}^{d_{\text{model}}}$; positional encodings; the complete tokenization → embedding → input pipeline; training vs inference phase.

**03 · Attention, Transformer Architecture &amp; Decoding Strategies** — the problem attention solves; the **Q, K, V** framework; scaled dot-product attention $\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$ and *why* $\frac{1}{\sqrt{d_k}}$; multi-head attention; self-attention vs recurrent vs convolutional; residual streams and the abstraction hierarchy; hidden state → logits; softmax, temperature, top-p/top-k, greedy vs stochastic sampling and beam search; the complete LLM pipeline.

</details>

**[📂 Lecture 02](./Lecture%2002%20-%20LLM%20Foundations/)** · **[📂 Lecture 03](./Lecture%2003%20-%20Attention%20and%20Decoding/)** · **[📄 Roadmap: Phase 1](./roadmap-v1.md#-phase-1--llm-foundations-stage-1-build)**

---

### 🟩 Phase 2 — Application Layer &amp; Harness Velocity *(Stage 1: Build)*

> **Thesis** — A raw model is an engine, not a car: your application supplies the keys, the dashboard, the fuel budget, dynamic model routing, and an `AGENTS.md` + SDD/TDD harness.

`Lecture 04 — LLM APIs &amp; Multi-SDK` · `Lecture 05 — Prompt Engineering` · `Lecture 06 — Chatbots &amp; Context` · `Lecture 07 — AI Streaming` · `Lecture 08 — Model Routing &amp; Harness Velocity`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**04 · LLM APIs, Multi-SDK, Prompt Caching &amp; Reasoning Models** — GenAI apps vs raw LLMs; the 4 invariant request components; chat roles; token economics, `usage` metadata and **prompt caching**; **reasoning models**; rate limits and throttling; **OpenAI · Gemini · Groq · Mistral · Claude · Ollama** in one interface; SDK vs direct REST; Node + Express + TypeScript + Zod setup; client singletons; telemetry and audit; API-key hygiene; **AI slop** and model collapse.

**05 · Prompt Engineering** — zero-shot, few-shot and in-context learning; Chain-of-Thought and when it *hurts*; role-play/persona; model-specific formats (**ChatML · Alpaca · INST · FLAN-T5**); prompt hygiene and delimiters; GIGO; direct vs indirect prompt injection (first contact); distillation and extraction attacks; moderation APIs; prompt versioning.

**06 · Chatbots, Context Budgeting &amp; Compaction** — statelessness as an application problem; context-window budget; $O(N^2)$ token accumulation; lost-in-the-middle; sliding window, compaction and rolling summaries; parametric vs in-context working memory; hallucination mechanics; **sycophancy**; calibrated refusal engineering; the 7-layer defence-in-depth architecture.

**07 · AI Streaming** — generation vs delivery; TTFT and ITL; token/chunk/byte granularity; chunked encoding, **SSE** and WebSockets; the 7 pipeline invariants; backpressure and flow control; `Flux`-style operators; history buffering during a stream; `fetch` + `ReadableStream` + `TextDecoder` on the client; cancellation; production hardening.

**08 · Model Routing &amp; Agent Harness Velocity** — complexity-based dynamic **model routing** between fast and deliberative models; the **`AGENTS.md`** repository instruction standard; the **`Pi`** coding harness; **`Superpowers`** composable skills; **Spec-Driven Development (SDD)** &amp; **Test-Driven Development (TDD)** for AI coding; independent automated review loops; sandboxed execution.

</details>

**[📂 Lecture 04](./Lecture%2004%20-%20LLM%20APIs%20and%20Multi-SDK/)** · **[📂 Lecture 05](./Lecture%2005%20-%20Prompt%20Engineering/)** · **[📂 Lecture 06](./Lecture%2006%20-%20Chatbots%20and%20Context/)** · **[📂 Lecture 07](./Lecture%2007%20-%20AI%20Streaming/)** · **[📂 Lecture 08](./Lecture%2008%20-%20Model%20Routing%20and%20Harness%20Velocity/)** · **[📄 Roadmap: Phase 2](./roadmap-v1.md#-phase-2--application-layer--harness-velocity-stage-1-build)**

---

### 🟨 Phase 3 — Agency, Graphs &amp; Loop Engineering *(Stage 1: Build)*

> **Thesis** — A tool call is an untrusted proposal, not an instruction. Bound the loop, verify schemas, isolate sandboxes, and orchestrate stateful graphs with explicit recovery paths.

`Lecture 09 — Tool Calling` · `Lecture 10 — Agents, Sandboxing &amp; HITL` · `Lecture 11 — Structured Outputs` · `Lecture 12 — Agent SDK from Scratch` · `Lecture 13 — LangChain, LangGraph &amp; LangSmith` · `Lecture 14 — Loop Engineering &amp; A2A`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**09 · Tool Calling &amp; Function Execution Loops** — from token prediction to tool augmentation; tool definitions as an **OpenAPI / JSON Schema contract**; the 5-step HTTP wire-protocol lifecycle; multi-step chaining and **double-turn** tool calling; multi-tool routing and `tool_choice`; the **ReAct** paradigm; self-healing error recovery; token accumulation and the economic ledger; tool = capability + permission.

**10 · AI Agents from First Principles: Agency, Sandboxing &amp; HITL** — the agency spectrum (4 progressive levels); the 6-component agent model (LLM + memory + tools + guardrails + planning); loop and harness engineering; threat modelling for filesystem agents; the hierarchy of isolation tiers; workspace sandboxing; the **3-tier tool authorization policy matrix**; asynchronous durable pause/resume; enterprise agent patterns.

**11 · Structured Outputs: Schema, Enforcement, Validation &amp; Repair** — the integration gap; "a schema is a form the application writes and the model fills"; why "just ask for JSON" fails; JSON Schema design for LLMs; the strict-mode subset and its silent limits; the three layers of enforcement (prompt → decoder → validation); **Outlines / Guidance** and grammar compilation; structural vs semantic validation; `block` vs `review` severities; repair loops and the fallback ladder; first-pass validity and issue distribution.

**12 · Building an Agent SDK from Scratch** — stateful SDK vs stateless API; the core triad; the fluent `AgentBuilder` pattern; harness prompting and the 5-stage ReAct pipeline (`INITIAL → THINK → TOOL_REQUEST → ANALYSE → OUTPUT`); `ITool` and dynamic schema auto-generation; the tool registry; stateful `messageHistory`; the event-driven interceptor pattern; `MAX_LOOP` bounds; multi-agent swarms; packaging for OpenAI and Gemini.

**13 · LangChain, LangGraph &amp; LangSmith** — $\text{Agent} = \text{Model} + \text{Harness}$; universal provider delivery model (`initChatModel`); message protocols (`SystemMessage`, `HumanMessage`, `AIMessage`, `ToolMessage`); typed tool calling with Zod &amp; Tavily; token streaming; structured output strategies; stateful cyclic graph orchestration with `StateGraph`, `StateSchema`, and channel reducers; Pregel super-step execution; checkpointers (`MemorySaver`, thread persistence); human-in-the-loop breakpoints; production case studies (automated Notion study notes &amp; Google Calendar meeting scheduler); zero-code observability, trace waterfalls, state inspection, custom spans with `traceable`, and golden dataset offline evals with `evaluate()`.

**14 · Advanced Loop Engineering, Adaptive Topologies &amp; A2A Protocol** — **Plan-Act-Verify** loops; bounded goal loops; **heartbeat**, schedule, and event triggers; tool permission boundaries &amp; budget caps; **stuck detection**, **retry**, **pivot**, and **escalation**; static vs. **adaptive graphs**; **A2A (Agent-to-Agent)** discovery, Agent Cards, and parallel peer delegation.

</details>

**[📂 Lecture 09](./Lecture%2009%20-%20Tool%20Calling/)** · **[📂 Lecture 10](./Lecture%2010%20-%20AI%20Agents%20and%20HITL/)** · **[📂 Lecture 11](./Lecture%2011%20-%20Structured%20Outputs/)** · **[📂 Lecture 12](./Lecture%2012%20-%20Agent%20SDK%20from%20Scratch/)** · **[📂 Lecture 13](./Lecture%2013%20-%20LangChain%20LangGraph%20LangSmith/)** · **[📂 Lecture 14](./Lecture%2014%20-%20Loop%20Engineering%20and%20A2A%20Protocol/)** · **[📄 Roadmap: Phase 3](./roadmap-v1.md#-phase-3--agency-graphs--loop-engineering-stage-1-build)**

---

### 🟧 Phase 4 — Vector Meaning &amp; ANN Retrieval *(Stage 1: Build)*

> **Thesis** — Represent → store → compare → rank. Meaning becomes geometry, and scale turns geometry into an engineering bargain.

`Lecture 15 — Vector Embeddings` · `Lecture 16 — Semantic Search Project` · `Lecture 17 — Vector Search &amp; Storage` · `Lecture 18 — Vector Databases &amp; ANN`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**15 · Vector Embeddings from First Principles** — the problem of meaning in computers; why numbers at all; **cosine, dot product, Euclidean and Manhattan** similarity; why direction sometimes matters more than distance; the failure of hand-crafted features (one-hot, bag-of-words, TF-IDF); what embeddings actually learn; identity matching vs semantic similarity; embedding model vs generative LLM; the interpretability trap.

**16 · Embeddings Project: Semantic Search &amp; Movie Recommendation** — why not just use an LLM (cost, latency, determinism, scale); **precomputation** as the key insight; the REPRESENT–STORE–COMPARE–RANK mental model; cosine similarity and normalisation in practice; a complete system design with catalog build, index, query, rank and respond.

**17 · Vector Search &amp; Storage** — the scale wall; why relational databases are not enough (and when they *are*); brute-force KNN as the correct baseline; why scalar indexes fail for vectors; the curse of dimensionality; the **ANN family tree**; the recall/latency/memory/cost spectrum; when you do not need ANN.

**18 · Vector Databases &amp; ANN Algorithms** — **IVF** (centroids, `nlist`/`nprobe`, IVF-Flat/PQ/SQ); **HNSW** (`M`/`M0`/`efConstruction`/`efSearch`, layer sampling, tombstones, filtered-search weakness); **Product Quantization** (codebooks, ADC, rescoring); **DiskANN** and the disk-resident family; the five layers of a vector database; hybrid search and RRF; **Qdrant** and **pgvector** hands-on; the wider vendor landscape; sharding, replication, pruning and selectivity; re-indexing, versioning and model migration with rollback.

</details>

**[📂 Lecture 15](./Lecture%2015%20-%20Vector%20Embeddings/)** · **[📂 Lecture 16](./Lecture%2016%20-%20Semantic%20Search%20Project/)** · **[📂 Lecture 17](./Lecture%2017%20-%20Vector%20Search%20and%20Storage/)** · **[📂 Lecture 18](./Lecture%2018%20-%20Vector%20Databases%20and%20ANN/)** · **[📄 Roadmap: Phase 4](./roadmap-v1.md#-phase-4--vector-meaning--ann-retrieval-stage-1-build)**

---

### 🟥 Phase 5 — RAG, Memory &amp; Knowledge Graphs *(Stage 1: Build)*

> **Thesis** — Retrieval sets the ceiling; the prompt can only use what arrived. Ground every answer with provenance, defend agent memory against poisoning, and track bitemporal graph facts.

`Lecture 19 — RAG` · `Lecture 20 — Advanced RAG` · `Lecture 21 — Vectorless RAG &amp; LLM Wiki` · `Lecture 22 — Agent Memory` · `Lecture 23 — Graphs &amp; Temporal GraphRAG`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**19 · RAG: The Open-Book Architecture** — parametric vs non-parametric memory; the two pipelines (offline ingestion, online serving); PDF extraction hazards, cleaning, chunking, metadata and deterministic ids; embeddings at query time (Matryoshka dimensions, symmetric vs asymmetric encoding); the vector index (namespaces, score calibration, top-K, filters, MMR); grounded generation (four-clause contract, the exact refusal sentence, U-shaped attention, citation markers); conversation state and query condensation; evaluation and debugging (recall@K, MRR, nDCG, faithfulness, citation validity, the retrieval-vs-generation 2×2).

**20 · Advanced RAG (+ Provenance &amp; Abstention)** — why basic RAG breaks; three families of chunking; fixed-size overlap arithmetic; structural, semantic and parent-child chunking; score floors calibrated per model and corpus; metadata filtering; hybrid search with **RRF** and **BM25/lexical** retrieval; cross-encoder **rerankers** vs bi-encoders; query translation (rewriting, step-back, sub-queries, **HyDE**); intent routing and multi-source adapters (Postgres · Qdrant · MongoDB · S3); **CRAG** self-reflective evaluation; **provenance tracking &amp; calibrated abstention**; PII masking and jailbreak defence; BullMQ + Redis async indexing.

**21 · Vectorless RAG, Hierarchical Tree Indexing &amp; LLM Wiki Engines** — the abrupt-chunking problem; $\text{Vector Similarity} \neq \text{Relevance}$; tree-structured indexing (the **PageIndex** model); `Root → Chapter → Section → Page` node summaries; AlphaGo-inspired agentic tree traversal; Karpathy's **LLM Wiki** vault paradigm; two-pass retrieval with lazy loading; the four-way architecture comparison.

**22 · Agent Memory Systems (+ TTL &amp; Poisoning Defence)** — context-window failure points; **STM** sliding windows; **LTM taxonomy** (working · episodic · semantic · procedural · graph); dynamic context assembly $\text{STM} + \text{LTM\_RAG} + \text{Query}$; fact extraction; eviction, **TTL/retention policies**, deduplication and contradiction resolution; **memory dreaming**; `mem0`; **memory poisoning defence &amp; provenance verification**; multi-tenant isolation and deletion.

**23 · Graph Databases, Cypher, Neo4j, Ontologies &amp; Temporal GraphRAG** — nodes, edges, properties, labels; SQL vs NoSQL vs native graph (**index-free adjacency**); **formal ontology engineering** (schema-first domain ontologies, type constraints &amp; cardinality vs unconstrained LLM extraction); **bitemporal knowledge graphs** (`valid_from`, `valid_to`, `transaction_time`); **point-in-time multi-hop Cypher queries**; Neo4j architecture and **Bolt** protocol; Node.js `neo4j-driver`; **temporal GraphRAG** and text-to-Cypher.

</details>

**[📂 Lecture 19](./Lecture%2019%20-%20RAG/)** · **[📂 Lecture 20](./Lecture%2020%20-%20Advanced%20RAG/)** · **[📂 Lecture 21](./Lecture%2021%20-%20Vectorless%20RAG%20and%20LLM%20Wiki/)** · **[📂 Lecture 22](./Lecture%2022%20-%20Agent%20Memory%20Systems/)** · **[📂 Lecture 23](./Lecture%2023%20-%20Graph%20Databases%20and%20GraphRAG/)** · **[📄 Roadmap: Phase 5](./roadmap-v1.md#-phase-5--rag-memory--knowledge-graphs-stage-1-build)**

---

### 🟣 Phase 6 — Enterprise Data, Semantics &amp; SQL *(Stage 2: Connect)*

> **Thesis** — Enterprise AI fails when agents guess table names or metric definitions. Ground agents in data catalogues, canonical ontologies, AI data contracts, semantic-layer SQL, and sandboxed Python.

`Lecture 24 — Enterprise Data Discovery &amp; Apache Ossie` · `Lecture 25 — AI Data Contracts &amp; Lakehouse Lifecycle` · `Lecture 26 — Semantic Text-to-SQL &amp; Analytical Python`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**24 · Enterprise Data Discovery, Ontologies &amp; Apache Ossie** — data estates, metadata discovery, ownership, lineage, and data catalogues; synthetic data environments; **canonical entities** &amp; cross-system identity mapping; business vocabularies &amp; semantic metrics; source-of-truth precedence &amp; knowledge provenance; **Apache Ossie** &amp; metadata-aware AI.

**25 · AI Data Contracts, Lakehouse Storage &amp; Knowledge Lifecycle** — LLM extraction/enrichment + deterministic transforms; **AI data contracts** (schema, exception queues, freshness SLAs); **deletion propagation** (GDPR cascade across SQL/vector/graph); **lakehouse &amp; warehouse integration**; tenant-aware filtering; **zero-downtime re-embedding**, knowledge versioning, retention &amp; safe migrations.

**26 · Semantic-Layer Text-to-SQL &amp; Analytical Intelligence** — metadata-guided schema discovery; semantic metric definitions; query decomposition; **SQL AST validation**; schema &amp; column-level authorization; read-only execution &amp; query cost budgets; execution-accuracy evals; multi-step analytical planning; **sandboxed Python** computation; cross-modal (SQL + Vector + Graph) reasoning; **numerical reconciliation**.

</details>

**[📂 Lecture 24](./Lecture%2024%20-%20Enterprise%20Data%20Discovery%20and%20Apache%20Ossie/)** · **[📂 Lecture 25](./Lecture%2025%20-%20AI%20Data%20Contracts%20and%20Lakehouse%20Lifecycle/)** · **[📂 Lecture 26](./Lecture%2026%20-%20Semantic%20Text-to-SQL%20and%20Analytical%20Python/)** · **[📄 Roadmap: Phase 6](./roadmap-v1.md#-phase-6--enterprise-data-semantics--sql-stage-2-connect)**

---

### 🟪 Phase 7 — Connectors, Code Mode &amp; Proactive Workflows *(Stage 2: Connect)*

> **Thesis** — Replace $N \times M$ bespoke integrations with MCP, compress 2,500-endpoint APIs into ~1,000 tokens with Cloudflare Code Mode, and drive continuous freshness via CDC and Inngest.

`Lecture 27 — MCP Core` · `Lecture 28 — MCP Resources, Prompts &amp; Gateway` · `Lecture 29 — Claude Skills` · `Lecture 30 — Enterprise APIs &amp; Computer-Use` · `Lecture 31 — Cloudflare Code Mode MCP` · `Lecture 32 — Durable Execution &amp; CDC`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**27 · MCP Core: Host, Client, Server &amp; Tools** — the integration problem and why standards win; **host / client / server**; the Tools primitive; discovery, invocation and lifecycle; **JSON-RPC 2.0**; **STDIO** vs **Streamable HTTP / SSE**; tool context poisoning; one host → many servers.

**28 · MCP: Resources, Prompts &amp; Production Gateway Architecture** — the three primitives and the **control model** (model, application or user); resource discovery, reading and anatomy (URIs, MIME types, templates); static · dynamic · templated resources; **MCP Prompts** as reusable interaction templates; gateway filtering, routing, auth and audit; the rule that *discovery is not permission*.

**29 · Claude Skills &amp; the Agent Skills Open Standard** — Skills vs MCP (connectivity vs workflow knowledge); **progressive disclosure** (`frontmatter` → `body` → `resources`); the `SKILL.md` spec; `assets/`, `references/` and `scripts/`; **deterministic code execution** over prose; validation, packaging, and the `/v1/skills` API.

**30 · Enterprise APIs, OpenAPI-to-MCP, Idempotency &amp; Computer-Use Fallback** — automated **OpenAPI-to-MCP** adaptation; typed tool contracts; scoped permissions &amp; approval-bound mutations; **idempotency keys** on `POST`/`PATCH` actions; connector governance; **browser &amp; computer-use fallback** (Playwright) for legacy UI-only systems.

**31 · Cloudflare Code Mode &amp; Isolated Code-Execution MCP (`@cloudflare/codemode`)** — solving the tool-schema scaling wall (2M+ tokens → ~1,000 tokens); `codeMcpServer()` and the `codemode` namespace; `openApiMcpServer()` (`search()` + `execute()` over 2,500+ endpoints); **Dynamic Workers** &amp; sandbox isolation; **OAuth 2.1** &amp; scoped delegated execution; `createLegacyMcpHandler` on Cloudflare Workers.

**32 · Durable Execution (Inngest) &amp; Event-Driven CDC Workflows** — async vs sync multi-agent architectures; **durable execution** and **state checkpointing** (`step.run`, `sleep`, `waitForEvent`, `invoke`, `sendEvent`); **Change Data Capture (CDC)** pipelines (Debezium / Postgres WAL) for continuous knowledge freshness; **duplicate-event idempotency** &amp; event ordering; **Dead-Letter Queue (DLQ)** inspection, poison-pill isolation &amp; safe replay workflows.

</details>

**[📂 Lecture 27](./Lecture%2027%20-%20MCP%20Core/)** · **[📂 Lecture 28](./Lecture%2028%20-%20MCP%20Resources%20Prompts%20and%20Gateway/)** · **[📂 Lecture 29](./Lecture%2029%20-%20Claude%20Skills/)** · **[📂 Lecture 30](./Lecture%2030%20-%20Enterprise%20APIs%20OpenAPI-to-MCP%20and%20Computer-Use/)** · **[📂 Lecture 31](./Lecture%2031%20-%20Cloudflare%20Code%20Mode%20MCP/)** · **[📂 Lecture 32](./Lecture%2032%20-%20Durable%20Execution%20with%20Inngest/)** · **[📄 Roadmap: Phase 7](./roadmap-v1.md#-phase-7--connectors-code-mode--proactive-workflows-stage-2-connect)**

---

### 🟫 Phase 8 — Multimodality, Full-Stack Apps &amp; Agent Scaling *(Stage 3: Ship)*

> **Thesis** — Images are numbers too, full-stack products need durable pipelines and auth, and real-time agent UX (`AG-UI`, `MCP Apps`) scales elastically on Kubernetes + KEDA.

`Lecture 33 — Multimodal AI` · `Lecture 34 — Full-Stack AI Platform` · `Lecture 35 — Async Indexing &amp; RAG Chat` · `Lecture 36 — GitHub PR Reviewer Bot` · `Lecture 37 — Agent UIs, K8s &amp; KEDA` · `Lecture 38 — AI Agent Sandboxes All-in-One`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**33 · Multimodal AI: How LLMs Understand Images** — **OCR vs MLLM** and when OCR still wins; pixels, patches and visual embeddings; connecting vision to language (projection layers, positional handling, cross-attention); **vision–language alignment**; **multimodal vs multi-model**; multimodal data ingestion (audio, video, PDF, images, web); screenshots and UI understanding; multimodal RAG.

**34 · Enterprise Full-Stack AI Platform** — client/server separation and REST + SSE API design; Express + TypeScript ESM and Next.js App Router; PostgreSQL + Prisma schema design; **Better Auth** (sessions, Google OAuth); multi-layer workspaces CRUD and access control; **multi-channel ingestion** (text, markdown, Firecrawl, YouTube transcripts, Cloudinary PDFs); source lifecycle and idempotent re-ingestion.

**35 · Async Vector Indexing, Streaming RAG Chat &amp; Learning Artifacts** — Inngest background indexing; sliding-window chunking and embeddings; **Pinecone** upserts and namespaces; streaming RAG chat with **interactive citations**; `mem0` memory across a workspace; **Tavily** live web search; structured **learning artifacts** (flashcards, quizzes, summaries, audio overviews); cost control and quotas.

**36 · Hands-On: Autonomous GitHub PR Reviewer Bot** — bot architecture and the Inngest event pipeline; **Octokit** REST integration and PAT auth; paginated PR diffs; diff token-window optimisation (filtering lockfiles, minified and binary files); structured review output with the OpenAI Agents SDK + Zod; webhook signature verification; rate limits and abuse protection.

**37 · Agent-to-User UIs (`AG-UI`, `MCP Apps`), Kubernetes &amp; KEDA Scaling** — **`AG-UI`** (Agent-User Interaction protocol); **`MCP Apps`** (interactive UI widgets inside MCP hosts); stateless services vs durable worker state; **Kubernetes** pods &amp; queues; **KEDA** event-driven autoscaling; microVM/gVisor **sandbox isolation** &amp; resource limits; managed vs self-hosted runtimes.

**38 · AI Agent Sandboxes All-in-One (`MicroVMs`, `Docker`, `Cloudflare`, `E2B`, `AIO`)** — *Sandbox-as-a-Tool* vs. *Agent-in-Sandbox* topologies; **V8 Isolates vs. Containers vs. `gVisor` vs. Firecracker MicroVMs**; **Docker AI Sandboxes** (microVM + private `dockerd` + host credential proxy); **OpenAI Agents SDK** `SandboxSession` abstraction; **Cloudflare Sandbox SDK (GA)** vs. **Dynamic Workers**; **AIO Sandbox (`agent-infra/sandbox`)** (Browser + Shell + VNC + MCP); and managed platforms (**E2B**, **Modal**, **Daytona**) with snapshots, hibernation &amp; preview URLs.

</details>

**[📂 Lecture 33](./Lecture%2033%20-%20Multimodal%20AI/)** · **[📂 Lecture 34](./Lecture%2034%20-%20Full-Stack%20AI%20Platform/)** · **[📂 Lecture 35](./Lecture%2035%20-%20Async%20Indexing%20and%20RAG%20Chat/)** · **[📂 Lecture 36](./Lecture%2036%20-%20GitHub%20PR%20Reviewer%20Bot/)** · **[📂 Lecture 37](./Lecture%2037%20-%20Agent%20UIs%20K8s%20and%20KEDA%20Scaling/)** · **[📂 Lecture 38](./Lecture%2038%20-%20AI%20Agent%20Sandboxes%20All-in-One/)** · **[📄 Roadmap: Phase 8](./roadmap-v1.md#-phase-8--multimodality-full-stack-apps--agent-scaling-stage-3-ship)**

---

### 🟦 Phase 9 — Distributed &amp; Sovereign Inference *(Stage 3: Ship)*

> **Thesis** — Inference is memory-bandwidth-bound. Serve models economically with vLLM, quantization, sovereign/Indic models, KV-cache reuse, and disaggregated prefill/decode (`SGLang`, `llm-d`, `Dynamo`).

`Lecture 39 — vLLM, Quantization &amp; Indic Models` · `Lecture 40 — Distributed Inference (SGLang, llm-d, Dynamo)`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**39 · High-Performance Inference: vLLM, Quantization &amp; Sovereign / Indic Models** — GPU VRAM and HBM; **compute-bound training vs memory-bandwidth-bound inference**; **prefill vs decode**; **PagedAttention** &amp; continuous batching; **quantization** (AWQ, GPTQ, FP8, INT4) and VRAM-vs-accuracy benchmarks; **hosted vs self-hosted TCO &amp; break-even math**; **RAG vs fine-tuning** decision framework; **sovereign &amp; Indian-language models** (Sarvam, BharatGPT, Krutrim, Airavata) and Indic tokenization/eval considerations.

**40 · Distributed Inference (`SGLang`, `llm-d`, `Dynamo`) &amp; Capacity Engineering** — model-aware routing; **KV cache reuse &amp; offloading** (LMCache / Mooncake); **disaggregated prefill/decode inference**; **SGLang** (RadixAttention), **`llm-d`**, and **NVIDIA Dynamo**; data **residency**, high availability, and TTFT/TPOT cost-capacity engineering.

</details>

**[📂 Lecture 38](./Lecture%2039%20-%20vLLM%20and%20PagedAttention/)** · **[📂 Lecture 39](./Lecture%2040%20-%20Distributed%20Inference%20SGLang%20llm-d%20and%20Dynamo/)** · **[📄 Roadmap: Phase 9](./roadmap-v1.md#-phase-9--distributed--sovereign-inference-stage-3-ship)**

---

### 🟥 Phase 10 — Quality, FinOps, Identity &amp; Security *(Stage 3: Ship)*

> **Thesis** — Never ship an autonomous system without trajectory evals, Z3 invariants, OTel/FOCUS FinOps, `flagd` progressive releases, delegated OIDC/ReBAC identity, and an AI BOM security gate.

`Lecture 41 — Evals &amp; Testing` · `Lecture 42 — Neuro-Symbolic Verification (Z3, GEPA)` · `Lecture 43 — AI Observability &amp; FOCUS FinOps` · `Lecture 44 — Progressive Autonomy (flagd)` · `Lecture 45 — Enterprise Identity (OIDC, SCIM, ReBAC)` · `Lecture 46 — Security, OWASP Agentic/MCP &amp; AI BOM`

<details>
<summary><b>🔎 What this phase teaches</b></summary>

<br>

**41 · GenAI Evaluation &amp; Testing** — the **attribution problem**; observability as the data layer (`AgentResponse`, `traceId`, `promptVersion`); versioned **golden datasets**; **deterministic evaluation**; quality as a **vector not a scalar**; **LLM-as-a-judge** and its biases; RAG metrics (hit · recall@k · precision@k · MRR · nDCG); offline vs online evaluation and CI release gates.

**42 · Neuro-Symbolic Verification, Trajectory Evals, Z3 Constraints &amp; GEPA** — **trajectory evaluation** (step-by-step path &amp; tool-action correctness); **property-based testing**; **neuro-symbolic verification** &amp; deterministic invariants; **Z3 SMT solver constraints** for pre-execution plan/policy validation; evaluation-driven prompt optimization (**GEPA**).

**43 · AI Observability (`OpenTelemetry`, `OpenObserve`) &amp; FOCUS FinOps** — **OpenTelemetry (OTel)** GenAI semantic conventions; **OpenObserve** traces, metrics &amp; logs; quality drift &amp; SLOs; **cost per successful task**; tenant &amp; feature attribution; budgets; **FOCUS-aligned** AI cost reporting.

**44 · Progressive Autonomy, Feature Flags (`OpenFeature`/`flagd`) &amp; Safe Releases** — progressive autonomy (**Shadow → Human-Approved → Scoped Autonomous**); **OpenFeature &amp; `flagd`**; evaluation-based **canaries**; prompt/model/skill versioning; **release manifests**; **technical UAT**; instant rollback &amp; incident recovery.

**45 · Enterprise Identity &amp; Agent Authorization (`OIDC`, `SAML`, `SCIM`, `authentik`, `ReBAC`)** — **OIDC, SAML &amp; SCIM**; **`authentik`** identity provider; scoped &amp; **delegated credentials** (On-Behalf-Of); user-to-tool attribution; **MCP Authorization** spec; **RBAC vs ReBAC** (Relationship-Based Access Control); gateway policy controls.

**46 · GenAI Security, Guardrails, OWASP Agentic/MCP Top 10 &amp; AI Supply Chain (AI BOM)** — threat modelling &amp; blast radius; prompt injection &amp; jailbreaks; **OWASP Top 10 for LLM, Agentic AI &amp; MCP** (tool poisoning, confused deputy, excessive agency); **AI supply chain security** (scanning malicious skills/plugins, model provenance, capability registries); **AI Bills of Materials (AI BOM / CycloneDX ML-BOM)** in CI/CD; fail-closed layered guardrails; bidirectional **PII masking**; red-teaming suites.

</details>

**[📂 Lecture 40](./Lecture%2041%20-%20Evals%20and%20Testing/)** · **[📂 Lecture 41](./Lecture%2042%20-%20Neuro-Symbolic%20Verification%20Z3%20and%20GEPA/)** · **[📂 Lecture 42](./Lecture%2043%20-%20AI%20Observability%20OTel%20and%20FOCUS%20FinOps/)** · **[📂 Lecture 43](./Lecture%2044%20-%20Progressive%20Autonomy%20flagd%20and%20Safe%20Releases/)** · **[📂 Lecture 44](./Lecture%2045%20-%20Enterprise%20Identity%20OIDC%20SCIM%20and%20ReBAC/)** · **[📂 Lecture 45](./Lecture%2046%20-%20Security%20and%20Guardrails/)** · **[📄 Roadmap: Phase 10](./roadmap-v1.md#-phase-10--quality-finops-identity--security-stage-3-ship)**

---

### 🏁 Capstone — Single-Engagement Proving Ground

> **Thesis** — One customer engagement. Every layer of delivery (`Build → Connect → Ship`). From discovery brief to tested deployment, UAT sign-off, FOCUS FinOps report, and handover.

Build **one** system that exercises all eleven phases: multi-provider client with dynamic routing and token accounting · streaming chat with correct UTF-8 framing · typed tools with a sandboxed loop, HITL approval, and `StateGraph` orchestration · hybrid retrieval with rerank, agent memory, and bitemporal GraphRAG · enterprise data contracts, semantic Text-to-SQL, MCP gateway, Cloudflare Code Mode, and Inngest CDC workflows · multimodal ingestion, `AG-UI` / `MCP Apps`, and vLLM / distributed inference · trajectory + Z3 evals, OTel/FOCUS FinOps, `flagd` progressive rollout, OIDC/ReBAC identity, OWASP Agentic/MCP guardrails, and an AI BOM gate.

**Deliverable:** a public repo, an architecture diagram, a metrics table (recall@k · faithfulness · p95 latency · FOCUS cost per successful task) and a one-page incident/limitations statement.

**[📄 Roadmap: Capstone brief](./roadmap-v1.md#-capstone--single-engagement-proving-ground)**

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

**Result: 35 source lectures/days + 24 FDE sessions + Code Mode → 45 lectures across 11 phases (Build → Connect → Ship).**

---

## ✅ Verification Appendices

Five verification appendices inside **[`roadmap-v1.md`](./roadmap-v1.md)** prove completeness and track progress:

| Appendix | What it proves | Link |
| :--- | :--- | :--- |
| **A — Re-Numbering &amp; De-duplication Map** | How each source lecture &amp; session (Old L01–L32 + S01–S24 + Code Mode) mapped to L01–L46 | [📄](./roadmap-v1.md#-appendix-a--re-numbering--de-duplication-map) |
| **B — 24-Session FDE Coverage Checklist** | **24/24** FDE sessions mapped ✅ | [📄](./roadmap-v1.md#-appendix-b--24-session-fde-coverage-checklist) |
| **C — Tech Stack, Prerequisites &amp; Study Plan** | Expanded production stack, prerequisites, and study sequence | [📄](./roadmap-v1.md#-appendix-c--tech-stack-prerequisites--study-plan) |
| **D — Progress Tracker** | Tick-off table for all **46 lectures** + the capstone (**46/46 · 100%**) | [📄](./roadmap-v1.md#-appendix-d--progress-tracker) |
| **E — Structural Learning Design** | The prerequisite → objective → unlocks chain and career capability ladder | [📄](./roadmap-v1.md#-appendix-e--structural-learning-design) |

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
1. Open  roadmap-v1.md                           → the master map: 45 lectures · 11 phases (Build → Connect → Ship)
2. Open  roadmap-v1.md → "Lecture NN — …"        → goal · topics · build · release gate
3. Open  Lecture NN - <Title>/README.md          → that lecture's workspace
4. Open  index v1.md                             → chapter-by-chapter index across all 46 lectures
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
├── index v1.md                   # 📚 chapter index — all 46 lectures' chapters + notes links
├── roadmap-v1.md                 # ⭐ THE MASTER MAP (45 lectures · 11 phases · Build → Connect → Ship)
│   ├── Macro Delivery Phases · Phase Graph · Career Capability Ladder
│   ├── Detailed breakdown        # 45 lecture cards: Goal · Topics · Build · Release Gate
│   ├── Capstone brief
│   └── Appendices A → E          # re-numbering · 24-session coverage · stack · tracker · sequence
│
├── Lecture 01 - Introduction to FDE and AI History/
│   ├── README.md                 # objectives · phase · level · source mapping · checklist
│   ├── index.md                  # chapter index
│   ├── notes/                    # chapter notes + Lecture_NN_Complete_Notes.md
│   ├── code/                     # Basic Code · Production Code
│   └── Assignment/
│       └── task.md               # chapter-wise questions, build tasks & completion gate
├── Lecture 02 - LLM Foundations/
├── …
├── Lecture 24 - Enterprise Data Discovery and Apache Ossie/
├── …
├── Lecture 33 - Multimodal AI/
├── …
└── Lecture 46 - Security and Guardrails/

Forward-Deployed-Engineer/        # source repository 1  (19 lectures · 152 chapter notes)
gen-ai-cohort/                    # source repository 2  (16 days · 83 note files)
```

> 🛠️ **Every lecture ships a `prompt.md`** — the generation prompt for that lecture. Open it, change only the **chapter number** in Block 1, and run the blocks in order: chapters → complete notes → basic code → production code → assignment → index. `prompt.md` is **git-ignored** (it is your personal working file), and the generated output lands in `notes/`, `code/`, `index.md` and `Assignment/task.md`.

> 📌 The two source repositories sit **beside** this folder — they are the *inputs*, never edited here. All 45 lecture folders are your **workspaces**.

---

## 📐 Conventions

Every lecture in this repository follows the same four-part contract, so you can move between phases without relearning the layout:

| # | Convention | What it means |
| :---: | :--- | :--- |
| 1 | **One lecture = one workspace** | `Lecture NN - <Title>/` with `README.md` + `notes/` + `code/` + `Assignment/task.md`. |
| 2 | **The roadmap is the single source of truth** | Topics, build task and gate live in `roadmap-v1.md`; the workspace stub links to it and never restates it — so nothing is duplicated. |
| 3 | **Notes are yours, not a copy** | You write your own chapter notes from the source files. Copying the source defeats the purpose. |
| 4 | **Claims are measured** | Any number you quote — latency, cost, recall@k, first-pass validity — must come from a command you can re-run. |

---

## 🛣️ Roadmap

| Status | Item |
| :---: | :--- |
| ✅ | All **46 lectures** defined across **11 phases** (`Build: L01–L23` · `Connect: L24–L32` · `Ship: L33–L46`), ordered basic → advanced |
| ✅ | **45 workspace folders** complete with `README.md` + `notes/` + `code/` + `Assignment/task.md` |
| ✅ | Master roadmap ([`roadmap-v1.md`](./roadmap-v1.md)) with per-lecture **Goal · Topics · Build · Release Gate** |
| ✅ | **5 verification appendices** (re-numbering · 24-session FDE coverage · stack · progress tracker `46/46` · structural design) |
| ✅ | **35/35** source lectures/days + **24/24** FDE sessions + **Cloudflare Code Mode** mapped — **0 duplicates** |
| ✅ | **All 46 lectures' notes, consolidated `Lecture_NN_Complete_Notes.md`, `index.md`, `code/` &amp; `Assignment/task.md` written** — indexed in [`index v1.md`](./index%20v1.md) |
| 🔜 | Your own hands-on rebuilds and measured benchmarks landing in each `code/` folder as you progress |
| 🔜 | The **capstone** system, with a metrics table and an incident/limitations statement |

> 🟢 This repository is a **living workspace** — it is meant to be filled in lecture by lecture.

---

## 🤝 Contributing

1. **Read the [Conventions](#-conventions) table** and the [reading contract](#2--working-a-lecture-the-reading-contract).
2. **Keep the four-part contract:** workspace stub → your notes → your code → measured numbers.
3. **Update the roadmap first:** if you add a topic, add it to `roadmap-v1.md` (and Appendix A if it changes a mapping) **before** writing notes — never fork the source of truth.
4. **Prove your numbers:** any metric you quote should be reproducible from a command in your codebase.
5. **Encode links correctly:** paths contain spaces, so use `%20` (e.g. `./Lecture%2015%20-%20Vector%20Embeddings/`).

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

**[📑 Master Roadmap v1](./roadmap-v1.md)** · **[📚 Chapter Index](./index%20v1.md)** · **[📖 Curriculum Navigation](#-curriculum-navigation)** · **[🚀 Quick Start](#-quick-start)** · **[✅ Verification](#-verification-appendices)**

*Built for Forward Deployed Engineers who measure what they ship.*

</div>
