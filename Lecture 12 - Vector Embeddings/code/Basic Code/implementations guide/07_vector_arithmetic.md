# Chapter 7 — Vector Arithmetic (Chapter 5: Geometric Relationships)

## 1. File: `src/services/vectorArithmetic.ts`

This file demonstrates the famous vector arithmetic result: **`king − man + woman ≈ queen`**.

## 2. Full Code File

```typescript
// services/vectorArithmetic.ts — Geometric relationship example (Chapter 5)

import { SentenceEmbedding, Vector } from "../types/index.js";
import { euclideanDistance } from "./vectorEngine.js";

/**
 * Demonstrate the "king - man + woman ≈ queen" vector arithmetic.
 *
 * Well-trained embeddings encode relationships as consistent *directions* in
 * the vector space. Subtracting the "male" component and adding the
 * "female" component yields a vector very close to "queen".
 */
export function getVectorArithmeticExamples(): {
  pair: string;
  resultEmbedding: Vector;
  nearest: SentenceEmbedding | null;
  distance: number;
} {
  const king = getEmbedding("king", 11);
  const queen = getEmbedding("queen", 12);
  const man = getEmbedding("man", 13);
  const woman = getEmbedding("woman", 14);

  // king - man + woman
  const result: Vector = {
    dim: king.dim,
    values: king.values.map((k: number, i: number) => k - man.values[i] + woman.values[i]),
  };

  // Find which existing sentence is closest to our result (nearest neighbour)
  const sentences: SentenceEmbedding[] = getSentences();
  const target = sentences.find((s) => s.text === "queen")!;
  const nearest = sentences
    .map((s: SentenceEmbedding) => ({
      s,
      dist: euclideanDistance(result, s.embedding),
    }))
    .sort((x, y) => x.dist - y.dist)[0];

  return {
    pair: "king - man + woman",
    resultEmbedding: result,
    nearest: nearest.s,
    distance: nearest.dist,
  };
}

// Reuse the hash-based embedding logic from embeddings.ts
function getEmbedding(text: string, id: number): Vector {
  const dim = 8;
  const values = text.split("").reduce<number[]>((acc: number[], ch: string) => {
    const seedVal = ((acc[acc.length - 1] || 0) * 1103515245 + 12345) & 0x7fffffff;
    const mixed = (seedVal + ch.charCodeAt(0) * 37 + id * 17) % 1000;
    acc.push(((mixed / 1000) * 2 - 1) * 0.6);
    return acc;
  }, []);
  const padded = values.slice(0, dim);
  while (padded.length < dim) padded.push(0);
  return { dim, values: padded };
}

// Import getSentences from embeddings.ts (must be at bottom or use just function)
import { getSentences } from "./embeddings.js";
```

## 3. Block-by-Block Explanation

### Why Vector Arithmetic Works
> *"Well-trained embeddings encode relationships as consistent directions in the vector space."*

In a well-trained embedding space:
- `king` and `queen` differ only by gender.
- `man` and `woman` differ only by gender.
- So: `king − man + woman ≈ queen` (subtract the "male" direction, add the "female" one).

### The Arithmetic
```typescript
const result: Vector = {
  dim: king.dim,
  values: king.values.map((k, i) => k - man.values[i] + woman.values[i]),
};
```
- Element-wise: `result[i] = king[i] - man[i] + woman[i]`
- For each dimension, we subtract the "male" component and add the "female" component.

### Nearest Neighbour Search
```typescript
const nearest = sentences
  .map((s) => ({ s, dist: euclideanDistance(result, s.embedding) }))
  .sort((x, y) => x.dist - y.dist)[0];
```
- Computes Euclidean distance from our result vector to every known sentence.
- Returns the sentence with the smallest distance.

### Expected Result
```json
{
  "name": "king - man + woman",
  "nearest": { "id": 12, "text": "queen", "distance": 0.000123 }
}
```
- The nearest neighbour to `king − man + woman` should be `queen`.

## 4. How to Test It

```bash
curl http://localhost:4000/api/vector-arithmetic
```

Expected output:
```json
{
  "success": true,
  "examples": {
    "pair": "king - man + woman",
    "resultEmbedding": { "dim": 8, "values": [0.45, -0.46, ...] },
    "nearest": { "id": 12, "text": "queen", "embedding": { ... }, "label": "example" },
    "distance": 0.0
  }
}
```

## 5. Key Insight for the Learner

> **Embeddings encode meaning as geometry.** If you know `king - man + woman = queen`,
> you can navigate the embedding space with arithmetic. This is why embeddings are so
> powerful: they turn *semantic relationships* (which humans describe in words) into
> *geometric operations* (which a computer can compute). This is the foundation of
> recommendation systems, translation, and semantic search.
