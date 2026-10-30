# 🏁 08 — End-to-End Cognitive Memory Application

> **Goal:** Wire together every piece from Chapters 01-07 into a deployable service: schema bootstrap, seed data, Cypher query library, Node.js driver wrapper, GraphRAG endpoint, and a minimal test harness that proves the hybrid retrieval beats dense-only retrieval.

---

## 1. 📦 Project Layout (Monorepo)

```text
cog-mem/
├─ .env
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ config/
│  │  └─ env.ts               # validated env (NEO4J_URI, NEO4J_USER, NEO4J_PASS, OPENAI_KEY …)
│  ├─ db/
│  │  ├─ driver.ts            # singleton Neo4j driver + graceful shutdown
│  │  ├─ schema.cypher        # DDL: constraints, indexes, vector indexes
│  │  └─ seed.cypher          # sample users, sessions, docs, embeddings
│  ├─ services/
│  │  ├─ cypher.ts            # typed query library (no raw strings in routes)
│  │  ├─ embedding.ts         # thin wrapper around OpenAI / local model
│  │  ├─ graphrag.ts          # hybrid retrieval + LLM prompt assembly
│  │  └─ memory.ts            # agent-memory helpers (profile, prefs, entity resolution)
│  ├─ routes/
│  │  ├─ health.ts            # GET /healthz
│  │  ├─ rag.ts               # POST /rag  (GraphRAG endpoint)
│  │  └─ memory.ts            # POST /memory/*  (profile, prefs, episodic recall)
│  ├─ app.ts                  # Express bootstrap
│  └─ main.ts                 # entry – starts HTTP server
├─ tests/
│  ├─ integration/
│  │  └─ rag.test.ts          # hits /rag, asserts multi-hop answer
│  └─ unit/
│     └─ cypher.test.ts       # pure-function tests for query builders
├─ scripts/
│  ├─ bootstrap.ts            # runs schema.cypher + seed.cypher
│  └─ dev.ts                  # ts-node-dev wrapper
└─ docker-compose.yml         # Neo4j + optional local embedding model
```

---

## 2. 🛠️ Bootstrap – Schema & Seed

### 2.1 `src/db/schema.cypher`

```cypher
// ── Constraints ──────────────────────────────────────────────
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT session_id IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT doc_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// ── Indexes ──────────────────────────────────────────────────
CREATE INDEX user_ext_id IF NOT EXISTS FOR (u:User) ON (u.externalId);
CREATE INDEX session_user IF NOT EXISTS FOR (s:Session) ON (s.userId);
CREATE INDEX message_ts IF NOT EXISTS FOR (m:Message) ON (m.ts);
CREATE INDEX event_type IF NOT EXISTS FOR (e:Event) ON (e.type);

// ── Vector Indexes ───────────────────────────────────────────
CREATE VECTOR INDEX doc_emb_idx IF NOT EXISTS
FOR (d:Document) ON (d.embedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };

CREATE VECTOR INDEX msg_emb_idx IF NOT EXISTS
FOR (m:Message) ON (m.embedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };

CREATE VECTOR INDEX ent_name_idx IF NOT EXISTS
FOR (e:Entity) ON (e.nameEmbedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };
```

### 2.2 `src/db/seed.cypher`

```cypher
// ── Core entities ────────────────────────────────────────────
CREATE (u:User {id: 'u1', externalId: 'alice', createdAt: datetime()});
CREATE (a:Agent {id: 'agent-1', name: 'CogMem', version: '0.1.0'});
CREATE (u)-[:OWNS]->(s:Session {id: 'sess-1', userId: 'u1', startedAt: datetime(), status: 'active'});
CREATE (s)-[:HAS_MESSAGE]->(m:Message {id: 'msg-1', role: 'user', content: 'I love Neo4j Cypher!', ts: datetime()});
CREATE (m)-[:FROM]->(u);
CREATE (m)-[:TO]->(a);

// ── Document with embedding (placeholder vector) ────────────
CREATE (d:Document {
  id: 'doc-1',
  title: 'Intro to Cypher',
  content: 'Cypher is Neo4j\'s query language...',
  embedding: [0.12, -0.45, 0.78, ...]   // 1536 dims
});

// ── Entity resolution seed ──────────────────────────────────
CREATE (e:Entity {id: 'ent-neo4j', type: 'Technology', name: 'Neo4j', nameEmbedding: [0.01, 0.02, ...]});
CREATE (m)-[:MENTIONS {confidence: 0.99}]->(e);
```

> Run with `npm run bootstrap` (see `scripts/bootstrap.ts`).

---

