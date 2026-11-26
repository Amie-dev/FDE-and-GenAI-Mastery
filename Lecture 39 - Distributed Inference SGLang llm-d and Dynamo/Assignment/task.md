# 📝 Lecture 39 — Assignment & Release Gate

**Distributed Inference (`SGLang`, `llm-d`, `Dynamo`) & Capacity Engineering**
Phase 9 · Distributed & Sovereign Inference · 🔴 Expert · **Estimated effort: 5–7 hours**

> **Read first:** the seven chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 39*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you explain P/D disaggregation, RadixAttention, `llm-d`, Dynamo, and residency | Written answers (`A1`–`A7`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does your sizing sheet meet `< 400ms` TTFT, `< 30ms` TPOT & residency compliance | `npm test` (4/4 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every distributed inference trade-off in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Contrast the hardware bottlenecks of Prefill (compute-bound) vs. Decode (memory-bandwidth-bound), and explain prefill-decode interference.
2. **A2 (Chapter 02):** How does `P/D` disaggregation with RDMA/NIXL eliminate TPOT spikes, and why do RAG workloads need a different `P:D` ratio than reasoning workloads?
3. **A3 (Chapter 03):** Explain how SGLang `RadixAttention` and `LMCache`/`Mooncake` work together across GPU HBM, CPU DRAM, and distributed RDMA pools.
4. **A4 (Chapter 04):** Why must an `llm-d` prefix-affinity router balance cache hit score against active queue depth?
5. **A5 (Chapter 05):** Compare `SGLang`, `llm-d`, and `NVIDIA Dynamo`.
6. **A6 (Chapter 06):** Why must a residency router fail closed (`503`) instead of failing over from `EU` to `US`?
7. **A7 (Chapter 07):** Given `20 RPS`, `6,000` input tokens, `300` output tokens, and `75%` KV reuse, calculate effective prefill tok/s and required `P` + `D` GPUs.

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`03_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/03_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `simulateCapacity()` proves Disaggregated `P/D` meets `< 400ms` TTFT and `< 30ms` TPOT while Monolithic fails TPOT SLO.
- [ ] Verify `DistributedInferenceRouter` fails closed on `IN` when only `US`/`EU` nodes exist, and avoids overloaded warm nodes.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 39 - Distributed Inference SGLang llm-d and Dynamo/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — prints the Monolithic vs. Disaggregated `P/D` sizing sheet and residency/prefix-affinity routing decisions.
- [ ] `npm test` — all 4 release-gate suites in `src/release-gate.test.ts` pass:
  1. Disaggregated `P/D` with `75%` KV reuse meets `< 400ms` TTFT and `< 30ms` TPOT under peak load.
  2. Disaggregated `P/D` beats Monolithic serving on both SLO compliance and GPU cost.
  3. Residency router enforces fail-closed compliance (`503 ResidencyUnavailable`).
  4. Prefix-affinity router selects warm KV node while avoiding overloaded hot-spot node.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. Why does round-robin load balancing destroy SGLang RadixAttention cache hit rates?
2. How does a `75%` KV-cache hit rate directly reduce GPU capex?
3. How do you achieve High Availability without violating EU/India data residency laws?

