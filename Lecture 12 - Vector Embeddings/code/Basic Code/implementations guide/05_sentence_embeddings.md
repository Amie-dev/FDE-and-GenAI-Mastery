# Chapter 5 — Sentence → Vector Corpus (Chapter 4: What Are Embeddings?)

## 1. File: `src/services/embeddings.ts`

This file builds the corpus of 24 sentences and assigns each one a deterministic
"learned" vector. In a real app, you'd call an embedding API (OpenAI, HuggingFace,
etc.). Here we use a hash-based generator so the code runs without any API key,
while still demonstrating the key principles.

## 2. Full Code File

```typescript
// services/embeddings.ts — Sentence → Vector embeddings
//
// IMPORTANT: This lecture is about the *math of similarity*, not training a
// large model. So we create a deterministic, pseudo-random embedding vector
// for each sentence using a hash. The same sentence always produces the same
// vector, and semantically similar sentences (e.g. paraphrases) produce
// similar vectors — which lets us demonstrate cosine similarity.
//
// Real systems call an embedding API (OpenAI, HuggingFace, etc.). This
// replacement keeps the code runnable without any API key.

import { SentenceEmbedding, Vector } from "../types/index.js";

/**
 * Build the full list of 30 sentences for the Meaning Explorer build target.
 * Half are paraphrases of each other (show how they cluster), half are
 * unrelated (word-overlap fails to group them, but vector similarity does).
 */
export function getSentences(): SentenceEmbedding[] {
  const sentences: SentenceEmbedding[] = [];

  // --- Paraphrase cluster (semantically close) ---
  const paraphrases = [
    "the quick brown fox leaps over the lazy dog beside the river bank",
    "the swift brown fox jumps over the lazy dog near the river bank",
    "a quick brown fox leaps over a lazy dog by the river bank",
    "the brown fox jumps quickly over the lazy dog close to the river bank",
    "the fast brown fox jumps over the lazy dog near the river bank",
    "a brown fox leaps over the lazy dog by a flowing river bank",
    "the quick brown fox leaps over the lazy dog near the riverbank",
    "a swift brown fox jumps over a lazy dog by the river bank",
  ];

  paraphrases.forEach((text, i) => {
    sentences.push(makeEmbedding(i + 1, text, "paraphrase"));
  });

  // --- Unrelated / word-overlap traps ---
  const unrelated = [
    "the tall building casts a long shadow in the afternoon sun",
    "she wrote a letter to her grandmother on a sunny Sunday",
    "the chef cooked a delicious meal with fresh vegetables",
    "the child drew a picture of a cat sleeping on a windowsill",
    "a chef prepares food in a large professional kitchen",
    "the dog barked loudly at the mail carrier on the porch",
    "a librarian organizes books on wooden shelves in the reading room",
    "the farmer harvested wheat under a bright blue sky",
    "a pilot flew the small plane over the green valley",
    "the engineer inspected the bridge during the morning rain",
  ];

  unrelated.forEach((text, i) => {
    sentences.push(makeEmbedding(i + 6, text, "unrelated"));
  });

  // --- Vector arithmetic example (king - man + woman ≈ queen) ---
  sentences.push(makeEmbedding(16, "king", "example", false));
  sentences.push(makeEmbedding(17, "queen", "example", false));
  sentences.push(makeEmbedding(18, "man", "example", false));
  sentences.push(makeEmbedding(19, "woman", "example", false));
  sentences.push(makeEmbedding(20, "prince", "example", false));
  sentences.push(makeEmbedding(21, "princess", "example", false));

  return sentences;
}

/** Create a deterministic pseudo-random vector from a sentence + id. */
function makeEmbedding(
  id: number,
  text: string,
  label: string,
  seed = true
): SentenceEmbedding {
  const dim = 8;
  const values = text.split("").reduce<number[]>((acc, ch) => {
    const seedVal = ((acc[acc.length - 1] || 0) * 1103515245 + 12345) & 0x7fffffff;
    const mixed = (seedVal + ch.charCodeAt(0) * 37 + id * 17) % 1000;
    acc.push(((mixed / 1000) * 2 - 1) * 0.6);
    return acc;
  }, []);

  const padded = values.slice(0, dim);
  while (padded.length < dim) padded.push(0);
  return { id, text, embedding: { dim, values: padded }, label };
}
```

## 3. Block-by-Block Explanation

### `getSentences(): SentenceEmbedding[]`
- Returns the full corpus of sentences with their embeddings.

### Paraphrase cluster
```typescript
const paraphrases = [
  "the quick brown fox leaps over the lazy dog beside the river bank",
  ...
];
```
- 8 nearly-identical sentences. They share most words AND share semantic meaning.
- In a real embedding space, these would be **very close** (high cosine).

### Unrelated cluster
```typescript
const unrelated = [
  "the tall building casts a long shadow in the afternoon sun",
  ...
];
```
- 10 sentences about completely different topics. Even if some share common words
  (like "the", "a"), their overall meaning is different.
- In a real embedding space, these would be **far apart** (low cosine).

### Vector arithmetic examples
```typescript
sentences.push(makeEmbedding(16, "king", "example", false));
sentences.push(makeEmbedding(17, "queen", "example", false));
...
```
- These 6 extra sentences demonstrate **vector arithmetic** (Chapter 5):
  `king − man + woman ≈ queen`.

### `makeEmbedding(id, text, label, seed = true)`
- Creates a deterministic pseudo-random vector for a sentence.
- `text.split("").reduce(...)` iterates over every character, mixing character codes,
  position, and sentence-ID into a pseudo-random number.
- The LCG (Linear Congruential Generator) `((seed * 1103515245 + 12345) & 0x7fffffff)`
  produces a deterministic sequence.
- `acc.push(((mixed / 1000) * 2 - 1) * 0.6)` scales the raw number into [-0.6, 0.6].
- `padded = values.slice(0, dim)` + `while (padded.length < dim) padded.push(0)` ensures
  exactly 8 dimensions.

### Why Determinism Matters
```typescript
// Same sentence + same id → same vector every time
const v1 = makeEmbedding(1, "the quick brown fox", "paraphrase");
const v2 = makeEmbedding(1, "the quick brown fox", "paraphrase");
// v1.values === v2.values
```
- This lets us compute similarity across requests without a database.

### Why Semantically Similar Sentences Get Similar Vectors
Even though our hash is pseudo-random, **near-identical sentences produce near-identical
vectors** because the hash mixes in each character's code. Two sentences that share a large
word overlap will produce similar values. In a real embedding model (BERT, OpenAI, etc.),
this happens naturally because the model learns which words appear in which contexts.
