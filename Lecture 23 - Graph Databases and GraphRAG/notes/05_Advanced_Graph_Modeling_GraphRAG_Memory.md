# Chapter 05 — Advanced Graph Modeling, GraphRAG & AI Agent Memory

## 5.1 Node vs Property Decision Framework

Not every domain concept deserves its own node. Only promote to a node when the concept **participates in relationships** or is **shared across entities**.

### Decision table

| Question | Choose **Property** | Choose **Node** |
|----------|---------------------|-----------------|
| Is it a simple scalar owned by one entity? | ✅ | ❌ |
| Is it shared / referenced by many entities? | ❌ | ✅ |
| Does it have its own properties / relationships? | ❌ | ✅ |
| Do you traverse *through* it in queries? | ❌ | ✅ |
| Is it a domain concept with identity? | ❌ | ✅ |

### Example: Address

```mermaid
graph LR
    subgraph Bad: Address as property
    A[User {address: "123 Main St"}] 
    B[Company {address: "123 Main St"}]
    end
    
    subgraph Good: Address as node
    C[User] -->|LIVES_AT| D[Address {street: "123 Main St"}]
    E[Company] -->|LOCATED_AT| D
    end
    
    style Bad fill:#fcc,stroke:#999
    style Good fill:#cfc,stroke:#333
```

## 5.2 BFS vs DFS — Conceptual, Not Hard-Coded

Neo4j does **not** hard-code BFS/DFS for every traversal. The Cypher planner picks operators (index seek, expand, filter) based on cost estimates.

```mermaid
graph TD
    Q[Query: (a)-[:KNOWS*1..3]->(b)] --> P[Planner]
    P --> S1[BFS-like expand]:::exp
    P --> S2[DFS-like expand]:::exp
    P --> S3[Filter by WHERE]:::flt
    P --> S4[Index Seek on label]:::idx
    classDef exp fill:#ffd,stroke:#333
    classDef flt fill:#aaf,stroke:#333
    classDef idx fill:#afa,stroke:#333
```

**Misconception:** “Neo4j uses BFS for this query” — it may use a mix of operators depending on indices, predicates, and data shape.

## 5.3 Shortest Path & All Shortest Paths

```cypher
// Single shortest path
MATCH p = shortestPath((a:User {id: "u1"})-[:KNOWS*]-(b:User {id: "u2"}))
RETURN p;

// All shortest paths (multiple equal length)
MATCH p = allShortestPaths((a:User {id: "u1"})-[:KNOWS*]-(b:User {id: "u2"}))
RETURN p;
```

Use `shortestPath` when you need minimal hops (recommendation, routing). Use `allShortestPaths` for tie-breaking.

## 5.4 Temporal / Versioned Memory Edges

Preferences and facts change over time. Model this with **temporal edges** carrying `validFrom` and `validTo`.

```cypher
// Add preference valid from a date
MATCH (u:User {id: $uid})
MERGE (p:Preference {key: "theme", value: "dark"})
MERGE (u)-[r:HAS_PREF {validFrom: datetime("2025-01-15"), validTo: null}]->(p);

// Query preference at a point in time
MATCH (u:User {id: $uid})-[r:HAS_PREF {key: "theme"}]->(p)
WHERE r.validFrom <= $at AND (r.validTo IS NULL OR r.validTo > $at)
RETURN p.value;
```

```mermaid
graph TD
    U[User] -.->|HAS_PREF {validFrom:2025-01-15}| P1[Preference: dark]
    U -.->|HAS_PREF {validFrom:2024-01-01, validTo:2025-01-15}| P2[Preference: light]
    
    style P1 fill:#cfc,stroke:#333
    style P2 fill:#f9f,stroke:#333
```

## 5.5 Episodic Memory — Immutable Event Log

Episodic memory stores *what happened, when, with whom*. Events are append-only; relationships link to entities.

```cypher
// Create an event node
CREATE (e:Event {
  id: "evt_123",
  type: "HOTEL_VISIT",
  ts: datetime("2025-03-10T14:30:00Z"),
  summary: "Alice stayed at Grand Plaza"
})
CREATE (p:Person {id: "p1", name: "Alice"})
CREATE (h:Hotel {id: "h1", name: "Grand Plaza"})
CREATE (e)-[:INVOLVES]->(p)
CREATE (e)-[:INVOLVES]->(h);
```

Query all events involving Alice:

```cypher
MATCH (e:Event)-[:INVOLVES]->(p:Person {name: "Alice"})
RETURN e.ts, e.type, e.summary
ORDER BY e.ts DESC;
```

## 5.6 Hybrid GraphRAG Retrieval Overview

GraphRAG = **vector search** (entry point) + **bounded graph expansion** (context enrichment).

