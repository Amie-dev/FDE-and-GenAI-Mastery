import type { DataAsset, PiiLevel, SemanticMetric } from "./types.js";

const PII_RANK: Record<PiiLevel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

/**
 * Apache Ossie-style open metadata catalogue indexing data assets,
 * upstream/downstream lineage, semantic metrics, and column-level ACLs.
 */
export class MetadataCatalogue {
  private readonly assets = new Map<string, DataAsset>();
  private readonly metrics = new Map<string, SemanticMetric>();

  registerAsset(asset: DataAsset): void {
    this.assets.set(asset.assetId, asset);
  }

  registerMetric(metric: SemanticMetric): void {
    this.metrics.set(metric.id, metric);
  }

  getAsset(assetId: string): DataAsset | undefined {
    return this.assets.get(assetId);
  }

  /** Traverse upstream lineage DAG recursively. */
  getUpstreamLineage(assetId: string): string[] {
    const visited = new Set<string>();
    const visit = (id: string) => {
      const asset = this.assets.get(id);
      if (!asset) return;
      for (const up of asset.upstreamAssets) {
        if (!visited.has(up)) {
          visited.add(up);
          visit(up);
        }
      }
    };
    visit(assetId);
    return [...visited];
  }

  /** Lookup a canonical semantic metric by ID or natural-language synonym. */
  findMetric(term: string): SemanticMetric | undefined {
    const norm = term.trim().toLowerCase();
    for (const m of this.metrics.values()) {
      if (m.id.toLowerCase() === norm || m.synonyms.some((s) => s.toLowerCase() === norm)) {
        return m;
      }
    }
    return undefined;
  }

  /** Enforce column-level ACLs based on the caller's maximum allowed PII clearance. */
  filterColumnsByClearance(
    assetId: string,
    maxAllowedPii: PiiLevel
  ): { accessible: string[]; masked: string[] } {
    const asset = this.assets.get(assetId);
    if (!asset) return { accessible: [], masked: [] };

    const accessible: string[] = [];
    const masked: string[] = [];
    for (const col of asset.columns) {
      if (PII_RANK[col.pii] <= PII_RANK[maxAllowedPii]) {
        accessible.push(col.name);
      } else {
        masked.push(col.name);
      }
    }
    return { accessible, masked };
  }
}

