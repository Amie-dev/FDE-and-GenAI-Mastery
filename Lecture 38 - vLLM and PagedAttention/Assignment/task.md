# Lecture 38 — Assignment & S21 Release Gate

> **Topic:** High-Performance Inference: vLLM, Quantization & Sovereign / Indic Models (`roadmap-v1.md` S21)

## Tasks

1. **Quantization & VRAM Audit (`code/vllm_serving_config.py`)**
   - Run `python3 code/vllm_serving_config.py` and compare 70B weight VRAM across `FP16` (140 GB), `FP8` (70 GB), `AWQ` (35 GB), and `GPTQ` (35 GB).
   - Explain why `AWQ` / `FP8` unlocks higher continuous-batching concurrency on an 80 GB GPU.
2. **TCO Break-Even Analysis**
   - Compute the monthly break-even token volume for a \$1.80/hr A100 vs. \$0.60/1M hosted API tokens (2,190M tokens/month), and state two reasons to self-host *before* break-even (e.g., data sovereignty).
3. **Indic Evaluation Slice (`code/indic_eval_slice.py`)**
   - Run `python3 code/indic_eval_slice.py` and verify:
     - Token fertility reduction on Hindi, Tamil, Telugu, and Hinglish using an Indic-adapted tokenizer vs. English-centric BPE.
     - Quantized accuracy remains **within 2% of FP16** (`within_2pct_gate: True`).

## Release Gate (S21)

- [ ] Achieve $\ge 3\times$ concurrent token throughput gain with vLLM continuous batching + PagedAttention vs. naive sequential serving.
- [ ] Hold quantized (`AWQ` / `FP8`) quality within **2% of FP16** across the Indic evaluation slice.

