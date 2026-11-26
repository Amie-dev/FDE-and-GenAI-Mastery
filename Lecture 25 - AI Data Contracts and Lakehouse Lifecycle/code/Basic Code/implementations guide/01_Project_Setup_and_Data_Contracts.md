# Chapter 01: Project Setup, Zod AI Data Contracts & Exception Queue

> **Chapter goal:** configure `package.json` / `tsconfig.json` and build `src/contracts.ts` with Zod schema validation, deterministic normalization, and an `ExceptionQueue`.
> **Notes chapters covered:** 01 (Hybrid Extraction) & 02 (AI Data Contracts & Exception Queues).

---

## 1.1 Full code: `package.json` & `tsconfig.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-25-ai-data-contracts-lakehouse",
  "version": "1.0.0",
  "description": "Lecture 25 Basic Code — Zod AI Data Contracts, Cascade Deletion & Zero-Downtime Blue/Green Re-Embedding",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "data-contracts",
    "zod",
    "cascade-deletion",
    "gdpr",
    "lakehouse",
    "typescript"
  ],
  "license": "ISC",
  "dependencies": {
    "zod": "^3.24.2"
  },
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

## 1.2 Full code: `src/contracts.ts`

File path: `code/Basic Code/src/contracts.ts`

```ts
import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Producer/Consumer AI Data Contract enforced at ingestion time.
 * Records failing validation are quarantined rather than corrupting downstream AI stores.
 */
export const IngestionRecordSchema = z.object({
  sourceId: z.string().min(1, "sourceId is required"),
  tenantId: z.string().min(1, "tenantId is required for multi-tenant isolation"),
  sourceUri: z.string().url("sourceUri must be a valid URL"),
  content: z.string().min(20, "content must be >= 20 chars to avoid empty/slop chunks"),
  tags: z.array(z.string()).default([]),
  updatedAt: z.string().datetime({ message: "updatedAt must be ISO-8601 UTC" }),
  freshnessSlaMs: z.number().int().positive().default(3_600_000),
  version: z.number().int().positive().default(1),
});

export type ValidatedRecord = z.infer<typeof IngestionRecordSchema>;

export interface NormalizedRecord extends ValidatedRecord {
  contentHash: string;
  normalizedTags: string[];
  extractedEntities: string[];
}

export interface QuarantineEntry {
  rawPayload: unknown;
  errors: string[];
  quarantinedAt: string;
}

export class ExceptionQueue {
  private readonly entries: QuarantineEntry[] = [];

  push(rawPayload: unknown, errors: string[]): void {
    this.entries.push({
      rawPayload,
      errors,
      quarantinedAt: new Date().toISOString(),
    });
  }

  list(): QuarantineEntry[] {
    return [...this.entries];
  }
}

/**
 * Deterministic pre/post-transform + lightweight entity extraction.
 */
export function normalizeAndEnrich(record: ValidatedRecord): NormalizedRecord {
  const cleanedContent = record.content.trim().replace(/\s+/g, " ");
  const contentHash = createHash("sha256").update(cleanedContent).digest("hex").slice(0, 16);
  const normalizedTags = [...new Set(record.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

  // Deterministic entity extraction (capitalized multi-word / acronym tokens)
  const matches = cleanedContent.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g) ?? [];
  const extractedEntities = [...new Set(matches)];

  return {
    ...record,
    content: cleanedContent,
    contentHash,
    normalizedTags,
    extractedEntities,
  };
}
```

### Block-by-block explanation
1. **`IngestionRecordSchema`:** Enforces `tenantId`, valid `sourceUri`, minimum content length (`>= 20`), ISO-8601 `updatedAt`, and `freshnessSlaMs` before any record is embedded.
2. **`ExceptionQueue`:** Quarantines invalid payloads with exact Zod issue paths so valid records in the same batch continue uninterrupted.
3. **`normalizeAndEnrich()`:** Computes a deterministic `contentHash` (for incremental skip-if-unchanged), lowercases tags, and extracts entity labels for the graph store.

