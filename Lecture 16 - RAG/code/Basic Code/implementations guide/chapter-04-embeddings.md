# Chapter 04 — Embeddings at Query Time

**Notes source:** `Lecture 16 - RAG/notes/04_embeddings_at_query_time.md`

**Goal:** One model, one dimension, identical preprocessing at ingestion AND query time. This is the Chapter 04 contract: a query is only meaningful in the space where the documents were embedded.

---

## `src/services/embedding.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/embedding.ts` |
| Chapter | 04 |
| What it does | Turns text into a vector. The same `embedText()` function is used by both ingestion and retrieval, guaranteeing both sides live in the same coordinate system. Falls back to a deterministic mock vector when no `OPENAI_API_KEY` is configured, so the code runs end-to-end without a key. |

### Full code

```ts
import OpenAI from "openai";
import { config } from "../config/config";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

function mockVector(text: string, dims: number): number[] {
  const out: number[] = new Array(dims).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash) || 1;
  for (let i = 0; i < dims; i++) {
    out[i] = Math.sin(seed * (i + 1)) * 0.5 + 0.5;
  }
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
  return out.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!config.openaiApiKey) {
    return mockVector(clean, config.embeddingDims);
  }
  const res = await getClient().embeddings.create({
    model: config.embeddingModel,
    dimensions: config.embeddingDims,
    input: clean,
  });
  const vector = res.data[0].embedding;
  if (vector.length !== config.embeddingDims) {
    throw new Error(
      `Embedding dimension mismatch: got ${vector.length}, expected ${config.embeddingDims}`,
    );
  }
  return vector;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
  }
  return out;
}
```

### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `let client: OpenAI \| null = null` / `getClient()` | Lazily creates a single OpenAI client instance. Reusing one client avoids re-creating HTTP connections. | Chapter 04 |
| `function mockVector(...)` | Produces a deterministic pseudo-vector when no API key is set. Used for offline learning so the full flow still runs. Not used when `OPENAI_API_KEY` is present. | Chapter 04 (offline mode) |
| `export async function embedText(text)` | The single embedding entry point. Cleans whitespace, calls OpenAI (or mock), and asserts the output dimension matches `config.embeddingDims`. | Chapter 04 |
| `const clean = text.trim().replace(/\s+/g, " ")` | Normalizes whitespace so identical text always produces the same input to the model. Same preprocessing at ingest and query. | Chapter 04 |
| `if (!config.openaiApiKey) return mockVector(...)` | Falls back to mock when no key. The rest of the app doesn't need to know whether it's real or mock embeddings. | Chapter 04 |
| `model: config.embeddingModel, dimensions: config.embeddingDims` | Sends the configured model and dimension. **Chapter 04 contract:** ingestion and query must use the same model + dims. | Chapter 04 |
| `if (vector.length !== config.embeddingDims) throw new Error(...)` | Fails loudly if the model returns a different dimension than expected. Silent dimension mismatch is the #1 cause of broken RAG indexes. | Chapter 04 |
| `export async function embedTexts(texts)` | Embeds an array of texts in order. Used by ingestion to embed all chunks of a document. | Chapter 03 |

### Chapter 04 contract honored

| Rule | How this code implements it |
|------|------------------------------|
| One model | `config.embeddingModel` used by both `embedText` (query) and `embedTexts` (ingest) |
| One dimension | `config.embeddingDims` asserted on every output |
| Same preprocessing | `clean` whitespace normalization applied identically everywhere |
| Fail loudly on mismatch | Dimension assertion throws instead of silently storing wrong vectors |

### Command

```bash
# Type-check the embedding service
npm run typecheck

# Test directly with tsx:
npx tsx -e "import { embedText } from './src/services/embedding'; embedText('hello world').then(v => console.log(v.length, 'dims'))"
```
