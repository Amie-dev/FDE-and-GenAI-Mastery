# Lecture 39 — High-Performance Inference: vLLM, Quantization & Sovereign / Indic Models · Chapter Index

> **Phase:** 9 · Distributed & Sovereign Inference · **Level:** 🔴 Expert · **Roadmap:** [../roadmap-v1.md](../roadmap-v1.md) (S21 · Moved from Old L25)

---

## 📚 Chapter Notes (`notes/`)

| # | Chapter | File |
| :---: | :--- | :--- |
| 01 | LLM Hardware Mechanics: GPU VRAM, HBM, Memory Hierarchy | [01_LLM_Hardware_Mechanics.md](./notes/01_LLM_Hardware_Mechanics.md) |
| 02 | Compute-Bound Training vs Memory-Bandwidth-Bound Inference | [02_Compute_Bound_vs_Memory_Bound.md](./notes/02_Compute_Bound_vs_Memory_Bound.md) |
| 03 | Inference Engine Architecture: Prefill vs Decode Phases | [03_Inference_Engine_Architecture.md](./notes/03_Inference_Engine_Architecture.md) |
| 04 | vLLM Architecture Overview | [04_vLLM_Architecture_Overview.md](./notes/04_vLLM_Architecture_Overview.md) |
| 05 | PagedAttention: Virtual Memory for KV Cache | [05_PagedAttention.md](./notes/05_PagedAttention.md) |
| 06 | Continuous Batching, Chunked Prefill, Prefix Caching | [06_Continuous_Batching_Chunked_Prefill_Prefix_Caching.md](./notes/06_Continuous_Batching_Chunked_Prefill_Prefix_Caching.md) |
| 07 | Quantization, Optimized Kernels, MoE, Speculative Decoding | [07_Quantization_Kernels_MoE_Speculative.md](./notes/07_Quantization_Kernels_MoE_Speculative.md) |
| 08 | Serving Economics, Self-Hosting vs Managed APIs, Roofline Model | [08_Serving_Economics_and_Roofline.md](./notes/08_Serving_Economics_and_Roofline.md) |
| 09 | Quantization, Serving TCO, RAG vs. Fine-Tuning & Sovereign / Indic Models | [09_Quantization_TCO_RAG_vs_FT_and_Sovereign_Indic_Models.md](./notes/09_Quantization_TCO_RAG_vs_FT_and_Sovereign_Indic_Models.md) |
| — | **Complete Notes (Master Reference)** | [Lecture_39_Complete_Notes.md](./notes/Lecture_39_Complete_Notes.md) |

---

## 💻 Code & Assignment

- [code/README.md](./code/README.md) — vLLM quantization serving flags (`AWQ`, `GPTQ`, `FP8`, `INT4`), TCO break-even calculator, and Indic evaluation slice
- [Assignment/task.md](./Assignment/task.md) — S21 release gate ($\ge 3\times$ throughput gain, $\le 2\%$ quality delta vs. FP16, Indic eval)

