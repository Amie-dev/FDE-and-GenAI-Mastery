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

