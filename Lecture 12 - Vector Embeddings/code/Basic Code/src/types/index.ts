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
