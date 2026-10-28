# Chapter 02 — Data Model & Configuration

This chapter wires the two pieces that make the rest of the project type-safe:

1. **A shared data model** (`src/types/movie.types.ts`) — the `Movie` shape, plus the
   `ScoredMovie` result type produced by the COMPARE + RANK step.
2. **Environment configuration** (`src/config/env.config.ts`) — a single typed
   `envConfig` object that reads `PORT` from `.env`.

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/types/movie.types.ts` | Shared TypeScript types: `Movie`, `MovieMetadata`, `ScoredMovie`. |
| `src/config/env.config.ts` | Reads `.env` into a typed `envConfig` singleton. |

The `.env`, `tsconfig.json`, `package.json` and `.gitignore` are covered in
**Chapter 01**.

## Full code

### `src/types/movie.types.ts`

```ts
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
```

### `src/config/env.config.ts`

```ts
/**
 * Environment configuration for the server.
 *
 * Loads values from .env (loaded automatically by Node's env module in
 * later steps; here we read them manually for a zero-dependency start).
 *
 * In production you would keep secrets out of code and use a real dotenv
 * loader.  For this basic demo there is only one value: the port.
 */

export interface EnvConfig {
  port: number;
  // In a real run these would point at an embedding provider.
  // The basic demo seeds vectors, so these are off by default.
  // embeddingBaseUrl: string;
  // embeddingModel: string;
}

function readEnv(key: string, fallback: string): string {
  const value = process.env[key] ?? process.env[key.toUpperCase()] ?? fallback;
  return value;
}

export const envConfig: EnvConfig = {
  port: Number(readEnv("PORT", "3000")) || 3000,
  // embeddingBaseUrl: readEnv("EMBEDDING_BASE_URL", ""),
  // embeddingModel: readEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
};
```

## Block-by-block

*`MovieMetadata` / `Movie`* — `vector` and `metadata` are **optional** on the
type. They are populated by the pipeline (`VectorStoreService`) and are never
part of what a user types, so the type tolerates a movie that has not yet been
embedded. `metadata` is a plain bag (`genres`, `year`, `rating`) — easy to
extend with filters later.

*`ScoredMovie`* — the unit of every COMPARE output: a `Movie` paired with a
`score` from `cosineSimilarity`. Both features (semantic search and similar
movies) return arrays of these.

*`EnvConfig`* — `readEnv()` is case-insensitive on the key (`PORT` vs `port`).
`Number(...) || 3000` guards against a non-numeric `PORT` (e.g. empty string),
which would otherwise produce `NaN` and crash `app.listen`. With the provider
fields commented out, `envConfig` carries only `port` — and `embedding.service.ts`
imports `envConfig` but references it **only inside comments**, so the demo
type-checks and boots with zero external configuration.

## Production replacement
> Uncomment the `embeddingBaseUrl` / `embeddingModel` lines in
> `src/config/env.config.ts`, then uncomment + complete the production body of
> `embedText()` in Chapter 03. The `readEnv()` helper and the `|| 3000` port guard
> already make `Number(envConfig.port)` safe for `app.listen`, which is all the
> demo needs right now.

## Tip
> The `feature` tag that appears in `/search` and `/similar` responses is an
> inline string literal on the controller (see Chapter 06), **not** a shared
> response interface here. Keeping the types lean lets the controller evolve the
> exact JSON shape without touching the shared model — a deliberate split
> between "data model" and "wire format".
