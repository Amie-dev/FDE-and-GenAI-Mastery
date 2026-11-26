# Chapter 04: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run the full OpenAPI-to-MCP + Idempotency + Playwright demo (`src/index.ts`) and verify all 5 release gates (`src/release-gate.test.ts`).
> **Notes chapter covered:** 07 (Production Connector Testing).

---

## 4.1 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { IdempotencyStore } from "./idempotency.js";
import { compileOpenApiToMcp } from "./openapi-to-mcp.js";
import { submitLegacyErpCreditMemo } from "./playwright-fallback.js";
import type { OpenApiSpec } from "./types.js";

const SAMPLE_BILLING_OPENAPI: OpenApiSpec = {
  title: "Enterprise Billing API",
  baseUrl: "https://api.billing.internal",
  operations: [
    { operationId: "get_order", summary: "Fetch order details", method: "GET", path: "/orders/{orderId}", requiredParams: ["orderId"] },
    { operationId: "create_refund", summary: "Issue customer refund", method: "POST", path: "/refunds", requiredParams: ["orderId", "amountUsd"], approvalThresholdUsd: 50 },
    { operationId: "delete_order", summary: "Permanently delete order", method: "DELETE", path: "/orders/{orderId}", requiredParams: ["orderId"] },
  ],
};

