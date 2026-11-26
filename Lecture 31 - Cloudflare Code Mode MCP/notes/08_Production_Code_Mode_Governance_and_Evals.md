# Chapter 08 — Production Code Mode Governance & Evals

> **Lecture 31 · Chapter 08 of 08** · Level: 🟠 Advanced · Phase 7 — Connectors, Code Mode & Proactive Workflows
> **Source:** `Cloudflare Code Mode Blog & Docs` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-31--cloudflare-code-mode--isolated-code-execution-mcp-cloudflarecodemode)
> **Roadmap topics:** Benchmarking schema token savings (`< 1,500` tokens) · multi-step latency reduction · sandbox secret-leakage tests · host-proxy rate limits & method allow-lists.

---

## 08.0 What this chapter is for

Before shipping a Code Mode MCP server to production, you must **prove with numbers** that:
1. It actually solves the **Tool Schema Scaling Wall** (`< 1,500` schema tokens even on a 200+ endpoint OpenAPI spec).
2. It actually executes multi-step loops in **one `execute()` call** rather than $N$ roundtrips.
3. It **leaks zero credentials** and blocks unauthorized outbound `fetch()` or disallowed HTTP methods (`DELETE`).

By the end of this chapter you should be able to:

1. Benchmark **Traditional MCP vs. `codeMcpServer` vs. `openApiMcpServer`** on schema tokens and roundtrip latency.
2. Write automated **sandbox security evals** verifying that secrets cannot be read and arbitrary external URLs cannot be fetched.
3. Enforce **host-proxy governance** (method allow-lists, base-URL pinning, and per-execution request caps).

---

## 08.1 Benchmark: Traditional MCP vs. Code Mode (200+ Endpoints)

| Metric | Traditional MCP (200 Tools) | `openApiMcpServer` (`search` + `execute`) | Improvement |
| :--- | :---: | :---: | :---: |
| **Schema Tokens per Turn** | `~90,000` tokens | **`~950` tokens** (`< 1,500` gate) | **98.9% reduction** |
| **10-Item Pagination Loop** | `10` LLM roundtrips | **`1` `execute()` call** | **10× fewer turns** |
| **Secret Exposure** | Host-side (safe) | **Host-side RPC proxy (`0` secrets in sandbox)** | Parity + sandboxed code |

### Host-Proxy SSRF & Method Guard
```typescript
const ALLOWED_BASE = "https://api.enterprise.internal";
const ALLOWED_METHODS = new Set(["GET", "POST"]);

if (!url.startsWith(ALLOWED_BASE) || !ALLOWED_METHODS.has(method.toUpperCase())) {
  throw new Error(`Blocked by Host Proxy Policy: ${method} ${url}`);
}
```

---

## 08.2 Key takeaways

1. **Measure schema tokens in CI:** fail the build if the exposed MCP tool list exceeds `1,500` tokens.
2. **Pin `baseUrl` and `allowedMethods` inside the Host `request` proxy** so sandboxed code cannot pivot to internal metadata IPs (`169.254.169.254`) or `DELETE` routes.
3. **Test secret isolation explicitly:** attempt `process.env` / `env.API_TOKEN` access inside `execute()` and assert it returns `undefined`.

---

**Next:** [Lecture 31 — Complete Notes (Master Consolidation)](./Lecture_31_Complete_Notes.md)

