# Chapter 03 — Managed vs. Self-Hosted Agent Runtimes

> **Lecture 37 · Chapter 03 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling
> **Source:** `FDE S22 & S23` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-37--agent-to-user-uis-ag-ui-mcp-apps-kubernetes--keda-scaling)
> **Roadmap topics:** Managed agent platforms (Cloudflare Agents, Modal, Inngest Cloud) vs. self-hosted Kubernetes · data residency & VPC requirements · TCO & operational complexity trade-offs.

---

## 03.0 What this chapter is for

Once your agent works on your laptop, your client asks: *"Where does this run in production?"*

You face a fundamental infrastructure fork: **Managed Serverless/Agent Platforms** (Cloudflare Workers/Agents, Inngest Cloud, Modal) vs. **Self-Hosted Kubernetes**. Choosing wrong either wastes 4 months of DevOps time on a 2-person startup or violates an enterprise bank's VPC compliance policy.

By the end of this chapter you should be able to:

1. Compare **Managed Agent Runtimes** vs. **Self-Hosted Kubernetes** across 5 decision axes.
2. Identify the **4 hard triggers** that force self-hosted Kubernetes (VPC data residency, custom microVMs/GPUs, existing K8s platform team, air-gapped compliance).

---

## 03.1 Decision Matrix: Managed vs. Self-Hosted Kubernetes

| Dimension | Managed (Cloudflare Agents / Modal / Inngest) | Self-Hosted Kubernetes + KEDA |
| :--- | :--- | :--- |
| **Time to Production** | **Hours** (`wrangler deploy` / `modal deploy`) | **Weeks** (cluster, ingress, KEDA, observability, RBAC) |
| **Cold Start & Scaling** | Automatic (`ms` for Workers, seconds for Modal) | Managed via KEDA `ScaledObject` (Chapter 05) |
| **Data Residency / VPC** | Cloud-hosted (enterprise VPC peering on higher tiers) | **100% inside customer VPC / on-prem** |
| **Custom Sandboxing** | Built-in (`Dynamic Workers` / Modal sandboxes) | Full control (`gVisor`, `Kata Containers`, `Firecracker`) |
| **Best For** | Startups, rapid FDE pilots, bursty SaaS | Regulated banks/healthcare, heavy GPU/CPU pipelines, existing K8s orgs |

---

## 03.2 Key takeaways

1. **Default to Managed Runtimes** during early FDE delivery unless compliance, VPC residency, or custom kernel sandboxing demands Kubernetes.
2. **When Kubernetes is required**, decouple stateless APIs from queue-backed worker pods (Chapter 04) and autoscale with KEDA (Chapter 05).

---

**Next:** [Chapter 04 — Stateless API Services vs. Durable Worker State](./04_Stateless_API_Services_vs_Durable_Worker_State.md)

