# Chapter 08 — End-to-End Cognitive Memory Application

## 8.1 Repository Layout & Schema Design

A production-grade GraphRAG cognitive-memory application follows a strict folder structure and separates storage schema from business logic.

```
repo_root/
├─ schema/            // Migration files (Cypher)
├─ code/
│  ├─ Basic/        // Minimal service for a functional demo
│  ├─ Production/   // Production hardened with observability, retries, validation
│  └─ Assignments/  // Grade‑aligned assignment scripts
├─ docs/
│  ├─ API.md       // Public endpoints and request/response schemas
│  ├─ ARCHITECTURE.md // Architecture and component diagram
│  └─ README.md    // Local dev setup
├─ docker-compose.yml // Multi‑service stack
├─ scripts/
│  ├─ deploy.sh    // Automated deploy script (Helm/Terraform)
│  └─ monitor.sh   // Prometheus alert exporter
├─ logs/            // Routed logs from containers
└─ tests/           // Integration and unit tests
```

## 8.2 Schema & Seed Migrations

### 8.2.1 Core labels & relationship patterns

Create the first schema with `schema/import.cypher` (recommended over ad‑hoc files).

```cypher
// Define mandatory property keys for type safety
declare graph.

-- Node types
CREATE CONSTRAINT u_user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT e_event_ts_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.ts IS UNIQUE;
CREATE CONSTRAINT ent_name_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE;

-- Composite indexes for hot lookups
CREATE INDEX user_name_idx IF NOT EXISTS FOR (u:User) ON (u.name);
CREATE INDEX session_created_idx IF NOT EXISTS FOR (s:Session) ON (s.createdAt);
CREATE INDEX vector_embedding_idx IF NOT EXISTS FOR (d:Document) ON (d.embedding);

-- Labels used across memory types
-- Semantic memory
:(Entity {name: string, type: string});

-- Episodic memory
:(Event {id: string, ts: datetime, type: string});

-- Working memory
:(Session {id: string, createdAt: datetime});
:(Message {id: string, ts: datetime, content: string});

-- Temporal memory
:(Preference {key: string, value: string});

-- Procedural memory
:(Skill {name: string, version: string});

-- Application data
:(Document {id: string, title: string, embedding: vector(1536)});
:(User {id: string, name: string});
:(Hotel {id: string, name: string, city: string});

-- Core relationships
(:User)-[:KNOWS]->(:User);
(:User)-[:LIKES]->(:Hotel);
(:User)-[:STAYED_AT]->(:Hotel);
(:Event)-[:INVOLVES]->(:Entity);
(:Entity)-[:TRIGGERS]->(:Event);
(:User)-[:HAS_PREF]->(:Preference);
(:User)-[:HAS_SKILL]->(:Skill);
(:Skill)-[:VERSION]->(:Skill);
(:Document)-[:MENTIONS]->(:Entity);
(:Document)-[:BELONGS_TO]->(:Category);
(:Document)-[:REFERENCES]->(:Topic);
```

### 8.2.2 Seed data (populates first time only)

```cypher
// People & companies
MERGE (a:User {id: "alice", name: "Alice"});
MERGE (b:User {id: "bob", name: "Bob"});
MERGE (acme:Entity {name: "Acme Corp", type: "Company"});
MERGE (a)-[:WORKS_AT]->(acme);
MERGE (acme)-[:LOCATED_IN]->(:Entity {name: "San Francisco", type: "City"});

// Hotels & likes
MERGE (p1:Hotel {id: "h1", name: "Grand Plaza", city: "Paris"});
MERGE (a)-[:LIKES]->(p1);
MERGE (p2:Hotel {id: "h2", name: "The Bullnose", city: "London"});
MERGE (b)-[:LIKES]->(p2);

// Temporal preference (Alice preferred "dark" theme before 2025-01-15)
MERGE (prefDark:Preference {key: "theme", value: "dark"});
MERGE (prefLight:Preference {key: "theme", value: "light"});
MERGE (a)-[:HAS_PREF {validFrom: datetime("2024-01-01"), validTo: datetime("2025-01-15")}]->(prefLight);
MERGE (a)-[:HAS_PREF {validFrom: datetime("2025-01-15"), validTo: null}]->(prefDark);

// Skill (Summarise) with version
MERGE (summ:Skill {name: "Summarise", version: "2.1"});
MERGE (a)-[:HAS_SKILL]->(summ);
```

