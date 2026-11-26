import type { NormalizedRecord } from "./contracts.js";

export interface SqlDocumentRow {
  sourceId: string;
  tenantId: string;
  version: number;
  contentHash: string;
  ingestedAtMs: number;
  freshnessSlaMs: number;
}

export interface VectorChunk {
  chunkId: string;
  sourceId: string;
  tenantId: string;
  text: string;
  dimensions: number;
  embeddingModel: string;
}

export interface GraphNode {
  nodeId: string;
  sourceId: string;
  tenantId: string;
  label: string;
}

export interface LineageEntry {
  sourceId: string;
  tenantId: string;
  sqlRowId: string;
  chunkIds: string[];
  graphNodeIds: string[];
  cacheKeys: string[];
}

export type IndexSlot = "blue" | "green";

/**
 * Simulates SQL, Vector (Blue/Green), Graph, and Cache stores with:
 * - Mandatory tenant_id pre-filtering
 * - Tombstone tracking (prevents zombie resurrection)
 * - Derived-artifact lineage ledger
 */
export class MultiStoreKnowledgeBase {
  readonly sqlDocs = new Map<string, SqlDocumentRow>();
  readonly vectorIndexes: Record<IndexSlot, Map<string, VectorChunk>> = {
    blue: new Map(),
    green: new Map(),
  };
  readonly graphNodes = new Map<string, GraphNode>();
  readonly cache = new Map<string, { tenantId: string; sourceId: string; answer: string }>();
  readonly tombstones = new Set<string>();
  readonly lineage = new Map<string, LineageEntry>();

  private activeReadSlot: IndexSlot = "blue";
  private dualWriteEnabled = false;

  private key(tenantId: string, sourceId: string): string {
    return `${tenantId}::${sourceId}`;
  }

  getActiveReadSlot(): IndexSlot {
    return this.activeReadSlot;
  }

  enableDualWrite(enabled: boolean): void {
    this.dualWriteEnabled = enabled;
  }

  swapReadAlias(target: IndexSlot): void {
    this.activeReadSlot = target;
  }

  isTombstoned(tenantId: string, sourceId: string): boolean {
    return this.tombstones.has(this.key(tenantId, sourceId));
  }

  upsertRecord(rec: NormalizedRecord, nowMs = Date.now()): { skipped: boolean; reason?: string } {
    const k = this.key(rec.tenantId, rec.sourceId);
    if (this.tombstones.has(k)) {
      return { skipped: true, reason: "Tombstone active; blocked zombie resurrection" };
    }

    const existing = this.sqlDocs.get(k);
    if (existing && existing.contentHash === rec.contentHash) {
      return { skipped: true, reason: "Content hash unchanged; skipped re-embedding" };
    }

    // 1. SQL metadata row
    this.sqlDocs.set(k, {
      sourceId: rec.sourceId,
      tenantId: rec.tenantId,
      version: rec.version,
      contentHash: rec.contentHash,
      ingestedAtMs: nowMs,
      freshnessSlaMs: rec.freshnessSlaMs,
    });

    // 2. Vector chunks (split into 2 deterministic chunks for demo)
    const mid = Math.ceil(rec.content.length / 2);
    const parts = [rec.content.slice(0, mid), rec.content.slice(mid)].filter(Boolean);
    const chunkIds: string[] = [];

    parts.forEach((text, idx) => {
      const chunkId = `${k}::chk_${idx}`;
      chunkIds.push(chunkId);

      // Write to active index
      this.vectorIndexes[this.activeReadSlot].set(chunkId, {
        chunkId,
        sourceId: rec.sourceId,
        tenantId: rec.tenantId,
        text,
        dimensions: this.activeReadSlot === "blue" ? 1536 : 3072,
        embeddingModel: this.activeReadSlot === "blue" ? "embed-v1-1536d" : "embed-v2-3072d",
      });

      // Dual-write during Blue/Green migration
      if (this.dualWriteEnabled) {
        const secondary: IndexSlot = this.activeReadSlot === "blue" ? "green" : "blue";
        this.vectorIndexes[secondary].set(chunkId, {
          chunkId,
          sourceId: rec.sourceId,
          tenantId: rec.tenantId,
          text,
          dimensions: secondary === "blue" ? 1536 : 3072,
          embeddingModel: secondary === "blue" ? "embed-v1-1536d" : "embed-v2-3072d",
        });
      }
    });

    // 3. Graph nodes
    const graphNodeIds: string[] = [];
    for (const ent of rec.extractedEntities) {
      const nodeId = `${k}::node_${ent}`;
      graphNodeIds.push(nodeId);
      this.graphNodes.set(nodeId, { nodeId, sourceId: rec.sourceId, tenantId: rec.tenantId, label: ent });
    }

    // 4. Semantic cache entry
    const cacheKey = `${k}::cache_summary`;
    this.cache.set(cacheKey, {
      tenantId: rec.tenantId,
      sourceId: rec.sourceId,
      answer: rec.content.slice(0, 60),
    });

    // 5. Lineage ledger
    this.lineage.set(k, {
      sourceId: rec.sourceId,
      tenantId: rec.tenantId,
      sqlRowId: k,
      chunkIds,
      graphNodeIds,
      cacheKeys: [cacheKey],
    });

    return { skipped: false };
  }

  /** Tenant-isolated search against the active read alias (pre-filtered by tenantId). */
  searchVectors(tenantId: string, queryText: string, nowMs = Date.now()): Array<VectorChunk & { stale: boolean }> {
    const q = queryText.toLowerCase();
    const activeIndex = this.vectorIndexes[this.activeReadSlot];
    const results: Array<VectorChunk & { stale: boolean }> = [];

    for (const chunk of activeIndex.values()) {
      // Mandatory tenant_id pre-filter
      if (chunk.tenantId !== tenantId) continue;
      if (chunk.text.toLowerCase().includes(q)) {
        const sql = this.sqlDocs.get(this.key(tenantId, chunk.sourceId));
        const stale = sql ? nowMs - sql.ingestedAtMs > sql.freshnessSlaMs : false;
        results.push({ ...chunk, stale });
      }
    }
    return results;
  }

  countDerivedArtifacts(tenantId: string, sourceId: string): number {
    const k = this.key(tenantId, sourceId);
    let count = this.sqlDocs.has(k) ? 1 : 0;
    for (const slot of ["blue", "green"] as const) {
      for (const c of this.vectorIndexes[slot].values()) {
        if (c.tenantId === tenantId && c.sourceId === sourceId) count += 1;
      }
    }
    for (const n of this.graphNodes.values()) {
      if (n.tenantId === tenantId && n.sourceId === sourceId) count += 1;
    }
    for (const entry of this.cache.values()) {
      if (entry.tenantId === tenantId && entry.sourceId === sourceId) count += 1;
    }
    return count;
  }
}

