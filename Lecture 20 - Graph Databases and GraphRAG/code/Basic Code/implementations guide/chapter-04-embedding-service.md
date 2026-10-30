# Chapter 04 — Embedding Service

**Notes source:** `notes/06_GraphRAG_Hybrid_Retrieval.md`

**Goal:** Turn text into a numeric vector. In production this calls an embedding model; here we use a deterministic hash so the code runs without an API key.

---

## 1. `src/services/embedding.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/embedding.ts` |
| Chapter | 04 (supports Chapters 05–07) |
| What it does | Deterministic embedding function (Chapter 06). |

### Full code

```ts
/** Deterministic embedding (Chapter 06).
 * In production this would call OpenAI / Cohere / a local model.
 * The deterministic version lets the basic code run without an API key.
 */

function embed(text: string): number[] {
  const vector = new Array(1536).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 1536; i++) {
    vector[i] = ((hash >> (i % 4)) & 0xf) / 15;
  }
  return vector;
}

export { embed };
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `const vector = new Array(1536).fill(0)` | Creates a 1536-dimensional zero vector (matches Neo4j vector index dims). |
| First `for` loop | Computes a simple hash from the input text characters. |
| Second `for` loop | Spreads hash bits across all 1536 dimensions. |
| `return vector` | Returns a fixed-length numeric embedding. |
| `export { embed }` | Makes `embed` importable by `graphrag.ts`. |

### Command

```bash
npm run typecheck
```