# Production Code Implementation Guide

## Structure

```
code/Production Code/
├── .env                # Environment configuration
├── package.json        # Dependencies + scripts
├── tsconfig.json       # TypeScript strict mode
├── README.md           # One-page setup guide
├── src/
│   ├── app.ts          # Express bootstrap + graceful shutdown
│   ├── index.ts        # Entry point
│   ├── types.ts        # Shared TypeScript interfaces
│   ├── config/
│   │   └── config.ts   # dotenv with Zod validation
│   ├── db/
│   │   ├── driver.ts   # Singleton Neo4j driver
│   │   ├── schema.cypher   # DDL + vector index
│   │   └── seed.cypher   # Sample data (idempotent)
│   ├── middleware/
│   │   ├── auth.ts         # API-key auth
│   │   ├── error.ts        # Global error handler
│   │   ├── logging.ts      # Winston structured logger
│   │   └── rate-limit.ts   # In-memory rate limiter
│   ├── observability/
│   │   ├── metrics.ts      # Prometheus metrics
│   │   └── tracing.ts      # OpenTelemetry stub
│   ├── services/
│   │   ├── cypher.ts       # Typed Cypher queries
│   │   ├── embedding.ts    # Embedding (deterministic/OpenAI)
│   │   ├── graphrag.ts     # Hybrid vector+graph pipeline
│   │   ├── llm.ts          # LLM client wrapper
│   │   └── memory.ts       # STM/LTM helpers
│   ├── scripts/
│   │   ├── bootstrap.ts    # Runs schema + seed
│   │   └── integration-test.ts  # Run after bootstrap
│   └── utils/
│       └── retry.ts        # Exponential backoff retry
```

## Commands

```bash
# Install (once)
npm install

# Type-check without emitting
npm run typecheck

# Lint
npm run lint

# Start dev server
npm run dev

# Build
npm run build

# Bootstrap DB (schema + seed data)
npm run bootstrap

# Run integration tests
npm run test:integration
```

## What This Code Does (One Sentence)

A production-hardened Express + TypeScript GraphRAG service with Neo4j driver singleton, Zod-validated config, Prometheus metrics, Winston logging, and a hybrid retrieval pipeline that fuses vector search with bounded graph traversal. Graceful shutdown on SIGTERM/SIGINT, rate-limited endpoints, and API-key auth middleware.

## Bootstrap (Schema + Seed)

The `npm run bootstrap` script:

1. Creates constraints (node uniqueness, preference temporal uniqueness).
2. Creates indexes (label+property, vector index `doc_emb_idx` 1536-dim cosine).
3. Inserts sample data: alice, bob, Acme Corp, hotels, preferences with validFrom/validTo, skills, sessions, messages, sample documents (placeholder embeddings), and one episodic event.

All statements use `IF NOT EXISTS` / `MERGE` so re-running is safe.

## GraphRAG Pipeline (`GraphRAGService.answer(question)`)

1. **Embed** the question via `embed()` (deterministic fallback; swap to OpenAI API if `OPENAI_API_KEY` is set).
2. **Vector search** — `CypherService.similarDocs(embedding)` queries Neo4j's native vector index `doc_emb_idx`, returns top-k documents with scores and content snippets.
3. **Bounded graph expansion** — `CypherService.expandDocContext(docIds)` expands 1–2 hops to pull authors (`[:WRITTEN_BY]`) and topics (`[:ABOUT]`).
4. **Context fusion** — Vector snippets + graph-author/topic names are combined into a single ordered prompt.
5. **LLM call** (optional) — If `OPENAI_API_KEY` is set, sends the fused prompt to OpenAI and returns the model's grounded answer.
6. **Metrics** — Increment `rag_requests_total`, `rag_latency_ms_histogram`, `vector_search_hits`, `graph_expansion_nodes`.

## Observability

- **Prometheus metrics** — exported via `observability/metrics.ts`; accessible at `http://:9090/metrics`.
- **Structured logging** — Winston JSON output to stdout; `LOG_LEVEL` configures verbosity.
- **Graceful shutdown** — Signal handlers close the Neo4j driver before process exit.
- **Error boundaries** — Global `errorHandler` middleware ensures no stack traces leak to clients.

## Deployment Checklist

| ✅ Item                              | Action                                   |
|--------------------------------------|------------------------------------------|
| Validate .env values                | Run `npm run typecheck`                  |
| Neo4j running (Docker or Aura)       | `docker run -d ...`                       |
| Run bootstrap                         | `npm run bootstrap`                      |
| Run typecheck                         | `npm run typecheck`                      |
| Start production server               | `npm run start`                          |
| Verify metrics endpoint               | `curl http://localhost:9090/metrics`     |
| Test /rag endpoint                    | `curl -X POST http://localhost:3000/rag` |
| Test /memory endpoint                 | `curl -X POST http://localhost:3000/memory/message` |
| Run integration test                  | `npm run test:integration`               |

## Production Hardening Checklist (Post-Deploy)

| ✅ Item                        | Action                                  |
|------------------------------|-----------------------------------------|
| TLS certs for Bolt          | Replace `TRUST_ALL_CERTIFICATES` with proper cert auth |
| Secret rotation               | Rotate `NEO4J_PASSWORD` and `OPENAI_API_KEY` regularly |
| Prometheus alerting           | Set alerts on `rag_latency_ms` p95 > 2s, `rag_requests_total` error rate > 5% |
| Winston log rotation          | Configure `winston.transports.File` with daily rotation |
| Rate limiting tuning          | Adjust `MAX_PER_WINDOW` / `WINDOW_MS` based on traffic patterns |
| API-key rotation              | Rotate `API_KEY` (used by `middleware/auth.ts`) |
| Database backup plan          | Schedule Neo4j daily export / Aura snapshots |