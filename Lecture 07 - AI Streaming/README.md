# Lecture 07 - AI Streaming

> **Phase:** 2 · Application Layer · **Level:** 🟡 Intermediate
> **Source:** `FDE L06 · GAC D01`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 07 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 07 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ☐ |
| Pass the lecture's completion gate | ☐ |

**Notes status.** All **9 chapter notes** are written in [`notes/`](./notes) (within the 5–10 chapter
limit), each with **mermaid** diagrams, JS/TS **pseudo-code** only (no runnable code), and a closing
*Common mistakes* + *Key takeaways* section. The consolidated
**[Lecture_07_Complete_Notes.md](./notes/Lecture_07_Complete_Notes.md)** adds an executive summary, a master
diagram, a cheat sheet, decision tables, the 7 pipeline invariants, 20 misconceptions, a glossary and 35
self-check questions.

| Piece | State |
| :--- | :--- |
| `notes/01…09_*.md` | ✅ 9 chapters |
| `notes/Lecture_07_Complete_Notes.md` | ✅ consolidated revision layer |
| `index.md` | ✅ chapter index with reading paths |
| `code/` (Basic + Production) | 🔜 not started |
| `Assignment/task.md` | 🔜 not written |
| The gate | ☐ render a stream with correct UTF-8 handling and cancel it mid-flight without leaking the connection |

## 📁 Layout

```text
Lecture 07 - AI Streaming/
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

Chapter notes live in [`notes/`](./notes) — see the **[chapter index](./index.md)** for the full list
(9 chapters), or read the consolidated **[Lecture_07_Complete_Notes.md](./notes/Lecture_07_Complete_Notes.md)**.

| # | Chapter |
| :---: | :--- |
| 01 | [How LLMs Generate Text — the Root Cause of Streaming](./notes/01_How_LLMs_Generate_Text.md) |
| 02 | [Generation vs Delivery: Non-Streaming & Streaming Responses](./notes/02_Generation_vs_Delivery_Non_Streaming_and_Streaming_Responses.md) |
| 03 | [Latency Anatomy: TTFT, ITL & Perceived Performance](./notes/03_Latency_Anatomy_TTFT_ITL_and_Perceived_Performance.md) |
| 04 | [Token, Provider Chunk, Network Chunk & Byte](./notes/04_Token_Chunk_Network_and_Byte_Granularity.md) |
| 05 | [HTTP Streaming Mechanics: Chunked, SSE & WebSockets](./notes/05_HTTP_Streaming_Mechanics_Chunked_Encoding_SSE_and_WebSockets.md) |
| 06 | [End-to-End Architecture & the 7 Pipeline Invariants](./notes/06_End_to_End_Streaming_Architecture_and_Pipeline_Invariants.md) |
| 07 | [Backend: `call` vs `stream`, `Flux` & Stream Pumps](./notes/07_Backend_Streaming_Call_vs_Stream_Flux_and_Stream_Pumps.md) |
| 08 | [Frontend: `fetch`, `ReadableStream` & `TextDecoder`](./notes/08_Frontend_Streaming_Fetch_ReadableStream_TextDecoder.md) |
| 09 | [History, Persistence & Production Hardening](./notes/09_History_Persistence_and_Production_Hardening.md) |

## 🔗 Source references

`FDE L06 · GAC D01` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
