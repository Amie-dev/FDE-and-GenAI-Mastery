# Chapter 01: Project Setup, TypeScript & Domain Types

> **Chapter goal:** configure strict ESM TypeScript (`package.json`, `tsconfig.json`) and define the domain contracts in `src/types.ts`.
> **Notes chapters covered:** 01–07.

---

## 1.1 Full code: `package.json` & `tsconfig.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-24-enterprise-data-discovery-ossie",
  "version": "1.0.0",
  "description": "Lecture 24 Basic Code — Metadata Catalogue, Canonical Entity Resolver, Source Precedence & Apache Ossie Agent",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "metadata-catalogue",
    "canonical-entity",
    "identity-resolution",
    "apache-ossie",
    "typescript"
  ],
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

---

## 1.2 Full code: `src/types.ts`

File path: `code/Basic Code/src/types.ts`

```ts
export type EstateTier = "OLTP" | "WAREHOUSE" | "SAAS_API" | "DOCUMENT" | "SHADOW";
export type PiiLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type SourceSystem = "crm" | "billing" | "support";

export interface DataColumn {
  name: string;
  type: string;
  pii: PiiLevel;
  description: string;
}

export interface DataAsset {
  assetId: string;
  system: SourceSystem | "warehouse";
  tier: EstateTier;
  certifiedGold: boolean;
  ownerTeam: string;
  freshnessSla: string;
  upstreamAssets: string[];
  columns: DataColumn[];
}

export interface SemanticMetric {
  id: string;
  synonyms: string[];
  formulaSql: string;
  requiredFilters: string[];
  authoritativeAsset: string;
  ownerTeam: string;
}

export interface SystemRecord {
  system: SourceSystem;
  localId: string;
  email: string;
  domain: string;
  companyName: string;
  updatedAt: string;
  fields: Record<string, string | number>;
}

export interface CanonicalEntity {
  canonicalId: string;
  displayName: string;
  normalizedDomain: string;
  crosswalk: Partial<Record<SourceSystem, string>>;
  matchConfidence: number;
}

export interface PrecedenceRule {
  field: string;
  priorityOrder: SourceSystem[];
  rationale: string;
}

export interface ResolvedField {
  field: string;
  value: string | number;
  authoritativeSystem: SourceSystem;
  authoritativeRecordId: string;
  precedenceRule: string;
  conflictsOverridden: Array<{
    system: SourceSystem;
    localId: string;
    value: string | number;
  }>;
}

export interface OssieQueryResponse {
  canonicalId: string;
  displayName: string;
  resolvedFields: Record<string, ResolvedField>;
  metricUsed?: SemanticMetric;
  accessibleColumns: string[];
  maskedColumns: string[];
}
```

### Block-by-block explanation
1. **`EstateTier`, `PiiLevel`, `DataAsset`:** Models technical (`columns`), business (`ownerTeam`, `certifiedGold`), and operational (`freshnessSla`, `upstreamAssets`) metadata.
2. **`SemanticMetric`:** Captures `synonyms`, `formulaSql`, and `requiredFilters` so agents never invent metric math.
3. **`CanonicalEntity` & `ResolvedField`:** Stores the cross-system crosswalk (`crm`, `billing`, `support`) and full provenance (`authoritativeSystem`, `authoritativeRecordId`, `conflictsOverridden`).

