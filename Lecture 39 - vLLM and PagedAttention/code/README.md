# Lecture 39 — Code (`vLLM`, Quantization & Indic Eval)

- `vllm_serving_config.py` — Quantization profiles (`fp16`, `fp8`, `awq`, `gptq`, `int4`), `vllm serve` CLI builder (`--quantization`, `--enable-prefix-caching`, `--enable-chunked-prefill`), VRAM estimator, and TCO break-even calculator.
- `indic_eval_slice.py` — Indic evaluation slice (Hindi, Tamil, Telugu, Hinglish) comparing English-centric BPE vs. Indic-adapted tokenizers and verifying the $\le 2\%$ quantization quality-delta gate.

```bash
python3 vllm_serving_config.py
python3 indic_eval_slice.py
```

