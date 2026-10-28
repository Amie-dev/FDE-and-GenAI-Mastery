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
