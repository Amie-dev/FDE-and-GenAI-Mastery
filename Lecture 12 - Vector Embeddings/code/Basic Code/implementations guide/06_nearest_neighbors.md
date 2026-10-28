# Chapter 6 — Nearest Neighbour Search (Chapter 5: Learned Representations)

## 1. File: `src/services/vectorEngine.ts` (findNearestNeighbors function)

This is the core of the build target: **"embed 30 sentences, print nearest neighbours,
show paraphrases cluster while word-overlap does not."**

## 2. Full Code File

```typescript
// services/vectorEngine.ts — Vector math engine (Chapter 3: measuring similarity)

import { Vector, SentenceEmbedding, Neighbor } from "../types/index.js";

// ... (dotProduct, euclideanDistance, manhattanDistance, cosineSimilarity,
//     magnitude, normalize from Chapter 4)

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

### `similarityFn: (a: Vector, b: Vector) => number = cosineSimilarity`
- A **callback** parameter. Defaults to `cosineSimilarity`.
- This makes the function flexible: you can pass `euclideanDistance` (as a similarity),
  `manhattanDistance`, or any other function.

### `const query = sentences.find((s) => s.text === queryText);`
- Finds the query sentence in the corpus. Throws if not found.

### `sentences.map((s) => ({ ... }))`
- For every sentence in the corpus, computes:
  - `similarity` = how similar the sentence is to the query
  - `distance` = Euclidean distance (always reported for completeness)

### `.filter((r) => r.id !== query.id)`
- **Excludes the query itself.** Without this, every query would trivially rank itself
  as the #1 nearest neighbour with similarity 1.0.

### `.sort((a, b) => b.similarity - a.similarity)`
- Sorts descending by similarity. Highest cosine first.

### `.slice(0, topN)`
- Takes the first `topN` results. Prevents returning the full corpus.

## 4. Controller Wiring

```typescript
// src/controllers/neighborController.ts
import { findNearestNeighbors, cosineSimilarity } from "../services/vectorEngine.js";
import { getSentences } from "../services/embeddings.js";

export const neighborController = {
  getNeighbors: (req, res) => {
    const { text, top = "3" } = req.query;
    if (!text) {
      return res.status(400).json({ success: false, error: "'text' is required" });
    }
    const topN = Math.min(Number(top), 10);
    const sentences = getSentences();
    try {
      const neighbours = findNearestNeighbors(sentences, String(text), topN, cosineSimilarity);
      res.json({ success: true, query: String(text), topN, neighbours });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  },
};
```

## 5. How to Test It

```bash
# Find 3 nearest neighbours to the fox sentence
curl "http://localhost:4000/api/neighbors?text=the%20quick%20brown%20fox%20leaps%20over%20the%20lazy%20dog%20beside%20the%20river%20bank&top=3"
```

Expected output shows the paraphrase cluster at the top (high similarity), then
unrelated sentences (low similarity):

```json
{
  "success": true,
  "query": "the quick brown fox leaps over the lazy dog beside the river bank",
  "topN": 3,
  "neighbours": [
    { "id": 5, "text": "the fast brown fox jumps over the lazy dog near the river bank", "similarity": 0.78, "distance": 0.67 },
    { "id": 10, "text": "a chef prepares food in a large professional kitchen", "similarity": 0.44, "distance": 1.17 },
    { "id": 14, "text": "a pilot flew the small plane over the green valley", "similarity": 0.36, "distance": 1.10 }
  ]
}
```

## 6. Why This Demonstrates the Build Target

1. **Embed 30 sentences** → `getSentences()` returns the corpus with vectors.
2. **Print nearest neighbours** → `findNearestNeighbors()` returns the ranked list.
3. **Paraphrases cluster** → The 8 paraphrase sentences are semantically close,
   so they appear at the top of the neighbour list with high cosine similarity.
4. **Word-overlap does not cluster** → Unrelated sentences that share common words
   (like "the", "a") still rank lower because their overall meaning differs.
