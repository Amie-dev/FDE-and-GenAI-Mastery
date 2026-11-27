# Chapter 05 — Cloudflare Sandbox SDK (GA) vs. Dynamic Workers

> **Lecture 38 · Chapter 05 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling
> **References:** [Cloudflare Sandbox GA](https://blog.cloudflare.com/sandbox-ga/) · [Dynamic Workers](https://blog.cloudflare.com/dynamic-workers/) · [Agents Sandbox Tools](https://developers.cloudflare.com/agents/tools/sandbox/) · [OpenAI Agents + Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/sdk/tutorials/openai-agents/)

---

## 05.1 Two Edge Sandbox Primitives

Cloudflare provides **two complementary sandboxes** depending on whether your agent needs **millisecond JS/TS execution** or a **full Linux container**:

| Dimension | **Dynamic Workers** (`env.LOADER`) | **Cloudflare Sandbox SDK (GA)** (`@cloudflare/sandbox`) |
| :--- | :--- | :--- |
| **Runtime** | V8 Isolate | Durable Object + Linux Container |
| **Boot Time** | **~2–5 ms** | **~1–2 s** (with sleep/wake persistence) |
| **Languages** | JS / TS only | Full Linux (`python3`, `bash`, `git`, `pip`, `npm`, binaries) |
| **Filesystem & Ports** | In-memory | Persistent disk, bucket mounts, `exposePort` preview URLs |
| **Security Model** | `globalOutbound: null` + Host RPC proxy | Non-secret env in container; secrets & outbound handlers in Worker |
| **Best For** | Code Mode MCP (Lecture 31) | OpenAI Agents SDK coding/data workspaces, git & Python tools |

```ts
import { getSandbox, Sandbox } from "@cloudflare/sandbox";
export { Sandbox };

const sandbox = getSandbox(env.Sandbox, `thread-${threadId}`);
const res = await sandbox.exec('python3 -c "print(2 + 2)"');
// res -> { stdout, stderr, exitCode, success }
```

