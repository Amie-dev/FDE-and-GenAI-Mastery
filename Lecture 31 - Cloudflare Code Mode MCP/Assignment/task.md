# 📝 Lecture 31 — Assignment & Release Gate

**Cloudflare Code Mode & Isolated Code-Execution MCP (`@cloudflare/codemode`)**
Phase 7 · Connectors, Code Mode & Proactive Workflows · 🟠 Advanced · **Estimated effort: 5–7 hours**

> **Read first:** the eight chapters in **[../notes](../notes)** (index: **[../index.md](../index.md)**).
> The lecture's **goal**, **build task**, and **release gate** live in **[../README.md](../README.md)** and **[../../roadmap-v1.md](../../roadmap-v1.md)** → *Lecture 31*.

---

## 🎯 What this assignment tests

| Weight | Part | What it tests | Output |
| :---: | :--- | :--- | :--- |
| **30%** | **A** — Chapter-wise practice | Can you explain the 1.17M-token wall, `codeMcpServer`, `openApiMcpServer`, Dynamic Workers, and OAuth 2.1 | Written answers (`A1`–`A8`) |
| **35%** | **B** — Code & Implementation Guide | Can you build & walk through `code/Basic Code/` + `implementations guide/` | `../code/Basic Code` |
| **20%** | **C** — Release Gate Verification | Does `openApiMcpServer` expose 200+ routes in `< 1,500` tokens with `0` leaked secrets | `npm test` (5/5 green) |
| **15%** | **D** — Spoken / Written Defense | Can you defend every architectural choice in 2–3 sentences | 3 short answers |

---

## Part A — Chapter-wise practice

1. **A1 (Chapter 01):** Quantify why 2,500+ REST endpoints break traditional MCP (`~1.17M` schema tokens, tool confusion, sequential roundtrips).
2. **A2 (Chapter 02):** Why do LLMs write TypeScript loops against typed APIs more reliably than chaining 20 sequential JSON tool calls?
3. **A3 (Chapter 03):** Explain how `codeMcpServer()` wraps an existing `McpServer` into 1 `code` tool with a typed `codemode.*` namespace.
4. **A4 (Chapter 04):** How does `openApiMcpServer()` keep schema tokens constant at `~1,000` tokens even when the OpenAPI spec has 2,500+ endpoints?
5. **A5 (Chapter 05):** Contrast V8 Isolates (Dynamic Workers) vs. Docker containers, and explain why `globalOutbound: null` + Host RPC proxies keep API tokens out of the sandbox.
6. **A6 (Chapter 06):** How does OAuth 2.1 per-user scope downscoping prevent Confused Deputy attacks inside `execute()`?
7. **A7 (Chapter 07):** Which `wrangler.jsonc` binding is required by `DynamicWorkerExecutor`, and how does `createMcpHandler` serve the MCP server?
8. **A8 (Chapter 08):** Design a CI eval proving `< 1,500` schema tokens and `0` leaked secrets on a 200+ endpoint API.

---

## Part B — `code/Basic Code/` & `implementations guide/`

Inspect, run, and extend [`../code/Basic Code/`](../code/Basic%20Code/) alongside its chapter-wise [`implementations guide/`](../code/Basic%20Code/implementations%20guide/):

- [ ] Read [`00_Overview_and_File_Structure.md`](../code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) through [`04_Demo_and_Release_Gate_Verification.md`](../code/Basic%20Code/implementations%20guide/04_Demo_and_Release_Gate_Verification.md).
- [ ] Verify `createOpenApiMcpServer()` exposes only `search` and `execute` (`< 1,500` schema tokens) over the 220-endpoint spec.
- [ ] Verify `IsolatedSandboxExecutor` blocks `fetch()` (`globalOutbound: null`) and hides `process.env`.
- [ ] Verify `createCodeMcpServer()` wraps upstream tools into a single `code` tool with `codemode.*` bindings.

---

## Part C — Release Gate Commands (`code/Basic Code/`)

Run inside `Lecture 31 - Cloudflare Code Mode MCP/code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria (Release Gate)

All of the following must exit with code `0`:

- [ ] `npm run typecheck` — zero TypeScript errors (`tsc --noEmit`).
- [ ] `npm start` — compares naive vs. Code Mode tokens over 220 endpoints, runs `search("dns")` + multi-step `execute()`, and runs `codeMcpServer`.
- [ ] `npm test` — all 5 automated release-gate tests in `src/release-gate.test.ts` pass:
  1. `openApiMcpServer` exposes 200+ endpoints using `< 1,500` schema tokens.
  2. Agent discovers endpoints via `search()` and executes a multi-step loop in one `execute()` call.
  3. Sandbox blocks raw `fetch()` (`globalOutbound: null`) and leaks zero host secrets.
  4. OAuth scope downscoping blocks unauthorized `POST` mutations (`403 Insufficient Scope`).
  5. `codeMcpServer` wraps upstream tools into a single `code` tool with `codemode.*` namespace.

---

## Part D — Spoken / Written Defense

Be ready to answer in 2–3 sentences each:
1. When should you use `codeMcpServer()` vs. `openApiMcpServer()`?
2. Why does keeping intermediate pagination arrays inside the sandbox improve both cost and accuracy?
3. How does `DynamicWorkerExecutor` achieve ~100× faster cold starts than Docker containers?