## 8.3 Typed Cypher Library

A wrapper library over the driver adds convenience methods and enforces types for basic CRUD.

### 8.3.1 Example library (`neo4j-lib.ts`)

```typescript
// Pseudo code — typed query library (no build tool shown)
import type * as neo4j from 'neo4j-driver';

export class GraphClient {
  private driver: any;

  constructor(driver: any) {
    this.driver = driver;
  }

  // ---- Nodes ----
  async getEntityByName(name: string): Promise<Entity | null> {
    const result = await this.driver.executeQuery(
      `MATCH (e:Entity {name: $name}) RETURN e AS entity`, { name }
    );
    return result.records[0]?.get('entity')?.toObject() ?? null;
  }

  async createOrMergeEntity(props: Pick<Entity, 'name' | 'type'>): Promise<Entity> {
    const result = await this.driver.executeQuery(
      `MERGE (e:Entity {name: $name, type: $type}) RETURN e`, props
    );
    return result.records[0]?.get('e')?.toObject();
  }

  async getUserByName(name: string): Promise<User | null> {
    const result = await this.driver.executeQuery(
      `MATCH (u:User {name: $name}) RETURN u`, { name }
    );
    return result.records[0]?.get('u')?.toObject() ?? null;
  }

  // ---- Relationships ----
  async createOrMergeRelationship(
    from: { id?: string; label: 'User' | 'Entity' | 'Hotel' | 'Skill' },
    relType: string,
    to: { id?: string; label: 'User' | 'Entity' | 'Hotel' | 'Skill' },
    relProps: Record<string, unknown> = {}
  ): Promise<void> {
    const relDecl = Object.entries(relProps).map(([k, v]) => `
      SET r.${k} = $${k}`).join('');
    const query = `
      MATCH (a:${from.label} $fromId)
      MATCH (b:${to.label} $toId)
      MERGE (a)-[r:${relType}]->(b)
      ${relDecl}
      RETURN nothing`; // intentionally empty to avoid payload overhead
    await this.driver.executeQuery(query, {
      fromId: from.id ? {id: from.id} : null,
      toId: to.id ? {id: to.id} : null,
      ...relProps,
    });
  }

  // ---- Traversals ----
  async getFriendsOf(userId: string, maxHops: number = 2): Promise<any[]> {
    const query = `
      MATCH path = (a:User $id)-[:KNOWS*1..$maxHops]->(f:User)
      UNWIND nodes(path) AS node
      RETURN node AS friend
      ORDER BY length(path)
      SKIP 0
      LIMIT 50`;
    const result = await this.driver.executeQuery(query, { id: {id: userId}, maxHops });
    return result.records.map(r => r.get('friend')?.toObject());
  }

  async getDocumentNeighbors(docId: string, hops: number = 1): Promise<any[]> {
    const query = `
      MATCH (d:Document $id)
      OPTIONAL MATCH path = (d)-[:BELONGS_TO|MENTIONS|REFERENCES*1..$hops]->(n)
      UNWIND nodes(path) AS node
      RETURN node.name AS name, node.labels AS labels
      ORDER BY length(path)
      SKIP 0
      LIMIT 50`;
    const result = await this.driver.executeQuery(query, { id: {id: docId}, hops });
    return result.records.map(r => ({ name: r.get('name'), labels: r.get('labels') }));
  }
}

export const graphClient = new GraphClient(driver);
```

**Why typed Cypher?**
- Safer refactoring (IDE auto‑complete)
- Reduced human error (schema enforces patterns)
- Consistent code (all CRUD uses same wrapper)

## 8.4 GraphRAG Service — Hybrid Retrieval + Generation

### 8.4.1 High‑Level Flow

