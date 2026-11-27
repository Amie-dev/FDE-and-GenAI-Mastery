# Chapter 07 — Managed Platforms (`E2B`, `Modal`, `Daytona`) & Selection Matrix

> **Lecture 38 · Chapter 07 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling
> **References:** [Mastra — Best AI Agent Sandbox Platforms](https://mastra.ai/articles/best-ai-agent-sandbox-platforms) · [LangChain Sandbox Guide](https://www.langchain.com/blog/how-to-choose-the-right-sandbox-for-your-agent)

---

## 07.1 Production Sandbox Platform Matrix

| Platform | Isolation | Boot Time | Persistence / Snapshots | Best For |
| :--- | :--- | :---: | :--- | :--- |
| **Cloudflare Dynamic Workers** | V8 Isolate | **~2–5 ms** | Stateless | High-frequency JS/TS Code Mode |
| **Cloudflare Sandbox (GA)** | DO + Linux Container | ~1–2 s | Persistent disk + sleep/wake | Edge Python/bash + preview URLs |
| **E2B** | Firecracker MicroVM | **~150 ms** | Memory + disk snapshots | Untrusted Python/JS code interpreter |
| **Daytona** | Container / VM | **<200 ms** | Persistent Git workspaces | Stateful SWE coding environments |
| **Modal Sandboxes** | gVisor / Container | ~1–3 s | Volume mounts + image cache | GPU workloads, ML evals, batch Python |
| **Docker AI Sandboxes** | MicroVM + Private Dockerd | ~1–3 s | Local workspace sync | Local/hybrid `docker compose` coding agents |
| **`agent-infra/sandbox`** | Container / gVisor Pod | ~2–4 s | Shared container volume | Unified Browser + Shell + VNC + MCP |

---

## 07.2 Stateful Lifecycle Checklist
1. **Snapshots:** Pre-bake `node_modules` / Python venvs so sessions boot in `<200 ms`.
2. **Hibernation (Sleep-to-Wake):** Pause idle sandboxes during human HITL waits without losing filesystem state.
3. **Preview URLs:** Expose authenticated ephemeral URLs for agent-built web apps.
4. **Egress Policy:** Default-deny `169.254.169.254` and internal VPC IPs; inject secrets only via host-side proxies.

