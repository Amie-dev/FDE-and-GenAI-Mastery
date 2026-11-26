# Chapter 07 — Serving with Cloudflare Workers & Agents SDK

> **Lecture 31 · Chapter 07 of 08** · Level: 🟠 Advanced · Phase 7 — Connectors, Code Mode & Proactive Workflows
> **Source:** `Cloudflare Code Mode Docs` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-31--cloudflare-code-mode--isolated-code-execution-mcp-cloudflarecodemode)
> **Roadmap topics:** `wrangler.jsonc` `worker_loaders` binding · `createMcpHandler` / `createLegacyMcpHandler` · stateful Durable Object MCP sessions vs. stateless HTTP MCP.

---

## 07.0 What this chapter is for

Once you have built your `codeMcpServer` or `openApiMcpServer`, you need to serve it over HTTP/SSE as a production Cloudflare Worker. That requires two pieces of Cloudflare platform plumbing:
1. Binding the **Dynamic Worker Loader** (`env.LOADER`) in `wrangler.jsonc`.
2. Exposing the MCP server on `/mcp` using the Cloudflare Agents SDK (`createMcpHandler` / `McpAgent`).

By the end of this chapter you should be able to:

1. Configure `wrangler.jsonc` with the `worker_loaders` binding required by `DynamicWorkerExecutor`.
2. Wire a Code Mode `McpServer` into a Cloudflare Worker `fetch()` handler.
3. Choose between **stateless Worker handlers** vs. **stateful Durable Object `McpAgent`** sessions.

---

## 07.1 `wrangler.jsonc` & Worker Wiring

```jsonc
// wrangler.jsonc
{
  "name": "enterprise-codemode-mcp",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "worker_loaders": [
    { "binding": "LOADER" }
  ]
}
```

```typescript
// src/worker.ts (Cloudflare Worker entry point)
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { openApiMcpServer } from "@cloudflare/codemode/mcp";
import { createMcpHandler } from "agents/mcp";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const server = await openApiMcpServer({
      spec: ENTERPRISE_OPENAPI_SPEC,
      executor: new DynamicWorkerExecutor({ loader: env.LOADER }),
      request: async ({ url, method, headers, body }) =>
        fetch(url, {
          method,
          headers: { ...headers, Authorization: `Bearer ${env.API_TOKEN}` },
          body,
        }),
    });

    return createMcpHandler(server)(request, env, ctx);
  },
};
```

---

## 07.2 Key takeaways

1. **`DynamicWorkerExecutor` requires `worker_loaders` (`LOADER`)** in `wrangler.jsonc`.
2. **`createMcpHandler(server)`** (from `agents/mcp`) exposes any `codeMcpServer` or `openApiMcpServer` over standard Streamable HTTP / SSE MCP transport.

---

**Next:** [Chapter 08 — Production Code Mode Governance & Evals](./08_Production_Code_Mode_Governance_and_Evals.md)

