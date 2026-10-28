# Chapter 09 — Production System Design

**Notes source:** `Lecture 16 - RAG/notes/09_production_system_design.md`

**Goal:** See how the basic code maps to the four production layers (presentation, application, data, infrastructure) and what to change before deploying.

---

## `src/index.ts` — Application + Presentation layer

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/index.ts` |
| Chapter | 09 |
| What it does | Creates the Express app, parses JSON bodies, mounts the router at `/api`, and starts listening on the configured port. This is the entry point. |

### Full code

```ts
import express from "express";
import { config } from "./config/config";
import router from "./router";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.listen(config.port, () => {
  console.log(`RAG basic code listening on http://localhost:${config.port}`);
  console.log(`Embedding model: ${config.embeddingModel} (${config.embeddingDims} dims)`);
  console.log(`Namespace: ${config.namespace}`);
});

export default app;
```

### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `express()` | Creates the Express application. | Chapter 09 (presentation layer) |
| `app.use(express.json({ limit: "1mb" }))` | Parses JSON request bodies. 1MB cap prevents oversized payloads. | Chapter 09 (cost control / reliability) |
| `app.use("/api", router)` | Mounts all routes under `/api`. | Chapter 02 + 09 |
| `app.listen(config.port, ...)` | Starts the HTTP server. Logs port, embedding model, and namespace on startup. | Chapter 09 |

---

## `.env` — Infrastructure / configuration

### Code file details

| Field | Meaning |
|-------|---------|
| File | `.env` |
| Chapter | 09 (secrets + config) |
| What it does | Holds environment variables: port, API keys, model names, chunk size, topK, namespace. Never committed to git (see `.gitignore`). |

### Full code

```
PORT=3000
OPENAI_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMS=1024
CHAT_MODEL=gpt-4o-mini
CHUNK_SIZE=400
CHUNK_OVERLAP=80
TOP_K=4
NAMESPACE=policies
```

### Block-by-block explanation

| Variable | Purpose | Production note |
|----------|---------|-----------------|
| `PORT` | HTTP listen port | Set by the platform (Heroku, Railway, etc.) |
| `OPENAI_API_KEY` | OpenAI secret key | **Never commit.** Inject via platform secrets or secret manager. |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMS` | Embedding model + dimension | Must match ingestion and query (Chapter 04). Pin these. |
| `CHAT_MODEL` | LLM for generation | Change to a cheaper/smaller model to reduce cost (Chapter 09) |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | Chunking parameters | Tune based on your documents (Chapter 03) |
| `TOP_K` | Chunks per query | Smaller = cheaper prompts, larger = better recall (Chapter 05) |
| `NAMESPACE` | Vector index namespace | Per-tenant or per-environment isolation (Chapter 05 / 09) |

---

## Four layers (from notes) mapped to this code

| Layer | Responsibility | Where it lives in this code |
|-------|---------------|----------------------------|
| **Presentation** | REST API, rate limiting | `src/index.ts` + `src/router/index.ts` |
| **Application** | Request handler, retrieval, generation, memory | `src/controllers/rag.controller.ts` + `src/services/*` |
| **Data** | Vector index, document store | `src/services/ingestion.ts` (in-memory `vectorIndex`) |
| **Infrastructure** | Secrets, observability, session store | `.env`, `src/config/config.ts`, `src/services/memory.ts` |

---

## What to change before production (from Chapter 09 notes)

| Concern | Basic code | Production change |
|---------|-----------|-------------------|
| Vector store | In-memory `Map` | Replace with Pinecone / Qdrant / pgvector |
| Session store | In-memory `Map` | Redis with TTL |
| Secrets | `.env` file | Platform secret manager |
| Logging | `console.log` | Structured logs + traces per stage |
| Evaluation | None | Goldenset + CI gate |
| Rate limiting | None | API gateway or middleware |
| Tenant isolation | In-code filter | Enforce at gateway + namespace + DB |

## Command

```bash
# Start the server (presentation layer):
npm run dev

# Set real secrets before deploying:
export OPENAI_API_KEY=sk-...
export NAMESPACE=acme-prod

# Build:
npm run build
npm start
```
