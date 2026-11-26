# Chapter 03: Canonical Entity Resolver & Source Precedence

> **Chapter goal:** implement `resolveCanonicalEntities()` and `resolveFieldWithPrecedence()` in `src/resolver.ts`.
> **Notes chapters covered:** 04 (Canonical Entities & Identity) & 06 (Source Precedence & Provenance).

---

## 3.1 Full code: `src/resolver.ts`

File path: `code/Basic Code/src/resolver.ts`

```ts
import { createHash } from "node:crypto";
import type {
  CanonicalEntity,
  PrecedenceRule,
  ResolvedField,
  SourceSystem,
  SystemRecord,
} from "./types.js";

/**
 * Resolves fragmented vendor records (CRM, Billing, Support) into Canonical Entities
 * and applies deterministic field-level Source-of-Truth precedence rules.
 */
export function resolveCanonicalEntities(records: SystemRecord[]): Array<{
  entity: CanonicalEntity;
  records: SystemRecord[];
}> {
  const groups = new Map<string, SystemRecord[]>();

  for (const rec of records) {
    // Tier 2 normalized natural key: domain (or lowercased email)
    const key = rec.domain.trim().toLowerCase() || rec.email.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(rec);
    groups.set(key, list);
  }

  const resolved: Array<{ entity: CanonicalEntity; records: SystemRecord[] }> = [];
  for (const [domain, groupRecords] of groups.entries()) {
    const hash = createHash("sha256").update(domain).digest("hex").slice(0, 8);
    const crosswalk: Partial<Record<SourceSystem, string>> = {};
    for (const r of groupRecords) {
      crosswalk[r.system] = r.localId;
    }

    resolved.push({
      entity: {
        canonicalId: `canon_${hash}`,
        displayName: groupRecords[0].companyName,
        normalizedDomain: domain,
        crosswalk,
        matchConfidence: 0.95,
      },
      records: groupRecords,
    });
  }

  return resolved;
}

/**
 * Resolve a specific field across multiple system records using field-level SoR precedence.
 */
export function resolveFieldWithPrecedence(
  field: string,
  records: SystemRecord[],
  rules: PrecedenceRule[]
): ResolvedField | undefined {
  const rule = rules.find((r) => r.field === field);
  const priorityOrder: SourceSystem[] = rule ? rule.priorityOrder : ["billing", "crm", "support"];

  const candidates = records
    .filter((r) => r.fields[field] !== undefined)
    .sort((a, b) => priorityOrder.indexOf(a.system) - priorityOrder.indexOf(b.system));

  if (candidates.length === 0) return undefined;

  const winner = candidates[0];
  const winnerVal = winner.fields[field];

  const conflictsOverridden = candidates
    .slice(1)
    .filter((c) => c.fields[field] !== winnerVal)
    .map((c) => ({
      system: c.system,
      localId: c.localId,
      value: c.fields[field],
    }));

  return {
    field,
    value: winnerVal,
    authoritativeSystem: winner.system,
    authoritativeRecordId: winner.localId,
    precedenceRule: priorityOrder.join(" > "),
    conflictsOverridden,
  };
}
```

---

## 3.2 Block-by-block explanation

1. **`resolveCanonicalEntities(records)`:** Groups records by normalized natural key (`domain`) rather than fragile fuzzy `companyName` strings, producing a stable `canonicalId` and a `crosswalk` mapping `{ crm: "sf_001", billing: "cus_991" }`.
2. **`resolveFieldWithPrecedence(field, records, rules)`:** Sorts candidate records by the field-specific `priorityOrder` (e.g., `["billing", "crm", "support"]` for `subscriptionStatus`), selects the winner, and logs every conflicting value in `conflictsOverridden` for full provenance transparency.

