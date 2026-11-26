# Chapter 02: Metadata Catalogue, Lineage & Column ACLs

> **Chapter goal:** implement `MetadataCatalogue` (`src/catalogue.ts`) to index assets, traverse upstream lineage, resolve glossary synonyms, and enforce column-level PII ACLs.
> **Notes chapters covered:** 01, 02, 05, 07.

---

## 2.1 Full code: `src/catalogue.ts`

File path: `code/Basic Code/src/catalogue.ts`

```ts
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
```

---

## 2.2 Block-by-block explanation

1. **`getUpstreamLineage(assetId)`:** Performs a cycle-safe DFS over `upstreamAssets` so an agent can trace a certified `mart.customer_360` table back to `crm.accounts` and `billing.subscriptions`.
2. **`findMetric(term)`:** Matches natural-language synonyms (e.g., `"ARR"`) to the canonical `net_arr` metric contract.
3. **`filterColumnsByClearance()`:** Compares each column's `PII_RANK` against the caller's `maxAllowedPii`, returning `accessible` vs. `masked` columns deterministically.

