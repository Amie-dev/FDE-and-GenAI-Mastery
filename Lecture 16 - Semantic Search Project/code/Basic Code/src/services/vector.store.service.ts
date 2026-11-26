/**
 * VectorStoreService — the "STORE" step of the embedding pipeline.
 *
 * Lecture 13 notes (Chapter 03): "Save vectors for reuse"
 * (precomputation).  A movie description is embedded ONCE when the
 * catalog is built, then stored for every future query.
 *
 * This demo keeps everything in memory (an array of `Movie`), which is
 * fine for a small catalog.  The notes (Chapter 07) explain that in
 * production you would swap this array for a vector database such as
 * Qdrant / Pinecone / pgvector, or a search engine like Elasticsearch.
 */

import { Movie } from "../types/movie.types.js";
import { EmbeddingService } from "./embedding.service.js";

/**
 * A plain catalog of movies used for the demo.
 * In a real app this would be loaded from a database or a JSON file.
 */
const SEED_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Interstellar",
    description:
      "A team of astronauts travels through a wormhole in search of a new home for humanity.",
    metadata: { genres: ["Sci-Fi", "Adventure"], year: 2014, rating: 8.7 },
  },
  {
    id: "2",
    title: "The Martian",
    description:
      "An astronaut is stranded on Mars and must somehow survive until the next mission arrives.",
    metadata: { genres: ["Sci-Fi", "Adventure", "Thriller"], year: 2015, rating: 8.1 },
  },
  {
    id: "3",
    title: "Gravity",
    description:
      "Two astronauts survive after a debris field damages their spacecraft and they are stranded in space.",
    metadata: { genres: ["Sci-Fi", "Thriller"], year: 2013, rating: 7.7 },
  },
  {
    id: "4",
    title: "Arrival",
    description:
      "A linguist works with military agents to communicate with alien visitors who have arrived on Earth.",
    metadata: { genres: ["Sci-Fi", "Drama"], year: 2016, rating: 7.9 },
  },
  {
    id: "5",
    title: "Titanic",
    description:
      "A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the doomed Titanic.",
    metadata: { genres: ["Romance", "Drama"], year: 1997, rating: 7.9 },
  },
];

/**
 * VectorStoreService holds the catalog and a small in-memory index.
 * It is deliberately simple so the learning path is clear:
 *
 *  - `addMovies()`    : STORE — precompute every vector once, then save
 *  - `getMovie()`     : fetch one movie by id
 *  - `getAll()`       : list the whole cached catalog
 *  - `clear()`        : reset the catalog (useful for tests / restarts)
 *
 * Notice the precomputation pattern from Chapter 03: the embedding model
 * is called once per movie, and the resulting vector is *stored* for
 * reuse.  Every later request reuses the stored vector instead of
 * re-embedding the same description.
 *
 * The EmbeddingService is injected here so the store is only responsible
 * for storage — not for the actual embedding call.
 */
export class VectorStoreService {
  private movies: Movie[] = [];

  constructor(
    private readonly embeddingService: EmbeddingService,
    movies: Movie[] = SEED_MOVIES,
  ) {
    // STORE: embed each description once, then save into the store.
    this.addMovies(movies);
  }

  /** STORE: precompute every movie's vector (called once per movie). */
  addMovies(movies: Movie[]): void {
    for (const movie of movies) {
      if (movie.vector) {
        // Already embedded — reuse the stored vector (precomputation).
        this.movies.push({ ...movie });
        continue;
      }

      const vector = this.embeddingService.embedText(movie.description);
      this.movies.push({ ...movie, vector });
    }
  }

  getMovie(id: string): Movie | undefined {
    return this.movies.find((m) => m.id === id);
  }

  getAll(): Movie[] {
    return this.movies;
  }

  clear(): void {
    this.movies = [];
  }

  count(): number {
    return this.movies.length;
  }

  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }
}
