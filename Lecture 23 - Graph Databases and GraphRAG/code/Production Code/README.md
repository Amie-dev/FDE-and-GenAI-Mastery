# Production Code — Lecture 20

Hardened production GraphRAG service with observability, retries, secrets validation, and security middleware.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Validate config
npm run typecheck

# 3. Bootstrap Neo4j (schema + seed data)
npm run bootstrap

# 4. Start server
npm run start
```

## Architecture

| Layer          | Responsibility                                   |
|---------------|--------------------------------------------------|
| Routes         | `/rag`, `/rag/context`, `/memory/*` endpoints    |
| Middleware     | API-key auth, rate limiting, structured logging  |
| Services      | Cypher typed library, embed, graphRAG, LLM, memory |
| DB            | Neo4j singleton driver + schema/seed cypher files |
| Observability  | Prometheus metrics, Winston logs                  |

## Endpoints

- `GET /health` — Service health
- `POST /rag` — Full hybrid retrieval → return answer + context
- `GET /rag/context?question=` — Return fused context without answer
- `POST /memory/message` — Add message to session's STM
- `GET /memory/session/:id/messages` — Retrieve recent messages

## Verification

After running `npm run bootstrap`, test the multi-hop question flow:

```bash
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "Which hotels did Alice like in Paris?"}'
```

The response should include `context` entries with `source: "graph"` containing author names (proving the bounded hop expansion worked).

Run the integration test:

```bash
npm run test:integration
```