# Chapter 07 — Capacity Engineering & Cost-per-Token Modeling

> **Lecture 40 · Chapter 07 of 07** · Level: 🔴 Expert · Phase 9 — Distributed & Sovereign Inference
> **Source:** `FDE S24` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-39--distributed-inference-sglang-llm-d--dynamo--capacity-engineering)
> **Roadmap topics:** Sizing Prefill vs. Decode GPU counts · TTFT & TPOT capacity formulas · impact of KV-cache hit rate on required GPUs · +20% HA headroom · hourly & per-1M-token cost modeling.

---

## 07.0 What this chapter is for

At the end of every enterprise engagement, the VP of Engineering asks one question:

> *"How many GPUs do we need to buy, what will it cost per hour, and can you prove we will stay under `400 ms` TTFT and `30 ms` TPOT at peak load?"*

This chapter turns distributed inference architecture into **exact capacity sizing math** — the exact model implemented in `code/Basic Code/src/simulator.ts`.

By the end of this chapter you should be able to:

1. Compute **Effective Prefill Tokens/sec** and **Prefill GPU count** from `peakRps`, `avgInputTokens`, and `kvCacheHitRate`.
2. Compute **Decode GPU count** from `peakRps * avgOutputTokens` and per-GPU decode throughput.
3. Add **+20% HA headroom** and compare **Monolithic vs. Disaggregated `P/D`** on TTFT, TPOT, GPU count, and hourly cost.

---

## 07.1 Step-by-Step Capacity Sizing Sheet (Worked Example)

Let's size our **Global Legal & Financial Copilot** at peak load:
- **Workload:** `peakRps = 20`, `avgInputTokens = 6,000`, `avgOutputTokens = 300`, `kvCacheHitRate = 0.75` (`75%` RadixAttention/LMCache hit rate).
- **SLOs:** `TTFT <= 400 ms`, `TPOT <= 30 ms`.
- **Hardware (`H100` tier):** `prefillTokPerSecPerGpu = 20,000`, `decodeTokPerSecPerGpu = 2,500`, `baseTtftMs = 45 ms`, `baseTpotMs = 18 ms`, `nixlTransferMs = 25 ms`, `gpuHourlyUsd = $3.50/hr`.

### Option A: Monolithic Serving (No Cross-Node Prefix Affinity, Interference)

- Total Prefill demand: $20 \times 6{,}000 = 120{,}000\text{ tok/s} \implies \lceil 120{,}000 / 20{,}000 \rceil = 6\text{ GPUs}$.
- With `+20%` HA headroom: $\lceil 6 \times 1.2 \rceil = \mathbf{8\text{ GPUs}}$ (`$28.00 / hr`).
- **Latency under interference (`1.8×` prefill queueing, `2.1×` decode stall):**
  - `TTFT` $\approx 45 + (6{,}000 / 20{,}000) \times 1000 \times 1.8 = \mathbf{585\text{ ms}}$ (❌ **Fails `< 400 ms` SLO!**)
  - `TPOT` $\approx 18 \times 2.1 = \mathbf{37.8\text{ ms}}$ (❌ **Fails `< 30 ms` SLO!**)

### Option B: Disaggregated `P/D` + `75%` KV Prefix Reuse

- **Effective Prefill demand:** $20 \times 6{,}000 \times (1 - 0.75) = \mathbf{30{,}000\text{ tok/s}}$!
  - Prefill GPUs: $\lceil 30{,}000 / 20{,}000 \rceil = \mathbf{2\text{ P-GPUs}}$.
- **Decode demand:** $20 \times 300 = 6{,}000\text{ tok/s}$.
  - Decode GPUs: $\lceil 6{,}000 / 2{,}500 \rceil = \mathbf{3\text{ D-GPUs}}$.
- **Total GPUs with `+20%` HA headroom:** $\lceil (2 + 3) \times 1.2 \rceil = \mathbf{6\text{ GPUs}}$ (`$21.00 / hr` — **25% cheaper than Monolithic!**)
- **Latency:**
  - `TTFT` $\approx 45 + (1{,}500 / 20{,}000) \times 1000 + 25 = \mathbf{145\text{ ms}}$ (✅ **Passes `< 400 ms` SLO!**)
  - `TPOT` $= \mathbf{18\text{ ms}}$ (✅ **Zero prefill interference — passes `< 30 ms` SLO!**)

| Metric | Monolithic (8 GPUs) | Disaggregated `P/D` + KV Reuse (6 GPUs) | Winner |
| :--- | :---: | :---: | :---: |
| **Total GPUs (incl. 20% HA)** | `8` | **`6`** | Disaggregated (`-25%` GPUs) |
| **Hourly Fleet Cost** | `$28.00 / hr` | **`$21.00 / hr`** | Disaggregated (`-25%` cost) |
| **Estimated TTFT** | `585 ms` (❌) | **`145 ms`** (✅) | Disaggregated (`4×` faster) |
| **Estimated TPOT** | `37.8 ms` (❌) | **`18.0 ms`** (✅) | Disaggregated (`2.1×` faster) |

---

## 07.2 Key takeaways

1. **Disaggregated `P/D` + `75%` KV reuse is cheaper AND faster** than monolithic serving (`6` GPUs vs. `8` GPUs, while meeting both `< 400ms` TTFT and `< 30ms` TPOT).
2. **Always include `+20%` HA headroom** so a single GPU or AZ maintenance event doesn't breach peak SLOs.
3. **Run the simulator (`code/Basic Code/src/simulator.ts`)** whenever workload `input:output` ratios or `kvCacheHitRate` change.

---

**Next:** [Lecture 40 — Complete Notes (Master Consolidation)](./Lecture_40_Complete_Notes.md)
