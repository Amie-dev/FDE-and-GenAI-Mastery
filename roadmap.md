# 🗺️ FDE &amp; GEN-AI — Master Roadmap

> **One curriculum. Two source repositories. Zero duplication. Zero missing topics.**
> A complete, beginner-to-advanced path from *"what is a token?"* to *"ship a secure, evaluated, production-grade enterprise AI system."*

---

## 📖 What This Repository Is

This folder (`FDE-and-GenAI-Mastery`) is a **single merged learning path** built by reading, comparing and
de-duplicating two existing note repositories:

| Source repository | Format | Volume |
| :--- | :--- | :--- |
| 🧭 **`Forward-Deployed-Engineer`** | 19 Lectures → `notes/` (chapter notes + complete notes + PDF + Excalidraw) and `code/` (TypeScript/Node.js codebases + implementation guides) | 19 lectures · ~150 chapter notes |
| 🧪 **`gen-ai-cohort`** | 8 Weeks → 16 Days → `notes/` (chapter notes + completed notes + interview notes) and `code/` (JS/TS codebases + implementation guides) | 16 days · ~200 note files |

**Neither repository is copied here.** This repository is the **map**: it tells you *what* to learn,
*in what order*, *from which source file*, and *what to build* to prove you learned it.

---

## 🎯 The Design Rules Behind This Roadmap

