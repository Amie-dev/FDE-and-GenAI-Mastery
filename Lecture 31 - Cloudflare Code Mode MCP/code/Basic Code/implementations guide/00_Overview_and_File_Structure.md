# Chapter 00: Overview, Architecture & File Structure

> **Chapter goal:** understand *what* this codebase is, how `codeMcpServer` and `openApiMcpServer` collapse 220+ endpoints to `< 1,500` tokens, and how the sandbox blocks `fetch()` and `process.env`.

---

## 0.1 What this codebase is

This is the **minimum working TypeScript engine** proving Lecture 31:
- Mirrors `@cloudflare/codemode` (`DynamicWorkerExecutor`) and `@cloudflare/codemode/mcp` (`codeMcpServer`, `openApiMcpServer`) locally using `node:vm` so all 5 release gates run offline in `< 1 second`.
- Also includes `wrangler.jsonc` and `src/worker.ts` showing the exact Cloudflare Workers deployment configuration.

| File | Responsibility | Notes Chapter |
| :--- | :--- | :---: |
| `package.json`, `tsconfig.json`, `wrangler.jsonc` | ESM + strict TypeScript + Cloudflare `worker_loaders` binding | 07 |
| `src/openapi-spec.ts` | Generates a 220-endpoint OpenAPI 3.1 spec + token estimator | 01 |
| `src/executor.ts` | `IsolatedSandboxExecutor` (`globalOutbound: null`, zero `process.env` access) | 05 |
| `src/codemode-mcp.ts` | `createCodeMcpServer()` + `createOpenApiMcpServer()` with OAuth scope checks | 03, 04, 06 |
| `src/worker.ts` | Production Cloudflare Worker `@cloudflare/codemode` reference | 07 |
| `src/index.ts` | Runnable end-to-end demo | 01–08 |
| `src/release-gate.test.ts` | 5 automated release-gate assertions (`node:test`) | All |

---

## 0.2 Commands

```bash
cd "Lecture 31 - Cloudflare Code Mode MCP/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

