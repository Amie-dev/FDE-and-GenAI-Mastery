# Lecture 38 - High-Performance Inference: vLLM, Quantization & Sovereign / Indic Models

> **Phase:** 9 · Distributed & Sovereign Inference · **Level:** 🔴 Expert
> **Source:** `GAC D07 · roadmap-v1.md (S21 · Moved from Old L25)`

---

## 📍 Where this lecture sits

See **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 38 — High-Performance Inference: vLLM, Quantization & Sovereign / Indic Models"* for the **complete topic list**,
the **goal**, the **build task** and the **release gate**. This file is only a workspace stub —
the roadmap is the single source of truth so that no topic is duplicated.

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Read every source note listed in the roadmap for Lecture 38 | ☑ |
| Write my own chapter notes in `notes/` | ☑ (01–09) |
| Build / rebuild the code in `code/` | ☑ |
| Pass the lecture's completion gate | ☐ |

## 📁 Layout

```text
Lecture 38 - vLLM and PagedAttention/
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

1. [01 — LLM Hardware Mechanics](./notes/01_LLM_Hardware_Mechanics.md)
2. [02 — Compute-Bound vs Memory-Bound](./notes/02_Compute_Bound_vs_Memory_Bound.md)
3. [03 — Inference Engine Architecture](./notes/03_Inference_Engine_Architecture.md)
4. [04 — vLLM Architecture Overview](./notes/04_vLLM_Architecture_Overview.md)
5. [05 — PagedAttention](./notes/05_PagedAttention.md)
6. [06 — Continuous Batching, Chunked Prefill & Prefix Caching](./notes/06_Continuous_Batching_Chunked_Prefill_Prefix_Caching.md)
7. [07 — Quantization, Kernels, MoE & Speculative Decoding](./notes/07_Quantization_Kernels_MoE_Speculative.md)
8. [08 — Serving Economics & Roofline](./notes/08_Serving_Economics_and_Roofline.md)
9. [09 — Quantization, TCO, RAG vs. Fine-Tuning & Sovereign / Indic Models](./notes/09_Quantization_TCO_RAG_vs_FT_and_Sovereign_Indic_Models.md)
- **Complete consolidation:** [notes/Lecture_38_Complete_Notes.md](./notes/Lecture_38_Complete_Notes.md) · **Index:** [index.md](./index.md)

## 🔗 Source references

`GAC D07` — see the roadmap for the exact file paths inside
`Forward-Deployed-Engineer/` and `gen-ai-cohort/`.
