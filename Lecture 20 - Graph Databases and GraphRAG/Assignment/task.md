# Lecture 20 — Graph Databases, Cypher, Neo4j & GraphRAG — Assignment

> **Source:** `../roadmap.md` → "Lecture 20" → **Build** and **Gate**

---

## 📋 Task Statement

Build a **cognitive-memory GraphRAG application** that combines vector similarity search with graph traversal to answer multi-hop questions. The application must include:

1. A Neo4j schema with constraints, indexes, and vector indexes
2. Seed data representing users, sessions, documents, entities, and relationships
3. A typed Cypher query library (no raw strings in routes)
4. A Node.js Express service with the official `neo4j-driver`
5. A `/rag` endpoint that implements the full GraphRAG pipeline:
   - Embed the user question
   - Vector search over documents (top-k)
   - One-hop graph traversal from retrieved docs (authors, topics)
   - Fuse vector + graph context
   - Return the assembled prompt (LLM call optional for Basic Code)
6. A `/memory` endpoint demonstrating STM (sliding-window messages)

---

## ✅ Deliverables Checklist

| # | Deliverable | Done |
|---|-------------|------|
| 1 | `.env` with Neo4j + vector index config | ☐ |
| 2 | `src/db/schema.cypher` — constraints, indexes, vector indexes | ☐ |
| 3 | `src/db/seed.cypher` — at least 2 users, 2 sessions, 3 documents, 2 entities | ☐ |
| 4 | `src/services/cypher.ts` — `similarDocs()`, `expandDocContext()` | ☐ |
| 5 | `src/services/graphrag.ts` — `answer(question)` pipeline | ☐ |
| 6 | `src/services/memory.ts` — `appendMessage()`, `recentMessages()` | ☐ |
| 7 | `src/routes/index.ts` — `POST /rag`, `GET /rag/context`, `POST /memory/message`, `GET /memory/session/:id/messages` | ☐ |
| 8 | `src/scripts/bootstrap.ts` — runs schema + seed | ☐ |
| 9 | `src/index.ts` — Express server with graceful shutdown | ☐ |
| 10 | `npm run typecheck` passes | ☐ |
| 11 | `npm run bootstrap` succeeds against running Neo4j | ☐ |
| 12 | `npm run dev` starts server on `:3000` | ☐ |

---

## 🎯 Acceptance Criteria

**The learner proves it works by:**

1. **Start Neo4j** (Docker or Aura):
   ```bash
   docker run -d --name neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/password \
     neo4j:5-enterprise
   ```

2. **Run bootstrap**:
   ```bash
   npm run bootstrap
   ```
   Expected output: `✅ Bootstrap complete`

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **Test `/rag` endpoint** (multi-hop question):
   ```bash
   curl -X POST http://localhost:3000/rag \
     -H "Content-Type: application/json" \
     -d '{"question": "Who wrote the introductory Cypher document?"}'
   ```
   - Response must include `answer` (string) and `context` (array)
   - `context` must contain at least one entry with `source: "graph"` (proving graph traversal happened)

5. **Test `/memory` endpoint** (STM sliding window):
   ```bash
   curl -X POST http://localhost:3000/memory/message \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "sess-test", "message": {"role": "user", "content": "Hello"}}'
   ```
   - Response includes `recent` array with the new message

6. **Manual verification of GraphRAG gate**:
   - The question **"Who wrote the introductory Cypher document?"** requires a **graph hop** from the document (found by vector search) to its author.
   - Dense/vector retrieval alone would return the document content but **not** the author name.
   - The response `context` must contain a `source: "graph"` entry with the author's name.

---

## 🚀 Stretch Goals

| # | Stretch Goal | Description |
|---|--------------|-------------|
| 1 | **LLM integration** | Replace the placeholder prompt in `graphrag.ts` with a real OpenAI/Anthropic call and return the actual answer. |
| 2 | **Entity resolution** | Implement `resolveEntity(mention)` that maps surface forms to canonical `Entity` nodes using the vector index on `Entity.nameEmbedding`. |
| 3 | **Temporal preference** | Add `POST /memory/preference` that stores/queries `HAS_PREFERENCE` edges with `validFrom`/`validTo` (temporal memory). |

---

## 📚 References

- **Notes:** `../notes/01…08_*.md`
- **Roadmap Build/Gate:** `../roadmap.md` → "Lecture 20"
- **Implementation guide:** `../code/Basic Code/implementations guide/`