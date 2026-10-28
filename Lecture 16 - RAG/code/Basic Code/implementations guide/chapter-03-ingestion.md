# Chapter 03 — Ingestion: Documents to Chunks

**Notes source:** `Lecture 16 - RAG/notes/03_ingestion_documents_to_chunks.md`

**Goal:** Turn a document into overlapping chunks, embed them, and upsert into the index with a content-addressed (deterministic) id so re-ingestion is idempotent.

---

## `src/services/ingestion.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/ingestion.ts` |
| Chapter | 03 (supports Chapter 05 upsert contract) |
| What it does | Splits text into chunks, embeds each chunk, assigns a stable content-addressed id, and upserts into the in-memory vector index. Removes any previous vectors for the same `docId` before writing, so re-running is idempotent. |

### Full code

```ts
import { embedTexts } from "./embedding";
import { config } from "../config/config";
import type { Chunk, IngestResult, VectorRecord } from "../types";

const index = new Map<string, VectorRecord>(); // in-memory "vector index"

function stableId(source: string, index: number, text: string): string {
  let hash = 0;
  const str = `${source}:${index}:${text}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

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
  upsert(records: VectorRecord[]): void {
    for (const record of records) {
      index.set(record.id, record);
    }
  },
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

export async function ingestDocument(params: {
  docId: string;
  title: string;
  text: string;
  tenantId: string;
}): Promise<IngestResult> {
  const { docId, title, text, tenantId } = params;
  const source = title;

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

### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `const index = new Map<string, VectorRecord>()` | The in-memory "vector index". A real system would use Pinecone/Qdrant/pgvector here. The contract (upsert, query, delete) is identical. | Chapter 05 |
| `function stableId(...)` | Creates a deterministic id from `source:chunkNo:text`. Same input always produces the same id — this is what makes re-ingestion idempotent (no duplicates). | Chapter 03 |
| `function chunkText(...)` | Splits `text` into overlapping windows of `size` characters with `overlap` characters of overlap. Prepends `source · chunk N` to each chunk's text so the heading/topic is embedded too. | Chapter 03 |
| `function cosine(...)` | Computes cosine similarity between two vectors. Used by `query()` to rank chunks. | Chapter 05 |
| `export const vectorIndex = { upsert, query, deleteByDocId, size }` | The minimal vector store contract: upsert by id, ANN-style search (cosine here), delete by docId. | Chapter 05 |
| `vectorIndex.deleteByDocId(docId)` | Removes all existing vectors for this document before re-ingesting. Prevents duplicate vectors on re-runs. | Chapter 03 |
| `chunkText(text, { size, overlap, ... })` | Produces the chunk array using config values for size and overlap. | Chapter 03 |
| `embedTexts(chunks.map(c => c.text))` | Embeds every chunk using the same embedding model/dimension as query time. | Chapter 04 |
| `stableId(source, chunk.metadata.chunk, chunk.text)` | Each record's id is content-addressed. If the document text doesn't change, the id doesn't change → upsert overwrites instead of duplicating. | Chapter 03 |
| `vectorIndex.upsert(records)` | Writes all chunk vectors into the index. | Chapter 05 |
| `return { file, chunks, embedded }` | Tells the caller how many chunks were produced and embedded. | Chapter 03 |

### Key Chapter 03 principles honored

| Principle | How this code implements it |
|-----------|------------------------------|
| Deterministic + idempotent | `stableId` + `deleteByDocId` means running twice = same records, no duplicates |
| Chunk size + overlap | `config.chunkSize` / `config.chunkOverlap` (default 400 / 80) |
| Keep headings | Each chunk text is prefixed with `source · chunk N` |
| Metadata for citation/filtering | `source`, `docId`, `chunk`, `page`, `section` stored flat in metadata |
| Same model for ingest and query | `embedTexts` uses `config.embeddingModel` / `config.embeddingDims` |

### Command

```bash
# Ingest a document via the HTTP route (offline pipeline):
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"docId":"doc-1","title":"refund-policy.pdf","text":"Refunds are allowed within 3 days.","tenantId":"acme"}'
```