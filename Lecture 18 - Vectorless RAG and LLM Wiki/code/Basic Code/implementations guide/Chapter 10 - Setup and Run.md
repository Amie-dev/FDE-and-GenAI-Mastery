# Chapter 10 — Setup and Run

> Purpose: Step-by-step instructions to install dependencies, build, and run the application. Also lists the API endpoints you can test.

## Step 1 — Install Dependencies

```bash
cd "/home/aminul/development/learn/GEN AI/FDE-and-GenAI-Mastery/Lecture 18 - Vectorless RAG and LLM Wiki/code/Basic Code"
npm install
```

This installs: `express`, `dotenv`, `@types/express`, `@types/node`, `ts-node`, `typescript`.

## Step 2 — Configure Environment

Edit the `.env` file if needed:

```
PORT=3000
NODE_ENV=development
MAX_TREE_DEPTH=3
LLM_MODEL=gpt-4o-mini
```

## Step 3 — Build TypeScript

```bash
npx tsc
```

This compiles all `.ts` files in `src/` to JavaScript in `dist/`.

## Step 4 — Start the Server

```bash
node dist/app.js
```

Or for development with auto-reload:

```bash
npx ts-node src/app.ts
```

You should see: `Server running on http://localhost:3000 (development)`

## Step 5 — Test the API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Build Tree Index (Vectorless RAG)
```bash
curl -X POST http://localhost:3000/api/tree/build \
  -H "Content-Type: application/json" \
  -d '{"documentPath": "./demo-document.md"}'
```

### Agentic Tree Search
```bash
curl -X POST http://localhost:3000/api/tree/search \
  -H "Content-Type: application/json" \
  -d '{"query": "sticky sessions ALB failure"}'
```

### Ingest a File into Wiki
```bash
curl -X POST http://localhost:3000/api/wiki/ingest \
  -H "Content-Type: application/json" \
  -d '{"sourcePath": "./some-document.txt"}'
```

### View Wiki Catalog (Pass 1 metadata)
```bash
curl http://localhost:3000/api/wiki/catalog
```

### Two-Pass Retrieval Search
```bash
curl -X POST http://localhost:3000/api/wiki/search \
  -H "Content-Type: application/json" \
  -d '{"query": "load balancing session failover"}'
```

## Summary of Features Implemented

| Feature | Notes Chapter | Files |
|---------|--------------|-------|
| Hierarchical tree indexing | Chapter 02 | `src/services/treeIndexingService.ts` |
| Agentic tree search | Chapter 03 | `src/services/agenticTreeSearchService.ts` |
| LLM Wiki vault + catalog | Chapter 04 | `src/services/wikiService.ts` |
| Two-pass retrieval | Chapter 05 | `src/services/twoPassRetrievalService.ts` |
| Express API controllers | All chapters | `src/controllers/treeController.ts`, `src/controllers/wikiController.ts` |
| Express routes | All chapters | `src/routes/index.ts` |
| App entry point | All chapters | `src/app.ts` |
| Configuration | All chapters | `src/config/config.ts` |
| TypeScript types | All chapters | `src/types/index.ts` |

## Related Note Features

This implementation covers all four core architectures from **Lecture 18 notes**:
- **Chapter 02** — Vectorless RAG & Tree-Structured Indexing
- **Chapter 03** — Agentic Tree Search & LLM Relevance Retrieval
- **Chapter 04** — LLM Wiki Architecture
- **Chapter 05** — Two-Pass Retrieval & Lazy Loading

Only features mentioned in the notes are implemented — no extra code.