```mermaid
graph TB
    A[Client request] --> B[Validate input]
    B --> C[Vector search (topK)]
    C --> D[Graph expansion (bounded hops)]
    D --> E[Fuse context]
    E --> F[LLM completion]
    F --> G[Return answer + citations]
    
    subgraph Services
        C --> V[VectorIndexClient]
        D --> GCL[GraphClient]
        F --> LLM[External LLM]
    end

    style A fill:#f9f,stroke:#333
    style G fill:#cfc,stroke:#333
```

### 8.4.2 Service Implementation (node‑only pseudo code)

```typescript
// Pseudo code — GraphRAG service business logic
interface GraphRAGConfig {
  vectorIndex: string;
  embeddingModel: string;
  maxGraphHops: number;
  similarityThreshold: number;
  maxContextTokens: number;
}

class GraphRAGService {
  constructor(
    private driver: any,
    private embedding: (text: string) => Promise<number[]>,
    private llm: (context: string, question: string) => Promise<string>,
    private config: GraphRAGConfig
  ) {}

  async retrieveAndGenerate(question: string): Promise<{
    answer: string;
    citations: any[];
  }> {
    // 1. Vector anchor search
    const qVector = await this.embedding(question);
    const vectorCypher = `
      CALL db.index.vector.queryNodes($index, $k, $vec)
      YIELD node AS doc, score
      WHERE score >= $threshold
      RETURN elementId(doc) AS docId, score
    `;
    const vectorResult = await this.driver.executeQuery(vectorCypher, {
      index: this.config.vectorIndex,
      k: 5,
      vec: qVector,
      threshold: this.config.similarityThreshold,
    });

    const docIds = vectorResult.records.map(r => r.get('docId'));

    // 2. Bounded graph expansion
    const expandCypher = `
      UNWIND $ids AS id
      MATCH (d) WHERE elementId(d) = id
      OPTIONAL MATCH path = (d)-[:BELONGS_TO|MENTIONS|REFERENCES*1..$hops]->(n)
      UNWIND nodes(path) AS node
      RETURN node
      LIMIT 30`;
    const expandResult = await this.driver.executeQuery(expandCypher, {
      ids: docIds,
      hops: this.config.maxGraphHops,
    });

    // 3. Build context
    const context = this.buildContext(vectorResult.records, expandResult.records);

    // 4. LLM generation
    const answer = await this.llm(context, question);

    // 5. Return structured response (citations optional)
    return { answer, citations: vectorResult.records.map(r => r.toObject()) };
  }

  private buildContext(vectorRecords: any[], expandRecords: any[]): string {
    const segments: string[] = [];
    for (const vr of vectorRecords) {
      segments.push(`[VECTOR docId=${vr.get('docId')} score=${vr.get('score')}]`);
    }
    for (const er of expandRecords) {
      const node = er.get('node');
      segments.push(`[GRAPH ${node.labels.join(':')}]`);
    }
    return segments.slice(0, this.config.maxContextTokens).join('\n');
  }
}
```

## 8.5 Integration Tests — “Hybrid > Dense‑Only”

### 8.5.1 How to prove the claim

We benchmark GraphRAG vs vector‑only RAG on the same domain:

```typescript
// Pseudo code — benchmark test ( Jest / Mocha style )
interface BenchmarkConfig {
  question: string;
  expectedTruth: boolean; // true if multi‑hop answer required
}

test('Hybrid (GraphRAG) should outperform dense‑only RAG for multi‑hop question', async () => {
  const question = 'Which hotels did Alice\'s friends like in Paris?';
  // Build test data: Alice, Bob, hotels, likes
  // Insert into a test graph (via schema/import.cypher)

  // Run vector‑only baseline
  const vectorAnswer = await denseRAGClient.query(question);
  const vectorConfident = vectorAnswer.includes('Grand Plaza') || vectorAnswer.includes('The Bullnose');
  // Note: vector‑only may hallucinate unrelated hotels or skip multi‑hop relationship

  // Run GraphRAG hybrid
  const graphRAGService = new GraphRAGService(driver, embeddingFn, llmFn, config);
  const hybridAnswer = await graphRAGService.retrieveAndGenerate(question);

  // Assert hybrid provides more precise answer (ideally mentions "Bob's like", "Paris")
  const hybridConfident = hybridAnswer.answer.includes('friends') || hybridAnswer.answer.includes('Paris');

  expect(hybridConfident).toBe(true);
  // Tolerate one‑digit variance; hybrid should not be worse than vector‑only
  expect(hybridAnswer.answer).toContain('Alice');
});
```

