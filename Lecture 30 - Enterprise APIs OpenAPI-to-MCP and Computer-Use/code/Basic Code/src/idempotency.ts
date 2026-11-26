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

