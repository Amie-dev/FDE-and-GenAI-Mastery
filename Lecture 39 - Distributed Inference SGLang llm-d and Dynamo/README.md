# Lecture 39 - Distributed Inference SGLang llm-d and Dynamo

> **Stage 3: Ship** · **Phase:** 9 · Distributed & Sovereign Inference · **Level:** 🔴 Expert
> **Source:** `FDE S24` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Architect multi-node distributed inference fleets using KV-cache reuse/offloading, prefix-aware routing, disaggregated prefill/decode (`SGLang`, `llm-d`, `NVIDIA Dynamo`), and data residency controls.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 38](../Lecture%2038%20-%20vLLM%20and%20PagedAttention/) |
| **Unlocks** | [Lecture 42](../Lecture%2042%20-%20AI%20Observability%20OTel%20and%20FOCUS%20FinOps/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_39_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Limits of Single-Node Inference Serving** | Why prefill-decode interference spikes TTFT and TPOT under mixed workloads. |
| **02** | **Disaggregated Prefill & Decode Architecture** | Separating compute-bound prefill pools from memory-bandwidth-bound decode pools. |
| **03** | **KV Cache Reuse, RadixAttention & Offloading** | Reusing shared system/RAG prefixes across requests via SGLang and LMCache/Mooncake. |
| **04** | **Model-Aware & Prefix-Affinity Routing (`llm-d`)** | Routing requests to replicas already holding the warm KV prefix. |
| **05** | **NVIDIA Dynamo & Multi-Node Orchestration** | Dynamic GPU worker scheduling, KV transfer fabrics (NIXL), and SLA-driven routing. |
| **06** | **Data Residency, Multi-Region HA & Failover** | Enforcing regional GPU residency (India/EU/US) and active-active failover. |
| **07** | **Capacity Engineering & Cost-per-Token Modeling** | Sizing prefill vs. decode GPU ratios for target TTFT/TPOT SLOs. |

---

## 🛠️ What You Will Build (`code/`)

A **Distributed Inference Capacity & Routing Simulator** (`code/`): models TTFT/TPOT and GPU cost across monolithic vLLM vs. prefix-aware `llm-d`/SGLang disaggregated prefill-decode pools.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 39** complete, verify all of the following:

Produce a verified capacity sizing sheet demonstrating residency compliance and meeting `< 400ms` TTFT and `< 30ms` TPOT under simulated peak load.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_39_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 39 - Distributed Inference SGLang llm-d and Dynamo/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_39_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [SGLang RadixAttention](https://docs.sglang.ai/)
- [llm-d Distributed Inference](https://llm-d.ai/)
- [NVIDIA Dynamo](https://github.com/ai-dynamo/dynamo)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 39**.
