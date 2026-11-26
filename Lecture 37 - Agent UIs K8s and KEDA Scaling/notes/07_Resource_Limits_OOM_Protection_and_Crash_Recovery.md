# Chapter 07 — Resource Limits, OOM Protection & Crash Recovery

> **Lecture 37 · Chapter 07 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling
> **Source:** `FDE S23` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-37--agent-to-user-uis-ag-ui-mcp-apps-kubernetes--keda-scaling)
> **Roadmap topics:** Kubernetes `requests` vs. `limits` · `OOMKilled` prevention · graceful `SIGTERM` shutdown (`terminationGracePeriodSeconds`) · dead-letter queues & checkpoint resumption.

---

## 07.0 What this chapter is for

A single LLM-generated Python script that allocates a 10 GB array (`[0] * 10**9`) inside an unbounded worker pod will trigger the Linux **OOM Killer** — crashing the entire pod and taking 4 other concurrent agent runs down with it ("noisy neighbor").

And when KEDA scales down pods or Kubernetes rolls a deployment, a pod receives `SIGTERM`. Without graceful shutdown, in-flight agent loops are **killed mid-step**.

By the end of this chapter you should be able to:

1. Set Kubernetes **`requests` and `limits`** for CPU and Memory to prevent noisy-neighbor OOM crashes.
2. Configure **`terminationGracePeriodSeconds`** and `SIGTERM` handlers so workers checkpoint and re-queue cleanly before exiting.
3. Recover orphaned jobs using **visibility timeouts** and **Postgres/Redis checkpoints**.

---

## 07.1 Pod Resource & Lifecycle Hygiene

| Setting | Purpose | Recommended Worker Value |
| :--- | :--- | :---: |
| **`resources.requests`** | Guarantees minimum CPU/RAM for scheduling | `cpu: "500m", memory: "512Mi"` |
| **`resources.limits`** | Hard ceiling preventing noisy-neighbor OOM | `cpu: "1000m", memory: "1Gi"` |
| **`terminationGracePeriodSeconds`** | Time K8s waits after `SIGTERM` before `SIGKILL` | `60`–`120` seconds |
| **Queue Visibility Timeout** | Auto-requeues job if a pod crashes (`OOMKilled`) without acking | `90` seconds |

---

## 07.2 Key takeaways

1. **Always set `resources.limits` on agent worker pods** and cap child sandbox memory (`ulimit` / `maxBuffer`) below the pod limit.
2. **Handle `SIGTERM` gracefully** (stop pulling new jobs, checkpoint current step, let in-flight step finish).
3. **Combine queue visibility timeouts with Postgres checkpoints** so crashed jobs resume from the last completed step.

---

**Next:** [Lecture 37 — Complete Notes (Master Consolidation)](./Lecture_37_Complete_Notes.md)

