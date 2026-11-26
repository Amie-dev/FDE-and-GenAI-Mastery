# Chapter 00 — File Structure

**Goal:** See every file in the `Basic Code` folder and know what each one does before reading any single file.

## Order to read

Read the files in this order:

1. `.env` — environment variables (Neo4j URI, user, password, vector index)
2. `package.json` — dependencies + npm scripts
3. `tsconfig.json` — TypeScript compiler settings
4. `src/types.ts` — shared TypeScript shapes used by every file
5. `src/config/config.ts` — one place that reads `.env`
6. `src/db/driver.ts` — singleton Neo4j driver + graceful shutdown
7. `src/db/schema.cypher` — DDL: constraints, indexes, vector indexes
8. `src/db/seed.cypher` — sample users, sessions, docs, embeddings
9. `src/services/cypher.ts` — typed Cypher query library
10. `src/services/embedding.ts` — deterministic embedding (no API key needed)
11. `src/services/graphrag.ts` — hybrid vector + graph retrieval service
12. `src/services/memory.ts` — agent memory helpers (STM, LTM)
13. `src/routes/index.ts` — Express routes
14. `src/app.ts` — Express bootstrap
15. `src/index.ts` — starts the HTTP server
16. `src/scripts/bootstrap.ts` — runs schema + seed against Neo4j

## Folder tree

```text
code/Basic Code/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── app.ts
    ├── index.ts
    ├── types.ts
    ├── config/
    │   └── config.ts
    ├── db/
    │   ├── driver.ts
    │   ├── schema.cypher
    │   └── seed.cypher
    ├── routes/
    │   └── index.ts
    ├── services/
    │   ├── cypher.ts
    │   ├── embedding.ts
    │   ├── graphrag.ts
    │   └── memory.ts
    └── scripts/
        └── bootstrap.ts
```

## What each folder means

| Folder | Purpose |
|--------|---------|
| `config/` | Reads `.env` once and exports a single `config` object. No other file reads `process.env` directly. |
| `db/` | Neo4j driver singleton + Cypher DDL/seed files. |
| `services/` | Pure logic: Cypher queries, embeddings, GraphRAG pipeline, agent memory. Each does one thing. |
| `routes/` | HTTP handlers for `/rag` and `/memory`. |
| `scripts/` | One-off bootstrap script to run schema + seed. |
| `types.ts` | Shared TypeScript interfaces so every file agrees on data shapes. |

## Commands to run

```bash
# Install dependencies (once)
npm install

# Type-check without emitting
npm run typecheck

# Start dev server with auto-reload
npm run dev

# Build to dist/
npm run build

# Run the built code
npm start

# Run schema + seed against Neo4j
npm run bootstrap
```

## What this code does (one sentence)

A minimum Express + TypeScript GraphRAG service. It exposes `/rag` (vector search → graph hop → fuse → LLM prompt) and `/memory` (STM sliding window) endpoints, backed by a singleton Neo4j driver and a typed Cypher library.