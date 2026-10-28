# Chapter 07 — Server & Run (COMPARE → RANK → serve)

This is the entry point that boots Express, mounts the router from Chapter 06,
and prints the banner you actually see when the server starts. It is tiny
because every responsibility lives elsewhere (config in Ch 02, types in Ch 02,
embedding in Ch 03, store in Ch 04, logic in Ch 05, wiring in Ch 06).

## Files in this chapter
| File | Purpose |
|------|---------|
| `src/index.ts` | Server entry point: builds `app`, mounts `createRouter()`, listens, prints the endpoint banner. |

## Full code

### `src/index.ts`

```ts
/**
 * Server entry point for the Lecture 13 semantic search project.
 *
 * This file:
 *   1. Reads the port from config (envConfig).
 *   2. Builds the dependency chain (see routes/search.routes.ts for the
 *      wiring order).
 *   3. Starts the Express server and prints the available endpoints.
 *
 * Run with:  npm run dev     (uses tsx for fast TS execution)
 * Build with: npm run build  (uses tsc)
 * Start with: npm start
 */

import express, { Express } from "express";
import { createRouter } from "./routes/search.routes.js";
import { envConfig } from "./config/env.config.js";

const app: Express = express();
const port = envConfig.port;

// Only JSON body parsing (semantic search sends its question as a query
// string, so no body parsing is needed, but this keeps the project ready
// for future POST endpoints).
app.use(express.json());

// All application routes are attached through the router factory.
app.use("/", createRouter());

app.listen(port, () => {
  console.log(`\n  Lecture 13 — Semantic Search & Movie Recommendation`);
  console.log(`  🔌 Listening on http://localhost:${port}\n`);

  console.log("  Endpoints:");
  console.log("    GET  /health              health check");
  console.log("    GET  /catalog             list all movies");
  console.log("    GET  /search?query=...    semantic search");
  console.log("    GET  /similar?movieId=... similar movies");
  console.log("    GET  /status              pipeline status\n");

  console.log(
    "  Example:\n    curl 'http://localhost:3000/search?query=space survival story'",
  );
  console.log(
    "    curl 'http://localhost:3000/similar?movieId=1'\n",
  );
});
```

## Block-by-block

*`import express, { Express } from "express"`* — the named `Express` type lets us
declare `const app: Express`, which is what gives you autocomplete on `app.use` /
`app.listen`. The router is imported **by name**: `createRouter` (not
`createSearchRouter`) — this is the single import Ch 07 of the notes wires.

*`app.use(express.json())`* — JSON body parser. The Basic Code's routes are all
`GET`, so no body is parsed today, but this line keeps the server ready for
POST endpoints when you add them.

*`app.use("/", createRouter())`* — `createRouter()` is called **once** at startup
(inside it, the whole dependency chain is built; see Ch 06). Mounting it at `/`
is the only line that connects the server to the routes.

*`app.listen` + banner* — the banner is the one the runtime actually prints
(`console.log` per line). Two things matter:

- The banner lists **all five** endpoints the README documents (`/health`,
  `/catalog`, `/search`, `/similar`, `/status`) even though only `/search` and
  `/similar` do search work — `/catalog` and `/status` are the debugging
  shortcuts added in Ch 06.
- The last two `console.log` lines are a **ready-to-copy** curl example for each
  search feature, so the banner doubles as the "how do I try it?" hint.

## How to run

```bash
cd "code/Basic Code"
npm install          # one-time
npm run dev           # tsx — fast TypeScript execution, starts on http://localhost:3000
# npm run build && npm start   # production-style: compile then node
```

The server is ready the moment you see the banner; reproduce the proof below:
`curl` against `/search` and `/similar` to prove the full REPRESENT → STORE →
COMPARE → RANK → serve loop end to end.

## Expected results (live-captured)

Every response below was captured against the *real, running* server
(`npm run dev`). Because the seed vectors are deterministic, your own run
reproduces these scores **exactly**. Each movie's 8-dim `vector` is present on
every response but is elided here for brevity.

### `GET /health`
```json
{ "status": "ok", "service": "lecture-13-semantic-search" }
```

### `GET /status`
```json
{
  "embeddingCacheSize": 6,
  "catalogCount": 5,
  "features": ["semantic_search", "similar_movies", "catalog"]
}
```
`embeddingCacheSize` is **6** because the store embedded 5 seed descriptions plus
the one search query ("space survival story") — that is `getEmbeddingCacheSize()`
reporting the live cache.

### `GET /search?query=space+survival+story`
```json
{
  "feature": "semantic_search",
  "query": "space survival story",
  "topN": 5,
  "count": 5,
  "results": [
    { "movie": { "id": "4", "title": "Arrival" }, "score": 1.088 },
    { "movie": { "id": "2", "title": "The Martian" }, "score": 0.9721 },
    { "movie": { "id": "5", "title": "Titanic" }, "score": 0.6697 },
    { "movie": { "id": "1", "title": "Interstellar" }, "score": -0.8265 },
    { "movie": { "id": "3", "title": "Gravity" }, "score": -1.0879 }
  ]
}
```
`count` is **5** because `topN=5` and the catalog has exactly 5 movies. The
`feature` discriminator is the **inline string literal** `"semantic_search"`
defined on the controller — there is no shared `SearchResponse` interface typing
it (see Chapter 02). Arrival wins only because the seed hash happens to correlate
with those words; swap in a real provider and the ranking turns truly semantic.

### `GET /similar?movieId=1`
```json
{
  "feature": "similar_movies",
  "movieId": "1",
  "topN": 5,
  "count": 4,
  "results": [
    { "movie": { "id": "4", "title": "Arrival" }, "score": 1.7172 },
    { "movie": { "id": "5", "title": "Titanic" }, "score": -0.3248 },
    { "movie": { "id": "3", "title": "Gravity" }, "score": -1.1681 },
    { "movie": { "id": "2", "title": "The Martian" }, "score": -1.6212 }
  ]
}
```
`count` is **4** — `similarTo()` filters the source movie (`id:"1"`,
"Interstellar") out of its own results, so a 5-movie catalog yields 4.

### `GET /catalog`
```json
{ "count": 5, "movies": [/* 5 movies, each WITH its 8-dim `vector` */] }
```
This is the endpoint the README flags as returning vectors. In the real
response each movie carries its full `vector` array — and because the controller
returns the **whole** `Movie` from the store, `/search` and `/similar` attach
that same vector to every result movie too.