async function main(): Promise<void> {
  console.log("=== 1. OpenAPI-to-MCP Compilation ===");
  const tools = compileOpenApiToMcp(SAMPLE_BILLING_OPENAPI);
  console.log("Compiled MCP Tools:", tools.map((t) => `${t.name} (idempotent=${t.requiresIdempotency})`));

  console.log("\n=== 2. Idempotent Refund Execution + Replay ===");
  const store = new IdempotencyStore();
  let upstreamCalls = 0;

  const first = await store.executeIdempotent({
    toolName: "create_refund",
    idempotencyKey: "ref-key-101",
    payload: { orderId: "ORD-1", amountUsd: 45 },
    approvalThresholdUsd: 50,
    amountUsd: 45,
    handler: async () => {
      upstreamCalls += 1;
      return { refundId: "re_9001", amountUsd: 45 };
    },
  });
  const replay = await store.executeIdempotent({
    toolName: "create_refund",
    idempotencyKey: "ref-key-101",
    payload: { orderId: "ORD-1", amountUsd: 45 },
    approvalThresholdUsd: 50,
    amountUsd: 45,
    handler: async () => {
      upstreamCalls += 1;
      return { refundId: "re_9002", amountUsd: 45 };
    },
  });
  console.log("First call:", first, "| Replay:", replay, "| Total upstream calls:", upstreamCalls);

  console.log("\n=== 3. Playwright Legacy ERP Fallback ===");
  const erpResult = await submitLegacyErpCreditMemo({
    targetUrl: "https://erp.internal/credit-memo",
    allowedDomains: ["erp.internal"],
    orderId: "ORD-1",
    amountUsd: 45,
    idempotencyKey: "erp-key-101",
    idempotencyStore: store,
    driver: {
      runSteps: async () => ({ confirmedText: "Credit Memo CM-4421 recorded" }),
    },
  });
  console.log("Playwright ERP Result:", erpResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IdempotencyStore } from "./idempotency.js";
import { compileOpenApiToMcp } from "./openapi-to-mcp.js";
import { submitLegacyErpCreditMemo } from "./playwright-fallback.js";
import type { OpenApiSpec } from "./types.js";

const SPEC: OpenApiSpec = {
  title: "Billing API",
  baseUrl: "https://api.billing.internal",
  operations: [
    { operationId: "get_order", summary: "Get order", method: "GET", path: "/orders/{orderId}", requiredParams: ["orderId"] },
    { operationId: "create_refund", summary: "Create refund", method: "POST", path: "/refunds", requiredParams: ["orderId", "amountUsd"], approvalThresholdUsd: 50 },
    { operationId: "delete_order", summary: "Delete order", method: "DELETE", path: "/orders/{orderId}", requiredParams: ["orderId"] },
  ],
};

describe("Lecture 30 Release Gate", () => {
  it("Gate 1: OpenAPI-to-MCP drops DELETE routes and injects required idempotencyKey on mutations", () => {
    const tools = compileOpenApiToMcp(SPEC);
    assert.equal(tools.some((t) => t.name === "delete_order"), false);
    const refund = tools.find((t) => t.name === "create_refund");
    assert.ok(refund);
    assert.equal(refund.requiresIdempotency, true);
    assert.ok(refund.inputSchema.required.includes("idempotencyKey"));
  });

  it("Gate 2: Replaying a mutating call with the same idempotencyKey executes the side effect exactly once", async () => {
    const store = new IdempotencyStore();
    let executions = 0;

    const r1 = await store.executeIdempotent({
      toolName: "create_refund",
      idempotencyKey: "k-1",
      payload: { orderId: "ORD-1", amountUsd: 45 },
      handler: async () => {
        executions += 1;
        return { refundId: "re_1" };
      },
    });
    const r2 = await store.executeIdempotent({
      toolName: "create_refund",
      idempotencyKey: "k-1",
      payload: { orderId: "ORD-1", amountUsd: 45 },
      handler: async () => {
        executions += 1;
        return { refundId: "re_2" };
      },
    });

    assert.equal(executions, 1);
    assert.equal(r1.status, "EXECUTED");
    assert.equal(r2.status, "REPLAYED");
    assert.equal(r2.replayed, true);
    assert.equal(r2.data.refundId, "re_1");
  });

  it("Gate 3: Reusing an idempotencyKey with a different payload throws 409 Conflict", async () => {
    const store = new IdempotencyStore();
    await store.executeIdempotent({
      toolName: "create_refund",
      idempotencyKey: "k-2",
      payload: { orderId: "ORD-1", amountUsd: 45 },
      handler: async () => ({ ok: true }),
    });

    await assert.rejects(
      () =>
        store.executeIdempotent({
          toolName: "create_refund",
          idempotencyKey: "k-2",
          payload: { orderId: "ORD-1", amountUsd: 90 },
          handler: async () => ({ ok: true }),
        }),
      /409 Conflict/
    );
  });

  it("Gate 4: Mutations above HITL threshold return PENDING_APPROVAL without executing", async () => {
    const store = new IdempotencyStore();
    let executed = false;
    const res = await store.executeIdempotent({
      toolName: "create_refund",
      idempotencyKey: "k-3",
      payload: { orderId: "ORD-1", amountUsd: 250 },
      approvalThresholdUsd: 50,
      amountUsd: 250,
      handler: async () => {
        executed = true;
        return { ok: true };
      },
    });

    assert.equal(executed, false);
    assert.equal(res.status, "PENDING_APPROVAL");
  });

  it("Gate 5: Playwright fallback blocks non-allow-listed domains and enforces idempotency", async () => {
    const store = new IdempotencyStore();
    await assert.rejects(
      () =>
        submitLegacyErpCreditMemo({
          targetUrl: "https://evil.example.com/phish",
          allowedDomains: ["erp.internal"],
          orderId: "ORD-1",
          amountUsd: 45,
          idempotencyKey: "pw-1",
          idempotencyStore: store,
          driver: { runSteps: async () => ({ confirmedText: "ok" }) },
        }),
      /403 Forbidden Origin/
    );

    let browserRuns = 0;
    const ok1 = await submitLegacyErpCreditMemo({
      targetUrl: "https://erp.internal/credit-memo",
      allowedDomains: ["erp.internal"],
      orderId: "ORD-1",
      amountUsd: 45,
      idempotencyKey: "pw-2",
      idempotencyStore: store,
      driver: {
        runSteps: async () => {
          browserRuns += 1;
          return { confirmedText: "CM-100" };
        },
      },
    });
    const ok2 = await submitLegacyErpCreditMemo({
      targetUrl: "https://erp.internal/credit-memo",
      allowedDomains: ["erp.internal"],
      orderId: "ORD-1",
      amountUsd: 45,
      idempotencyKey: "pw-2",
      idempotencyStore: store,
      driver: {
        runSteps: async () => {
          browserRuns += 1;
          return { confirmedText: "CM-101" };
        },
      },
    });

    assert.equal(browserRuns, 1);
    assert.equal(ok1.status, "EXECUTED");
    assert.equal(ok2.status, "REPLAYED");
  });
});
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

