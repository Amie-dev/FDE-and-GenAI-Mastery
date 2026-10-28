/**
 * Lecture 14 — Vector Search and Storage
 * Basic code: the record model mentioned in the notes.
 *
 * A vector record is the minimum viable unit of a vector database:
 *   ID + Vector + Metadata
 * (see notes/03_Anatomy_of_a_Vector_Database.md)
 */

export interface VectorRecord {
  /** Stable, deterministic identifier (maps result back to the real entity). */
  id: string;
  /** The numeric embedding used for similarity search. */
  embedding: number[];
  /** Structured attributes for filtering, display, authorization (optional). */
  metadata?: Record<string, unknown>;
}

/** Result of a KNN search: one stored vector with its similarity score. */
export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}