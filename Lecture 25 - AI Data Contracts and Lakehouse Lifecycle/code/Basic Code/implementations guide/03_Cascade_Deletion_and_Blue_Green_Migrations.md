# Chapter 03: Cascade Deletion & Blue/Green Re-Embedding Lifecycle

> **Chapter goal:** implement `ingestBatch()`, `cascadeDelete()`, and `runBlueGreenReembedding()` in `src/lifecycle.ts`.
> **Notes chapters covered:** 04 (GDPR Cascade Deletion) & 07 (Zero-Downtime Re-Embedding & Migrations).

---

## 3.1 Full code: `src/lifecycle.ts`

File path: `code/Basic Code/src/lifecycle.ts`

```ts
import { ExceptionQueue, IngestionRecordSchema, normalizeAndEnrich } from "./contracts.js";
import type { IndexSlot, MultiStoreKnowledgeBase } from "./stores.js";

export interface IngestionBatchReport {
  accepted: number;
  skipped: number;
  quarantined: number;
}

export interface DeletionReceipt {
  tenantId: string;
  sourceId: string;
  tombstoneWritten: boolean;
  remainingDerivedArtifacts: number;
  verifiedClean: boolean;
}

/**
 * Validates raw records against the Zod AI Data Contract, quarantines failures,
 * and upserts valid records into SQL, Vector, Graph, and Cache stores.
 */
export function ingestBatch(
  rawRecords: unknown[],
  kb: MultiStoreKnowledgeBase,
  dlq: ExceptionQueue,
  nowMs = Date.now()
): IngestionBatchReport {
  let accepted = 0;
  let skipped = 0;
  let quarantined = 0;

  for (const raw of rawRecords) {
    const parsed = IngestionRecordSchema.safeParse(raw);
    if (!parsed.success) {
      quarantined += 1;
      dlq.push(
        raw,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
      );
      continue;
    }

    const enriched = normalizeAndEnrich(parsed.data);
    const res = kb.upsertRecord(enriched, nowMs);
    if (res.skipped) skipped += 1;
    else accepted += 1;
  }

  return { accepted, skipped, quarantined };
}

/**
 * GDPR Cascade Deletion:
 * 1. Write tombstone to block zombie re-ingestion.
 * 2. Delete SQL row, Vector chunks (both Blue & Green), Graph nodes, and Cache entries.
 * 3. Audit remaining derived artifacts == 0.
 */
export function cascadeDelete(
  kb: MultiStoreKnowledgeBase,
  tenantId: string,
  sourceId: string
): DeletionReceipt {
  const k = `${tenantId}::${sourceId}`;
  kb.tombstones.add(k);

  const entry = kb.lineage.get(k);
  kb.sqlDocs.delete(k);

  if (entry) {
    for (const chunkId of entry.chunkIds) {
      kb.vectorIndexes.blue.delete(chunkId);
      kb.vectorIndexes.green.delete(chunkId);
    }
    for (const nodeId of entry.graphNodeIds) {
      kb.graphNodes.delete(nodeId);
    }
    for (const cacheKey of entry.cacheKeys) {
      kb.cache.delete(cacheKey);
    }
    kb.lineage.delete(k);
  }

  const remaining = kb.countDerivedArtifacts(tenantId, sourceId);
  return {
    tenantId,
    sourceId,
    tombstoneWritten: true,
    remainingDerivedArtifacts: remaining,
    verifiedClean: remaining === 0,
  };
}

/**
 * Zero-Downtime Blue/Green Re-Embedding Migration:
 * Backfills historical chunks into the target slot and atomically flips the read alias.
 */
export function runBlueGreenReembedding(
  kb: MultiStoreKnowledgeBase,
  targetSlot: IndexSlot
): { migratedChunks: number; activeReadSlot: IndexSlot } {
  const sourceSlot: IndexSlot = targetSlot === "green" ? "blue" : "green";
  const targetDim = targetSlot === "green" ? 3072 : 1536;
  const targetModel = targetSlot === "green" ? "embed-v2-3072d" : "embed-v1-1536d";

  kb.enableDualWrite(true);
  let migratedChunks = 0;

  for (const [chunkId, chunk] of kb.vectorIndexes[sourceSlot].entries()) {
    if (kb.isTombstoned(chunk.tenantId, chunk.sourceId)) continue;
    kb.vectorIndexes[targetSlot].set(chunkId, {
      ...chunk,
      dimensions: targetDim,
      embeddingModel: targetModel,
    });
    migratedChunks += 1;
  }

  // Atomic alias swap (zero search downtime)
  kb.swapReadAlias(targetSlot);
  kb.enableDualWrite(false);

  return { migratedChunks, activeReadSlot: kb.getActiveReadSlot() };
}
```

### Block-by-block explanation
1. **`ingestBatch()`:** Uses `IngestionRecordSchema.safeParse(raw)` so invalid records go to `ExceptionQueue` without halting valid records.
2. **`cascadeDelete()`:** Writes the tombstone *first*, deletes all derived artifacts tracked in `kb.lineage` across both Blue and Green vector slots, and returns `verifiedClean: remaining === 0`.
3. **`runBlueGreenReembedding()`:** Enables dual-write, backfills non-tombstoned chunks into the target dimension (`3072d`), and flips `swapReadAlias(targetSlot)` atomically.