1. **Basic → Advanced, one thing after another.** Every lecture assumes *only* the lectures before it.
2. **No topic is missed.** Every lecture, chapter and day from both source repos is mapped to a slot in
   the [Coverage Checklist](#-appendix-b--full-source-coverage-checklist).
3. **No topic is duplicated.** When both repos teach the same subject, it appears **once**, with both
   sources listed as depth tiers (e.g. *"FDE L10 = internals, GAC D04 = vendor landscape"*).
4. **Understand → build → prove.** Every lecture ends with a runnable artefact and a completion gate.
5. **Zero-knowledge friendly.** Phase 0–2 need no AI background at all — only basic JavaScript/TypeScript.

---

## 🧭 How to Use This Roadmap

```text
1. Read the lecture row in the PHASE table below.
2. Open the matching source notes listed in the lecture's "Source" line.
3. Write your own notes into  Lecture NN - <Title>/  in THIS folder.
4. Run / rebuild the code listed under "Build".
5. Pass the "You can move on when…" gate before starting the next lecture.
```

**Suggested pace:** 1 lecture ≈ 3–5 days (notes + code). A phase ≈ 2–3 weeks. Full path ≈ 6–8 months
part-time, 3–4 months full-time.

> **Completeness &amp; sequence guarantees**
> - Nothing missing → **[Appendix B](./roadmap.md#-appendix-b--full-source-coverage-checklist)** (lecture level) and
>   **[Appendix F](./roadmap.md#-appendix-f--source-chapter-coverage-ledger)** (chapter level).
> - Nothing duplicated → **[Appendix A](./roadmap.md#-appendix-a--de-duplication-map)**.
> - Strictly sequential, followable from zero → **[Appendix E](./roadmap.md#-appendix-e--structural-learning-design)**.

---

## 🗂️ Repository Structure

```text
FDE-and-GenAI-Mastery/
├── README.md                     # Orientation & how to start
├── roadmap.md                    # ← you are here (the master map)
├── Lecture NN - <Title>/         # one folder per lecture
│   ├── README.md                 # objectives · phase · level · source mapping · checklist
│   ├── index.md                  # chapter index (filled by prompt.md → Block 6)
│   ├── prompt.md                 # generation prompt (git-ignored)
│   ├── .gitignore                # ignores prompt.md
│   ├── notes/                    # your own notes (written from the source repos)
│   ├── code/                     # your rebuild of the lecture's codebase
│   └── Assignment/
│       └── task.md               # the lecture assignment (filled by prompt.md → Block 5)
├── Lecture 02 - <Title>/
│   └── ...
└── Lecture 31 - <Title>/
```

> 🛠️ **Every lecture ships a `prompt.md`** — the generation prompt for that lecture. Change only the
> **chapter number** in Block 1, then run the blocks in order:
> `chapters → complete notes → basic code → production code → assignment → index`.
> `prompt.md` is git-ignored; its output lands in `notes/`, `code/`, `index.md` and `Assignment/task.md`.

---

## 📚 The 31 Lectures at a Glance (10 Phases)

| # | Phase | Lecture | Level | Merged from |
| :---: | :--- | :--- | :---: | :--- |
| 01 | 0 · Orientation | Introduction to Forward Deployed Engineering & the History of AI | 🟢 Beginner | FDE L01 |
| 02 | 1 · Foundations | LLM Foundations: Next-Token Prediction, Tokenization & Embeddings | 🟢 Beginner | FDE L02 (ch1–3) · GAC D01 |
| 03 | 1 · Foundations | Attention, Transformer Architecture & Decoding Strategies | 🟢 Beginner | FDE L02 (ch4–7) · GAC D01 |
| 04 | 2 · Application Layer | Calling LLMs from Your Application: APIs, Multi-SDK & Token Economics | 🟢 Beginner | FDE L03 · GAC D01, D03 |
| 05 | 2 · Application Layer | Prompt Engineering: Zero/Few-Shot, CoT, Persona & Prompt Hygiene | 🟢 Beginner | GAC D02 · FDE L03 (ch6) |
| 06 | 2 · Application Layer | Chatbots: Statelessness, Context, Memory & Hallucination | 🟡 Intermediate | FDE L04 |
| 07 | 2 · Application Layer | AI Streaming: From LLM Tokens to a Live Chat Experience | 🟡 Intermediate | FDE L06 · GAC D01 |
| 08 | 3 · Agency & Contracts | Tool Calling & Function Execution Loops | 🟡 Intermediate | FDE L05 (ch1–3) · GAC D03 |
| 09 | 3 · Agency & Contracts | AI Agents from First Principles: Agency, Sandboxing & HITL | 🟡 Intermediate | FDE L05 (ch4–7) · GAC D02 |
| 10 | 3 · Agency & Contracts | Structured Outputs: Schema, Enforcement, Validation & Repair | 🟡 Intermediate | FDE L13 · GAC D03 |
| 11 | 3 · Agency & Contracts | Building an Agent SDK from Scratch (Harness · Builder · ReAct Loop) | 🟠 Advanced | GAC D08 |
| 12 | 4 · Embeddings | Vector Embeddings from First Principles | 🟢 Beginner | FDE L07 |
| 13 | 4 · Embeddings | Embeddings Project: Semantic Search & Movie Recommendation | 🟡 Intermediate | FDE L08 |
| 14 | 4 · Embeddings | Vector Search & Storage: Scale, KNN & the Curse of Dimensionality | 🟡 Intermediate | FDE L09 |
| 15 | 4 · Embeddings | Vector Databases & ANN Algorithms: IVF, HNSW & Product Quantization | 🟠 Advanced | FDE L10 · GAC D04 |
| 16 | 5 · RAG | RAG: The Open-Book Architecture (Ingestion → Grounded Generation) | 🟡 Intermediate | FDE L11 · GAC D04 |
| 17 | 5 · RAG | Advanced RAG: Chunking, Hybrid Retrieval, Reranking & Context Engineering | 🟠 Advanced | FDE L12 · GAC D05 |
| 18 | 5 · RAG | Vectorless RAG, Hierarchical Tree Indexing & LLM Wiki Engines | 🟠 Advanced | GAC D06 |
| 19 | 5 · RAG | Agent Memory Systems: STM, LTM, Graph Memory, Dreaming & mem0 | 🟠 Advanced | GAC D07 · FDE L11 (ch7) |
| 20 | 5 · RAG | Graph Databases, Cypher, Neo4j & GraphRAG | 🟠 Advanced | GAC D11, D12 |
| 21 | 6 · Integration | MCP from First Principles: Host, Client, Server & Tools | 🟡 Intermediate | FDE L14 · GAC D15 |
| 22 | 6 · Integration | MCP: Resources, Prompts & Production Gateway Architecture | 🟠 Advanced | FDE L15 · GAC D15 |
| 23 | 6 · Integration | Claude Skills & the Agent Skills Open Standard | 🟠 Advanced | GAC D16 |
| 24 | 7 · Multimodality | Multimodal AI: How LLMs Understand Images | 🟠 Advanced | FDE L16 · GAC D04 |
| 25 | 8 · Production Infra | High-Performance Inference: GPU Mechanics, vLLM & PagedAttention | 🔴 Expert | GAC D07 |
| 26 | 8 · Production Infra | Durable Execution & Event-Driven Multi-Agent Workflows (Inngest) | 🟠 Advanced | GAC D13 |
| 27 | 8 · Production Infra | Enterprise Full-Stack AI Platform: Architecture, DB, Auth & Ingestion | 🔴 Expert | GAC D09 |
| 28 | 8 · Production Infra | Async Vector Indexing, Streaming RAG Chat & Learning Artifacts | 🔴 Expert | GAC D10 |
| 29 | 8 · Production Infra | Hands-On: Autonomous GitHub PR Reviewer Bot | 🟠 Advanced | GAC D14 |
| 30 | 9 · Quality &amp; Safety | GenAI Evaluation &amp; Testing: Golden Data, Deterministic Evals & LLM-as-a-Judge | 🟠 Advanced | FDE L17, L18 |
| 31 | 9 · Quality &amp; Safety | GenAI Security &amp; Guardrails: Prompt Injection, Jailbreaks & Safe Tool Use | 🔴 Expert | FDE L19 · GAC D02, D03, D05 |

**Legend:** 🟢 Beginner · 🟡 Intermediate · 🟠 Advanced · 🔴 Expert

### Phase Dependency Graph

```text
Phase 0  Orientation
   │
Phase 1  Foundations (LLM internals)
   │
Phase 2  Application Layer (APIs · prompts · chat · streaming)
   │
Phase 3  Agency & Contracts (tools · agents · schema · SDK)
   │
Phase 4  Embeddings (vectors · similarity · ANN · vector DBs)
   │
Phase 5  RAG & Knowledge Systems (RAG · adv-RAG · vectorless · memory · graphs)
   │
Phase 6  Integration (MCP · skills)
   │
Phase 7  Multimodality (vision ↔ language)
   │
Phase 8  Production Infrastructure (inference · durable workflows · full-stack)
   │
Phase 9  Quality & Safety (evals · security)   ← runs across everything above
```

> **Cross-cutting note:** Phase 9 is not "last" in spirit — security and evaluation apply to every
> system you build from Phase 2 onwards. Read Phase 9 as the **certification** layer.

---

# 📖 Detailed Lecture Breakdown

Each lecture gives you: **Goal · Topics (complete) · Build · Source · Gate**.

> **How to read a lecture card**
> - **Goal** — the one thing this lecture exists to teach.
> - **Topics** — the complete sub-topic list, merged and de-duplicated from both source repos.
> - **Build** — the runnable artefact that proves you understood it.
> - **Source** — the exact files inside `Forward-Deployed-Engineer/` and `gen-ai-cohort/` to read.
> - **Gate** — the question you must be able to answer *without notes* before moving on
>   (see [Appendix E3](./roadmap.md#e3--reading-contract-how-to-make-progress-verifiable)).

---

## 🟦 Phase 0 — Orientation

### Lecture 01 — Introduction to Forward Deployed Engineering &amp; the History of AI

- **Level:** 🟢 Beginner · **Prerequisites:** none
- **Goal:** Understand what a Forward Deployed Engineer actually does (discover the *real* business
  problem, not the requested solution), and trace how the industry got from hand-written rules to
  Transformers.
- **Topics**
  - The FDE role: customer solution vs **true requirement**; discovery workflow
  - E-commerce case study: 50k daily support queries
  - Three iterative attempts: **rules → ML classifier → naïve LLM** (and why each failed)
  - Grounded enterprise AI system architecture (the target topology)
  - Foundations of AI: Turing Test (1950), coining of "AI" (McCarthy, 1956)
  - Deterministic computing vs cognitive tasks; the AI hierarchy
  - Symbolic AI & Expert Systems: **fact base + rule base + inference engine**
  - ELIZA (1966) and the illusion of understanding
  - Combinatorial explosion of handwritten rules
  - ML paradigm shift: $Y = f(X; \Theta)$; supervised vs unsupervised; training vs inference
  - Feature-engineering bottleneck; deep learning & representation learning
  - CNNs vs RNNs vs Transformers (high level)
  - Language modelling: n-grams, frequency counting, sparsity, RNN hidden state & long-range decay
  - Attention & *"Attention Is All You Need"* (Vaswani et al., 2017) — first contact
  - The enterprise production AI stack: **grounded · observable · secure · actionable**
  - Linguistic challenges of natural language: **polysemy, word order, negation, coreference, sarcasm**
  - Self-attention vs recurrent vs convolutional layers; "attention is not intelligence by itself"
  - Paper training methodology, regularisation & empirical benchmarks (*Attention Is All You Need*)
  - Pronoun coreference & disambiguation worked examples
  - The evolutionary matrix: rules → ML → n-grams → RNN → Transformer
- **Build:** a one-page written "discovery brief" for the e-commerce case (problem → constraints →
  measurable success metric).
- **Source:** `Forward-Deployed-Engineer/Lecture 01/notes/` → `01_…` … `06_…`,
  `Lecture_01_Complete_Notes.md`, `Notes.pdf`, `Excalidraw-Notes.svg`,
  `Attebtion Is All You Need.pdf`
- **Gate:** you can explain, in your own words, why "the client asked for a chatbot" is not the requirement.

---

## 🟦 Phase 1 — Foundations: How LLMs Actually Work

### Lecture 02 — LLM Foundations: Next-Token Prediction, Tokenization &amp; Embeddings

- **Level:** 🟢 Beginner · **Prerequisites:** Lecture 01
- **Goal:** Build the mental model *"an LLM is a next-token probability machine"* from the ground up.
- **Topics**
  - What an LLM is; autoregressive next-token prediction
  - Transformers & text processing at a glance
  - Tokenization: **BPE / WordPiece / subwords**; vocabulary; why tokens ≠ words
  - Numerical representation: token ids → dense vectors $\mathbb{R}^{d_{\text{model}}}$
  - Embedding vectors, similarity between token vectors
  - Positional encodings (why order must be injected)
  - Context windows (capacity vs attention) — first pass
  - Text pipeline: raw text → tokens → ids → vectors → logits
  - Token IDs are **labels, not measurements**
  - Word-level vs character-level vs subword tokenization — and why subwords win
  - Tokenizer comparison across models; `tiktoken` for local token counting
  - Training phase vs inference phase; why emergent complexity arises from simple prediction
  - The complete tokenization → embedding → input pipeline
- **Build:** a script that calls a tokenizer and prints token ids, token boundaries and token counts
  for the same sentence across 2 providers.
- **Source:** `Forward-Deployed-Engineer/Lecture 02/notes/01…03`, `Lecture_02_Complete_Notes.md` ·
  `gen-ai-cohort/week01/learning/day01/notes/notes.md` (LLM basics, tokenization, embeddings,
  context windows)
- **Gate:** you can tokenize a sentence by hand for a simple BPE case and explain why "strawberry" is hard.

### Lecture 03 — Attention, Transformer Architecture &amp; Decoding Strategies

- **Level:** 🟢 Beginner · **Prerequisites:** Lecture 02
- **Goal:** Open the black box: attention → transformer block → logits → softmax → sampling.
- **Topics**
  - Self-attention mechanism: **Q, K, V** architecture
  - Scaled dot-product attention $\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$ — and *why* $\frac{1}{\sqrt{d_k}}$
  - Multi-head attention ($h$ heads); what each head can specialise in
  - Encoder-decoder vs decoder-only; why GPT is decoder-only
  - $O(1)$ path length vs RNN sequential decay
  - Transformer blocks: residual streams, layer norm, MLP, deep-layer behaviour
  - Logits projection head → probability distribution
  - Softmax, temperature, top-p / top-k sampling, greedy vs beam
  - Decoding strategies and how they change output character
  - End-to-end pipeline recap + key takeaways
  - Positional encodings: sinusoidal form & the **linear-offset property**
  - Greedy vs stochastic sampling; beam search; repetition / frequency / presence penalties
  - Correcting the common misconception about what a transformer block actually does
- **Build:** a tiny "attention by hand" notebook (numpy/JS) computing attention for a 3-token sequence,
  then a decoding playground showing temperature/top-p effects on the same prompt.
- **Source:** `Forward-Deployed-Engineer/Lecture 02/notes/04…07`,
  `Lecture_02_Complete_Notes.md`, `Excalidraw-Notes.svg` ·
  `gen-ai-cohort/week01/learning/day01/notes/notes.md` (attention, temperature, top-p)
- **Gate:** you can draw the transformer block from memory and explain temperature without saying "creativity".

---

## 🟩 Phase 2 — The Application Layer: Talking to Models

### Lecture 04 — Calling LLMs from Your Application: APIs, Multi-SDK &amp; Token Economics

- **Level:** 🟢 Beginner · **Prerequisites:** Lectures 02–03
- **Goal:** Stop using the ChatGPT website and start shipping a service that calls a model correctly.
- **Topics**
  - GenAI applications vs raw LLMs — the *"engine vs car"* analogy
  - LLM API architecture & the request/response protocol (what Postman shows you)
  - The **4 invariant request components**: model, messages, params, (optional) tools
  - Chat roles: system / user / assistant / developer
  - System instructions vs user prompts
  - Token economics: input vs output pricing, metadata (`usage`), latency
  - Rate limits, quotas and retry/backoff
  - **Multi-SDK integration:** OpenAI, Google Gemini, Groq, Mistral, Anthropic Claude, **Ollama (local)**
  - SDK access vs direct REST inference — when each is right
  - Node.js from scratch: Express + TypeScript + ESM environment, project layout
  - Zod-validated configuration, client singletons, connection pooling
  - Framework abstractions, response metadata & prompt hygiene
  - Telemetry, auditing & structured logging
  - **AI slop** and **model collapse** — what they are and why they matter
  - Complete application pipeline & key takeaways
  - **Managing API keys safely**; secrets hygiene & environment configuration
  - Rate limits, **throttling**, quotas & retry/backoff
  - Tokenizer libraries (`tiktoken`) for local token counting & cost estimation
  - Local model runtime (**Ollama**) vs hosted providers
- **Build:** a production-shaped microservice — **Support Ticket Summarizer** —
  `config/ · lib/ · services/ · routes/ · scripts/` with health + summarize endpoints, Zod env
  validation and a standalone prototype script.
- **Source:** `Forward-Deployed-Engineer/Lecture 03/notes/01…07` + `code/` +
  `implementations guide/` ·
  `gen-ai-cohort/week01/learning/day01/notes/` (`open ai.md`, `gemini.md`, `groq.md`, `mistral.md`,
  `role.md`, `notes.md`) · `gen-ai-cohort/week02/learning/day03/notes/03-accessing-llms-sdk-vs-api.md`
- **Gate:** one codebase that can answer the same prompt through 3 different providers with a single
  interface, and reports token cost per call.

### Lecture 05 — Prompt Engineering: Zero/Few-Shot, CoT, Persona &amp; Prompt Hygiene

- **Level:** 🟢 Beginner · **Prerequisites:** Lecture 04
- **Goal:** Learn prompting as an engineering discipline — patterns, formats, failure modes and hygiene —
  not as magic phrases.
- **Topics**
  - Zero-shot prompting
  - Few-shot prompting & in-context learning
  - Chain-of-Thought (CoT) prompting
  - Role-play & persona prompting
  - Model-specific formats: **ChatML, Alpaca, INST, FLAN-T5** (and why raw formats still matter)
  - Prompt hygiene: delimiters, instruction ordering, avoiding contradiction, separating data from rules
  - GIGO — garbage in, garbage out
  - Direct & indirect prompt injection (first contact — full treatment in Lecture 31)
  - Input & output guardrails (first contact)
  - Distillation & extraction attacks (system-prompt leakage)
  - Prompt versioning and evaluation of prompt changes
  - Few-shot craft: **define the task · show consistent examples · cover important classes · use representative examples**
  - Chain-of-Thought variants — and the cases where CoT *hurts*
  - Content **moderation / safety APIs** and where they belong in a pipeline
- **Build:** a prompt-pattern lab: the same task solved with zero-shot / few-shot / CoT / persona, with
  a small side-by-side comparison table and a stored prompt registry.
- **Source:** `gen-ai-cohort/week01/learning/day02/notes/` → `row-class.md`, `prompting-notes/01…04`,
  `02 llm-chat-roles.md`, `03 model-specific-formats.md`, `04 llm-security-and-guardrails.md`,
  `🚀 One-Line Summary of Day 02.md` ·
  `Forward-Deployed-Engineer/Lecture 03/notes/06_Framework_Abstractions_Response_Metadata_and_Prompt_Hygiene.md`
- **Gate:** you can convert a vague request into a versioned prompt with delimiters, explicit output
  contract and a known failure mode.

### Lecture 06 — Chatbots: Statelessness, Context, Memory &amp; Hallucination

- **Level:** 🟡 Intermediate · **Prerequisites:** Lectures 04–05
- **Goal:** Build a real multi-turn assistant and understand exactly why it forgets, drifts and lies.
- **Topics**
  - Stateless LLMs; conversation history as *application* state
  - Role architecture and message arrays
  - Context windows: token accumulation, growth arithmetic, cost of history
  - Context management strategies (truncation, summarisation, sliding window — first pass)
  - Context vs model weights; the **illusion of learning**
  - Real-time streaming architecture & SSE (first contact — depth in Lecture 07)
  - Hallucination mechanisms: fluency vs truth; why the model *cannot* know it is wrong
  - Hallucination triggers and vulnerability surface
  - Engineering defences: grounding, RAG (preview), guardrails, verification
  - Complete enterprise chatbot architecture
  - **Model sycophancy** — why a model agrees with a wrong premise
  - **Calibrated refusal engineering** ("I don't know") as a shipped product feature
  - Fluency vs truth **orthogonality**; why hallucinations sound unwaveringly confident
  - The **5 catalysts** of production hallucinations
  - $O(N^2)$ quadratic token accumulation; the fallacy of "just send everything"
  - Parametric knowledge vs in-context working memory; the mechanics of context-conditioned prediction
  - Decoupled application memory store; the LLM as an **unprivileged kernel**
  - The 7-layer defence-in-depth architecture; the "coder army" case study
- **Build:** a conversational AI microservice: `SessionStore`, `ContextManager`, streaming + grounding
  services, CLI chat prototype, plus a **context-bloat test** and a **hallucination test** script.
- **Source:** `Forward-Deployed-Engineer/Lecture 04/notes/01…07` + `code/` + `implementations guide/`
- **Gate:** you can show a conversation that stays coherent past the context limit — and explain the
  exact trade-off you chose.

### Lecture 07 — AI Streaming: From LLM Tokens to a Live Chat Experience

- **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 06
- **Goal:** Own the full streaming path end to end — token → network frame → rendered character.
- **Topics**
  - How LLMs generate text (recap) and why generation ≠ delivery
  - Non-streaming vs streaming responses
  - Latency anatomy: **TTFT**, ITL, perceived performance
  - Token vs chunk vs network-packet vs byte granularity
  - HTTP streaming mechanics: chunked transfer encoding, **SSE**, WebSockets — when to use which
  - End-to-end streaming architecture & pipeline invariants
  - Backend: `call` vs `stream` vs `Flux`; stream pumps, delta coalescing, backpressure
  - Conversation history buffering & persistence during streams
  - Frontend: `fetch`, `ReadableStream`, `TextDecoder`, rAF rendering, cancellation, recovery
  - Production hardening: timeouts, heartbeats, observability, graceful shutdown
  - The **7 pipeline invariants**; backpressure & flow control
  - Multi-user isolation & thread safety on the server
  - Token accounting & context management *during* a stream
  - Cancelling generation (the "stop" button) & abort semantics
  - Infrastructure that **silently breaks streaming** (proxies, buffering, compression)
  - Rendering rich content while it is still arriving; accessibility
  - `Flux`-style reactive operators and why they exist
- **Build:** the streaming microservice + browser client: Express + TS server with 3 transports, a
  telemetry HUD, wire inspector, chaos toggles, CLI consumer, UTF-8 torture test, benchmark script.
- **Source:** `Forward-Deployed-Engineer/Lecture 06/notes/01…10` + `code/` + `implementations guide/` ·
  `gen-ai-cohort/week01/learning/day01/notes/notes.md` (token streaming end-to-end)
- **Gate:** you can render a streamed response with correct UTF-8 multi-byte handling and cancel it
  mid-flight without leaking the connection.

---

## 🟨 Phase 3 — Agency: Tools, Agents &amp; Output Contracts

### Lecture 08 — Tool Calling &amp; Function Execution Loops

- **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 07
- **Goal:** Move from *"the model talks"* to *"the model acts"* — safely.
- **Topics**
  - From token prediction to tool augmentation
  - The tool-calling protocol & wire architecture (schema → model → call → result → model)
  - Function/tool schema definition; parameter typing
  - Multi-step tool chaining & execution loops
  - **Double-turn tool calling** (proposal turn + result turn)
  - Tool selection as a behaviour you can test
  - Error handling: a tool failure is a *result*, not an exception
  - Tool result formatting & context re-injection
  - Loop bounds and termination conditions
  - Tool definitions as an **OpenAPI / JSON Schema contract**
  - The **5-step HTTP wire-protocol lifecycle**
  - Multi-tool routing & **`tool_choice`** policies
  - The **ReAct** cognitive paradigm (reasoning + acting)
  - Self-healing error recovery & exception feedback
  - Token accumulation & the economic ledger in multi-turn loops
  - Why LLMs fail at arithmetic; **tool = capability + permission**
- **Build:** a CLI agent with 3–4 typed tools (weather, calculator, DB lookup, task manager) and a
  visible multi-step trace.
- **Source:** `Forward-Deployed-Engineer/Lecture 05/notes/01…03` ·
  `gen-ai-cohort/week02/learning/day03/notes/04-structured-output-and-function-calling.md`
- **Gate:** you can show a 3-hop tool chain and point at the exact message that caused each hop.

### Lecture 09 — AI Agents from First Principles: Agency, Sandboxing &amp; HITL

- **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 08
- **Goal:** Understand what an "agent" really is — a loop with tools and constraints — and how to keep it
  from hurting anything.
- **Topics**
  - First principles of AI agents; the **agency spectrum** (chatbot → copilot → agent)
  - Agent architecture: **LLM + memory + tools + guardrails + planning**
  - Brain + loop + tools; the perceive → decide → act cycle
  - Loop engineering & harness engineering (first contact)
  - Workspace sandboxing & agent security (filesystem, network, process isolation)
  - Autonomous website-builder agent (end-to-end example)
  - Human-in-the-loop safety patterns
  - Authorization guardrails & RBAC at the agent boundary
  - Enterprise agent patterns and failure modes
  - The first-principles **6-component agent model**
  - The agency spectrum: **4 progressive levels** (from advice to full actuation)
  - Threat modelling for filesystem agents; the **hierarchy of isolation tiers**
  - The **3-tier tool authorization policy matrix**
  - Asynchronous **durable pause/resume** state machine
  - "The application is the kernel" — why the runtime, not the prompt, owns safety
- **Build:** a sandboxed autonomous agent that writes files inside a jailed workspace, plus an
  approval gate that must be satisfied before any destructive action.
- **Source:** `Forward-Deployed-Engineer/Lecture 05/notes/04…07` ·
  `gen-ai-cohort/week01/learning/day02/notes/05 agent-architecture-and-loops.md` ·
  `gen-ai-cohort/week02/learning/day03/notes/01-ai-agent-architecture.md`,
  `notes/3.1/3.2-Defensive Wrapper.md`, `notes/3.1/3.3-Role-Based Access Control (RBAC) + Platform-Level Guardrails.md`
- **Gate:** you can describe the blast radius of your agent and the exact control that limits it.

### Lecture 10 — Structured Outputs: Schema, Enforcement, Validation &amp; Repair

- **Level:** 🟡 Intermediate · **Prerequisites:** Lectures 08–09
- **Goal:** Make a model's output something a program can *trust* — a typed object, never "JSON-ish text".
- **Topics**
  - Why plain text is not enough — the integration gap (humans read meaning, software reads fields)
  - What structured output is: **a schema is a form the application writes and the model fills**
  - Schema contract & types; one declaration → three artefacts (TS type, runtime validator, wire contract)
  - Why "just ask for JSON" fails: chatty preamble, markdown fences, trailing commas, truncation
  - JSON Schema design for LLMs: enums for closed sets, require-or-nullify, flatten by default,
    units in names, reasoning field first, `description` as the highest-value keyword
  - The **strict-mode subset** and its silent limits (`pattern`, `minimum` ignored by grammar)
  - Enforcement mechanisms & provider landscape: prompt-only → JSON mode → strict schema → logit masking
  - Grammar compilation & caching; the tool-use workaround
  - Validation: **structural** (types/enums/bounds) vs **semantic** (is it *true*?)
  - `block` vs `review` severities; repair prompts; bounded loops; the fallback ladder ending in a
    **degraded object**
  - Structured output vs tool calling (result vs request)
  - Production playbook: first-pass validity, repair rate, per-field accuracy, issue distribution
  - The **three layers of enforcement** (prompt → decoder → validation)
  - Constrained-decoding tooling: grammars, **Outlines**, **Guidance**
  - Prompt *instruction* vs structured *contract*
  - What structured output is **not**
  - OpenAPI / JSON Schema as the shared contract between app and model
- **Build:** a validated extraction service (e.g. `MeetingDetails`) with Zod, a repair loop and a
  metrics table showing validity per enforcement rung.
- **Source:** `Forward-Deployed-Engineer/Lecture 13/notes/01…09` + `code/` + `implementations guide/` ·
  `gen-ai-cohort/week02/learning/day03/notes/04-structured-output-and-function-calling.md`
- **Gate:** you can prove — with a table — that your system never emits a malformed object, and you know
  what it does when the *content* is wrong.

### Lecture 11 — Building an Agent SDK from Scratch (Harness · Builder · ReAct Loop)

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 08–10
- **Goal:** Stop being a framework user; build the framework. Understand every layer by writing it.
- **Topics**
  - Stateful agent SDKs vs stateless LLM APIs
  - The core agent triad: **LLM engine + harness prompt + tools**
  - Fluent `AgentBuilder` design pattern & configuration decoupling
  - Harness prompting & the **5-stage ReAct pipeline**:
    `INITIAL → THINK → TOOL_REQUEST → ANALYSE → OUTPUT`
  - Structured JSON schema output enforcement & anti-hallucination regex parsing
  - `ITool` interface specification; dynamic tool schema auto-generation; tool registry engine
  - Stateful `messageHistory` execution lifecycle (`user`, `assistant`, `developer`)
  - Event-driven interceptor pattern (`attachInterceptor`, `notifyInterceptors`) & loop bounds (`MAX_LOOP`)
  - Multi-agent swarms (fan-out / fan-in) on top of the SDK
  - Production packaging of a custom agent SDK (OpenAI & Gemini implementations)
- **Build:** your own `agent-sdk` package: `types · builder · harness · core loop · tools · interceptors`,
  published locally and consumed by a demo CLI + a multi-agent swarm demo.
- **Source:** `gen-ai-cohort/week04/learning/day08/notes/01…05`, `completed notes.md`,
  `completed notes with code.md`, `Interview.md`, `interview01.md` + `code/agent-sdk/`,
  `code/agent-sdk-sir/`, `code/agent-sdk-advanced/`
- **Gate:** you can add a new tool, a new interceptor and a second provider without editing the core loop.

---

## 🟧 Phase 4 — Meaning &amp; Retrieval: Embeddings

### Lecture 12 — Vector Embeddings from First Principles

- **Level:** 🟢 Beginner · **Prerequisites:** Lectures 02–03
- **Goal:** Understand how a computer can represent *meaning* as a list of numbers.
- **Topics**
  - The problem of meaning in computers
  - From numbers to vectors; the vector space intuition
  - Measuring similarity between vectors (cosine, dot product, Euclidean)
  - The failure of hand-crafted features (one-hot, bag-of-words, TF-IDF)
  - What embeddings actually learn: learned representations, neighbourhoods, analogy arithmetic
  - Vector vs embedding — the distinction that trips everyone
  - Applications: search, clustering, classification, recommendation, anomaly detection
  - The complete journey: text → vector → geometry → meaning
  - Why **direction** sometimes matters more than distance
  - **Manhattan (L1) distance** — and which metric is right for which job
  - "Do individual dimensions have a clear meaning?" — the interpretability trap
  - **Identity matching vs semantic similarity** — two different retrieval goals
  - Embedding model vs generative LLM — two different jobs, often confused
- **Build:** a "meaning explorer": embed 30 sentences, print nearest neighbours, and show that
  paraphrases cluster while word-overlap does not.
- **Source:** `Forward-Deployed-Engineer/Lecture 07/notes/01…07`, `Lecture_07_Complete_Notes.md`,
  `Excalidraw-Notes.svg`
- **Gate:** you can explain cosine similarity geometrically and why it ignores magnitude.

### Lecture 13 — Embeddings Project: Semantic Search &amp; Movie Recommendation

- **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 12
- **Goal:** Turn the theory into a working retrieval product.
- **Topics**
  - Embeddings and the problem of meaning (recap)
  - **Why not just use an LLM?** — cost, latency, determinism, scale
  - **Precomputation** — the key engineering insight
  - Semantic search & movie recommendation as the same problem
  - Cosine similarity in practice; normalisation
  - The core mental model: **REPRESENT → STORE → COMPARE → RANK**
  - Complete system design: catalog build, index, query, rank, respond
- **Build:** a Movie Recommendation Engine — Express + TS, `EmbeddingService`, `VectorStore`,
  `RecommendationService`, endpoints for catalog / search / similar / status, plus a standalone JS demo
  over `movies.json`.
- **Source:** `Forward-Deployed-Engineer/Lecture 08/notes/01…07` + `code/` + `implementations guide/`
- **Gate:** you can explain where the recommendation quality comes from — the embedding, the store, or
  the ranking — and prove it by changing one at a time.

### Lecture 14 — Vector Search &amp; Storage: Scale, KNN &amp; the Curse of Dimensionality

- **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 13
- **Goal:** Understand why toy vector search collapses at scale, and what the escape routes are.
- **Topics**
  - The scale wall: why toy vector search breaks
  - Why relational databases are not enough (B-trees don't index geometry)
  - Anatomy of a vector database (first pass)
  - **Brute-force KNN** — the correct baseline (and its $O(N \cdot d)$ cost)
  - Indexes, and why scalar indexes fail for vectors
  - The **curse of dimensionality**
  - Approximate nearest neighbour (ANN) — the central trade-off
  - Recall / latency / memory / cost spectrum
  - When exact search is still the correct answer
  - When a relational database **is** enough — and when it is not
  - The **ANN family tree** (trees · graphs · hashing · quantization · partitioning)
  - When you do **not** need ANN at all
  - The 1M-vector vs 10M-vector arithmetic
- **Build:** a benchmark harness comparing brute-force KNN against an ANN index on 100k vectors,
  reporting recall@k vs latency.
- **Source:** `Forward-Deployed-Engineer/Lecture 09/notes/01…07`, `Lecture_09_Complete_Notes.md`
- **Gate:** you can state your recall/latency budget and defend the index choice that meets it.

### Lecture 15 — Vector Databases &amp; ANN Algorithms: IVF, HNSW &amp; Product Quantization

- **Level:** 🟠 Advanced · **Prerequisites:** Lecture 14
- **Goal:** Know how the indexes actually work — and how to operate a vector database in production.
- **Topics**
  - **IVF (Inverted File Index):** centroids, k-means training, inverted lists, query → probe →
    candidates, the 1M-vector arithmetic, boundary problem, `nlist`/`nprobe`, IVF variants
    (IVF-Flat, IVF-PQ, IVF-SQ), updates, drift, filtering, tuning
  - **HNSW (Hierarchical Navigable Small World):** from partitioning to connectivity, the flat-graph
    problem, exponential layer sampling, insertion & query algorithms, `M`/`M0`/`efConstruction`/`efSearch`,
    memory accounting, build cost, tombstones, the filtered-search weakness, IVF vs HNSW
  - **Product Quantization:** why float32 is expensive, scalar/binary quantization, PQ
    split → codebooks → codes, ADC, lossy compression, exact rescoring, IVF-PQ / HNSW-PQ, capacity planning
  - **Anatomy of a vector database:** the five layers, the record model (id + vector + payload),
    collections/points/segments, write & read paths, pre- vs post- vs filter-aware search
  - **Hybrid search & RRF** (first contact)
  - Lifecycle, source-of-truth rules, what a vector DB does *not* do
  - **Qdrant** object model, Docker, JS client, collections, upsert/query/filter, payload indexes,
    multi-tenancy, snapshots
  - **pgvector:** schema, operators, HNSW/IVFFlat, dimension limits, iterative scans
  - Vendor landscape: Pinecone, Weaviate, ChromaDB, Milvus, MongoDB Atlas Vector Search
  - Production RAG retrieval systems: chunking as the ceiling, query understanding, candidate
    generation, reranking, context assembly, retrieval vs generation evaluation, latency/cost budgets,
    freshness, multi-tenant security, failure runbook
  - **DiskANN** and the disk-resident index family (plus ScaNN, Annoy, FAISS as reference points)
  - **Sharding, replication, pruning** & index selectivity
  - **Re-indexing, versioning & model migration** — with rollback and alias swap
  - The real cost of "just use Postgres"
  - Multi-tenancy isolation strategies (namespace per tenant vs payload filter)
- **Build:** stand up Qdrant + pgvector with Docker, load the same corpus into both, and produce a
  comparison table (recall, p95 latency, memory, ops burden).
- **Source:** `Forward-Deployed-Engineer/Lecture 10/notes/01…09`, `Lecture_10_Complete_Notes.md` ·
  `gen-ai-cohort/week02/learning/day04/notes/02-vector-databases-and-embeddings.md`
- **Gate:** you can size a cluster for a given corpus, dimension and QPS target — and justify every number.

---

## 🟥 Phase 5 — RAG &amp; Knowledge Systems

### Lecture 16 — RAG: The Open-Book Architecture (Ingestion → Grounded Generation)

- **Level:** 🟡 Intermediate · **Prerequisites:** Lectures 10, 13–15
- **Goal:** Build a grounded answering system end to end and know exactly what RAG can and cannot fix.
- **Topics**
  - What RAG is: retrieval + augmentation + generation
  - Solving knowledge cutoffs & private-data privacy
  - The human brain / library mental model for search
  - The stateless model: parametric vs non-parametric memory, inference loop
  - Why hallucination is a *mechanism*, not a bug; knowledge cutoffs
  - The **open-book architecture**; the two pipelines (offline ingestion, online serving)
  - **Ingestion:** PDF extraction hazards, cleaning, chunking strategies, metadata & context headers,
    deterministic ids, orphan chunks, batching
  - **Embeddings at query time:** model selection, Matryoshka dimensions, symmetric vs asymmetric
    encoding, prefixes, normalisation, truncation, cost of changing a model
  - **The vector index:** record model, namespaces, query anatomy, score calibration, top-K, metadata
    filters, hybrid search + RRF, MMR, reranking, consistency & freshness
  - **Grounded generation:** the four-clause prompt contract, the exact refusal sentence, context
    ordering & the U-shaped attention curve, citation markers, fabrication guards
  - **Conversation state & memory:** query condensation ("And for shoes?"), quadratic history cost,
    session ownership, IDOR, TTL, deletion, history poisoning
  - **Evaluation & debugging:** golden sets, recall@K / MRR / nDCG, faithfulness, citation validity,
    refusal correctness, retrieval-vs-generation 2×2, LLM-as-judge biases, the debug tree
  - Production system design
  - Naive RAG failure modes (the bridge to Lecture 17)
  - The **seven ways basic RAG fails** (a field guide)
  - **Three families of chunking** — and the rule that metadata must be attached *before* the split
  - Keyword vs semantic vs hybrid search
  - Collections, namespaces & fixed configuration
  - Two-stage retrieval and the **recall ceiling**
- **Build:** two codebases — a **production RAG** service (structure-aware chunking, hybrid retrieval,
  grounded prompt with `[n]` citations, citation verification, query rewriting, golden-set eval, HTTP
  API with full request trace) **and** a minimal **easy RAG** (PDF → chunks → embeddings → Qdrant →
  top-5 → grounded answer, ~6 ES modules, 4 dependencies).
- **Source:** `Forward-Deployed-Engineer/Lecture 11/notes/01…09` + `code/Productions RAG/`,
  `code/Eassy RAG/`, both `implementations guide/` ·
  `gen-ai-cohort/week02/learning/day04/notes/01-introduction-to-rag.md`,
  `03-rag-architecture-and-pipelines.md`, `04-building-rag-with-langchain-and-qdrant.md`,
  `code/rag1/` (openai + gemini)
- **Gate:** given a wrong answer, you can attribute it to retrieval, generation, spec or pass — with evidence.

### Lecture 17 — Advanced RAG: Chunking, Hybrid Retrieval, Reranking &amp; Context Engineering

- **Level:** 🟠 Advanced · **Prerequisites:** Lecture 16
- **Goal:** Fix the failure modes that survive a correct basic RAG architecture.
- **Topics**
  - Why basic RAG breaks: query mismatch, distance mismatch
  - Fixed-size chunking & overlap (the `1–1000 / 801–1800` arithmetic)
  - Structural, semantic and contextual chunking; parent-child chunking
  - Top-K & similarity thresholds; score floors calibrated per model & corpus
  - Metadata filtering (and filter-aware search)
  - **Hybrid search & RRF** (dense + sparse fusion, in depth)
  - **Reranking:** two-stage retrieval, cross-encoders, recall ceiling at the candidate stage
  - **Pre-retrieval query translation:** query rewriting, step-back prompting, sub-query decomposition, **HyDE**
  - **Intent-based query routing** & multi-source database adapters
    (PostgreSQL auth DB · Qdrant · MongoDB · AWS S3)
  - **Self-reflective evaluation via Corrective RAG (CRAG)** — score evaluation & retry loops
  - Context engineering: ordering, compression, budget allocation, lost-in-the-middle
  - Input/output security guardrails: bidirectional **PII masking**, jailbreak defence
  - Latency optimisation & asynchronous queues (**BullMQ + Redis**)
  - Evaluation & production playbook
  - Text splitters in practice (recursive character splitting and its limits)
  - **Lexical / BM25 retrieval** and why sparse search is still needed alongside dense
  - Cross-encoder **rerankers** vs bi-encoders — cost, latency and accuracy
- **Build:** the **production advanced RAG** pipeline: guardrails → query translation → routing →
  multi-source retrieval → RRF fusion → cross-encoder rerank → CRAG evaluation → context assembly →
  generation, with async indexing workers and an HTTP API + CLI. Ship OpenAI **and** Gemini adapters.
- **Source:** `Forward-Deployed-Engineer/Lecture 12/notes/01…09`, `Lecture_12_Complete_Notes.md` ·
  `gen-ai-cohort/week03/learning/day05/notes/01…06`, `completed notes.md`, `completed notes with code.md` +
  `code/adv-rag/`, `code/adv-rag-1/`, `code/adv-rag-gemini-1/`, `code/advance-rag-pipeline-sir/`
- **Gate:** you can take one failing query and show the exact pipeline stage where recall was lost.

### Lecture 18 — Vectorless RAG, Hierarchical Tree Indexing &amp; LLM Wiki Engines

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 16–17
- **Goal:** Learn the alternatives to vector search when *similarity ≠ relevance*.
- **Topics**
  - Limitations of standard vector RAG & the **abrupt token-chunking problem**
  - Semantic similarity vs contextual relevance: $\text{Vector Similarity} \neq \text{Relevance}$
  - **Vectorless RAG** & tree-structured indexing (the **PageIndex** architecture model)
  - Natural structural document parsing & metadata node summaries
    (`Root → Chapter → Section → Page`)
  - **AlphaGo-inspired top-down agentic tree traversal**; zero-vector relevance reasoning
  - Andrej Karpathy's **LLM Wiki** paradigm (Obsidian & markdown knowledge vault management)
  - **Two-pass retrieval:** lightweight metadata summary scan → selective full-content lazy loading
  - System comparison: vector RAG vs vectorless RAG vs LLM Wiki vs enterprise hybrid RAG
  - Benchmarks and when each architecture wins
- **Build:** a Node.js vectorless RAG engine: tree builder, node index, agentic tree search, LLM-Wiki
  vault, two-pass librarian, plus a benchmark CLI comparing it against your Lecture 17 vector pipeline.
- **Source:** `gen-ai-cohort/week03/learning/day06/notes/01…05`, `completed notes.md`,
  `completed notes with code.md` + `code/adv-vectorless-rag/`, `code/vectorless-rag-01/`,
  `code/vectorless-rag-gemini-01/`
- **Gate:** you can name the query class where vectorless retrieval beats dense retrieval, and prove it.

### Lecture 19 — Agent Memory Systems: STM, LTM, Graph Memory, Dreaming &amp; mem0

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 06, 16–17
- **Goal:** Give an agent durable memory that survives sessions — without poisoning the context window.
- **Topics**
  - Stateless LLM APIs & context-window failure points (bandwidth, latency, token cost, attention decay)
  - **Short-Term Memory (STM)** & sliding-window buffers ($N$ turns + database persistence)
  - **Long-Term Memory (LTM) taxonomy:** semantic (facts) · episodic (events) · graph (Neo4j)
  - Dynamic context assembly: $\text{STM} + \text{LTM\_RAG} + \text{Query}$
  - LLM fact-extraction pipelines; memory write policy
  - Memory eviction, contradiction resolution & decay
  - **Claude-style memory "dreaming"** — background offline reflection
  - Managed memory frameworks: **`mem0`**
  - Latency pre-fetching optimisations
  - Multi-tenant memory isolation, privacy, deletion & compliance
  - **Temporal memory** (time-aware facts) alongside semantic, episodic & graph memory
  - **Deduplication / duplicate detection** on write
  - **Immutable input logs** & memory auditability
  - Eager loading, hit-score tracking & agentic memory retrieval
  - **Context inflation** as the price of memory
- **Build:** an agent with STM + LTM + RAG memory: fact extractor, memory store, retrieval-augmented
  context assembler, eviction policy and an offline reflection job.
- **Source:** `gen-ai-cohort/week04/learning/day07/notes/01…05`, `completed notes.md`,
  `completed notes with code.md`, `extra/` + `code/adv-rag-memory/`, `code/rag+memory/`,
  `code/sample-code/` · `Forward-Deployed-Engineer/Lecture 11/notes/07_Conversation_State_and_Memory.md`
- **Gate:** you can show an agent recalling a fact from 3 sessions ago, and show it *forgetting* an
  evicted one.

### Lecture 20 — Graph Databases, Cypher, Neo4j &amp; GraphRAG

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 15–16, 19
- **Goal:** Model connected knowledge explicitly and combine graph traversal with vector retrieval.
- **Topics**
  - Graph fundamentals: nodes, edges, properties, labels
  - Human cognitive memory model: key-value vs **connected/relational** factual & episodic memory
  - In-memory vs persistent graph storage engines
  - Paradigm comparison: **SQL (junction tables) vs NoSQL (embedded references) vs native graph DB
    (index-free adjacency)**
  - Graph schema design & property-graph modelling rules
  - **Cypher** ASCII-art syntax (`()`, `[]`, `-->`)
  - Cypher CRUD: `MATCH`, `CREATE`, `MERGE`, `SET`, `DELETE`, `DETACH DELETE`
  - Traversal algorithms & variable-length paths (BFS vs DFS)
  - **Neo4j** engine architecture, **Bolt protocol** (port 7687), Aura cloud vs Docker
  - Node.js `neo4j-driver`: `driver.executeQuery()`, sessions, transactions
  - **GraphRAG:** hybrid vector search + knowledge-graph traversal; **text-to-Cypher** with an LLM
  - Graph-based memory for agents; entity resolution & profile building
- **Build:** a cognitive-memory graph application: schema, seed data, Cypher query library, a Node.js
  service with the official driver, and a GraphRAG endpoint that answers questions using both vector
  similarity and graph hops.
- **Source:** `gen-ai-cohort/week06/learning/day12/notes/01…05`, `completed notes.md`,
  `completed notes with code.md`, `Interview.md` + `code/` + `implementation guide/`
  (`01-graph-fundamentals` → `05-graphrag-and-profiling`)
- **Gate:** you can answer a multi-hop question that dense retrieval alone gets wrong.

---

## 🟪 Phase 6 — Integration &amp; Interoperability

### Lecture 21 — MCP from First Principles: Host, Client, Server &amp; Tools

- **Level:** 🟡 Intermediate · **Prerequisites:** Lectures 08–11
- **Goal:** Replace N×M bespoke integrations with one open protocol.
- **Topics**
  - The integration problem & why standards win (the "USB-C for AI tools" argument)
  - What MCP is: a protocol, a server, and a **standard interface**
  - MCP vs tool calling — complementary layers, not competitors
  - **Host / Client / Server** architecture; the core triad
  - The **Tools** primitive (function calling, standardised)
  - Resources and Prompts — first contact (depth in Lecture 22)
  - Discovery, invocation & lifecycle (initialise → list → call → shutdown)
  - **JSON-RPC 2.0** message shape
  - **Transports:** STDIO local process pipes vs HTTP streaming / **SSE**
  - **Tool context poisoning** & mitigation
  - **Gateway architecture** & dynamic tool filtering/routing (first contact)
  - Security, production concerns & practical architecture
  - Anatomy of an MCP **resource** (URIs, MIME types, templates)
  - One host can connect to **multiple** MCP servers
  - "**Tools are only one third of the server**"
  - The **six questions every integration must answer**
  - **Streamable HTTP** transport; OpenAPI-derived tool schemas
  - Host configuration: roots, sampling & elicitation (first contact)
- **Build:** three MCP servers of increasing complexity — `01-stdio-mcp-server`,
  `02-http-sse-mcp-server`, `03-mcp-gateway` — plus a suite of real servers
  (calculator · weather · database · GitHub · task manager) and an LLM agent loop that consumes them.
- **Source:** `Forward-Deployed-Engineer/Lecture 14/notes/01…08` + `code/` + `implementations guide/` ·
  `gen-ai-cohort/week08/learning/day15/notes/01-introduction-to-mcp.md`,
  `02-mcp-architecture-and-providers.md`, `03-mcp-transports-stdio-and-http-sse.md`,
  `Complete MCP Master Notes + TypeScript Implementation.md` + `code/mcp/`, `code/mcp-master/`
- **Gate:** you can swap a STDIO server for an HTTP/SSE server without changing the host application.

### Lecture 22 — MCP: Resources, Prompts &amp; Production Gateway Architecture

- **Level:** 🟠 Advanced · **Prerequisites:** Lecture 21
- **Goal:** Master all three MCP primitives and put each under the right owner.
- **Topics**
  - The three primitives & the **control model** (who decides: model, application or user)
  - Why **Resources** — context as a first-class primitive
  - Resource discovery, reading & anatomy (URIs, MIME types, templates)
  - Building resources: **static · dynamic · templated**
  - How the application chooses a resource (application-controlled context)
  - **MCP Prompts** — reusable interaction templates
  - Prompt arguments, discovery & client wiring
  - Bringing tools + resources + prompts together in one server
  - **MCP Gateway:** tool filtering, routing, rate limits, auth, observability
  - **Context poisoning** in depth & defence
  - Security review, capability boundaries and the rule that *discovery is not permission*
- **Build:** one "kitchen-sink" MCP server exposing all three primitives, plus a gateway in front of it
  that filters, routes and audits every call.
- **Source:** `Forward-Deployed-Engineer/Lecture 15/notes/01…08` + `code/` + `implementations guide/` ·
  `gen-ai-cohort/week08/learning/day15/notes/04-tool-context-poisoning-and-mcp-gateway.md`,
  `05-mcp-interview-guide-and-summary.md`
- **Gate:** you can state, for every capability in your server, whether the model, the app or the user
  owns the decision.

### Lecture 23 — Claude Skills &amp; the Agent Skills Open Standard

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 21–22
- **Goal:** Package *workflow knowledge* — not connectivity — as a portable, versioned skill.
- **Topics**
  - Claude Skills architecture vs MCP: **connectivity vs workflow knowledge**
  - **Progressive disclosure architecture:** Level 1 frontmatter → Level 2 body → Level 3 resources
  - `SKILL.md` specification: YAML frontmatter, description formulas, security rules
  - Assets, `references/` and `scripts/` layout
  - **Deterministic code execution** (Python/Bash/JS in `scripts/`) over probabilistic instructions
  - Planning, design & technical requirements for a skill
  - Testing & evaluation spectrum: manual · CLI · API · the `skill-creator` tool
  - Skill validation & packaging (`validate_skill.js`, `package_skill.js`)
  - Distribution, sharing & API integration
  - **Agent Skills open standard** & the programmatic API (`/v1/skills`)
  - Architecture patterns, troubleshooting & production distribution
- **Build:** a skill suite — `pay-skill` (payments/subscriptions with compliance rules & templates),
  `sentry-code-review` (MCP-integrated code review), and `skill-creator` (a meta-skill that scaffolds,
  validates and packages other skills).
- **Source:** `gen-ai-cohort/week08/learning/day16/notes/01…06`, `raw-class.md`,
  `The-Complete-Guide-to-Building-Skill-for-Claude.md` (+ `.pdf`) + `code/` +
  `implementation guide/chapter-01…03`
- **Gate:** you can hand your skill to a colleague and they get the same behaviour without reading your prompt.

---

## 🟫 Phase 7 — Multimodality

### Lecture 24 — Multimodal AI: How LLMs Understand Images

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 02–03, 16
- **Goal:** Extend the token pipeline to pixels — and know the real cost/security/eval consequences.
- **Topics**
  - Why text-only AI is not enough
  - What multimodal models understand; **OCR vs MLLM** (and when OCR still wins)
  - The text pipeline (recap) — text → numbers
  - **Images are numbers:** pixels, patches, visual embeddings
  - Connecting vision to language: **projection layers**, positional handling, cross-attention
  - How models learn **vision–language alignment** (contrastive pretraining → instruction tuning)
  - The end-to-end multimodal pipeline
  - **Multimodal data ingestion system design** (audio, video, PDF, images, web)
  - Production multimodal systems: cost, latency, security and evaluation
  - Multimodal RAG: images inside the retrieval pipeline
  - **Multimodal vs multi-model** — two different things, often conflated
  - What a *modality* is; the modality combinations you will actually meet
  - Screenshots & UI understanding as a real production use case
  - Vision benchmark caveats: what MLLM demos overstate
- **Build:** a multimodal ingestion + question-answering service: image → patches → embeddings →
  retrieval → grounded answer, with a cost/latency report and an evaluation harness.
- **Source:** `Forward-Deployed-Engineer/Lecture 16/notes/01…08` + `code/` + `implementations guide/` ·
  `gen-ai-cohort/week02/learning/day04/notes/05-multimodal-ingestion-and-advanced-rag.md`
- **Gate:** you can explain why OCR + a text LLM is sometimes *better* than a multimodal model.

---

## 🔴 Phase 8 — Production Infrastructure

### Lecture 25 — High-Performance Inference: GPU Mechanics, vLLM &amp; PagedAttention

- **Level:** 🔴 Expert · **Prerequisites:** Lectures 03, 19
- **Goal:** Understand the hardware and serving engine under the API — and why inference is
  memory-bandwidth-bound, not compute-bound.
- **Topics**
  - LLM hardware mechanics: GPU VRAM, **HBM**, memory hierarchy
  - **Compute-bound training vs memory-bandwidth-bound inference**
  - Inference engine architecture — the *"Nginx of LLMs"*
  - **Prefill phase** (parallel prompt processing) vs **Decode phase** (autoregressive generation)
  - **UC Berkeley vLLM** architecture
  - **PagedAttention** — virtual-memory paging that eliminates KV-cache fragmentation
  - KV cache: what it is, how it grows, why it is the bottleneck
  - **Continuous batching** · **prefix caching** · **chunked prefill** · **Mixture-of-Experts (MoE) kernels**
  - Throughput vs latency trade-offs; batching policy
  - Serving economics: $/1M tokens, GPU utilisation, autoscaling
  - Self-hosting vs managed APIs — the decision framework
  - **Data locality** — why moving weights costs more than computing on them
  - Local model runtimes (**Ollama**, llama.cpp) vs a real serving engine
  - Speculative decoding & quantization families (GGUF / GPTQ / AWQ) as throughput levers
  - The roofline view: when you are compute-bound vs bandwidth-bound
- **Build:** run a local model behind vLLM (or an equivalent engine), benchmark tokens/sec and
  time-to-first-token under different batch sizes, and compare against a managed API on cost.
- **Source:** `gen-ai-cohort/week04/learning/day07/notes/extra/01-llm-hardware-training-vs-inference.md`,
  `02-inference-engines-prefill-vs-decode.md`, `03-vllm-architecture-and-paged-attention.md`,
  `raw extra class.md`
- **Gate:** you can explain why doubling GPU compute does not halve decode latency.

### Lecture 26 — Durable Execution &amp; Event-Driven Multi-Agent Workflows (Inngest)

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 09, 11, 17
- **Goal:** Run long, multi-step, multi-agent work that survives crashes, timeouts and retries.
- **Topics**
  - Asynchronous vs synchronous AI multi-agent architectures
  - The failure modes of naive long-running AI work: gateway timeouts, duplicate tokens,
    partial writes, process crashes
  - **Durable execution** fundamentals & **state checkpointing** mechanics
  - Traditional queues (**RabbitMQ · Redis · BullMQ**) vs serverless durable engines (**Inngest**)
  - Inngest SDK **Steps API:** `step.run()` · `step.sleep()` · `step.waitForEvent()` ·
    `step.invoke()` · `step.sendEvent()`
  - **Memoisation** & deterministic replay
  - Parallel **fan-out / fan-in** (`Promise.all`)
  - Concurrency control & rate limiting
  - Human-in-the-loop waits & approvals inside a workflow
  - Error resilience, retries, idempotency & dead-letter handling
  - Observability of long-running workflows
  - Cron & scheduled workflows; `onFailure` handlers and dead-letter flows
  - **Throttling vs concurrency vs rate limiting** — three different knobs, often confused
  - Workflow versioning & safe deploys of in-flight runs
- **Build:** a durable multi-agent workflow: fan-out to 3 agents, fan-in to a synthesiser, a
  `waitForEvent` human approval gate, a retry-on-failure step and a concurrency limit.
- **Source:** `gen-ai-cohort/week07/learning/day13/notes/01…05`, `completed notes.md`,
  `completed notes with code.md`, `Interview.md` + `code/` + `implementation guide/chapter-01…05`
- **Gate:** you can kill the process mid-workflow and show it resuming exactly where it stopped.

### Lecture 27 — Enterprise Full-Stack AI Platform: Architecture, DB, Auth &amp; Ingestion

- **Level:** 🔴 Expert · **Prerequisites:** Lectures 16–17, 19, 26
- **Goal:** Build the *skeleton* of a real AI product: client/server split, database, auth,
  multi-tenancy and multi-channel ingestion.
- **Topics**
  - Full-stack AI application architecture: client/server separation, REST + SSE API design
  - Express + TypeScript **ESM** server setup; **Next.js 16 App Router** client
  - **PostgreSQL** foundation & **Prisma ORM** schema design (relations, migrations, seeding)
  - **Better Auth**: session management, Google OAuth, protected routes
  - Multi-layer **workspaces** CRUD & access control (ownership, membership, roles)
  - **Knowledge-source ingestion channels:**
    - plain text & markdown
    - **Firecrawl** web scraping
    - **YouTube** transcript extraction
    - **Cloudinary** PDF uploads
  - Source lifecycle: draft → processing → ready → failed; idempotent re-ingestion
  - Environment/config management, secrets, local Docker Compose for dependencies
  - Monorepo layout, shared types, API contracts
- **Build:** the server half of a NotebookLM-style app — bootstrap, database, auth, workspaces,
  sources CRUD, import channels — with a Next.js client that can log in and create a workspace.
- **Source:** `gen-ai-cohort/week05/notes.md`, `raw-class.md`,
  `implementations guide/chapter-00…06` (+ `server/`, `client/` variants) ·
  `week05/NoteBookLM/`, `week05/chaibook-llm-sir/`
- **Gate:** a second user cannot see the first user's workspace — and you can prove it with a test.

### Lecture 28 — Async Vector Indexing, Streaming RAG Chat &amp; Learning Artifacts

- **Level:** 🔴 Expert · **Prerequisites:** Lecture 27
- **Goal:** Complete the platform: background indexing, streaming RAG chat, memory, web search and
  generated study artifacts.
- **Topics**
  - Asynchronous background processing with the **Inngest** engine
  - Sliding-window text chunking & OpenAI vector embeddings
  - Vector store indexing & **Pinecone** upserts (namespaces, metadata, re-indexing)
  - **Real-time streaming RAG chat** with Server-Sent Events & interactive citations
  - Agentic memory integration (`mem0`) across a workspace
  - **Tavily** live web search as a retrieval source
  - **Structured learning-artifact generation:** flashcards, quizzes, summaries, **audio overviews**
  - Job status, progress reporting, partial failure & retry UX
  - Cost control: embedding budget, token budget, per-workspace quotas
  - Evaluation & monitoring hooks for the whole platform
  - **Re-indexing & model migration** for a live workspace (new collection → alias swap → rollback)
  - Partial re-embedding strategies when only some sources change
- **Build:** wire indexing jobs → Pinecone → streaming RAG chat → artifacts, then load-test the
  pipeline and report p95 latency per stage.
- **Source:** `gen-ai-cohort/week05/notes.md`, `raw-class.md`,
  `implementations guide/chapter-07…10` (+ `server/`, `client/` variants) ·
  `week05/NoteBookLM/server/src/` (`lib/rag`, `services`, `repository`)
- **Gate:** you can upload a 200-page PDF and ask a question about it 60 seconds later, with a citation.

### Lecture 29 — Hands-On: Autonomous GitHub PR Reviewer Bot

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 10, 26
- **Goal:** Ship a real autonomous agent against a real external API, end to end.
- **Topics**
  - Autonomous GitHub PR review bot architecture & the Inngest event pipeline
  - **Octokit** GitHub REST API integration & PAT authentication
  - Extracting & parsing **paginated PR diffs** (`octokit.paginate`)
  - Diff token-window optimisation: filtering `package-lock.json`, minified files & binary assets
  - Structured LLM review output enforcement with the **OpenAI Agents SDK** + **Zod** schemas
  - Prompt design for code review: severity, file/line anchoring, actionable suggestions
  - Webhook listener routes (`/webhook/github`) & signature verification
  - End-to-end durable execution testing
  - Posting reviews back to GitHub; rate limits & abuse protection
- **Build:** a deployable bot: webhook → Inngest → diff fetch → token budget → LLM review →
  Zod-validated structured output → posted review, with tests.
- **Source:** `gen-ai-cohort/week07/learning/day14/notes/01…04`, `completed notes.md`,
  `completed notes with code.md`, `Interview.md` + `code/` + `implementation guide/chapter-01…05`
- **Gate:** you can open a PR on a test repo and receive a useful, structured review automatically.

---

## 🟫 Phase 9 — Quality, Evaluation &amp; Safety

> **This phase is a certification layer.** Apply it retroactively to every system you built in
> Phases 2–8.

### Lecture 30 — GenAI Evaluation &amp; Testing: Golden Data, Deterministic Evals &amp; LLM-as-a-Judge

- **Level:** 🟠 Advanced · **Prerequisites:** Lectures 16–17, 27
- **Goal:** Replace "it looked good in the demo" with a release gate that can **block a deploy**.
- **Topics**
  - **Why AI needs evals** — and why AI application testing is different
  - The **attribution problem:** an AI app is a pipeline (retrieve → decide → call → generate),
    not an input→output function
  - Traditional testing vs AI evaluation side by side (determinism · exactness · unit under test ·
    expected value · failure mode)
  - Why *a satisfying answer is not evidence*
  - **Anatomy of an eval:** input, expected behaviour, evaluator, threshold, verdict
  - **The application under test** — the three capability categories (policy/retrieval,
    order/tool, out-of-scope/refusal)
  - **Observability as the data layer:** `AgentResponse` as the *second output of every request*
    (`answer` · `retrievedDocuments` · `context` · `toolsUsed` · `toolArguments` · `toolResults`),
    `traceId` / `promptVersion`, why `[]` is an assertion
  - **Evaluation datasets & golden data:** the six coverage classes
    (normal · reworded · edge · out-of-scope · missing-information · adversarial),
    why a dataset is a **versioned file, not a generator**, negative expectations as real assertions,
    splits, leakage & provenance
  - **Deterministic evaluation** — when code is the judge: JSON validity, schema conformance,
    tool selection, tool arguments, refusal behaviour, required facts, forbidden claims, latency &
    cost budgets; **normalise before comparing**; **assert absence**
  - **AI quality metrics** — quality is a **vector, not a scalar:** relevance · correctness ·
    faithfulness · helpfulness · hallucination; scales and direction
  - **LLM-as-a-Judge** — the judge as a *measuring instrument, not ground truth*: the input matrix
    (question · golden answer · evidence · actual answer · rubric), structured JSON scores,
    `temperature: 0` and why it does not remove variance, known biases
    (position · verbosity · self-preference), judge versioning
  - **Rubrics, pointwise vs pairwise, and human evaluation:** anchors at both ends of the scale;
    pointwise gates a release, pairwise chooses between configurations (with order swapping);
    humans calibrate the judge
  - **RAG & system-level evaluation:** retrieval metrics as set arithmetic
    (**hit · recall@k · precision@k · MRR · nDCG**) and the **attribution classifier**
    (retrieval · generation · spec · pass)
  - **Offline vs online evaluation:** offline gates the release, online discovers the unknown;
    signals worth capturing (thumbs · escalations · re-asks · refusals · retrieval-empty rate ·
    p95 latency); the **promotion loop** that turns a production failure into a regression test
  - **The four-layer evaluation pipeline** & release-gating policy
    (deterministic on every commit · judge on a sample · full set nightly)
  - **Choosing evaluators & thresholds**; thresholds from environment; exit codes CI can read
  - Deterministic software vs AI software; **AI applications can have regression bugs**
  - Where the **non-determinism** actually comes from
  - **Component evals vs end-to-end evals**
  - The evaluation dataset vs the golden dataset; where eval data comes from
  - The **three layers of data** available for evaluation
  - **Metric consistency** across the whole stack
  - The seven questions that replace *"is the answer good?"*
  - Dataset **contamination**, leakage & the "looks good to me" anti-pattern
- **Build:** an e-commerce support agent that returns **an answer and a trace**, plus the evaluation
  system around it: a nine-case golden dataset, an eight-check deterministic catalogue, an
  LLM-as-a-judge with rubric and five metrics, the four-layer pipeline, per-metric thresholds and a
  release gate (`npm run eval` passes at `topK=1`, blocks at `topK=2`, and **attributes the failure
  to retrieval**).
- **Source:** `Forward-Deployed-Engineer/Lecture 17/notes/01…09`, `Lecture_17_Complete_Notes.md` ·
  `Forward-Deployed-Engineer/Lecture 18/notes/01…08`, `Lecture_18_Complete_Notes.md` +
  `Lecture 18/code/Basic Code/` + `implementations guide/` (01 → 10 chapters)
- **Gate:** you can change one pipeline parameter and show CI blocking the release with the failing
  stage named.

### Lecture 31 — GenAI Security &amp; Guardrails: Prompt Injection, Jailbreaks &amp; Safe Tool Use

- **Level:** 🔴 Expert · **Prerequisites:** Lectures 09–10, 21–22, 30
- **Goal:** Design systems that assume the model **will** be persuaded — and make persuasion
  insufficient to move anything that matters.
- **Topics**
  - Why GenAI breaks traditional security (no instruction/data boundary)
  - Threat modelling: **assets, trust boundaries**, attacker goals, blast radius
  - **Prompt injection — the fundamental problem:** one channel for instructions and data, so there
    is no patch that separates them
  - **Injection delivery channels:** direct input, retrieved documents, tool results, web pages,
    file contents, code comments, image text
  - **Jailbreaks, constraints & why prompts are not controls**
  - Why **tools change the risk model** (read-only vs write, idempotency, authority)
  - **Least privilege & capability routing** — constrain what the model *can* ask for, before it runs
  - **Never trust, always verify** — validation, authorization and confirmation *after* the model
  - **Guardrails as layers / defence in depth:** input layer, instruction layer, **action layer**
    (judge the *call*, not the sentence), output layer (canary comparison); **fail closed**
  - **Filters are not controls** — a guardrail that must read the attack is always one rewrite behind
  - **Confirmations & fingerprints:** binding an approval to a hash of the exact arguments so it
    cannot be replayed with different values
  - Bidirectional **PII masking** (input & output) & data minimisation
  - RBAC & platform-level guardrails at the agent boundary
  - Defensive wrappers for untrusted content
  - Prompt-injection testing, red-teaming & security regression suites
  - Compliance, audit trails & observability for security events
  - The **risk equation** (impact × likelihood) applied to an AI system
  - "**An LLM is not business logic**"; every input to the LLM can be untrusted
  - The **SQL-injection analogy** — and why it only partially fits
  - Prompt injection is *not* just "ignore previous instructions"
  - The attack toolbox; **hijacking** & exfiltration paths
  - Content **moderation** APIs and where they belong
  - **Pseudonymisation** vs masking vs encryption
  - Audit **ledger**, governance, incident triage & rollback
  - **Two failure classes** — and why the difference is load-bearing
- **Build:** an e-commerce agent hardened end to end: capability routing, least-privilege tool
  registry, an action-layer judge, a canary output check, PII masking both directions, an
  approval fingerprint, plus an attack suite that must all be blocked.
- **Source:** `Forward-Deployed-Engineer/Lecture 19/notes/01…09`, `Lecture_19_Complete_Notes.md` +
  `Lecture 19/code/Basic Code/` ·
  `gen-ai-cohort/week01/learning/day02/notes/04 llm-security-and-guardrails.md` ·
  `gen-ai-cohort/week02/learning/day03/notes/3.1/3.1-Prompt Injection.md`,
  `3.2-Defensive Wrapper.md`,
  `3.3-Role-Based Access Control (RBAC) + Platform-Level Guardrails.md` ·
  `gen-ai-cohort/week03/learning/day05/notes/05-input-output-guardrails-and-pii-masking.md`
- **Gate:** you can present a red-team attack that fails against your system **and** name the layer
  that stopped it.

---

## 🏁 Capstone — Prove the Whole Path

After Lecture 31, build **one** system that exercises every phase. A suggested brief:

| Requirement | Proves |
| :--- | :--- |
| Multi-provider LLM client with token accounting | Phase 1–2 |
| Streaming chat with correct UTF-8 framing | Lecture 07 |
| Typed tool calling + sandboxed agent loop + HITL approval | Phase 3 |
| Hybrid retrieval (dense + sparse + rerank) over your own corpus | Phase 4–5 |
| Agent memory (STM + LTM) and a graph-backed entity store | Lectures 19–20 |
| MCP server exposing tools/resources/prompts + a gateway | Phase 6 |
| Multimodal ingestion (at least images) | Phase 7 |
| Durable background indexing + async workflows | Phase 8 |
| Golden dataset, deterministic checks, LLM judge, CI release gate | Lecture 30 |
| Threat model, capability routing, canary check, red-team suite | Lecture 31 |

**Deliverable:** a public repo, an architecture diagram, a metrics table (recall@k · faithfulness ·
p95 latency · cost per 1k requests) and a one-page incident/limitations statement.

---

# 📎 Appendix A — De-duplication Map

This table shows **exactly how the two source curricula were merged**. Every row states what was
merged, what was kept unique, and which target lecture owns the topic.

| Source lecture | Target lecture | What was merged / kept |
| :--- | :---: | :--- |
| FDE L01 — FDE & GenAI Foundations | **01** | Unique (role + AI history). |
| FDE L02 — How LLMs Work | **02, 03** | Split: ch1–3 → L02; ch4–7 → L03. Merged with GAC D01's LLM/tokenization/attention/temperature topics. |
| GAC D01 — API Platforms & Multi-SDKs | **02, 03, 04, 07** | Split: LLM theory → L02/L03; SDK setup & roles → L04; streaming → L07. |
| FDE L03 — Talking to an LLM from Your App | **04** | Owner of API/app layer + token economics + prompt hygiene. |
| GAC D02 — Prompt Engineering & Loops | **05, 09, 31** | Split: prompting patterns & formats → L05; agent architecture/loops/harness → L09; injection & guardrails → L31. |
| FDE L04 — Building a Chatbot | **06** | Owner of statelessness/context/hallucination. |
| FDE L06 — AI Streaming | **07** | Owner of streaming depth (GAC D01 streaming folded in). |
| FDE L05 — Autonomous Agents & Tool Calling | **08, 09** | Split: ch1–3 tool calling → L08; ch4–7 agency/sandbox/HITL → L09. |
| GAC D03 — AI Agents & Multi-SDK Orchestration | **04, 08, 09, 10, 31** | Split: SDK vs REST & AI slop → L04; function-calling loop → L08; agent architecture & RBAC → L09; Zod structured output → L10; injection/RBAC guardrails → L31. |
| FDE L13 — Structured Outputs | **10** | Owner of structured output (GAC D03 Zod folded in). |
| GAC D08 — Agent SDK from Scratch | **11** | Unique. |
| FDE L07 — Vector Embeddings First Principles | **12** | Unique (theory). |
| FDE L08 — Embeddings Project | **13** | Unique (applied). |
| FDE L09 — Vector Search & Storage | **14** | Unique (scale/KNN/dimensionality). |
| FDE L10 — Vector DBs & ANN Algorithms | **15** | Owner of ANN internals. |
| GAC D04 — RAG & Vector Stores | **15, 16, 24** | Split: vector DB landscape → L15; RAG pipelines → L16; multimodal ingestion → L24. |
| FDE L11 — RAG | **16** | Owner of core RAG (GAC D04 RAG folded in). |
| FDE L12 — Advanced RAG | **17** | Owner of advanced RAG. |
| GAC D05 — Production Advanced RAG | **17, 26, 31** | Merged into L17 (query translation, routing, RRF, CRAG, queues); queue theory → L26; PII masking → L31. |
| GAC D06 — Vectorless RAG & LLM Wiki | **18** | Unique. |
| GAC D07 — Agent Memory & vLLM | **19, 25** | Split: memory → L19; hardware/vLLM → L25. |
| GAC D11 + D12 — Graph DB, Cypher, Neo4j, GraphRAG | **20** | Merged (same subject, two days). |
| FDE L14 — MCP First Principles | **21** | Owner of MCP core. |
| FDE L15 — MCP Resources & Prompts | **22** | Owner of MCP primitives depth. |
| GAC D15 — MCP Architecture & Transports | **21, 22** | Merged into L21 (architecture/transports/poisoning) and L22 (gateway). |
| GAC D16 — Claude Skills | **23** | Unique. |
| FDE L16 — Multimodal AI | **24** | Owner of multimodality. |
| GAC D09 — Full-Stack Platform (architecture/DB/auth/ingestion) | **27** | Unique. |
| GAC D10 — Async Indexing, RAG Chat, Artifacts | **28** | Unique. |
| GAC D13 — Inngest Durable Execution | **26** | Unique. |
| GAC D14 — GitHub PR Reviewer Bot | **29** | Unique. |
| FDE L17 + FDE L18 — Evals & Testing | **30** | Merged (heavy overlap: same golden-set / deterministic / judge / pipeline material). |
| FDE L19 — GenAI Security & Guardrails | **31** | Owner of security depth. |

**Result:** 35 source lectures/days → **31 target lectures**, with **no topic dropped** and
**no topic taught twice as new material**.

---

# ✅ Appendix B — Full Source Coverage Checklist

## B1 · `Forward-Deployed-Engineer` (19 lectures)

| Source | Mapped to | Status |
| :--- | :--- | :---: |
| L01 Introduction to FDE & GenAI Foundations (ch1–6) | Lecture 01 | ✅ |
| L02 How LLMs Work (ch1–7) | Lecture 02 (ch1–3) · Lecture 03 (ch4–7) | ✅ |
| L03 Talking to an LLM from Your Application (ch1–7) | Lecture 04 (+ ch6 → Lecture 05) | ✅ |
| L04 Building a Chatbot (ch1–7) | Lecture 06 (+ ch4 streaming → Lecture 07) | ✅ |
| L05 Autonomous Agents & Tool Calling (ch1–7) | Lecture 08 (ch1–3) · Lecture 09 (ch4–7) | ✅ |
| L06 AI Streaming (ch1–10) | Lecture 07 | ✅ |
| L07 Vector Embeddings First Principles (ch1–7) | Lecture 12 | ✅ |
| L08 Embeddings Project (ch1–7) | Lecture 13 | ✅ |
| L09 Vector Embedding Search & Storage (ch1–7) | Lecture 14 | ✅ |
| L10 Vector Databases & ANN (ch1–9) | Lecture 15 | ✅ |
| L11 RAG (ch1–9) | Lecture 16 (+ ch7 → Lecture 19) | ✅ |
| L12 Advanced RAG (ch1–9) | Lecture 17 | ✅ |
| L13 Structured Outputs (ch1–9) | Lecture 10 (+ ch8 MCP → Lectures 21–22) | ✅ |
| L14 MCP First Principles (ch1–8) | Lecture 21 | ✅ |
| L15 MCP Resources & Prompts (ch1–8) | Lecture 22 | ✅ |
| L16 Multimodal AI (ch1–8) | Lecture 24 | ✅ |
| L17 GenAI Evals & Testing (ch1–9) | Lecture 30 | ✅ |
| L18 AI Application Testing (ch1–8) | Lecture 30 | ✅ |
| L19 GenAI Security & Guardrails (ch1–9) | Lecture 31 | ✅ |

## B2 · `gen-ai-cohort` (8 weeks · 16 days)

| Source | Mapped to | Status |
| :--- | :--- | :---: |
| W01 D01 API Platforms & Multi-SDKs | Lectures 02, 03, 04, 07 | ✅ |
| W01 D02 Prompt Engineering & Loops | Lectures 05, 09, 31 | ✅ |
| W02 D03 Building AI Agents & Multi-SDK Orchestration | Lectures 04, 08, 09, 10, 31 | ✅ |
| W02 D04 RAG & Vector Stores | Lectures 15, 16, 24 | ✅ |
| W03 D05 Production Advanced RAG & Multi-Source Pipelines | Lectures 17, 26, 31 | ✅ |
| W03 D06 Vectorless RAG & LLM Wiki Engines | Lecture 18 | ✅ |
| W04 D07 Agent Memory Systems & vLLM | Lectures 19, 25 | ✅ |
| W04 D08 Autonomous Agent SDK Framework | Lecture 11 | ✅ |
| W05 D09 Full-Stack Architecture, DB, Auth & Ingestion | Lecture 27 | ✅ |
| W05 D10 Async Indexing, RAG Chat & Learning Artifacts | Lecture 28 | ✅ |
| W06 D11 Graph DB Fundamentals & Cognitive Memory | Lecture 20 | ✅ |
| W06 D12 Cypher, Neo4j & GraphRAG | Lecture 20 | ✅ |
| W07 D13 Inngest & Durable Execution | Lecture 26 | ✅ |
| W07 D14 AI GitHub PR Reviewer Bot | Lecture 29 | ✅ |
| W08 D15 MCP Architecture & Transports | Lectures 21, 22 | ✅ |
| W08 D16 Claude Skills & MCP Integration | Lecture 23 | ✅ |

**Coverage: 19/19 FDE lectures + 16/16 cohort days = 35/35 mapped. Nothing missing.**

---

# 🧰 Appendix C — Tech Stack, Prerequisites &amp; Study Plan

## C1 · Languages &amp; runtime

| Layer | Tooling used across the curriculum |
| :--- | :--- |
| Language | **TypeScript** (primary) · **JavaScript** (ESM, where the source repo uses it) |
| Runtime | **Node.js** (LTS) |
| Backend | **Express** (+ Zod validation, `tsx`/`ts-node`) |
| Frontend | **Next.js 16 App Router** · vanilla `fetch` + `ReadableStream` for streaming demos |
| Database | **PostgreSQL** + **Prisma ORM** · **MongoDB** |
| Vector stores | **Qdrant** · **Pinecone** · **pgvector** (and comparisons with Weaviate/Chroma/Milvus) |
| Graph DB | **Neo4j** (Docker / Aura) + `neo4j-driver` + **Cypher** |
| Queues / workflows | **BullMQ + Redis** · **Inngest** (durable execution) |
| Memory | **mem0** · custom STM/LTM stores |
| Scraping / media | **Firecrawl** · YouTube transcript extraction · **Cloudinary** |
| Search | **Tavily** |
| Model providers | **OpenAI** · **Google Gemini** · **Anthropic Claude** · **Groq** · **Mistral** · **Ollama** (local) |
| Protocol | **MCP** (JSON-RPC 2.0 over STDIO / HTTP-SSE) · Claude **Skills** (`SKILL.md`) |
| Serving engines | **vLLM** (PagedAttention) |
| DevOps | Docker / Docker Compose · GitHub Actions (for the eval release gate) |

## C2 · Prerequisites by phase

| Before you start… | You should already be able to… |
| :--- | :--- |
| Phase 0–1 | Write basic JS/TS, use `npm`, read JSON, use the terminal |
| Phase 2 | Build a small Express server; use `async/await`; understand HTTP basics |
| Phase 3 | Read a JSON Schema; write a TypeScript interface; handle errors |
| Phase 4 | Understand arrays/matrices conceptually; use `curl`/Postman |
| Phase 5 | Run Docker containers; read SQL basics |
| Phase 6–7 | Read a protocol spec; work with binary/base64 data |
| Phase 8 | Deploy a service; manage env vars & secrets; read logs/metrics |
| Phase 9 | Write unit tests; use a CI system |

## C3 · Suggested study plan (part-time)

| Weeks | Lectures | Focus |
| :--- | :--- | :--- |
| 1 | 01 | Orientation & history; write the discovery brief |
| 2–3 | 02–03 | LLM internals; attention & decoding labs |
| 4–6 | 04–07 | Application layer; ship a streaming chatbot |
| 7–9 | 08–11 | Tools, agents, schema contracts, build your own SDK |
| 10–12 | 12–15 | Embeddings → vector search → ANN internals |
| 13–17 | 16–20 | RAG → advanced RAG → vectorless → memory → graphs |
| 18–20 | 21–23 | MCP + Claude Skills |
| 21 | 24 | Multimodality |
| 22–26 | 25–29 | Inference, durable workflows, full-stack platform, PR bot |
| 27–29 | 30–31 | Evals & release gating, security & red-teaming |
| 30–32 | Capstone | One system that proves the whole path |

> Adjust freely — but **never skip Phase 1**. Everything after it is a consequence of
> "an LLM predicts the next token".

---

# 📈 Appendix D — Progress Tracker

Copy this table into a scratch file (or tick it in your fork) as you go.

| # | Lecture | Notes written | Code built | Gate passed |
| :---: | :--- | :---: | :---: | :---: |
| 01 | FDE Introduction & AI History | ✅ | ☐ | ☐ |
| 02 | LLM Foundations | ✅ | ✅ | ☐ |
| 03 | Attention & Decoding | ✅ | ✅ | ☐ |
| 04 | APIs, Multi-SDK & Token Economics | ✅ | ✅ | ☐ |
| 05 | Prompt Engineering | ✅ | ✅ | ☐ |
| 06 | Chatbots, Context & Hallucination | ✅ | ✅ | ☐ |
| 07 | AI Streaming | ✅ | ✅ | ☐ |
| 08 | Tool Calling | ✅ | ✅ | ☐ |
| 09 | Agents, Sandboxing & HITL | ✅ | ✅ | ☐ |\n| 10 | Structured Outputs | ✅ | ✅ | ☐ |
| 11 | Agent SDK from Scratch | ☐ | ☐ | ☐ |
| 12 | Embeddings First Principles | ☐ | ☐ | ☐ |
| 13 | Semantic Search Project | ☐ | ☐ | ☐ |
| 14 | Vector Search & Storage | ☐ | ☐ | ☐ |
| 15 | Vector DBs & ANN | ☐ | ☐ | ☐ |
| 16 | RAG | ☐ | ☐ | ☐ |
| 17 | Advanced RAG | ☐ | ☐ | ☐ |
| 18 | Vectorless RAG & LLM Wiki | ☐ | ☐ | ☐ |
| 19 | Agent Memory Systems | ☐ | ☐ | ☐ |
| 20 | Graph DB, Cypher & GraphRAG | ☐ | ☐ | ☐ |
| 21 | MCP Core | ☐ | ☐ | ☐ |
| 22 | MCP Resources, Prompts & Gateway | ☐ | ☐ | ☐ |
| 23 | Claude Skills | ☐ | ☐ | ☐ |
| 24 | Multimodal AI | ☐ | ☐ | ☐ |
| 25 | vLLM & PagedAttention | ☐ | ☐ | ☐ |
| 26 | Durable Execution (Inngest) | ☐ | ☐ | ☐ |
| 27 | Full-Stack AI Platform | ☐ | ☐ | ☐ |
| 28 | Async Indexing & RAG Chat | ☐ | ☐ | ☐ |
| 29 | GitHub PR Reviewer Bot | ☐ | ☐ | ☐ |
| 30 | Evals & Testing | ☐ | ☐ | ☐ |
| 31 | Security & Guardrails | ☐ | ☐ | ☐ |
| ★ | Capstone | ☐ | ☐ | ☐ |

---

# 🧱 Appendix E — Structural Learning Design

> This is the **sequence guarantee**. Read the table top-to-bottom: every lecture's *Prerequisites*
> are strictly lower-numbered, every lecture *unlocks* the next capability, and nothing appears
> before it can be understood.

## E1 · The dependency chain, lecture by lecture

| # | Lecture | Prerequisites | You will be able to… | Unlocks |
| :---: | :--- | :--- | :--- | :--- |
| 01 | FDE Intro & AI History | — | Run a problem-discovery brief; narrate rules → ML → n-grams → RNN → Transformer; name the 4 properties of a production AI system | 02 |
| 02 | LLM Foundations | 01 | Explain next-token prediction; tokenize by hand; read token ids as labels | 03 |
| 03 | Attention & Decoding | 02 | Draw a transformer block; compute scaled dot-product attention; pick a decoding strategy deliberately | 04 |
| 04 | APIs & Multi-SDK | 02–03 | Call one interface across ≥3 providers; budget tokens & cost per request; manage keys and rate limits | 05, 06 |
| 05 | Prompt Engineering | 04 | Turn a vague ask into a versioned prompt with an output contract and a known failure mode | 06, 08 |
| 06 | Chatbots & Context | 04–05 | Keep a conversation coherent past the context limit; explain hallucination and sycophancy mechanically | 07, 16 |
| 07 | AI Streaming | 06 | Stream token → frame → pixel correctly; handle UTF-8, backpressure and cancellation | 08, 27 |
| 08 | Tool Calling | 07 | Define typed tools; run a multi-hop tool chain and point at the message that caused each hop | 09, 10 |
| 09 | Agents, Sandboxing & HITL | 08 | Bound an agent's blast radius; apply the 3-tier authorization matrix and a durable approval gate | 10, 11, 31 |
| 10 | Structured Outputs | 08–09 | Guarantee a typed object from any provider; validate, repair, and degrade safely | 11, 16, 30 |
| 11 | Agent SDK from Scratch | 08–10 | Add a tool, an interceptor and a second provider without touching the core loop | 26 |
| 12 | Vector Embeddings | 02–03 | Explain cosine vs L1 vs L2 geometrically; build a meaning explorer | 13 |
| 13 | Semantic Search Project | 12 | Ship represent → store → compare → rank; defend where quality comes from | 14, 16 |
| 14 | Vector Search & Storage | 13 | Set a recall/latency budget; choose exact vs ANN on evidence | 15 |
| 15 | Vector DBs & ANN | 14 | Size a cluster; explain IVF/HNSW/PQ/DiskANN; migrate an index without downtime | 16, 19 |
| 16 | RAG | 10, 13–15 | Build grounded answering end to end; attribute a wrong answer to a pipeline stage | 17, 24, 27 |
| 17 | Advanced RAG | 16 | Fix query mismatch and distance mismatch; run hybrid + rerank + CRAG | 18, 26, 28 |
| 18 | Vectorless RAG & LLM Wiki | 16–17 | Choose vectorless retrieval for structural questions; benchmark it against dense | — |
| 19 | Agent Memory Systems | 06, 16–17 | Give an agent durable STM+LTM+graph memory with eviction and reflection | 20, 27 |
| 20 | Graph DB & GraphRAG | 15–16, 19 | Model connected knowledge; answer multi-hop questions dense retrieval gets wrong | 27 |
| 21 | MCP Core | 08–11 | Expose tools over one open protocol; swap transports without touching the host | 22, 23 |
| 22 | MCP Resources, Prompts & Gateway | 21 | Assign every capability to model / app / user; filter and audit at a gateway | 23, 27 |
| 23 | Claude Skills | 21–22 | Package workflow knowledge as a portable, validated, versioned skill | 27, 28 |
| 24 | Multimodal AI | 02–03, 16 | Explain patches → embeddings → projection; decide OCR vs MLLM on cost evidence | 28 |
| 25 | vLLM & PagedAttention | 03, 19 | Explain why decode is bandwidth-bound; benchmark a self-hosted engine vs an API | — |
| 26 | Durable Execution (Inngest) | 09, 11, 17 | Make long multi-agent work crash-safe, resumable and rate-limited | 27, 28, 29 |
| 27 | Full-Stack AI Platform | 16–17, 19, 26 | Ship a multi-tenant AI product with auth, DB and multi-channel ingestion | 28 |
| 28 | Async Indexing & RAG Chat | 27 | Index asynchronously, stream cited answers, generate learning artifacts | 29, 30 |
| 29 | GitHub PR Reviewer Bot | 10, 26 | Ship an autonomous agent against a real third-party API, end to end | 30 |
| 30 | Evals & Testing | 16–17, 27 | Build a golden set + deterministic checks + judge, and **block a release in CI** | 31 |
| 31 | Security & Guardrails | 09–10, 21–22, 30 | Make prompt injection insufficient to move anything that matters; name the layer that stopped each attack | Capstone |

## E2 · Capability ladder — what "industry-ready" means at each phase

| After phase | Job-ready capability | Typical title |
| :---: | :--- | :--- |
| 1 | Explain how an LLM produces a token; read model docs intelligently | Learner / intern |
| 2 | Ship a streaming, cost-aware, prompt-engineered chat service | **AI Application Developer** |
| 3 | Give a model tools safely; enforce output contracts; build an agent runtime | **AI Engineer (agents)** |
| 4 | Design and operate a vector search layer at scale | **Retrieval / Search Engineer** |
| 5 | Own a RAG system's quality end to end, including memory and graphs | **RAG / Knowledge Engineer** |
| 6 | Integrate any tool or workflow through open standards | **AI Platform / Integration Engineer** |
| 7 | Extend pipelines to images and documents | **Multimodal Engineer** |
| 8 | Run inference economically, orchestrate durable workflows, ship full-stack AI products | **Senior AI Engineer / AI Product Engineer** |
| 9 | Gate releases with evals and defend a threat model | **AI Engineer (Quality &amp; Safety) / FDE** |

## E3 · Reading contract (how to make progress verifiable)

For every lecture, in this order:

```text
READ   → the source notes named in the lecture's "Source" line
WRITE  → your own chapter notes into  notes/   (not a copy — your words)
BUILD  → the artefact named in the lecture's "Build" line into  code/
TEST   → run it; capture the numbers (latency, cost, recall, validity)
GATE   → answer the lecture's "Gate" question out loud, without notes
RECORD → tick Appendix D and write down the number you measured
```

If you cannot answer the Gate question, the lecture is **not finished** — re-read; do not move on.
That rule is what makes this path *structural* rather than a reading list.

# 📋 Appendix F — Source Chapter Coverage Ledger

> **The completeness proof.** Every chapter file in both source repositories, mapped to its target
> lecture. If a chapter is not in this table, it does not exist in the sources.
> Format: `NN Chapter title` → **target lecture**.

## F1 · `Forward-Deployed-Engineer` — chapter by chapter

| Source | Chapters (from the source `notes/` folders) | Target |
| :--- | :--- | :---: |
| **FDE L01** | `01` Introduction to Forward Deployed Engineering · `02` Foundations of AI & Rule-Based Systems · `03` Machine Learning & Deep Learning Foundations · `04` Language Modeling, Statistical N-Grams & RNNs · `05` Attention Mechanism, Transformers & LLMs · `06` Production Systems & Key Takeaways | **01** |
| **FDE L02** | `01` Foundations of LLMs & Next-Token Prediction · `02` Tokenization, Subwords & Numerical Representations · `03` Positional Encodings & Vector Embeddings · `04` Self-Attention & QKV Architecture · `05` Transformer Blocks, Deep Layers & Logits · `06` Softmax, Decoding Strategies & Temperature · `07` Complete LLM Pipeline & Key Takeaways | **02** (`01–03`) · **03** (`04–07`) |
| **FDE L03** | `01` GenAI Applications vs Raw LLMs & the Engine Analogy · `02` LLM API Architecture & the Postman Protocol · `03` Token Economics, Metadata & Production Engineering · `04` Node/Express JS/TS Environment & Architecture · `05` Building the Production Support Ticket Summarizer · `06` Framework Abstractions, Response Metadata & Prompt Hygiene · `07` Complete Application Pipeline & Key Takeaways | **04** (`01–05,07`) · **05** (`06`) |
| **FDE L04** | `01` Stateless LLMs, Conversation History & Role Architecture · `02` Context Windows, Token Accumulation & Context Management · `03` Context vs Model Weights & the Illusion of Learning · `04` Real-Time Streaming Architecture & SSE Protocols · `05` Hallucination Mechanisms, Fluency vs Truth & Vulnerabilities · `06` Engineering Defenses: RAG, Guardrails & Verification · `07` Complete Enterprise Chatbot Architecture & Takeaways | **06** (`01–03,05–07`) · **07** (`04`) |
| **FDE L05** | `01` From Token Prediction to Tool Augmentation · `02` The Tool Calling Protocol & Wire Architecture · `03` Multi-Step Tool Chaining & Execution Loops · `04` First Principles of AI Agents & Agency Spectrum · `05` Workspace Sandboxing & Agent Security · `06` Building an Autonomous Website Builder Agent · `07` Human-in-the-Loop Safety & Enterprise Patterns | **08** (`01–03`) · **09** (`04–07`) |
| **FDE L06** | `01` How LLMs Generate Text · `02` Generation vs Delivery: Non-Streaming & Streaming · `03` Latency Anatomy: TTFT, ITL & Perceived Performance · `04` Token, Chunk, Network & Byte Granularity · `05` HTTP Streaming Mechanics: Chunked Encoding, SSE & WebSockets · `06` End-to-End Streaming Architecture & Pipeline Invariants · `07` Backend Streaming: `call` vs `stream` vs `Flux` · `08` Conversation History Buffering & Persistence · `09` Frontend Streaming: `fetch`, `ReadableStream`, `TextDecoder` · `10` Production Hardening, Observability & Takeaways | **07** |
| **FDE L07** | `01` The Problem of Meaning in Computers · `02` From Numbers to Vectors · `03` Measuring Similarity Between Vectors · `04` The Failure of Hand-Crafted Features · `05` What Are Embeddings Learning? Representations · `06` Vector vs Embedding & Applications · `07` The Complete Journey: Synthesis | **12** |
| **FDE L08** | `01` Embeddings & the Problem of Meaning · `02` Why Not Just Use an LLM? · `03` Precomputation: The Key Engineering Insight · `04` Semantic Search & Movie Recommendation · `05` Cosine Similarity: Measuring Closeness · `06` Core Mental Model: REPRESENT–STORE–COMPARE–RANK · `07` Complete System Design & Applications | **13** |
| **FDE L09** | `01` The Scale Wall: Why Toy Vector Search Breaks · `02` Why Relational Databases Are Not Enough · `03` Anatomy of a Vector Database · `04` Brute-Force KNN: The Correct Baseline · `05` Indexes & Why Scalar Indexes Fail for Vectors · `06` The Curse of Dimensionality · `07` Approximate Nearest Neighbor Indexes · `08` Production Vector Search Design | **14** (`01–07`) · **15** (`08`) |
| **FDE L10** | `01` Embeddings & the Geometry of Meaning · `02` Similarity, Distance & Metric Consistency · `03` Exact KNN & the ANN Bargain · `04` IVF — Inverted File Index · `05` HNSW — Hierarchical Navigable Small World · `06` Vector Compression & Product Quantization · `07` Anatomy of a Vector Database · `08` Qdrant, pgvector & the Storage Decision · `09` Production RAG Retrieval Systems | **15** |
| **FDE L11** | `01` The Stateless Model · `02` RAG: The Open-Book Architecture · `03` Ingestion: Documents to Chunks · `04` Embeddings at Query Time · `05` The Vector Index · `06` Grounded Generation · `07` Conversation State & Memory · `08` Evaluation & Debugging · `09` Production System Design | **16** (`01–06,08,09`) · **19** (`07`) |
| **FDE L12** | `01` Why Basic RAG Breaks · `02` Fixed-Size Chunking & Overlap · `03` Structural, Semantic & Contextual Chunking · `04` Top-K & Similarity Thresholds · `05` Metadata Filtering · `06` Hybrid Search & RRF · `07` Reranking: Two-Stage Retrieval · `08` Context Engineering · `09` Evaluation & Production Playbook | **17** |
| **FDE L13** | `01` Why Plain Text Is Not Enough · `02` What Structured Output Is: Schema, Contract & Types · `03` Why "Just Ask for JSON" Fails · `04` JSON Schema & Schema Design for LLMs · `05` Enforcement Mechanisms & Provider Landscape · `06` Validation, Repair & Failure Handling · `07` Structured Output vs Tool Calling · `08` From Data to Action: Tools, Integrations & MCP · `09` Production Playbook, Evaluation & Checklist | **10** (`01–07,09`) · **21–22** (`08`) |
| **FDE L14** | `01` The Integration Problem & Why Standards Win · `02` What MCP Is: Protocol, Server & Standard Interface · `03` MCP vs Tool Calling: Complementary Layers · `04` Host, Client, Server Architecture · `05` The Tools Primitive · `06` Resources & Prompts · `07` Discovery, Invocation & Lifecycle · `08` Security, Production & Practical Architecture | **21** |
| **FDE L15** | `01` The Three Primitives & the Control Model · `02` Why Resources: Context as a First-Class Primitive · `03` Resource Discovery, Reading & Anatomy · `04` Building Resources: Static, Dynamic & Templated · `05` How the Application Chooses a Resource · `06` MCP Prompts: Reusable Interaction Templates · `07` Prompt Arguments, Discovery & Client Wiring · `08` Bringing Tools, Resources & Prompts Together | **22** |
| **FDE L16** | `01` Why Text-Only AI Is Not Enough · `02` What Multimodal Models Understand & OCR vs MLLM · `03` From Text to Numbers: The Text Pipeline · `04` Images Are Numbers: Pixels, Patches & Visual Embeddings · `05` Connecting Vision to Language: Projection, Position & Attention · `06` How Models Learn Vision–Language Alignment · `07` The End-to-End Multimodal Pipeline · `08` Production Multimodal Systems: Cost, Security & Evaluation | **24** |
| **FDE L17** | `01` Why AI Needs Evals · `02` Anatomy of an Eval · `03` Evaluation Datasets & Golden Data · `04` Deterministic Evaluation · `05` AI Quality Metrics · `06` LLM-as-a-Judge · `07` Rubrics, Pointwise, Pairwise & Human Evaluation · `08` RAG & System-Level Evaluation · `09` Offline & Online Evaluation | **30** |
| **FDE L18** | `01` Why AI Testing Is Different · `02` The Application Under Test · `03` Observability: `AgentResponse` & Traces · `04` The Golden Dataset · `05` Deterministic Evaluation · `06` LLM-as-a-Judge · `07` The Four-Layer Evaluation Pipeline · `08` Choosing Evaluators & Thresholds | **30** |
| **FDE L19** | `01` Why GenAI Breaks Traditional Security · `02` Threat Modelling: Assets & Trust Boundaries · `03` Prompt Injection: The Fundamental Problem · `04` Injection Delivery Channels · `05` Jailbreaks, Constraints & "Prompts Are Not Controls" · `06` Why Tools Change the Risk Model · `07` Least Privilege & Capability Routing · `08` Never Trust, Always Verify · `09` Guardrails as Layers: Defence in Depth | **31** |

## F2 · `gen-ai-cohort` — day by day

| Source | Chapters / note files | Target |
| :--- | :--- | :---: |
| **GAC D01** | `notes.md` (what is an LLM · BPE tokenization · embeddings · vector space intuition · attention · context window & rate limits · temperature & top-p · training vs inference phase · Node.js setup · streaming) · `open ai.md` · `gemini.md` · `groq.md` · `mistral.md` (client instantiation · request config · raw response JSON · parsing) · `role.md` (four primary roles · how roles work under the hood) | **02, 03, 04, 07** |
| **GAC D02** | `prompting-notes/01` Zero-Shot · `02` Few-Shot & In-Context Learning · `03` Chain-of-Thought · `04` Role-Play/Persona · `02 llm-chat-roles` · `03 model-specific-formats` (ChatML · Alpaca · INST · FLAN-T5) · `04 llm-security-and-guardrails` (prompt injection · distillation & extraction attacks · GIGO · input/output guardrails) · `05 agent-architecture-and-loops` (brain+loop+tools · perceive/decide/act · harness engineering) | **05** (prompting/roles/formats) · **09** (agent arch/loops/harness) · **31** (security depth) |
| **GAC D03** | `01-ai-agent-architecture` · `02-context-and-token-management` (sliding memory window · token costs) · `03-accessing-llms-sdk-vs-api` (REST vs SDK · Ollama) · `04-structured-output-and-function-calling` (Zod · double-turn tool calling) · `3.1/3.1` Prompt Injection · `3.2` Defensive Wrapper · `3.3` RBAC + platform-level guardrails | **04** (SDK vs API/Ollama) · **08** (function calling) · **09** (agent arch/RBAC) · **10** (Zod) · **31** (injection/wrapper) |
| **GAC D04** | `01-introduction-to-rag` · `02-vector-databases-and-embeddings` (similarity metrics · vector DB landscape) · `03-rag-architecture-and-pipelines` (indexing + query pipeline) · `04-building-rag-with-langchain-and-qdrant` · `05-multimodal-ingestion-and-advanced-rag` | **15** (landscape/metrics) · **16** (RAG/LangChain/Qdrant) · **24** (multimodal ingestion) |
| **GAC D05** | `01` Naive RAG vs Production Advanced RAG · `02` Query Translation: rewriting · step-back · sub-query decomposition · HyDE · `03` Query Routing & Multi-Source Adapters (Postgres · Qdrant · MongoDB · S3) · `04` RRF Ranking & CRAG Evaluation · `05` Input/Output Guardrails & PII Masking · `06` Latency Optimisation & Async Queues (BullMQ + Redis) | **17** · **26** (queues) · **31** (PII/guardrails) |
| **GAC D06** | `01` Limitations of Vector RAG & Abrupt Chunking · `02` Vectorless RAG & Tree-Structured Indexing · `03` Agentic Tree Search & LLM Relevance Retrieval · `04` LLM Wiki & Obsidian/Karpathy Architecture · `05` Comparative Analysis: Vector vs Vectorless RAG | **18** |
| **GAC D07** | `01` Application-Level Memory & Context Limits · `02` Short-Term Memory & Sliding Windows · `03` Long-Term Memory Taxonomy & RAG · `04` Memory Eviction & Dreaming/Reflection · `05` Agent Memory System Design & `mem0` · `extra/01` LLM Hardware: Training vs Inference · `extra/02` Inference Engines: Prefill vs Decode · `extra/03` vLLM Architecture & PagedAttention | **19** (`01–05`) · **25** (`extra/01–03`) |
| **GAC D08** | `01` Introduction to Agent SDK & Architecture · `02` Builder Pattern & Agent Configuration · `03` Harness Prompting & ReAct Pipeline · `04` Tool Execution Engine & Registry · `05` Message State Execution & Interceptors | **11** |
| **GAC D09** | Implementation guide `00` overview/setup · `01` bootstrap · `02` database · `03` authentication · `04` workspaces · `05` sources CRUD · `06` import channels | **27** |
| **GAC D10** | Implementation guide `07` indexing pipeline · `08` RAG chat · `09` memory search · `10` learning artifacts | **28** |
| **GAC D11** | `01` Graph Database Fundamentals & Memory Architecture | **20** |
| **GAC D12** | `02` Cypher Syntax & Patterns · `03` Neo4j Architecture, Deployment & LLM Integration · `04` Building Neo4j Apps with the Node.js Driver · `05` Advanced Graph Modeling, GraphRAG & Memory Systems | **20** |
| **GAC D13** | `01` Inngest Fundamentals & Async Architecture · `02` Procedural Code vs Event-Driven Multi-Agent Orchestration · `03` Traditional Queues (RabbitMQ/Redis) vs Inngest · `04` Durable Execution SDK & Steps API · `05` Advanced Multi-Agent Workflows, Concurrency & Error Resilience | **26** |
| **GAC D14** | `01` AI PR Reviewer Architecture & Inngest · `02` Octokit Integration & Diff Parsing · `03` OpenAI Agents & Structured PR Review · `04` Inngest Durable PR Review Pipeline | **29** |
| **GAC D15** | `01` Introduction to MCP · `02` MCP Architecture & Providers · `03` MCP Transports: STDIO & HTTP-SSE · `04` Tool Context Poisoning & MCP Gateway · `05` MCP Interview Guide & Summary | **21** (`01–03`) · **22** (`04`) |
| **GAC D16** | `01` Introduction & Fundamentals of Claude Skills · `02` Planning, Design & Technical Requirements · `03` Testing, Iteration & Evaluation Strategies · `04` Distribution, Sharing & API Integration · `05` Architecture Patterns & Troubleshooting · `06` Resources, Checklists & Reference Templates | **23** |

**Ledger result:** every chapter file of all **19 FDE lectures** and all **16 cohort days** appears in
F1/F2 above with a target lecture. **No chapter is unmapped.**

---

## 🧭 Final Mental Model

```text
Text ──tokens──▶ Vectors ──attention──▶ Probabilities ──sampling──▶ Output
   │                                                                    │
   └────────────── your application owns all of this ────────────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
   CONTEXT            CAPABILITY          QUALITY
 (history, memory,  (tools, agents,     (evals, security,
  retrieval, RAG,    MCP, skills,        guardrails, release
  graphs, images)    permissions)        gates)
        │                 │                  │
        └─────────────────┴──────────────────┘
                          ▼
              A grounded · observable · secure · actionable system
```

> **The thesis of this whole curriculum:** the model proposes; your architecture disposes.
> Everything after Lecture 01 is about building the seam between the two — and then proving,
> with numbers, that the seam holds.

