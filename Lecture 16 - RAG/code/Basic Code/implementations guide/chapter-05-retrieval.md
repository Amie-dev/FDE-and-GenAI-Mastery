# Chapter 05 — Vector Index: Retrieval Engine

**Notes source:** `Lecture 16 - RAG/notes/05_vector_index_retrieval_engine.md`

**Goal:** Given a question, find the most relevant chunks for this tenant only. Over-fetch, filter by tenant, apply a score floor, dedupe per document, and keep top-K.

---

## `src/services/retrieval.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/retrieval.ts` |
| Chapter | 05 (uses `vectorIndex` from Chapter 03 ingestion service) |
| What it does | Embeds the question, queries the vector index with a tenant filter, applies a score floor, dedupes chunks per source document, and returns top-K matches. |

### Full code

```ts
import { embedText } from "./embedding";
import { vectorIndex } from "./ingestion";
import { config } from "../config/config";
import type { Match, QueryContext } from "../types";

const SCORE_FLOOR = 0.3;
const MAX_PER_DOC = 2;

export async function retrieve(params: {
  question: string;
  ctx: QueryContext;
  topK?: number;
}): Promise<Match[]> {
  const { question, ctx, topK = config.topK } = params;

  const vector = await embedText(question);

  const raw = vectorIndex.query({
    vector,
    topK: topK * 4,
    filter: (record) => {
      if (record.metadata.tenantId !== ctx.tenantId) return false;
      if (ctx.roles.length > 0) {
        const acl = String(record.metadata.acl ?? "public");
        if (!ctx.roles.includes(acl) && acl !== "public") return false;
      }
      return true;
    },
  });

  const filtered = raw.filter((m) => m.score >= SCORE_FLOOR);

  const byDoc = new Map<string, number>();
  const deduped: Match[] = [];
  for (const match of filtered) {
    const source = String(match.metadata.source ?? match.id);
    const count = byDoc.get(source) ?? 0;
    if (count >= MAX_PER_DOC) continue;
    byDoc.set(source, count + 1);
    deduped.push(match);
  }

  return deduped.slice(0, topK);
}
```

### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `import { vectorIndex } from "./ingestion"` | Reuses the vector index created in the ingestion service. Ingestion and retrieval share the same store. | Chapter 05 |
| `const SCORE_FLOOR = 0.3` | Only trust matches above this similarity score. Removes obvious noise. Should be calibrated per corpus in production. | Chapter 05 |
| `const MAX_PER_DOC = 2` | Never return more than 2 chunks from the same document. Prevents one document from dominating the context budget. | Chapter 05 |
| `export async function retrieve({ question, ctx, topK })` | The retrieval entry point. Takes a question plus the query context (tenant, roles, session). | Chapter 05 |
| `const vector = await embedText(question)` | Embeds the question using the exact same function and model as ingestion. **Chapter 04 contract:** question and documents must be in the same space. | Chapter 04 |
| `topK: topK * 4` | Over-fetches 4× the final count so that after filtering + dedupe there are still enough results. | Chapter 05 |
| `filter: (record) => { ... }` | Authorisation inside the query. A record is only returned if its `tenantId` matches and (if roles are set) its `acl` is allowed. One tenant can never read another's documents. | Chapter 05 / Chapter 09 |
| `raw.filter((m) => m.score >= SCORE_FLOOR)` | Drops low-similarity matches. Only chunks meaningfully close to the question survive. | Chapter 05 |
| `byDoc` map + `MAX_PER_DOC` | Dedupe: tracks how many chunks each source document has contributed and skips beyond 2 per doc. | Chapter 05 |
| `return deduped.slice(0, topK)` | Returns at most `topK` chunks (default 4). Small enough to fit comfortably in the prompt budget. | Chapter 05 |

### Chapter 05 principles honored

| Principle | How this code implements it |
|-----------|------------------------------|
| Upsert by id | Handled in ingestion service; retrieval only reads |
| ANN top-K search | `vectorIndex.query` returns top candidates sorted by cosine similarity |
| Metadata payload + filter | Tenant filter + ACL filter applied inside the query |
| Filter by tenant | `record.metadata.tenantId !== ctx.tenantId` rejects cross-tenant records |
| Over-fetch then keep | `topK * 4` fetched, then filtered/dedupe down to `topK` |
| Score floor | `SCORE_FLOOR = 0.3` removes noise |
| Dedupe per document | `MAX_PER_DOC = 2` caps chunks from one source |

### Command

```bash
# Retrieval happens inside POST /api/query:
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"refund policy","tenantId":"acme","sessionId":"s1","roles":[]}'
```
