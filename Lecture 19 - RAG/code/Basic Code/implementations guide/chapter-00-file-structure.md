# Chapter 00 — File Structure

**Goal:** See every file in the `Basic Code` folder and know what each one does before reading any single file.

## Order to read

Read the files in this order:

1. `.env` — environment variables (secrets + tuning)
2. `package.json` — dependencies + npm scripts
3. `tsconfig.json` — TypeScript compiler settings
4. `src/types.ts` — shared TypeScript shapes used by every file
5. `src/config/config.ts` — one place that reads `.env`
6. `src/services/embedding.ts` — text → vector (Chapter 04 contract)
7. `src/services/ingestion.ts` — document → chunks → vectors (Chapters 03, 05)
8. `src/services/retrieval.ts` - question → relevant chunks (Chapters 04, 05)
9. `src/services/generation.ts` — chunks + question → grounded answer (Chapter 06)
10. `src/services/memory.ts` — per-session chat history (Chapter 07)
11. `src/controllers/rag.controller.ts` — HTTP handlers for `/ingest` and `/query`
12. `src/router/index.ts` — Express routes
13. `src/index.ts` — starts the Express server

## Folder tree

```
code/Basic Code/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config/
    │   └── config.ts
    ├── controllers/
    │   └── rag.controller.ts
    ├── router/
    │   └── index.ts
    ├── services/
    │   ├── embedding.ts
    │   ├── ingestion.ts
    │   ├── retrieval.ts
    │   ├── generation.ts
    │   └── memory.ts
    └── types.ts
```

## What each folder means

| Folder | Purpose |
|--------|---------|
| `config/` | Reads `.env` once and exports a single `config` object. No other file reads `process.env` directly. |
| `controllers/` | HTTP request handlers. Parse `req.body`, call one service, return JSON. No business logic. |
| `router/` | Mounts controllers on Express routes. |
| `services/` | Pure logic: embedding, ingestion, retrieval, generation, memory. Each does one thing. |
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
```

## What this code does (one sentence)

A minimum Express + TypeScript RAG server. You `POST /api/ingest` to add a document, then `POST /api/query` to ask a grounded question. The model answers only from retrieved chunks, cites them with `[n]`, and refuses when the answer is not in the documents.