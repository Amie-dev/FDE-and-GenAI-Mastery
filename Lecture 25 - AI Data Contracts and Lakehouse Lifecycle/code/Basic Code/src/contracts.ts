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

