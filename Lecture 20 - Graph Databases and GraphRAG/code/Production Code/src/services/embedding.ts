import { config } from "../config/config";

/** Deterministic embeddings for GraphRAG (Chapter 06). */
export async function embed(text: string): Promise<number[]> {
  // For production use real LLM embeddings; this deterministic placeholder is safe for development.
  // Example: OpenAI API call or local embedding model.
  if (process.env.OPENAI_API_KEY) {
    // Real embedding call (pseudo code)
    // const response = await fetch("https://api.openai.com/v1/embeddings", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,\
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     model: process.env.OPENAI_MODEL,
    //     input: text,
    //   }),
    // });
    // const data = await response.json();
    // return data.data[0].embedding;
  }

  // Deterministic fallback using hash
  const hash = simpleHash(text);
  const dim = 1536;
  const embedding = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    embedding[i] = hashChar(text, i);
  }

  // Normalise vector to unit length (cosine similarity)
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding.map(() => Math.random() - 0.5);
  return embedding.map((val) => val / magnitude);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function hashChar(str: string, index: number): number {
  const seed = simpleHash(str);
  return Math.sin(seed + index) * 0.1; // Pseudo-random small values
}