```mermaid
flowchart LR
    A[User Query] --> B[Embed Query]
    B --> C[Vector Index Search]
    C --> D[Top-k Anchor Nodes]
    D --> E[Bounded Graph Traversal\n(hops ≤ 3)]
    E --> F[Context Fusion]
    F --> G[LLM Generation]
    
    style A fill:#f9f,stroke:#333
    style C fill:#aaf,stroke:#333
    style E fill:#ffa,stroke:#333
    style F fill:#cfc,stroke:#333
    style G fill:#faa,stroke:#333
```

### Why bounded hops?

```cypher
// From vector anchor, expand 1-2 hops
MATCH (d:Document)-[:BELONGS_TO]->(c:Category)
WHERE d.id IN $anchorIds
OPTIONAL MATCH (c)-[:HAS_TAG]->(t:Tag)
RETURN d.title, c.name, collect(t.name) AS tags;
```

Without bounds, you traverse the whole graph.

## 5.7 JS/TS Pseudo Code — Hybrid Retrieval Service

```typescript
// Pseudo code — GraphRAG hybrid retrieval
interface RetrievalConfig {
  vectorIndex: string;
  topK: number;
  maxHops: number;
  similarityThreshold: number;
}

interface HybridResult {
  anchor: any;
  expandedContext: any[];
  fusedContext: string;
}

class GraphRAGService {
  constructor(
    private driver: any,
    private config: RetrievalConfig
  ) {}

  async hybridRetrieve(query: string): Promise<HybridResult> {
    // 1. Embed query (external embedding service)
    const queryEmbedding = await this.embed(query);

    // 2. Vector search for anchors
    const vectorCypher = `
      CALL db.index.vector.queryNodes($index, $k, $emb)
      YIELD node AS anchor, score
      WHERE score >= $threshold
      RETURN anchor, score
      ORDER BY score DESC
    `;
    const anchors = await this.driver.executeQuery(vectorCypher, {
      index: this.config.vectorIndex,
      k: this.config.topK,
      emb: queryEmbedding,
      threshold: this.config.similarityThreshold,
    });

    const anchorIds = anchors.records.map(r => r.get('anchor').elementId);

    // 3. Bounded graph expansion from anchors
    const expandCypher = `
      UNWIND $ids AS id
      MATCH (anchor) WHERE elementId(anchor) = id
      CALL apoc.path.subgraphAll(anchor, {
        relationshipFilter: "BELONGS_TO|HAS_TAG|MENTIONS|REFERENCES",
        maxLevel: $maxHops
      })
      YIELD nodes, relationships
      RETURN nodes, relationships
    `;
    const expanded = await this.driver.executeQuery(expandCypher, {
      ids: anchorIds,
      maxHops: this.config.maxHops,
    });

    // 4. Fuse into single context string (truncate to token limit)
    const fused = this.fuseContext(anchors.records, expanded.records);

    return { anchor: anchors.records, expandedContext: expanded.records, fusedContext: fused };
  }

  private fuseContext(anchors: any[], expanded: any[]): string {
    // Build a single text context for LLM
    const parts: string[] = [];
    for (const a of anchors) {
      const node = a.get('anchor');
      parts.push(`[ANCHOR ${node.labels.join(':')} ${node.properties.title}]`);
    }
    for (const e of expanded) {
      for (const n of e.get('nodes')) {
        parts.push(`[CTX ${n.labels.join(':')} ${JSON.stringify(n.properties)}]`);
      }
    }
    return parts.slice(0, 50).join('\n'); // Cap context
  }

  private async embed(text: string): Promise<number[]> {
    // External call to embedding service (OpenAI, Cohere, etc.)
    // Return float[]
    return [];
  }
}
```

## 5.8 Common Mistakes

| Mistake | Why it's wrong | Fix |
|---------|----------------|-----|
| Making every noun a node | Blows up graph size & traversal cost | Only nodes that are traversed/shared |
| Using unbounded `*` traversals | Combinatorial explosion | Always bound `*1..3` |
| Forgetting temporal edges for changing facts | Query returns stale/current mix | Use `validFrom`/`validTo` on rels |
| No index on anchor lookup property | Full label scan for vector anchor | Index the property used in `WHERE` |
| Single embedding dimension mismatch | Vector index creation fails | Match dimension in code & schema |

## 5.9 Key Takeaways

- Promote to node only when concept is shared, traversed, or has own properties.
- Neo4j planner is cost-based, not hard-coded BFS/DFS.
- Temporal edges (`validFrom`/`validTo`) model time-varying facts.
- Episodic memory = immutable `Event` nodes linked via `INVOLVES`.
- GraphRAG: vector top-k → bounded hop expansion → fuse → LLM.

---

**Self-check questions:**
13. When should a concept become a separate `Node` instead of a `Property`?
14. Explain why “Neo4j uses BFS for this query” is an oversimplification.
15. How do you model a user preference that changed on 2025-01-15?