# Chapter 02: Idempotency Store & Approval Governance

> **Chapter goal:** implement `IdempotencyStore` (`src/idempotency.ts`) with `sha256` payload-mismatch detection (`409 Conflict`) and HITL approval thresholds.
> **Notes chapters covered:** 03 (Idempotency Keys) & 04 (Approval-Bound Actions & Governance).

---

## 2.1 Full code: `src/idempotency.ts`

File path: `code/Basic Code/src/idempotency.ts`

```ts
import { createHash } from "node:crypto";
import type { ToolExecutionResponse } from "./types.js";

interface StoredIdempotencyRecord {
  payloadHash: string;
  responseData: Record<string, unknown>;
}

/**
 * Guarantees exactly-once side effects on mutating MCP tool calls:
 * - Same key + same payload -> returns cached response (replayed: true, 0 upstream calls)
 * - Same key + different payload -> throws 409 Conflict
 */
export class IdempotencyStore {
  private readonly store = new Map<string, StoredIdempotencyRecord>();

  static hashPayload(payload: Record<string, unknown>): string {
    const canonical = JSON.stringify(
      Object.keys(payload)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = payload[k];
          return acc;
        }, {})
    );
    return createHash("sha256").update(canonical).digest("hex");
  }

  async executeIdempotent(params: {
    toolName: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    approvalThresholdUsd?: number;
    amountUsd?: number;
    handler: () => Promise<Record<string, unknown>>;
  }): Promise<ToolExecutionResponse> {
    if (!params.idempotencyKey || params.idempotencyKey.trim().length === 0) {
      throw new Error(`400 Bad Request: missing required idempotencyKey for '${params.toolName}'`);
    }

    // Governance gate: pause high-value mutations before committing side effects
    if (
      params.approvalThresholdUsd !== undefined &&
      params.amountUsd !== undefined &&
      params.amountUsd > params.approvalThresholdUsd
    ) {
      return {
        status: "PENDING_APPROVAL",
        replayed: false,
        data: {
          toolName: params.toolName,
          amountUsd: params.amountUsd,
          thresholdUsd: params.approvalThresholdUsd,
          approvalId: `apr_${params.idempotencyKey}`,
        },
      };
    }

    const compositeKey = `${params.toolName}:${params.idempotencyKey}`;
    const payloadHash = IdempotencyStore.hashPayload(params.payload);
    const existing = this.store.get(compositeKey);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new Error(
          `409 Conflict: idempotencyKey '${params.idempotencyKey}' reused with different payload`
        );
      }
      return {
        status: "REPLAYED",
        replayed: true,
        data: existing.responseData,
      };
    }

    const responseData = await params.handler();
    this.store.set(compositeKey, { payloadHash, responseData });

    return {
      status: "EXECUTED",
      replayed: false,
      data: responseData,
    };
  }
}
```

### Block-by-block explanation
1. **HITL Threshold Gate:** Checked *before* executing `handler()` so refunds `> $50` return `PENDING_APPROVAL` without touching upstream billing.
2. **Canonical `hashPayload()`:** Sorts keys before SHA-256 hashing so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` hash identically.
3. **Replay vs. `409 Conflict`:** Matching `payloadHash` returns `{ status: "REPLAYED", replayed: true }` with zero upstream calls; mismatched `payloadHash` throws `409 Conflict`.

