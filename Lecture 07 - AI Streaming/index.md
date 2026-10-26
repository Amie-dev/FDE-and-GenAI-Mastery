# Lecture 07 — AI Streaming · Chapter Index

> **Phase:** 2 · Application Layer · **Level:** 🟡 Intermediate · **Prerequisites:** Lecture 06
> **Goal:** own the full streaming path end to end — token → network frame → rendered character.
> **Gate:** you can render a streamed response with correct UTF-8 multi-byte handling and cancel it
> mid-flight without leaking the connection.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **How LLMs Generate Text — the Root Cause of Streaming** | Generation is an irreducibly sequential next-token loop; prefill sets TTFT, decode sets TPS, and the KV cache taxes every turn. | [01_How_LLMs_Generate_Text.md](./notes/01_How_LLMs_Generate_Text.md) |
| 02 | **Generation vs Delivery: Non-Streaming & Streaming Responses** | Two independent processes — you cannot make the model faster, but you can stop hiding its output; streaming changes failure semantics too. | [02_Generation_vs_Delivery_Non_Streaming_and_Streaming_Responses.md](./notes/02_Generation_vs_Delivery_Non_Streaming_and_Streaming_Responses.md) |
| 03 | **Latency Anatomy: TTFT, ITL & Perceived Performance** | TTFT governs *perceived responsiveness*, total time governs *completion*; every prompt token is a TTFT tax and the client−server TTFT gap is the diagnostic. | [03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md](./notes/03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md) |
| 04 | **Token, Provider Chunk, Network Chunk & Byte** | Four granularities with unstable boundaries; one streaming `TextDecoder` per response, blind accumulation, and a fragmentation torture test. | [04_Token_Chunk_Network_and_Byte_Granularity.md](./notes/04_Token_Chunk_Network_and_Byte_Granularity.md) |
| 05 | **HTTP Streaming Mechanics: Chunked, SSE & WebSockets** | Streaming is HTTP with a progressive body; SSE is a *format*, not a transport, and infrastructure (buffering, compression, timeouts) is the usual culprit. | [05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md](./notes/05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md) |
| 06 | **End-to-End Architecture & the 7 Pipeline Invariants** | Two streams must both stay streamed; the backend is a bridge not a buffer; backpressure is usually a UI-rendering problem. | [06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md](./notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md) |
| 07 | **Backend: `call` vs `stream`, `Flux` & Stream Pumps** | The return type *is* the architecture; `Flux`/`AsyncIterable` is a conveyor belt, and errors after the first byte must be signalled in-band. | [07_Backend_Streaming_Call_vs_Stream_Flux_and_Stream_Pumps.md](./notes/07_Backend_Streaming_Call_vs_Stream_Flux_and_Stream_Pumps.md) |
| 08 | **Frontend: `fetch`, `ReadableStream` & `TextDecoder`** | `await fetch()` resolves on headers; one `response.text()` destroys streaming; one bubble, one decoder, cancellable and sanitised. | [08_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md](./notes/08_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md) |
| 09 | **History, Persistence & Production Hardening** | Never store chunks as messages; dual-write, persist once, keep interrupted turns, and alert on the TTFT gap. | [09_History_Persistence_and_Production_Hardening.md](./notes/09_History_Persistence_and_Production_Hardening.md) |
| — | **Lecture 07 — Complete Notes** | Consolidated revision layer: executive summary, master diagram, cheat sheet, decision tables, the 7 invariants, 20 misconceptions, glossary and 35 self-check questions. | [Lecture_07_Complete_Notes.md](./notes/Lecture_07_Complete_Notes.md) |

**Chapter count: 9** (within the 5–10 limit for this lecture).

---

## 🧭 Reading paths

| Situation | Read |
| :--- | :--- |
| First pass, start to finish | 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 |
| "Nothing appears until the end" | [02](./notes/02_Generation_vs_Delivery_Non_Streaming_and_Streaming_Responses.md) · [06](./notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md) · [08](./notes/08_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md) §08.2 |
| "It feels slow" | [03](./notes/03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md) §03.2–§03.4 |
| "Weird characters / broken text" | [04](./notes/04_Token_Chunk_Network_and_Byte_Granularity.md) §04.4–§04.6 |
| "Works locally, breaks in production" | [05](./notes/05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md) §05.6 · [06](./notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md) §06.3 |
| "The assistant forgot what it said" | [09](./notes/09_History_Persistence_and_Production_Hardening.md) §09.2–§09.4 |
| "Our token bill exploded" | [03](./notes/03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md) §03.4 · [09](./notes/09_History_Persistence_and_Production_Hardening.md) §09.5, §09.9 |
| Preparing for an interview | [Lecture_07_Complete_Notes.md](./notes/Lecture_07_Complete_Notes.md) §1, §3, §6, §8 |
| Designing a new streaming feature | [06](./notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md) → [05](./notes/05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md) → [07](./notes/07_Backend_Streaming_Call_vs_Stream_Flux_and_Stream_Pumps.md) → [08](./notes/08_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md) → [09](./notes/09_History_Persistence_and_Production_Hardening.md) |

---

## 🔗 Related workspace links

| Item | Link | Status |
| :--- | :--- | :---: |
| Lecture workspace / checklist | [📄 README.md](./README.md) | ✅ |
| Generation prompt (git-ignored) | [📄 prompt.md](./prompt.md) | ✅ |
| Chapter notes | [📂 notes/](./notes/) | ✅ |
| Basic Code | [📂 code/](./code/) | 🔜 to build |
| Production Code | [📂 code/](./code/) | 🔜 to build |
| Lecture assignment | [📝 Assignment/task.md](./Assignment/task.md) | 🔜 to write |
| Roadmap — Lecture 07 topics, build & gate | [🗺️ ../roadmap.md](../roadmap.md) | ✅ |
| Repository chapter index (all lectures) | [📚 ../index.md](../index.md) | ✅ |

---

## 🔗 Source references

- `Forward-Deployed-Engineer/Lecture 06/notes/01_How_LLMs_Generate_Text.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/02_Generation_vs_Delivery_Non_Streaming_and_Streaming_Responses.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/04_Token_Chunk_Network_and_Byte_Granularity.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/07_Backend_Streaming_Call_vs_Stream_and_Flux.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/08_Conversation_History_Buffering_and_Persistence.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/09_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/10_Production_Hardening_Observability_and_Takeaways.md`
- `Forward-Deployed-Engineer/Lecture 06/notes/Lecture_06_Complete_Notes.md`
- `gen-ai-cohort/week01/learning/day01/notes/notes.md` — token streaming end to end

---

### Navigation

- **Previous lecture:** [Lecture 06 — Chatbots and Context](../Lecture%2006%20-%20Chatbots%20and%20Context/index.md)
- **Next lecture:** [Lecture 08 — Tool Calling](../Lecture%2008%20-%20Tool%20Calling/index.md)

