# Chapter 0 — Project Structure & Overview

## 1. File Structure

This project is a minimal **Express + TypeScript** web server that turns sentences into numeric vectors and demonstrates vector similarity. The folder layout matches the `code/Basic Code` specification:

```text
code/Basic Code/
├── .env                      # Environment variables (port, dim, max sentences)
├── package.json              # Project metadata, scripts, dependencies
├── tsconfig.json             # TypeScript compiler configuration
├── node_modules/             # Installed dependencies (npm install)
├── dist/                     # Compiled JavaScript (npm run build)
├── src/                      # TypeScript source code
│   ├── config/               # Configuration loader (env → typed config)
│   │   └── config.ts         # Loads .env, exports AppConfig
│   ├── controllers/          # Route handlers (thin, no business logic)
│   │   ├── sentenceController.ts
│   │   ├── similarityController.ts
│   │   └── neighborController.ts
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.ts   # Centralised error handling
│   ├── routes/               # Express route definitions
│   │   └── index.ts          # Mounts all /api/* routes
│   ├── services/             # Business logic & vector math
│   │   ├── vectorEngine.ts   # Four similarity measures (Ch 3)
│   │   ├── embeddings.ts     # Sentence → vector conversion (Ch 5 corpus)
│   │   └── vectorArithmetic.ts  # king - man + woman ≈ queen (Ch 5)
│   ├── types/                # Shared TypeScript interfaces
│   │   └── index.ts
│   └── index.ts              # App entry point (wires everything, starts server)
└── implementations guide/    # This folder — chapter-wise guides
```

## 2. Chapter Map (Short)

| Chapter | Topic | Files | Key Route |
|---------|-------|-------|-----------|
| 0 – Overview | File structure, setup | `package.json`, `tsconfig.json`, `.env` | — |
| 1 – Ch0 (setup) | Environment & build | `.env`, `tsconfig.json` | — |
| 2 – Ch1 (Types) | Shared interfaces | `src/types/index.ts` | — |
| 3 – Ch2 (Config) | Config loader | `src/config/config.ts` | — |
| 4 – Ch3 (Vector Math) | 4 similarity measures | `src/services/vectorEngine.ts` | `/api/similarity` |
| 5 – Ch4 (Corpus) | Sentences → vectors | `src/services/embeddings.ts` | `/api/sentences` |
| 6 – Ch5 (Nearest Neighbors) | Top-N search | `src/services/vectorEngine.ts` + `neighborController.ts` | `/api/neighbors` |
| 7 – Ch6 (Vector Arithmetic) | king - man + woman ≈ queen | `src/services/vectorArithmetic.ts` | `/api/vector-arithmetic` |
| 8 – Ch7 (Integration) | Routes + entry point | `src/routes/index.ts`, `src/index.ts` | `/api/*` |

## 3. Commands

```bash
npm install        # Install runtime + dev dependencies
npm run dev        # Run with tsx (typeScript executor, no build step)
npm run build      # Compile TypeScript to JavaScript in ./dist
npm start          # Run the compiled server (node dist/index.js)
```

## 4. How the App Works (End-to-End)

1. **Client** sends a `GET /api/neighbors?text=…&top=3` request.
2. **Express router** (`src/routes/index.ts`) matches the route and calls
   `neighborController.getNeighbors`.
3. **Controller** (`src/controllers/neighborController.ts`) validates `text` and `top`,
   then asks the service layer.
4. **Service** (`src/services/vectorEngine.ts` → `findNearestNeighbors`) computes
   cosine similarity between the query sentence's vector and every sentence in the corpus.
5. **Service** (`src/services/embeddings.ts`) generates the query vector on-the-fly
   using a deterministic hash (same sentence → same vector).
6. **Result** is returned as JSON: `{ query, topN, neighbours: [{ id, text, similarity, distance }] }`.

## 5. Design Principles

- **Keep routes thin.** Routes only map HTTP → controller. All logic lives in `services/`.
- **Use TypeScript interfaces** (`types/`) so every file shares the same shape.
- **Test with curl.** Start the server and hit endpoints:
  ```bash
  curl http://localhost:4000/api/health
  curl "http://localhost:4000/api/neighbors?text=fox%20jumps&top=3"
  curl http://localhost:4000/api/similarity/chart
  ```
