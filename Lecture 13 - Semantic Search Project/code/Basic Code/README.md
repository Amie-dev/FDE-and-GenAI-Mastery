# Basic Code — Semantic Search & Movie Recommendation (Lecture 13)

Basic, minimal TypeScript + Express implementation of the Lecture 13 notes:

- **Semantic search** — find movies whose meaning is closest to a query text
- **Movie recommendation** — find movies similar to a given movie

It follows the universal embedding pattern from the notes:

```text
REPRESENT  → text → vector (EmbeddingService)
STORE      → save vectors (VectorStoreService)
COMPARE    → cosine similarity (RecommendationService)
RANK       → sort scores, return top N
```

## Run it

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/health` — health check
- `http://localhost:3000/catalog` — list all movies with their vectors
- `http://localhost:3000/search?query=space survival story` — semantic search
- `http://localhost:3000/similar?movieId=1` — similar movies to movie id 1

## Folders

```text
src/
  config/        # env configuration
  types/         # TypeScript types (Movie)
  services/      # EmbeddingService · VectorStoreService · RecommendationService
  controllers/   # HTTP handlers
  routes/        # Express routes
  index.ts       # server entry point
implementations guide/   # chapter-by-chapter guide to every file
```

> No generative LLM is used in this basic demo. Recommendation comes from pure vector math, as the notes explain.