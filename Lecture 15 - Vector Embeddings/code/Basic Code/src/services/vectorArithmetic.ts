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

// Import getSentences from embeddings.ts
import { getSentences } from "./embeddings.js";
