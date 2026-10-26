# Lecture 06 — Chatbots and Context · Chapter Index

> **Phase:** 2 · Application Layer · **Level:** 🟡 Intermediate · **Prerequisites:** Lectures 04–05
> **Goal:** build a real multi-turn assistant and understand exactly why it forgets, drifts and lies.
> **Gate:** you can show a conversation that stays coherent past the context limit — and explain the exact
> trade-off you chose.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Stateless LLMs, Conversation History & Role Architecture** | The model has no memory — the application carries the conversation; roles are authority levels, not formatting. | [01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md](./notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md) |
| 02 | **Context Windows & Token Accumulation** | The window is a hard budget ($L_{\text{input}} + L_{\text{output}} \le C_{\text{max}}$); naive history appending is $O(N^2)$ in tokens, money, latency and accuracy. | [02_Context_Windows_and_Token_Accumulation.md](./notes/02_Context_Windows_and_Token_Accumulation.md) |
| 03 | **Context Management Strategies** | Four levers — retain, compress, retrieve, evict — layered across time horizons, with compaction kept off the hot path. | [03_Context_Management_Strategies.md](./notes/03_Context_Management_Strategies.md) |
| 04 | **Context vs Model Weights & the Illusion of Learning** | Weights are frozen and context is fluid; "in-context learning" is conditioning, and memory belongs in a database — not a fine-tune. | [04_Context_vs_Model_Weights_and_the_Illusion_of_Learning.md](./notes/04_Context_vs_Model_Weights_and_the_Illusion_of_Learning.md) |
| 05 | **Real-Time Streaming & SSE** | Autoregressive generation is already incremental; SSE is the transport, TTFT is the metric, and cancellation is mandatory. | [05_Real_Time_Streaming_and_SSE.md](./notes/05_Real_Time_Streaming_and_SSE.md) |
| 06 | **Hallucination Mechanisms: Fluency vs Truth** | Hallucination is the training objective working as designed; fluency guarantees nothing and sycophancy is the default. | [06_Hallucination_Mechanisms_Fluency_vs_Truth.md](./notes/06_Hallucination_Mechanisms_Fluency_vs_Truth.md) |
| 07 | **Engineering Defences: Grounding, RAG, Guardrails & Verification** | Seven deterministic layers around a probabilistic core, with calibrated refusal shipped as a product feature. | [07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md](./notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md) |
| 08 | **Complete Enterprise Chatbot Architecture** | Six tiers, one unprivileged kernel, and a cost/coherence/latency trade-off you must be able to name. | [08_Complete_Enterprise_Chatbot_Architecture.md](./notes/08_Complete_Enterprise_Chatbot_Architecture.md) |
| — | **Lecture 06 — Complete Notes** | Consolidated revision layer: executive summary, one master diagram, cheat sheet, decision tables, 20 misconceptions, glossary and 23 self-check questions. | [Lecture_06_Complete_Notes.md](./notes/Lecture_06_Complete_Notes.md) |

**Chapter count: 8** (within the 5–10 limit for this lecture).

---

## 🧭 Reading paths

| Situation | Read |
| :--- | :--- |
| First pass, start to finish | 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 |
| "The bot forgot what I said" | [01](./notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md) §01.3–§01.6 · [03](./notes/03_Context_Management_Strategies.md) §03.3 |
| "Our token bill exploded" | [02](./notes/02_Context_Windows_and_Token_Accumulation.md) §02.5–§02.9 · [03](./notes/03_Context_Management_Strategies.md) |
| "It feels slow" | [05](./notes/05_Real_Time_Streaming_and_SSE.md) §05.3 |
| "It makes things up" | [06](./notes/06_Hallucination_Mechanisms_Fluency_vs_Truth.md) · [07](./notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md) |
| Preparing for an interview | [Lecture_06_Complete_Notes.md](./notes/Lecture_06_Complete_Notes.md) §1, §4, §5, §8 |
| Designing a new system | [08](./notes/08_Complete_Enterprise_Chatbot_Architecture.md) → [02](./notes/02_Context_Windows_and_Token_Accumulation.md)–[03](./notes/03_Context_Management_Strategies.md) → [07](./notes/07_Engineering_Defences_Grounding_RAG_Guardrails_and_Verification.md) |


---

## 🔗 Related workspace links

| Item | Link | Status |
| :--- | :--- | :---: |
| Lecture workspace / checklist | [📄 README.md](./README.md) | ✅ |
| Generation prompt (git-ignored) | [📄 prompt.md](./prompt.md) | ✅ |
| Chapter notes | [📂 notes/](./notes/) | ✅ |
| Basic Code | [📂 code/Basic Code/](./code/Basic%20Code/) · [📖 implementation guide](./code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) | ✅ |
| Production Code | [📂 code/](./code/) | 🔜 to build |
| Lecture assignment | [📝 Assignment/task.md](./Assignment/task.md) | ✅ |
| Roadmap — Lecture 06 topics, build & gate | [🗺️ ../roadmap.md](../roadmap.md) | ✅ |
| Repository chapter index (all lectures) | [📚 ../index.md](../index.md) | ✅ |

---

## 🔗 Source references

- `Forward-Deployed-Engineer/Lecture 04/notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/02_Context_Windows_Token_Accumulation_and_Context_Management.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/03_Context_vs_Model_Weights_and_The_Illusion_of_Learning.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/04_Real_Time_Streaming_Architecture_and_SSE_Protocols.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/05_Hallucination_Mechanisms_Fluency_vs_Truth_and_Vulnerabilities.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/06_Engineering_Defenses_RAG_Guardrails_and_Verification.md`
- `Forward-Deployed-Engineer/Lecture 04/notes/07_Complete_Enterprise_Chatbot_Architecture_and_Takeaways.md`

---

### Navigation

- **Previous lecture:** [Lecture 05 — Prompt Engineering](../Lecture%2005%20-%20Prompt%20Engineering/index.md)
- **Next lecture:** [Lecture 07 — AI Streaming](../Lecture%2007%20-%20AI%20Streaming/index.md)

