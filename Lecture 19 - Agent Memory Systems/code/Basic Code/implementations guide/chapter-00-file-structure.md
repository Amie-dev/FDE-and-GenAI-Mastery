# Chapter 00 — File Structure

**Goal:** See every file in the `Basic Code` folder and know what each one does before reading any single file.

## Order to read

Read the files in this order:

1. `.env` — environment variables (port, window sizes, budgets)
2. `package.json` — dependencies + npm scripts
3. `tsconfig.json` — TypeScript compiler settings
4. `src/types.ts` — shared TypeScript shapes used by every file
5. `src/config/config.ts` — one place that reads `.env`
6. `src/services/stm.ts` — Short-Term Memory, sliding window (Chapter 2)
7. `src/services/ltm.ts` — Long-Term Memory store + search + scoring (Chapters 3, 4, 5)
8. `src/services/extraction.ts` — fact extraction from chat (Chapter 3)
9. `src/services/context.ts` — assemble STM + LTM + query within budget (Chapter 4)
10. `src/services/dream.ts` — background reflection / dreaming (Chapter 6)
11. `src/controllers/memory.controller.ts` — HTTP handlers for `/chat`, `/dream`, `/health`
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
    │   └── memory.controller.ts
    ├── router/
    │   └── index.ts
    └── services/
        ├── context.ts
        ├── dream.ts
        ├── extraction.ts
        ├── ltm.ts
        └── stm.ts
```

## What each folder means

| Folder | Purpose |
|--------|---------|
| `config/` | Reads `.env` once and exports a single `config` object. No other file reads `process.env` directly. |
| `controllers/` | HTTP request handlers. Parse `req.body`, call services, return JSON. No business logic. |
| `router/` | Mounts controllers on Express routes. |
| `services/` | Pure logic: STM sliding window, LTM store/search/scoring, fact extraction, context assembly, dreaming. Each does one thing. |
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

A minimum Express + TypeScript agent memory server. `POST /api/chat` stores the user turn, retrieves recent STM (sliding window) and relevant LTM facts, assembles them inside a token budget, replies, and extracts new facts into long-term memory. `POST /api/dream` runs background reflection to remove duplicates and low-value memories.
