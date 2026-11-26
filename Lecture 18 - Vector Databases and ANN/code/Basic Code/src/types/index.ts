/**
 * Chapter 01 — Five Layers: Record model
 * A vector record = id + vector + payload (metadata)
 */
export interface VectorRecord {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

/**
 * Search result returned by similarity search
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Filter applied during search (metadata filter — Chapter 01 Layer 5)
 */
export interface VectorFilter {
  [key: string]: unknown;
}