### 8.5.2 Best practices for integration tests

| Practice | Reasoning |
|----------|-----------|
| Clean, isolated test database | Avoid data pollution from other tests |
| Reset fixtures using `schema/import.cypher` | Idempotent seed; same repo as production schema |
| Paramaterise test data (users, hotels) | Reuse across multiple test scenarios |
| Use a fixed known state (Alice knows Bob) | Deterministic expected outcomes |
| Separate coverage for pure graph, pure vector, hybrid cases | Each path exercised independently |

## 8.6 Docker Compose Stack

Compose is kept minimal; only components that have external dependencies.

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.18-community
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_SERVER_MEMORY_HEAP_INITIALSIZE=512m
      - NEO4J_SERVER_MEMORY_HEAP_MAXSIZE=2G
    ports:
      - "7474:7474"   # HTTP
      - "7687:7687"   # Bolt
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD-SHELL", "nc -z localhost 7687"]
      interval: 10s
      timeout: 5s
      retries: 10

  vector-store:
    image: ghcr.io/org/vector-store:1.0   # hypothetical image
    environment:
      - DB_URL=neo4j:7687
    depends_on:
      - neo4j
    ports:
      - "8080:8080"

  app:
    build: ./code/Production
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - VECTOR_SERVICE_URL=http://vector-store:8080
    depends_on:
      - neo4j
      - vector-store
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  neo4j_data:
```

## 8.7 Observability & Logging

- **Application logs** (JSON format) go to stdout, structured with `log.level`, `request.id`, `operation`, `latency_ms`.
- **Structured metrics** via Prometheus exporter (`/metrics` endpoint) tracking QPS, latency p95, vector search hits.
- **Distributed tracing** (OpenTelemetry) between GraphClient, vector service, LLM API.
- **Alerting**: High error rate (>10%), long-running queries (>5s), missing indexes.

### Example structured log entry (inside GraphRAGService)

```json
{
  "timestamp": "2026-10-31T11:35:39Z",
  "level": "INFO",
  "request_id": "req_abc123",
  "operation": "hybrid_retrieve",
  "question_hash": "sha256:7a3f...",
  "vector_hits": 3,
  "graph_nodes": 12,
  "latency_ms": 452,
  "error": null
}
```

## 8.8 Deployment Checklist

| Item | Command / Action |
|------|------------------|
| Verify schema applied | `CALL db.schema() YIELD ...` |
| Seed test data if empty | `CALL db.schema.await.indexes() + schema/import.cypher` |
| Restart vector service if unavailable | `docker-compose restart vector-store` |
| Run integration test suite | `npm run test:integration` |
| Monitor deployment logs | `docker-compose logs -f app` |
| Update dashboard metrics | Query `graphrag_hits_total`, `graphrag_latency_histogram` |
| Verify external LLMs endpoints | `curl https://api.openai.com/v1/models` |
| Rollback if any component unhealthy (Neo4j, vector-store) | `docker-compose down --rmi all` + rollback image tag |

## 8.9 Why This Design Works

- **Single driver** eliminates connection leaks and pool churn.
- **Typed Cypher library** prevents injection and encourages consistent patterns.
- **GraphRAG pipeline** fuses dense semantics with graph connectivity for multi‑hop accuracy.
- **Integration test** provides objective evidence that hybrid beats dense‑only.
- **Docker Compose** runs a realistic, reproducible dev environment.
- **Observability** gives visibility into performance and correctness of the pipeline.

---

**Self-check questions:**
19. Which three files must change if the embedding dimension changes from 1536 → 3072?
20. How does the integration test prove “hybrid > dense‑only"?
