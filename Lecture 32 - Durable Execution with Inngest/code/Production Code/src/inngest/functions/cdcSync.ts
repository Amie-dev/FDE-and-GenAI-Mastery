import { inngest } from "../client.js";
import { EVENTS, type CdcRecordChangedPayload } from "../events.js";

/**
 * Chapter 09 — Idempotent CDC Sync + DLQ Replay.
 *
 * Guarantees:
 *   1. Event & step idempotency via `idempotencyKey` (zero duplicate writes on replay).
 *   2. Monotonic LSN ordering (`lsn <= lastAppliedLsn` is safely skipped).
 *   3. Poison-pill isolation into a DLQ with safe idempotent replay.
 */

export interface IndexedDoc {
  recordId: string;
  table: string;
  title: string;
  content: string;
  lsn: number;
  updatedAt: string;
}

export interface DlqEntry {
  dlqId: string;
  payload: CdcRecordChangedPayload;
  error: string;
  attempts: number;
  status: "pending" | "replayed";
  failedAt: string;
  replayedAt?: string;
}

const processedKeys = new Set<string>();
const indexStore = new Map<string, IndexedDoc>();
const dlqStore: DlqEntry[] = [];

export function getIndexedDoc(recordId: string): IndexedDoc | undefined {
  return indexStore.get(recordId);
}

export function inspectDlq(): DlqEntry[] {
  return [...dlqStore];
}

export function pushToDlq(payload: CdcRecordChangedPayload, error: string, attempts = 3): DlqEntry {
  const entry: DlqEntry = {
    dlqId: `dlq_${payload.table}_${payload.recordId}_${payload.lsn}`,
    payload,
    error,
    attempts,
    status: "pending",
    failedAt: new Date().toISOString(),
  };
  dlqStore.push(entry);
  return entry;
}

/**
 * Core idempotent CDC processor (used by both the Inngest function and DLQ replay).
 */
export function processCdcEvent(payload: CdcRecordChangedPayload): {
  status: "applied" | "deleted" | "skipped_duplicate" | "skipped_stale_lsn";
  recordId: string;
  lsn: number;
} {
  if (payload.simulateFailure) {
    throw new Error(`Poison-pill CDC failure for ${payload.recordId} at lsn=${payload.lsn}`);
  }

  if (processedKeys.has(payload.idempotencyKey)) {
    return { status: "skipped_duplicate", recordId: payload.recordId, lsn: payload.lsn };
  }

  const existing = indexStore.get(payload.recordId);
  if (existing && payload.lsn <= existing.lsn) {
    processedKeys.add(payload.idempotencyKey);
    return { status: "skipped_stale_lsn", recordId: payload.recordId, lsn: payload.lsn };
  }

  if (payload.op === "DELETE") {
    indexStore.delete(payload.recordId);
    processedKeys.add(payload.idempotencyKey);
    return { status: "deleted", recordId: payload.recordId, lsn: payload.lsn };
  }

  indexStore.set(payload.recordId, {
    recordId: payload.recordId,
    table: payload.table,
    title: payload.after?.title ?? "",
    content: payload.after?.content ?? "",
    lsn: payload.lsn,
    updatedAt: new Date().toISOString(),
  });
  processedKeys.add(payload.idempotencyKey);
  return { status: "applied", recordId: payload.recordId, lsn: payload.lsn };
}

/**
 * Safe DLQ replay handler: fixes/overrides the poison payload if needed and
 * replays through `processCdcEvent` using the original `idempotencyKey`.
 */
export function replayDlqEntry(
  dlqId: string,
  override?: Partial<CdcRecordChangedPayload>
): { replayed: boolean; result: ReturnType<typeof processCdcEvent> } {
  const entry = dlqStore.find((item) => item.dlqId === dlqId);
  if (!entry) {
    throw new Error(`DLQ entry not found: ${dlqId}`);
  }

  const fixedPayload: CdcRecordChangedPayload = {
    ...entry.payload,
    ...override,
    simulateFailure: false,
  };
  const result = processCdcEvent(fixedPayload);
  entry.status = "replayed";
  entry.replayedAt = new Date().toISOString();
  return { replayed: true, result };
}

/**
 * Inngest durable CDC workflow with event-level idempotency and DLQ onFailure isolation.
 */
export const cdcSync = inngest.createFunction(
  {
    id: "cdc-knowledge-sync",
    idempotency: "event.data.idempotencyKey",
    retries: 3,
    concurrency: { limit: 5, key: "event.data.table" },
    onFailure: async ({ event, error }) => {
      const payload = event.data.event.data as CdcRecordChangedPayload;
      pushToDlq(payload, error.message, 3);
    },
  },
  { event: EVENTS.CDC_RECORD_CHANGED },
  async ({ event, step }) => {
    const payload = event.data as CdcRecordChangedPayload;
    return await step.run("apply-cdc-idempotent", async () => processCdcEvent(payload));
  }
);

