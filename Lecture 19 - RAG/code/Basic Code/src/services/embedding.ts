import OpenAI from "openai";
import { config } from "../config/config";

/**
 * Embedding service — Chapter 04 contract.
 *
 * One model, one dimension, identical preprocessing at ingestion AND at query
 * time. This file is the single place that turns text into a vector, so the
 * query path can never accidentally use a different space than the index.
 *
 * When OPENAI_API_KEY is missing (learning / offline mode) it falls back to a
 * deterministic pseudo-vector so the code still runs end to end without a key.
 */

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

/** Stable pseudo-vector used when no OpenAI key is configured. */
function mockVector(text: string, dims: number): number[] {
  const out: number[] = new Array(dims).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash) || 1;
  for (let i = 0; i < dims; i++) {
    out[i] = Math.sin(seed * (i + 1)) * 0.5 + 0.5;
  }
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0));
  return out.map((v) => v / norm);
}

/** Embed one piece of text. Same function is called by ingestion and retrieval. */
export async function embedText(text: string): Promise<number[]> {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!config.openaiApiKey) {
    return mockVector(clean, config.embeddingDims);
  }
  const res = await getClient().embeddings.create({
    model: config.embeddingModel,
    dimensions: config.embeddingDims,
    input: clean,
  });
  const vector = res.data[0].embedding;
  if (vector.length !== config.embeddingDims) {
    throw new Error(
      `Embedding dimension mismatch: got ${vector.length}, expected ${config.embeddingDims}`,
    );
  }
  return vector;
}

/** Embed many texts, preserving order (used by ingestion batching). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
  }
  return out;
}