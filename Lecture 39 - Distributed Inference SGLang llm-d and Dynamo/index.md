# Lecture 39 — Chapter Index

**Distributed Inference (`SGLang`, `llm-d`, `Dynamo`) & Capacity Engineering**
Phase 9 · Distributed & Sovereign Inference · 🔴 Expert · **7 chapters**

> Source of truth for topics, goal, build task and gate: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 39"*.
> Source mapping: `FDE S24`.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Limits of Single-Node Inference Serving** | Compute-bound prefill vs. memory-bandwidth-bound decode, prefill-decode interference, round-robin thrashing | [01_Limits_of_Single_Node_Inference_Serving.md](./notes/01_Limits_of_Single_Node_Inference_Serving.md) |
| 02 | **Disaggregated Prefill & Decode Architecture** | Separating `P` and `D` GPU pools, RDMA/NIXL KV transfer, independent `P:D` scaling ratios | [02_Disaggregated_Prefill_and_Decode_Architecture.md](./notes/02_Disaggregated_Prefill_and_Decode_Architecture.md) |
| 03 | **KV Cache Reuse, RadixAttention & Offloading** | SGLang prefix radix tree, tiered `HBM -> DRAM -> LMCache/Mooncake` offloading, 10x TTFT speedup | [03_KV_Cache_Reuse_RadixAttention_and_Offloading.md](./notes/03_KV_Cache_Reuse_RadixAttention_and_Offloading.md) |
| 04 | **Model-Aware & Prefix-Affinity Routing (`llm-d`)** | Prefix-affinity scoring balanced by queue depth to prevent hot-spotting | [04_Model_Aware_and_Prefix_Affinity_Routing_llmd.md](./notes/04_Model_Aware_and_Prefix_Affinity_Routing_llmd.md) |
| 05 | **NVIDIA Dynamo & Multi-Node Orchestration** | Smart Router, NIXL KV fabric, and SLA Planner dynamically reallocating `P/D` GPUs | [05_NVIDIA_Dynamo_and_Multi_Node_Orchestration.md](./notes/05_NVIDIA_Dynamo_and_Multi_Node_Orchestration.md) |
| 06 | **Data Residency, Multi-Region HA & Failover** | Fail-closed regional residency (`EU`/`IN`/`US`) and intra-jurisdiction AZ failover | [06_Data_Residency_Multi_Region_HA_and_Failover.md](./notes/06_Data_Residency_Multi_Region_HA_and_Failover.md) |
| 07 | **Capacity Engineering & Cost-per-Token Modeling** | Sizing `P` and `D` GPU fleets for `< 400ms` TTFT & `< 30ms` TPOT under peak load | [07_Capacity_Engineering_and_Cost_per_Token_Modeling.md](./notes/07_Capacity_Engineering_and_Cost_per_Token_Modeling.md) |

---

## 📄 Complete notes

A single consolidated document with the executive summary, architecture diagram, cheat sheet, and self-check questions:

👉 **[Lecture_39_Complete_Notes.md](./notes/Lecture_39_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript Distributed Inference Capacity Simulator (`TTFT`/`TPOT`) + Prefix-Affinity/Residency Router, release-gate tests, and chapter-wise `implementations guide/`
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — lecture objectives, phase, level, source mapping and checklist
- **[../roadmap-v1.md](../roadmap-v1.md)** — complete topic list, goal, build task and completion gate

---

## 🧭 Reading order

```mermaid
flowchart LR
    C1["01 Single-Node Limits"] --> C2["02 P/D Disaggregation"]
    C2 --> C3["03 Radix & LMCache"]
    C3 --> C4["04 llm-d Routing"]
    C4 --> C5["05 NVIDIA Dynamo"]
    C5 --> C6["06 Residency & HA"]
    C6 --> C7["07 Capacity Sizing"]
    C7 --> N["Complete Notes"]
```

