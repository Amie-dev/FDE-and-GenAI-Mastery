# Lecture 31 — Chapter Index

**Cloudflare Code Mode & Isolated Code-Execution MCP (`@cloudflare/codemode`)**
Phase 7 · Connectors, Code Mode & Proactive Workflows · 🟠 Advanced · **8 chapters**

> Source of truth for topics, goal, build task and gate: **[../roadmap-v1.md](../roadmap-v1.md)** → *"Lecture 31"*.
> References: [Cloudflare Blog: Code Mode](https://blog.cloudflare.com/code-mode/) · [Build a Code Mode MCP Server](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/).

---

## 📚 Chapters

| # | Chapter | One-line summary | File |
| :---: | :--- | :--- | :--- |
| 01 | **The Tool Schema Scaling Wall** | Why 2,500+ JSON tool schemas consume 1.17M tokens, dilute attention, and slow roundtrips | [01_The_Tool_Schema_Scaling_Wall.md](./notes/01_The_Tool_Schema_Scaling_Wall.md) |
| 02 | **Code-First Agents vs. JSON Tool Calling** | Why LLMs write TypeScript loops/filters more reliably than chaining sequential JSON tool calls | [02_Code_First_Agents_vs_JSON_Tool_Calling.md](./notes/02_Code_First_Agents_vs_JSON_Tool_Calling.md) |
| 03 | **Single Code Tool Pattern (`codeMcpServer`)** | Wrapping existing `McpServer` instances into 1 `code` tool with a typed `codemode.*` namespace | [03_Single_Code_Tool_Pattern_codeMcpServer.md](./notes/03_Single_Code_Tool_Pattern_codeMcpServer.md) |
| 04 | **Search & Execute Pattern (`openApiMcpServer`)** | Publishing 2,500+ OpenAPI endpoints in ~1,000 tokens via `search()` + `execute()` | [04_Search_and_Execute_Pattern_openApiMcpServer.md](./notes/04_Search_and_Execute_Pattern_openApiMcpServer.md) |
| 05 | **Dynamic Workers & Sandbox Isolation** | V8 isolates (~2–5ms boot), `globalOutbound: null`, and Host RPC proxies keeping secrets out of sandbox | [05_Dynamic_Workers_and_Sandbox_Isolation.md](./notes/05_Dynamic_Workers_and_Sandbox_Isolation.md) |
| 06 | **OAuth 2.1 & Scoped Delegated Execution** | Workers OAuth 2.1 + PKCE and per-user scope enforcement inside the Host Worker proxy | [06_OAuth_2_1_and_Scoped_Delegated_Execution.md](./notes/06_OAuth_2_1_and_Scoped_Delegated_Execution.md) |
| 07 | **Serving with Cloudflare Workers & Agents SDK** | Configuring `wrangler.jsonc` `worker_loaders` (`LOADER`) and `createMcpHandler` | [07_Serving_with_Cloudflare_Workers_and_Agents_SDK.md](./notes/07_Serving_with_Cloudflare_Workers_and_Agents_SDK.md) |
| 08 | **Production Code Mode Governance & Evals** | Benchmarking `< 1,500` schema tokens, 10x roundtrip savings, and secret-isolation evals | [08_Production_Code_Mode_Governance_and_Evals.md](./notes/08_Production_Code_Mode_Governance_and_Evals.md) |

---

## 📄 Complete notes

A single consolidated document with the executive summary, architecture diagram, cheat sheet, and self-check questions:

👉 **[Lecture_31_Complete_Notes.md](./notes/Lecture_31_Complete_Notes.md)**

---

## 🔗 Related

- **[./code/Basic Code](./code/Basic%20Code)** — runnable TypeScript `@cloudflare/codemode` (`codeMcpServer` + `openApiMcpServer`) over a 220-endpoint OpenAPI spec, release-gate tests, and chapter-wise `implementations guide/`
- **[./Assignment/task.md](./Assignment/task.md)** — hands-on assignment & release gate checklist
- **[./README.md](./README.md)** — lecture objectives, phase, level, source mapping and checklist
- **[../roadmap-v1.md](../roadmap-v1.md)** — complete topic list, goal, build task and completion gate

---

## 🧭 Reading order

```mermaid
flowchart LR
    C1["01 Scaling Wall"] --> C2["02 Code-First"]
    C2 --> C3["03 codeMcpServer"]
    C3 --> C4["04 openApiMcpServer"]
    C4 --> C5["05 Dynamic Workers"]
    C5 --> C6["06 OAuth 2.1"]
    C6 --> C7["07 Workers & SDK"]
    C7 --> C8["08 Governance & Evals"]
    C8 --> N["Complete Notes"]
```

