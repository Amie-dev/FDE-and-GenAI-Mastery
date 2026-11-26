# Chapter 00: Overview, Architecture & File Structure

> **Chapter goal:** understand *what* this codebase is, how OpenAPI specs compile to governed MCP tools, how idempotency prevents duplicate mutations, and how Playwright bridges UI-only legacy portals.

---

## 0.1 What this codebase is

This is the **minimum working TypeScript engine** proving Lecture 30:
- Every module has one clear responsibility (OpenAPI compiler, Idempotency + Approval store, Playwright fallback).
- Zero external SaaS dependencies — all 5 release gates run deterministically offline in `< 1 second`.

| File | Responsibility | Notes Chapter |
| :--- | :--- | :---: |
| `package.json` & `tsconfig.json` | ESM + strict TypeScript setup (`tsx`, `@types/node`) | — |
| `src/types.ts` | Shared contracts for OpenAPI, MCP Tools, Idempotency, and Browser steps | 01–07 |
| `src/openapi-to-mcp.ts` | Compiles OpenAPI 3.1 into governed MCP tools (drops `DELETE`, injects `idempotencyKey`) | 02 |
| `src/idempotency.ts` | `IdempotencyStore` with `sha256` payload checks (`409 Conflict`) & HITL thresholds | 03, 04 |
| `src/playwright-fallback.ts` | Domain-locked, idempotent Playwright fallback for UI-only ERP forms | 05 |
| `src/index.ts` | Runnable end-to-end demo | 01–07 |
| `src/release-gate.test.ts` | 5 automated release-gate assertions (`node:test`) | All |

---

## 0.2 Commands

```bash
cd "Lecture 30 - Enterprise APIs OpenAPI-to-MCP and Computer-Use/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

