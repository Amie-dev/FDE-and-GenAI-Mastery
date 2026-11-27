# Chapter 04 — OpenAI Agents SDK Sandboxes & Abstractions

> **Lecture 38 · Chapter 04 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling
> **Reference:** [OpenAI Agents SDK — Sandboxes Guide](https://developers.openai.com/api/docs/guides/agents/sandboxes)

---

## 04.1 Provider-Agnostic Sandbox Abstractions

Hardcoding E2B, Modal, or local `child_process` calls directly inside agent tools locks you into one runtime. The **[OpenAI Agents SDK Sandboxes](https://developers.openai.com/api/docs/guides/agents/sandboxes)** architecture decouples the agent's reasoning loop from the underlying compute provider:

- **`Workspace` / `SandboxSession`:** Binds a conversation or task `thread_id` to an isolated shell + filesystem session.
- **`Manifest` / Snapshots:** Declaratively defines the base container image, packages, and seeded files so sandboxes boot reproducibly and resume from warm snapshots.
- **Standardized Tools:** Exposes `shell` / `exec`, `read_file`, `write_file`, and `apply_patch` against the `SandboxSession` interface.
- **Pluggable Backends:** Develop locally against Docker/local sandboxes and deploy to **Cloudflare Sandbox**, **E2B**, **Modal**, **Daytona**, or **Runloop** by swapping the provider adapter.

