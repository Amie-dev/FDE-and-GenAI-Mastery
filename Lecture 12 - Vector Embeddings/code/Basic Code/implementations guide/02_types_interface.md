# Chapter 2 — Shared Types & Interfaces

## 1. File: `src/types/index.ts`

This file defines the shared TypeScript interfaces used across the whole app.
It lives in the `types/` folder so every other file can `import { Vector, ... } from "../types/index.js"`.

## 2. Full Code File

```typescript
// types/index.ts — Shared TypeScript interfaces for the Vector Embeddings Mastery app

/** A point in D-dimensional vector space. */
export interface Vector {
  dim: number;
  values: number[];
}

/** One sentence + its learned vector embedding. */
export interface SentenceEmbedding {
  id: number;
  text: string;
  embedding: Vector;
  label?: string;
}

/** A neighbor result from a similarity search. */
export interface Neighbor {
  id: number;
  text: string;
  similarity: number;
  distance: number;
}

/** Configuration loaded from .env. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  defaultVectorDim: number;
  maxSentences: number;
}
```

## 3. Block-by-Block Explanation

### `export interface Vector { dim: number; values: number[]; }`
- `dim`: the number of dimensions. E.g. `8` means a list of 8 numbers.
- `values`: the actual numbers (an array of floats).

**Why:** A vector is just an ordered list of numbers. This type captures both the
length and the contents in one place.

### `export interface SentenceEmbedding { id: number; text: string; embedding: Vector; label?: string; }`
- `id`: a unique number to identify the sentence (helps us find it in arrays).
- `text`: the original sentence.
- `embedding`: its vector (type `Vector`).
- `label?`: optional tag like `"paraphrase"`, `"unrelated"`, or `"example"`.

**Why:** When we build the corpus of sentences, each one needs its raw text plus
its computed vector plus a label for grouping. This interface bundles them.

### `export interface Neighbor { id: number; text: string; similarity: number; distance: number; }`
- `id`: which sentence this neighbor is.
- `text`: the neighbor's text (shortened for display).
- `similarity`: cosine similarity (high = close).
- `distance`: Euclidean distance (low = close).

**Why:** When we search "find 3 sentences most similar to X", we return a list of
these neighbor objects so the API consumer sees both the ranking and the scores.

### `export interface AppConfig { nodeEnv: string; port: number; defaultVectorDim: number; maxSentences: number; }`
- Holds the app's configuration: environment, port, and defaults for vector dim.

**Why:** Centralising config means we read `.env` once and use `config.port` in
`src/index.ts` instead of scattering `process.env.PORT` everywhere.

## 4. How to Use It

In any other file:

```typescript
import { Vector, SentenceEmbedding, Neighbor } from "../types/index.js";

const myVec: Vector = { dim: 8, values: [0.1, -0.2, 0.3, 0.4, -0.5, 0.6, -0.7, 0.8] };
const sentence: SentenceEmbedding = {
  id: 1,
  text: "the quick brown fox jumps",
  embedding: myVec,
  label: "paraphrase"
};
```
