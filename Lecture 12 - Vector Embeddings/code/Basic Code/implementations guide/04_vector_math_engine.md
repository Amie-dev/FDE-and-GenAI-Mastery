# Chapter 4 — Vector Math Engine (Chapter 3: Measuring Similarity)

## 1. File: `src/services/vectorEngine.ts`

This file implements the **four similarity measures** from the lecture notes.
It is the core computational engine of the app.

## 2. Full Code File

```typescript
// services/vectorEngine.ts — Vector math engine (Chapter 3: measuring similarity)

import { Vector, SentenceEmbedding, Neighbor } from "../types/index.js";

/**
 * Dot product of two vectors:  Σ(aᵢ × bᵢ)
 * Captures both direction AND magnitude.
 * Used heavily in cosine similarity.
 */
export function dotProduct(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    sum += a.values[i] * b.values[i];
  }
  return sum;
}

/**
 * Euclidean distance (L2):  √(Σ(xᵢ − yᵢ)²)
 * Straight-line distance. Good for well-scaled, dense features.
 */
export function euclideanDistance(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    const diff = a.values[i] - b.values[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Manhattan distance (L1):  Σ|xᵢ − yᵢ|
 * City-block travel on a grid. Robust to outliers, good for sparse features.
 */
export function manhattanDistance(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) {
    sum += Math.abs(a.values[i] - b.values[i]);
  }
  return sum;
}

/**
 * Cosine similarity:  dot(a, b) / (|a| × |b|)
 * Captures direction only — magnitude-invariant. Range: -1 to 1.
 * This is the workhorse metric for text/embedding similarity.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.values.length !== b.values.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.values.length} vs ${b.values.length}`
    );
  }
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Helper: length (magnitude) of a vector. */
export function magnitude(v: Vector): number {
  let sum = 0;
  for (const x of v.values) sum += x * x;
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length (magnitude = 1).
 * After normalization, cosine similarity == dot product.
 */
export function normalize(v: Vector): Vector {
  const mag = magnitude(v);
  if (mag === 0) return { ...v, values: [...v.values] };
  return {
    dim: v.dim,
    values: v.values.map((x: number) => x / mag),
  };
}

/**
 * Find the top-N nearest neighbours of queryText among sentences.
 * Uses cosine similarity by default (recommended for embeddings).
 */
export function findNearestNeighbors(
  sentences: SentenceEmbedding[],
  queryText: string,
  topN: number,
  similarityFn: (a: Vector, b: Vector) => number = cosineSimilarity
): Neighbor[] {
  const query = sentences.find((s) => s.text === queryText);
  if (!query) throw new Error(`Query sentence not found: ${queryText}`);

  const results = sentences
    .map((s: SentenceEmbedding) => ({
      id: s.id,
      text: s.text,
      similarity: similarityFn(query.embedding, s.embedding),
      distance: euclideanDistance(query.embedding, s.embedding),
    }))
    .filter((r) => r.id !== query.id) // exclude self
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return results;
}
```

## 3. Block-by-Block Explanation

### Dot Product (`dotProduct`)
```typescript
sum += a.values[i] * b.values[i];
```
- Multiplies corresponding elements and adds them up.
- **Formula:** Σ(aᵢ × bᵢ) = |a| × |b| × cos(θ)
- **Captures both direction AND magnitude.**

### Euclidean Distance (`euclideanDistance`)
```typescript
const diff = a.values[i] - b.values[i];
sum += diff * diff;
return Math.sqrt(sum);
```
- Computes √Σ(xᵢ − yᵢ)².
- **Formula:** √((x₂−x₁)² + (y₂−y₁)²)
- **Good for** well-scaled, dense features. Sensitive to outliers.

### Manhattan Distance (`manhattanDistance`)
```typescript
sum += Math.abs(a.values[i] - b.values[i]);
```
- Computes Σ|xᵢ − yᵢ|.
- **Formula:** |x₂−x₁| + |y₂−y₁|
- **Good for** sparse features, robust to outliers.

### Cosine Similarity (`cosineSimilarity`)
```typescript
const dot = dotProduct(a, b);
const magA = magnitude(a);
const magB = magnitude(b);
return dot / (magA * magB);
```
- **Formula:** cos(θ) = (a·b) / (|a| × |b|)
- **Captures direction only** — magnitude-invariant.
- **Range:** -1 to 1 (1 = same direction, 0 = perpendicular, -1 = opposite).
- **This is the workhorse metric for text/embedding similarity.**

### Magnitude (`magnitude`)
```typescript
let sum = 0;
for (const x of v.values) sum += x * x;
return Math.sqrt(sum);
```
- Computes |v| = √(Σ xᵢ²). Used by both cosine and normalize.

### Normalize (`normalize`)
```typescript
values: v.values.map((x) => x / mag)
```
- Scales the vector so its magnitude becomes 1.
- **After normalization:** cosine similarity == dot product (because |a| and |b| are both 1).

### Find Nearest Neighbors (`findNearestNeighbors`)
```typescript
const results = sentences
  .map((s) => ({ id: s.id, text: s.text, similarity: similarityFn(query.embedding, s.embedding), distance: euclideanDistance(query.embedding, s.embedding) }))
  .filter((r) => r.id !== query.id)   // exclude self
  .sort((a, b) => b.similarity - a.similarity)  // highest similarity first
  .slice(0, topN);                                    // take top N
```
- For each sentence, computes similarity and distance to the query.
- Filters out the query itself (so it can't be its own neighbor).
- Sorts descending by similarity (highest first).
- Takes the first `topN`.

## 4. Which Measure to Use?

| Measure | Formula | Use When |
|---------|---------|----------|
| **Cosine** | dot(a,b) / (|a|×|b|) | Text/embedding similarity (direction only) |
| **Euclidean** | √Σ(xᵢ−yᵢ)² | Well-scaled, dense features (absolute gap matters) |
| **Manhattan** | Σ\|xᵢ−yᵢ\| | Sparse features, robust to outliers |
| **Dot Product** | Σ(aᵢ×bᵢ) | When both direction AND magnitude matter |

> **Rule of thumb from the lecture notes:** Embedding vectors → use cosine.
> Hand-designed features → use Euclidean with standardization. Sparse features → L1.