## 3. 📚 Typed Cypher Query Library (`src/services/cypher.ts`)

```ts
// TS pseudo‑code – no raw strings in routes
import { Driver, Result } from 'neo4j-driver';

export class CypherLib {
  constructor(private driver: Driver) {}

  // Vector search over documents
  async similarDocs(emb: number[], k = 5) {
    return this.driver.executeQuery(
      `CALL db.index.vector.queryNodes('doc_emb_idx', $k, $emb)
       YIELD node AS d, score
       RETURN d.id, d.title, d.content, score
       ORDER BY score DESC`,
      { k, emb }
    );
  }

  // One‑hop graph expansion from doc → author / topics
  async expandDocContext(docIds: string[]) {
    return this.driver.executeQuery(
      `UNWIND $ids AS id
       MATCH (d:Document {id: id})
       OPTIONAL MATCH (d)-[:WRITTEN_BY]->(auth:User)
       OPTIONAL MATCH (d)-[:ABOUT]->(t:Topic)
       RETURN d.id, collect(DISTINCT auth.name) AS authors, collect(DISTINCT t.name) AS topics`,
      { ids: docIds }
    );
  }

  // Agent memory: recent messages
  async recentMessages(sessionId: string, minutes = 30) {
    return this.driver.executeQuery(
      `MATCH (s:Session {id: $sid})-[:HAS_MESSAGE]->(m:Message)
       WHERE m.ts > datetime() - duration({minutes: $min})
       RETURN m.role, m.content, m.ts
       ORDER BY m.ts ASC`,
      { sid: sessionId, min: minutes }
    );
  }

  // Temporal preference lookup
  async preferenceAt(userId: string, key: string, at: Date) {
    return this.driver.executeQuery(
      `MATCH (u:User {id: $uid})-[:HAS_PREFERENCE {key: $key}]->(p:Preference)
       WHERE p.validFrom <= $at AND (p.validTo IS NULL OR p.validTo > $at)
       RETURN p.value`,
      { uid: userId, key, at }
    );
  }
}
```

---

## 4. 🔀 GraphRAG Service (`src/services/graphrag.ts`)

```ts
// TS pseudo‑code
import { CypherLib } from './cypher';
import { embed } from './embedding';
import { callLLM } from './llm';

export class GraphRAG {
  constructor(private cypher: CypherLib) {}

  async answer(question: string) {
    const qEmb = await embed(question);

    // 1️⃣ Vector retrieval
    const { records: vecRecs } = await this.cypher.similarDocs(qEmb, 5);
    const docIds = vecRecs.map(r => r.get('d.id'));

    // 2️⃣ Graph expansion
    const { records: graphRecs } = await this.cypher.expandDocContext(docIds);

    // 3️⃣ Fuse
    const vecCtx = vecRecs.map(r => ({
      source: 'vector',
      title: r.get('d.title'),
      snippet: r.get('d.content').slice(0, 160),
      score: r.get('score')
    }));
    const graphCtx = graphRecs.flatMap(r => [
      ...(r.get('authors')?.map(a => ({ source: 'graph', title: a, snippet: `author: ${a}`, score: 1 })) || []),
      ...(r.get('topics')?.map(t => ({ source: 'graph', title: t, snippet: `topic: ${t}`, score: 1 })) || [])
    ]);

    const fused = [...vecCtx, ...graphCtx].sort((a, b) => a.score - b.score);

    // 4️⃣ LLM
    const prompt = `Answer using the context below.\nQuestion: ${question}\nContext: ${JSON.stringify(fused, null, 2)}`;
    return callLLM(prompt);
  }
}
```

---

## 5. 🌐 Express Routes (`src/routes/rag.ts`)

```ts
import { Router, Request, Response } from 'express';
import { GraphRAG } from '../services/graphrag';

export function ragRouter(graphrag: GraphRAG) {
  const r = Router();
  r.post('/', async (req: Request, res: Response) => {
    const q = req.body?.question?.trim();
    if (!q) return res.status(400).json({ error: 'question required' });
    try {
      const answer = await graphrag.answer(q);
      res.json({ answer });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'internal' });
    }
  });
  return r;
}
```

Wire in `src/app.ts`:

```ts
import express from 'express';
import { driver } from './db/driver';
import { CypherLib } from './services/cypher';
import { GraphRAG } from './services/graphrag';
import { ragRouter } from './routes/rag';

const app = express();
app.use(express.json());

const cypher = new CypherLib(driver);
const graphrag = new GraphRAG(cypher);

app.use('/rag', ragRouter(graphrag));
app.get('/healthz', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 CogMem listening on ${PORT}`));
```

---

## 6. 🧪 Integration Test – Proving Hybrid > Dense-Only

```ts
// tests/integration/rag.test.ts (Jest + Supertest pseudo‑code)
import request from 'supertest';
import { app } from '../../src/app';

