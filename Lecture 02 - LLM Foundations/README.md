# Lecture 02 - LLM Foundations

> **Phase:** 1 · Foundations · **Level:** 🟢 Beginner
> **Source:** `FDE L02 (ch1-3) · GAC D01`

---

## 📍 Where this lecture sits

See **[../roadmap.md](../roadmap.md)** → *"Lecture 02 — ..."* for the **complete topic list**,
the **goal**, the **build task** and the **completion gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 02 | ☐ |
| Write my own chapter notes in `notes/` | ✅ |
| Build / rebuild the code in `code/` | ☐ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 02 - LLM Foundations/
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
(8 chapters), or read the consolidated **[Lecture_02_Complete_Notes.md](./notes/Lecture_02_Complete_Notes.md)**.

| # | Chapter |
| :---: | :--- |
| 01 | [What an LLM Is & Next-Token Prediction](./notes/01_What_an_LLM_Is_and_Next_Token_Prediction.md) |
| 02 | [The Text Pipeline & Why Token IDs Are Labels](./notes/02_The_Text_Pipeline_and_Why_Token_IDs_Are_Labels.md) |
| 03 | [Tokenization Strategies: Word vs Character vs Subword](./notes/03_Tokenization_Strategies_Word_Character_Subword.md) |
| 04 | [BPE, WordPiece, SentencePiece & the Vocabulary](./notes/04_BPE_WordPiece_SentencePiece_and_Vocabulary.md) |
| 05 | [Tokenizers in Practice: `tiktoken` & Model Comparison](./notes/05_Tokenizers_in_Practice_tiktoken_and_Model_Comparison.md) |
| 06 | [Embeddings: Dense Vectors & Similarity](./notes/06_Embeddings_Dense_Vectors_and_Similarity.md) |
| 07 | [Positional Encodings & Word Order](./notes/07_Positional_Encodings_and_Word_Order.md) |
| 08 | [Context Windows, Training vs Inference & the Complete Pipeline](./notes/08_Context_Windows_Training_vs_Inference_and_the_Complete_Pipeline.md) |

## 🔗 Source references

`FDE L02 (ch1-3) · GAC D01` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
