# Chapter 04 — Vector Store (STORE)

The **STORE** step persists embeddings so they are computed once and reused.
In this demo the "store" is a plain in-memory array of `Movie` objects (each
carrying its own precomputed `vector`), which keeps the project zero-dependency.
The notes (Chapter 07) describe swapping this array for a real vector DB
(Qdrant / Pinecone / pgvector / Elasticsearch) later.

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/services/vector.store.service.ts` | `VectorStoreService` — seeded catalog + precompute-on-init + lookups. |

## Full code

### `src/services/vector.store.service.ts`

```ts
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
```

## Block-by-block

*`import { EmbeddingService }`* — note there is **no** `L2normalize` import here.
The store calls `embedText()` to produce a vector and stores it **raw**; it does
not run the class's `normalize()` method. (See Chapter 03: calling
`this.embeddingService.normalize(vector)` before pushing would turn the
store's dot-product scores into true cosine scores — the recommended one-line
upgrade.)

*`SEED_MOVIES`* — the 5-row catalog (Interstellar, The Martian, Gravity,
Arrival, Titanic). Each entry omits `vector`; it is filled in during
construction.

**Constructor** — precomputation happens **once at startup**: `new VectorStoreService(embeddingService)`
runs `addMovies()` immediately, embedding every seed description and caching the
result on each movie. Every subsequent query reuses those stored vectors.

*`addMovies()`* — stores **copies** (`{ ...movie }` / `{ ...movie, vector }`) so
the seed data can never be mutated by a downstream read. The `if (movie.vector)`
guard implements the "already embedded → reuse" short-circuit (precompute once).

*`getAll()`* — returns the raw array, **including each movie's `vector`**. The
`/catalog` route uses this, so `GET /catalog` lists movies **with their vectors**
as the README states.

*`clear()` / `count()`* — support helpers (`clear` keeps restarts clean; `count`
backs `/status.catalogCount`).

*`getEmbeddingService()`* — the bridge `RecommendationService` uses to embed a
**new** query text (the query is not in the store, so it is embedded on demand).

## Tip
> The constructor's default `movies = SEED_MOVIES` means `new VectorStoreService(embeddingService)`
> needs no second argument. Pass your own array to `addMovies()` to load a real
> catalog — the precomputation logic is identical.