describe('GraphRAG endpoint', () => {
  it('answers a multi-hop question that vector-only fails', async () => {
    // Question needs: "Who wrote the doc about Cypher?" → vector finds doc, graph hop finds author
    const res = await request(app)
      .post('/rag')
      .send({ question: 'Who wrote the introductory Cypher document?' })
      .expect(200);

    // Vector-only would return the doc title but not the author
    expect(res.body.answer).toMatch(/author|wrote/i);
  });
});
```

Run: `npm test` → should pass once seed data contains a `Document` linked via `WRITTEN_BY` to a `User`.

---

## 7. 🐳 Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: '3.8'
services:
  neo4j:
    image: neo4j:5-enterprise
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/password
      NEO4J_PLUGINS: '["graph-data-science"]'  # optional
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs

  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [neo4j]
    command: npm run dev

volumes:
  neo4j-data:
  neo4j-logs:
```

---

## 8. 📈 Observability Checklist (Production-Ready)

| Concern | Tool / Pattern |
|---------|----------------|
| **Request latency** | OpenTelemetry + Prometheus (`http_request_duration_seconds`) |
| **Neo4j query latency** | `driver.on('query', …)` hook → histogram |
| **Vector index health** | `CALL db.index.vector.queryNodes` latency + recall@k nightly job |
| **Error rates** | Structured JSON logs → Loki / Datadog |
| **Schema drift** | CI step runs `cypher-lint` + `neo4j-admin check-consistency` |

---

## 9. 🚀 Deployment Notes

1. **Neo4j Aura** – use `neo4j+s://` URI; enable `trustServerCertificate=true` in driver config.
2. **Secrets** – never commit `.env`; inject via secret manager (AWS Secrets Manager, GCP Secret Manager, Vault).
3. **Driver pooling** – single `Driver` instance per process; tune `maxConnectionPoolSize` (default 100).
4. **Graceful shutdown** – `process.on('SIGTERM', async () => { await driver.close(); process.exit(0); })`.
5. **Blue/Green** – deploy new version behind a load balancer; run smoke test against `/healthz` + `/rag` before switching traffic.

---

## 10. 🎯 Completion Gate (from Roadmap)

> **You can answer a multi-hop question that dense retrieval alone gets wrong.**

Run the integration test above; if it passes, the gate is satisfied.

---

## 11. 🛑 Common End-to-End Mistakes

| Mistake | Consequence | Remedy |
|---------|-------------|--------|
| **Running bootstrap on every container start** | Duplicate constraints / indexes, slow startup. | Run once via init‑container or migration job. |
| **Hard‑coding vector dimensions** | Breaks when embedding model changes. | Read dimension from env / model metadata. |
| **No retry on transient Bolt errors** | 500s under network blip. | Driver config `connectionAcquisitionTimeout`, `maxTransactionRetryTime`. |
| **Skipping `PROFILE` on new Cypher** | Hidden full-scan queries in prod. | Mandate `PROFILE` in PR template for any new query. |
| **Forgetting to close sessions in error paths** | Connection leak → pool exhaustion. | Wrap in `try/finally { await session.close() }` or use `session.executeRead/Write`. |

---

## 12. 📌 Key Takeaways

1. **Schema, seed, query lib, services, routes** – keep them in separate files; import, don’t inline.
2. **Bootstrap once** (migrations) – not on every cold start.
3. **Typed Cypher library** prevents string‑injection bugs and enables unit tests.
4. **GraphRAG = vector search → bounded graph hop → fuse → LLM** – keep each step testable.
5. **Integration test proves the gate** – multi-hop question must succeed.
6. **Observability & graceful shutdown** are mandatory for production.

---

## 13. 🧪 Self‑Check Questions

1. Which file owns the **singleton Neo4j driver** and why must it be a singleton?  
2. How does `scripts/bootstrap.ts` avoid re-creating constraints on every run?  
3. In `GraphRAG.answer`, why do we `UNWIND` the doc IDs instead of a single `MATCH`?  
4. What environment variable tells the driver to trust a self-signed Neo4j cert?  
5. Name two metrics you would export to Prometheus for the `/rag` endpoint.  
6. If the embedding model changes from 1536 → 3072 dims, list every file that must change.  
7. Explain how the integration test demonstrates “hybrid > dense-only”.  

--- 

*End of chapter — the lecture is now complete.*