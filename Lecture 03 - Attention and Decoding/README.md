# Lecture 03 - Attention and Decoding

> **Phase:** 1 · Foundations · **Level:** 🟢 Beginner
> **Source:** `FDE L02 (ch4-7) · GAC D01`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 03 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 03 | ✅ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ✅ |
| Pass the lecture's completion gate | ☐ |

**Code status.** `code/Basic Code` is built and runs: Express + TypeScript with **no ML library at all** —
every vector comes from a seeded pseudo-random function, so every number is reproducible and checkable by
hand. `npm run typecheck` is clean, and every endpoint was verified with curl (**15 endpoints + 7 error
paths**: missing field, unknown route, bad mask, mismatched array lengths, array-as-object, out-of-range
temperature, and a bad `shape` that falls back safely).

| Piece | State |
| :--- | :--- |
| `code/Basic Code/src/**` | ✅ 7 services · 7 controllers · router · middleware · config · types — 21 files, 2,319 lines |
| `code/Basic Code/implementations guide/` | ✅ 11 chapters — orientation + one per note chapter, each with the full file and a numbered block-by-block explanation |
| `code/Production Code/` | 🔜 not started (a defended serving layer: batching, KV-cache accounting, metrics, tests) |
| `Assignment/task.md` | ✅ Parts A–F written (103 practice questions, 6 code extensions, the attention-by-hand capstone, the gate, the rubric) |
| The gate | ☐ the transformer block drawn from memory and the 90-second temperature explanation are still to be recorded |

## 📁 Layout

```text
Lecture 03 - Attention and Decoding/
├── README.md          # this file — objectives · phase · level · source mapping · checklist
├── index.md           # chapter index for this lecture — every chapter with a one-line summary
├── prompt.md          # generation prompt (git-ignored) — change the chapter number, run it block by block
├── .gitignore         # ignores prompt.md
├── notes/             # 9 chapter notes + Lecture_03_Complete_Notes.md
├── code/
│   └── Basic Code/    # 15 endpoints: attention · heads · block · logits · decoding · position
│       ├── src/       # config · types · middleware · routes · controllers · services
│       └── implementations guide/   # 11 chapter documents
└── Assignment/
    └── task.md        # the lecture assignment (Parts A-F)
```

## 🧠 My notes

Nine chapters plus a consolidated document — see **[./index.md](./index.md)** for the full table with
one-line summaries, and **[./notes/Lecture_03_Complete_Notes.md](./notes/Lecture_03_Complete_Notes.md)**
for the cheat sheet, four decision tables, 25 misconceptions and 20 self-check questions.

| # | Chapter | Notes |
| :---: | :--- | :--- |
| 01 | Why attention: from static vectors to dynamic context | [📄](./notes/01_Why_Attention_From_Static_Vectors_to_Dynamic_Context.md) |
| 02 | Queries, keys & values: the attention search engine | [📄](./notes/02_Queries_Keys_Values_The_Attention_Search_Engine.md) |
| 03 | Scaled dot-product attention, by hand | [📄](./notes/03_Scaled_Dot_Product_Attention_by_Hand.md) |
| 04 | Multi-head attention & head specialisation | [📄](./notes/04_Multi_Head_Attention_and_Head_Specialisation.md) |
| 05 | The transformer block & the residual stream | [📄](./notes/05_The_Transformer_Block_and_the_Residual_Stream.md) |
| 06 | Encoder-decoder vs decoder-only & why GPT | [📄](./notes/06_Encoder_Decoder_vs_Decoder_Only_and_Why_GPT.md) |
| 07 | Logits, the LM head & softmax | [📄](./notes/07_Logits_the_LM_Head_and_Softmax.md) |
| 08 | Decoding strategies & sampling controls | [📄](./notes/08_Decoding_Strategies_and_Sampling_Controls.md) |
| 09 | Position, masking & attention geometry | [📄](./notes/09_Position_Masking_and_Attention_Geometry.md) |

## 🔗 Source references

`FDE L02 (ch4-7) · GAC D01` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
