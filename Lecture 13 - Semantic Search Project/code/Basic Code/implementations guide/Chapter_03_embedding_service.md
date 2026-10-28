# Chapter 03 — Embedding Service (REPRESENT)

The **REPRESENT** step turns text into a vector. In Production you call an HTTP
embedding model; in this **Basic Code** the same text always maps to the same
deterministic "seed" vector, so the demo is runnable with no API key.

The file is laid out so the **production replacement is a copy/paste swap**, not
a rewrite — the only real change is the body of `embedText()`.

> ⚠️ Note the exact shape of this file (it differs from the "obvious" rewrite).
> `EmbeddingService` exports **only** the class (no default export, no
> `L2normalize` helper). Normalisation is a **method** on the class called
> `normalize()`, and the cache-size getter sits *before* `embedText()`.

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/services/embedding.service.ts` | `EmbeddingService` — text → vector with an in-memory cache + a `normalize()` method. |

## Full code

### `src/services/embedding.service.ts`

```ts
/**
 * EmbeddingService — the "REPRESENT" step of the embedding pipeline.
 *
 * Lecture 13 notes (Chapter 06): "Convert meaning into numbers."
 *
 * What it does:
 *   1. Normalizes a raw text string into a vector (the embedding).
 *   2. Passes the vector through a normalizer so cosine similarity is
 *      safe and fast on the vector store.
 *
 * In PRODUCTION the `embedText()` method calls an embedding provider
 * (e.g. OpenAI text-embedding-3-small) over HTTP.  Every embedded text
 * is cached, and only *changing* text is re-embedded — that is the
 * "precompute stable data once" idea from Chapter 03.
 *
 * In THIS BASIC DEMO there is no API, so `embedText()` falls back to a
 * deterministic seeded vector built from the text's characters.
 * This keeps the demo runnable with zero external credentials, while the
 * code still shows exactly where the real provider call would go.
 */

import { envConfig } from "../config/env.config.js";

/**
 * A tiny deterministic vector so the demo runs with no API key.
 * Real projects replace this body with an HTTP call to the provider.
 *
 * Algorithm (character hash): turn each character into a small number,
 * sum them with simple trig for stability, then normalise to a fixed
 * length.  The result is *not* a real embedding — it is only a stand-in
 * that behaves like one: the same text always produces the same vector.
 *
 * This keeps lecture-13 runnable and lets you focus on REPRESENT →
 * STORE → COMPARE → RANK, which is the whole point of the lecture.
 */
function seedVectorFromText(text: string): number[] {
  const length = 8;
  const digits = text.split("").map((ch) => ch.charCodeAt(0));
  const sum = digits.reduce((acc, code) => acc + Math.sin(code) + code, 0);
  const mixed = digits.map((code, idx) => Math.sin(code * (idx + 1) + sum));
  let out: number[] = [];
  for (let i = 0; i < length; i++) {
    out.push(mixed[i % mixed.length]);
  }
  return out;
}

/**
 * Embed raw text into a vector.
 *
 * Production replacement:
 *   async embedText(text: string): Promise<number[]> {
 *     const res = await fetch(`${envConfig.embeddingBaseUrl}/embeddings`, {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({
 *         model: envConfig.embeddingModel,
 *         input: text,
 *       }),
 *     });
 *     const body = await res.json();
 *     return body.data[0].embedding as number[];
 *   }
 */
export class EmbeddingService {
  private cache = new Map<string, number[]>();

  getEmbeddingCacheSize(): number {
    return this.cache.size;
  }

  embedText(text: string): number[] {
    const normalized = text.trim().toLowerCase();

    // 1. Cache lookup — REPRESENT + STORE together for speed.
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    // 2. Real provider call goes here.  Disabled in the basic demo.
    //     if (envConfig.embeddingBaseUrl) {
    //       return this.embedTextWithProvider(normalized);
    //     }

    // 3. Fallback: deterministic seeded vector for the demo.
    const vector = seedVectorFromText(normalized);

    // 4. Cache the result so repeated queries are cheap.
    this.cache.set(normalized, vector);
    return vector;
  }

  /**
   * Normalise a vector to unit length (L2 norm).
   *
   * Why: cosine similarity only measures *direction*, not magnitude.
   * Normalising first makes the similarity formula simpler and avoids
   * long documents dominating short ones.  The notes (Chapter 05) explain
   * that cosine similarity ignores vector length, which is exactly what
   * this step makes possible.
   */
  normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }
}
```

## Block-by-block

*`import { envConfig }`* — `envConfig` is imported but referenced **only inside
comments** (the production-replacement stub reads `envConfig.embeddingBaseUrl`).
That is why the demo type-checks even though the provider fields are commented
out in `env.config.ts` — the import is genuinely exercised by the commented code
path the reader is meant to uncomment.

*`seedVectorFromText`* — a **module-level** function (not a method). It is
**not** a real embedding, but it is *stable*: the same input always yields the
same output. Stability is what matters for the demo — it is exactly the property
the production provider also guarantees.

*`getEmbeddingCacheSize()`* — sits before `embedText()` in the source; it simply
returns `this.cache.size` so the `/status` endpoint can report how many texts
have been embedded this session.

*`embedText()`* — the cache key is `text.trim().toLowerCase()`, which is why
re-querying "The Matrix" and "the matrix" collapses to one cache entry
(**store-on-first-use**: nothing is embedded until asked, and never re-embedded).

*`normalize()`* — a **public method** on the class (the only normaliser in this
file). `VectorStoreService.addMovies()` calls `embedText()` but does **not**
call `normalize()` in this demo — vectors are stored raw, so
`RecommendationService.cosineSimilarity` effectively computes a dot product
(its docstring assumes unit vectors). Calling `this.normalize(...)` on the
stored vector in `addMovies()` is the recommended one-line upgrade for true
cosine scores; it is left out here to keep the learning path minimal.

**Exports.** There is no `export default` and no `export { ... }`. `VectorStoreService`
and `index.ts` import it as a named export: `import { EmbeddingService } from "./embedding.service.js"`.

## Production replacement
> Uncomment the `embeddingBaseUrl` / `embeddingModel` lines in
> `src/config/env.config.ts`, then replace the `embedText()` body with the
> `async` version in the doc block above. The cache, the `.trim().toLowerCase()`
> key, and the return contract stay the same — but you must also `await` it at
> the call sites in `VectorStoreService.addMovies()` and
> `RecommendationService.search()` / `similarTo()` (the one structural change).

## Tips
> - **Cache = dev-loop friend.** Re-querying the same text returns a cache HIT;
> open `/status` twice and watch `embeddingCacheSize` stay flat — proof the cache
> works without standing up an external provider.
> - **Seed vectors prove consistency, not quality.** If results *look* plausible,
> that is the seed function coincidentally correlating characters — swap in a real
> provider to judge true semantic relevance.
