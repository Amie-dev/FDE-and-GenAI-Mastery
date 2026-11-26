/**
 * Shared TypeScript types for the Lecture 13 semantic search project.
 *
 * A "Movie" has both user-facing fields (id, title, description) and
 * internal fields used only by the embedding pipeline (vector, metadata).
 *
 * - id          : stable identifier (used in URLs and responses)
 * - title       : display name shown to the user
 * - description : plot summary used to produce the embedding
 * - vector      : precomputed embedding (numbers). Internal only.
 * - metadata    : extra fields used for filtering / display (genres, year, rating)
 *
 * These fields mirror the "Complete Data Model" from Lecture 13 notes
 * Chapter 07 (07_complete_system_design.md).
 */

export interface MovieMetadata {
  genres: string[];
  year: number;
  rating: number;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  vector?: number[];
  metadata?: MovieMetadata;
}

/** A result returned after COMPARE + RANK: a movie with its similarity score. */
export interface ScoredMovie {
  movie: Movie;
  score: number;
}
