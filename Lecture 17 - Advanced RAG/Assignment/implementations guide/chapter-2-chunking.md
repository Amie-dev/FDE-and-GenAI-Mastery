# Chapter 2 — Chunking Strategies (Fixed-Size)

**Goal:** Split documents into searchable, self-contained chunks so each unit carries its own meaning.
**Notes reference:** `notes/02_Chunking_Strategies.md`
**File:** `src/services/chunking.service.ts`
**Order:** Run after Chapter 1.

---

## 2.1 File Details

**`src/services/chunking.service.ts`**

```ts
/**
 * Chapter 02 — Chunking Strategies
 *
 * Fixed-size chunking with overlap. Splits text into searchable units so
 * each chunk carries its own meaning (retrieval unit), fits the prompt
 * (context unit), and can be cited (citation unit).
 */

export interface Chunk {
  id: string;
  text: string;
  tokens: number;
  start: number;
  end: number;
  metadata: Record<string, unknown>;
}

export interface ChunkingOptions {
  chunkSize: number;   // tokens per chunk
  overlap: number;     // token overlap between chunks
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(
  text: string,
  docId: string,
  opts: ChunkingOptions,
  metadata: Record<string, unknown> = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  const total = countTokens(text);
  let start = 0;
  let index = 0;

  while (start < total) {
    const end = Math.min(start + opts.chunkSize, total);
    const slice = text.slice(start * 4, end * 4);

    chunks.push({
      id: `${docId}-chunk-${index}`,
      text: slice,
      tokens: countTokens(slice),
      start,
      end,
      metadata: { ...metadata, chunkIndex: index },
    });

    index++;
    if (end >= total) break;
    start = end - opts.overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

export function withBreadcrumb(
  chunks: Chunk[],
  breadcrumb: string
): Chunk[] {
  return chunks.map((c) => ({
    ...c,
    text: `${breadcrumb}\n${c.text}`,
    tokens: countTokens(`${breadcrumb}\n${c.text}`),
  }));
}
```

**Block-by-block:**
- `Chunk` interface — shape of one chunk: id, text, token count, start/end positions, metadata.
- `ChunkingOptions` — `chunkSize` (how big) and `overlap` (shared tokens between adjacent chunks).
- `countTokens` — tiny approximation (1 token ≈ 4 chars) so the example runs without a real tokenizer.
- `chunkText` — the core loop:
  - Slices text into windows of `chunkSize` tokens.
  - Each window becomes a `Chunk` with a deterministic id (`{docId}-chunk-{index}`).
  - Moves `start` forward by `chunkSize - overlap` so adjacent chunks share context (prevents cutting a sentence in half).
  - Stops when `end >= total`.
- `withBreadcrumb` — prepends a section heading (e.g. "Electronics Return Policy") to every chunk so each chunk is understandable on its own (Chapter 02: "a chunk should be understandable out of context").

---

## 2.2 Commands

No runtime command — this is a library used by the pipeline. Test it with `ts-node`:

```bash
npx ts-node -e "
import { chunkText, withBreadcrumb } from './src/services/chunking.service';
const chunks = chunkText(
  'Electronics Return Policy: Electronic products may be returned within 7 days of delivery, subject to inspection.',
  'doc-2',
  { chunkSize: 20, overlap: 5 }
);
console.log(chunks);
"
```

---

## 2.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Chunk size in tokens | `chunkSize` option + `countTokens` |
| Overlap window | `overlap` option in `chunkText` loop |
| Self-contained chunk | `withBreadcrumb` prepends heading |
| Citation unit | each `Chunk` has an `id` |
| Token stored in metadata | `tokens` field on every chunk |
