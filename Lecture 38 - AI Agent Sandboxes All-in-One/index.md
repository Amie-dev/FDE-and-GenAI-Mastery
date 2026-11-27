# Lecture 38 — Chapter Index

**AI Agent Sandboxes All-in-One (`MicroVMs`, `Docker`, `Cloudflare`, `E2B`, `AIO`)**
Phase 8 · Multimodality, Full-Stack Apps & Agent Scaling · 🔴 Expert · **7 chapters**

> Source of truth: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 38"*.

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **Why Agents Need Sandboxes & Core Topologies** | Path-jail limits, **Sandbox-as-a-Tool** vs. **Agent-in-Sandbox**, and threat boundaries | [01_Why_Agents_Need_Sandboxes_and_Core_Topologies.md](./notes/01_Why_Agents_Need_Sandboxes_and_Core_Topologies.md) |
| 02 | **Isolation Layers: V8, Containers, gVisor & MicroVMs** | Comparing V8 isolates (~2 ms), Docker `runc`, `gVisor` (`runsc`), and Firecracker/Kata microVMs | [02_Isolation_Layers_V8_Containers_gVisor_MicroVMs.md](./notes/02_Isolation_Layers_V8_Containers_gVisor_MicroVMs.md) |
| 03 | **Docker AI Sandboxes (Local & Hybrid Workflows)** | MicroVM-per-workspace isolation, private Docker daemon (`dockerd`), and host credential proxy | [03_Docker_AI_Sandboxes_Local_and_Hybrid_Workflows.md](./notes/03_Docker_AI_Sandboxes_Local_and_Hybrid_Workflows.md) |
| 04 | **OpenAI Agents SDK Sandboxes & Abstractions** | `Workspace`, `SandboxSession`, `Manifest` snapshots, and provider-agnostic agent tools | [04_OpenAI_Agents_SDK_Sandboxes_and_Abstractions.md](./notes/04_OpenAI_Agents_SDK_Sandboxes_and_Abstractions.md) |
| 05 | **Cloudflare Sandbox SDK (GA) vs. Dynamic Workers** | `@cloudflare/sandbox` Linux containers (`exec()`, preview URLs, sleep/wake) vs. V8 isolates | [05_Cloudflare_Sandbox_SDK_GA_vs_Dynamic_Workers.md](./notes/05_Cloudflare_Sandbox_SDK_GA_vs_Dynamic_Workers.md) |
| 06 | **AIO Multimodal Sandboxes (`agent-infra/sandbox`)** | Unified Browser (CDP/Playwright) + Shell + Filesystem + Jupyter + VNC over MCP/REST | [06_AIO_Multimodal_Sandboxes_Browser_Shell_MCP.md](./notes/06_AIO_Multimodal_Sandboxes_Browser_Shell_MCP.md) |
| 07 | **Managed Platforms (`E2B`, `Modal`, `Daytona`) & Selection Matrix** | Snapshots, hibernation, preview URLs, network egress, and the production decision matrix | [07_Managed_Platforms_E2B_Modal_Daytona_and_Selection_Matrix.md](./notes/07_Managed_Platforms_E2B_Modal_Daytona_and_Selection_Matrix.md) |

---

## 📄 Complete Notes

👉 **[Lecture_38_Complete_Notes.md](./notes/Lecture_38_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript Sandbox Router + AIO MCP Adapter + OpenAI/Cloudflare Sandbox pattern + release-gate tests
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — objectives & checklist

