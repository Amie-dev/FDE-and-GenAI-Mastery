import { embedTexts } from "./embedding";
import { config } from "../config/config";
import type { Chunk, IngestResult, VectorRecord } from "../types";

/**
 * Ingestion service — Chapters 03 and 05 (offline pipeline).
 *
 * document -> extract text -> chunk -> embed -> upsert (content-addressed id).
 * Content-addressed ids (sha256 of source:index:text) make re-ingestion
 * idempotent: running twice on unchanged input produces the same records, not
 * duplicates. Stale chunks for a document are removed so the index never grows
 * forever on re-runs.
 */

const index = new Map<string, VectorRecord>(); // in-memory "vector index"

/** Tiny sha256-free content id: stable, deterministic, good enough for basic code. */
function stableId(source: string, index: number, text: string): string {
  let hash = 0;
  const str = `${source}:${index}:${text}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Split text into overlapping chunks of roughly chunkSize characters.
 * Chapter 03 default: 300-500 tokens, 10-20% overlap, keep structure.
 * (Basic code uses characters; swap in a real tokenizer for production.)
 */
function chunkText(
  text: string,
  { size, overlap, source, docId }: { size: number; overlap: number; source: string; docId: string },
): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let chunkNo = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const piece = text.slice(start, end).trim();
    if (piece.length > 0) {
      chunks.push({
        text: `${source} · chunk ${chunkNo + 1}\n${piece}`,
        metadata: { source, docId, chunk: chunkNo, page: undefined, section: undefined },
      });
      chunkNo++;
    }
    if (end >= text.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

/** Cosine similarity between two vectors. */
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export const vectorIndex = {
  /** Upsert records by id — overwrite, never duplicate (Chapter 05 minimum contract). */
  upsert(records: VectorRecord[]): void {
    for (const record of records) {
      index.set(record.id, record);
    }
  },
  /** Query: cosine similarity, optional metadata filter, top-K. */
  query({
    vector,
    topK,
    filter,
  }: {
    vector: number[];
    topK: number;
    filter?: (record: VectorRecord) => boolean;
  }): { id: string; score: number; metadata: Record<string, unknown> }[] {
    const scored: { id: string; score: number; metadata: Record<string, unknown> }[] = [];
    for (const [id, record] of index) {
      if (filter && !filter(record)) continue;
      scored.push({ id, score: cosine(vector, record.vector), metadata: record.metadata });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  },
  /** Remove every record belonging to a document (used before re-ingesting it). */
  deleteByDocId(docId: string): number {
    let removed = 0;
    for (const [id, record] of index) {
      if (record.metadata.docId === docId) {
        index.delete(id);
        removed++;
      }
    }
    return removed;
  },
  size(): number {
    return index.size;
  },
};

/** Ingest one document into the index. Idempotent and deterministic. */
export async function ingestDocument(params: {
  docId: string;
  title: string;
  text: string;
  tenantId: string;
}): Promise<IngestResult> {
  const { docId, title, text, tenantId } = params;
  const source = title;

  // Remove any previous vectors for this doc so re-runs stay idempotent (Chapter 03).
  vectorIndex.deleteByDocId(docId);

  const chunks = chunkText(text, {
    size: config.chunkSize,
    overlap: config.chunkOverlap,
    source,
    docId,
  });

  const vectors = await embedTexts(chunks.map((c) => c.text));

  const records: VectorRecord[] = chunks.map((chunk, i) => ({
    id: stableId(source, chunk.metadata.chunk, chunk.text),
    vector: vectors[i],
    metadata: {
      ...chunk.metadata,
      namespace: config.namespace,
      tenantId,
      embeddingModel: config.embeddingModel,
      updatedAt: new Date().toISOString(),
    },
  }));

  vectorIndex.upsert(records);

  return { file: title, chunks: chunks.length, embedded: records.length };
}