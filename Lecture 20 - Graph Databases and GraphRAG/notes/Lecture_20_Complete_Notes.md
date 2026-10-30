# 📘 Lecture 20 — Graph Databases, Cypher, Neo4j & GraphRAG — Complete Notes

> **Lecture level:** 🟠 Advanced  
> **Prerequisites:** Lectures 15–16, 19 (RAG basics, vector search, agent memory)  
> **Goal:** Model connected knowledge explicitly and combine graph traversal with vector retrieval to build a cognitive-memory GraphRAG service.

---

## 🧭 Executive Summary

| Chapter | Title | Core Idea |
|---------|-------|-----------|
| 01 | **Graph Database Fundamentals & Cognitive Memory Architecture** | Graph DBs = nodes + relationships + properties + labels; they map naturally to human *connected* memory (facts + episodes). |
| 02 | **Cypher Query Language: Syntax & Patterns** | Declarative ASCII-art patterns (`()`, `[]`, `-->`); CRUD via `MATCH`, `CREATE`, `MERGE`, `SET`, `DELETE`, `DETACH DELETE`. |
| 03 | **Neo4j Architecture, Deployment & LLM Cypher** | Bolt (7687), ACID, index-free adjacency; Aura vs Docker; LLM → text-to-Cypher for Knowledge Graphs. |
| 04 | **Neo4j Node.js Driver** | `neo4j-driver` singleton, `driver.executeQuery()`, sessions, transactions, graceful shutdown. |
| 05 | **Advanced Graph Modeling, GraphRAG & AI Agent Memory** | Node vs property decision framework; BFS/DFS concepts; shortest paths; temporal/episodic/factual memory; vector + graph retrieval. |
| 06 | **GraphRAG & Hybrid Retrieval** | Vector index creation (`CREATE VECTOR INDEX`), bounded graph hops after vector search, context fusion, endpoint sketch. |
| 07 | **AI Agent Memory Systems on Graphs** | Working / episodic / semantic / temporal / procedural memory; entity resolution; profile building; indexing hot paths. |
| 08 | **End-to-End Cognitive Memory Application** | Repo layout, schema & seed migrations, typed Cypher library, GraphRAG service, integration test, Docker Compose, observability, deployment checklist. |

**Key takeaway:** A production GraphRAG system is a *pipeline* — embed query → vector top‑k → bounded graph expansion → fuse → LLM — backed by a typed Cypher library and a schema that separates *what* (entities) from *when* (temporal edges).

---

## 🗂️ Cheat Sheet — Most-Used Cypher Patterns

| Task | Cypher Snippet |
|------|----------------|
| **Find node by id** | `MATCH (n {id: $id}) RETURN n` |
| **Create / merge node** | `MERGE (u:User {id: $id}) ON CREATE SET u.created = datetime()` |
| **Parameterised relationship** | `MATCH (a {id:$a}), (b {id:$b}) MERGE (a)-[:KNOWS {since:datetime()}]->(b)` |
| **Variable-length hop (bounded)** | `MATCH (a)-[:REL*1..3]->(b) WHERE a.id=$id RETURN b` |
| **Shortest path** | `MATCH p=shortestPath((a)-[*]-(b)) WHERE a.id=$a AND b.id=$b RETURN p` |
| **Vector index search** | `CALL db.index.vector.queryNodes('idx', 5, $emb) YIELD node, score RETURN node, score` |
| **Temporal preference** | `MATCH (u)-[:HAS_PREF {key:'theme', validFrom:<=$at, validTo:null}]->(p) RETURN p.value` |
| **Profile aggregation** | `MATCH (u)-[:OWNS]->()-[:TRIGGERS]->(:Event)-[:INVOLVES]->(e) RETURN e.name, count(*)` |

---

## ⚖️ Decision Tables

### Node vs Property

| Question | Choose **Property** | Choose **Node** |
|----------|---------------------|-----------------|
| Is it a simple scalar owned by one entity? | ✅ | ❌ |
| Is it shared / referenced by many entities? | ❌ | ✅ |
| Does it have its own properties / relationships? | ❌ | ✅ |
| Do you traverse *through* it in queries? | ❌ | ✅ |
| Is it a domain concept with identity? | ❌ | ✅ |

### Memory Type → Graph Construct

| Memory Type | Core Labels | Temporal Edge? | Typical Query |
|-------------|-------------|----------------|---------------|
| Working / STM | `Session → Message` | No (TTL on session) | Last N messages |
| Episodic | `Event → Entity` | `Event.ts` immutable | “All events involving X” |
| Semantic / Factual | `Entity → Entity` | Optional `validFrom/To` on rels | “Company of Alice” |
| Temporal / Versioned | `Preference` on `HAS_PREF` | Yes (`validFrom`, `validTo`) | “Theme on date D” |
| Procedural / Skill | `Skill` node, `HAS_SKILL` edge | Version on node | “Latest summarisation prompt” |

---

## 🧨 Common Misconceptions (and the Reality)

| Misconception | Reality |
|---------------|---------|
| “Neo4j always uses BFS or DFS for every Cypher query.” | Cypher is compiled into an *execution plan* with operators (index seek, expand, filter). Traversal strategy depends on planner, runtime, predicates, indexes — not a single hard-coded BFS/DFS. |
| “Unbounded `*` traversals are fine on small graphs.” | Even modest density explodes combinatorially; always bound (`*1..3`) and filter. |
| “Vector search alone is enough for RAG.” | Vector finds *semantically similar* text; graph adds *connected* context (authors, topics, provenance). Hybrid strictly improves multi-hop QA. |
| “Store every noun as an `Entity` node.” | Graph size & traversal cost explode; only canonicalise *named entities* that participate in relationships. |
| “One driver per request.” | Driver = connection pool; create **once** at startup, reuse, close on shutdown. |
| “Indexes are free; index everything.” | Each index costs storage, write latency, and planner complexity. Index only hot lookup paths (proved by `PROFILE`). |
| “Text-to-Cypher is safe if the LLM is smart.” | Generated Cypher is **untrusted input** — validate, run with restricted DB role, sandbox, and verify result shape. |

---

## 📖 Glossary

| Term | Definition |
|------|------------|
| **Bolt** | Neo4j’s binary protocol (port 7687) for driver ↔ DB communication. |
| **Index-free adjacency** | Nodes store direct pointers to their relationships → O(1) hop traversal. |
| **Vector index** | Native Neo4j 5+ index that enables ANN search over `embedding` property (cosine / L2). |
| **GraphRAG** | Retrieval-Augmented Generation that fuses vector similarity with graph traversal. |
| **Entity resolution** | Mapping surface mentions (“Apple”, “AAPL”) to a single canonical `Entity` node. |
| **Temporal edge** | Relationship carrying `validFrom` / `validTo` to model facts that change over time. |
| **Profile** | Materialised view (e.g., `HAS_SKILL` counts) aggregated from raw events/observations. |
| **Working memory** | Short-lived conversation window (`Session → Message`), typically TTL’d. |
| **Episodic memory** | Immutable log of interactions (`Event` nodes) for replay / audit. |
| **Cypher injection** | Unsafe string interpolation in queries; prevented by parameterised `executeQuery`. |

---

## ❓ 20 Self-Check Questions (answers in chapter files)

1. **01** – What are the four core building blocks of a property graph?  
2. **01** – Contrast *key-value* vs *connected* memory models for an AI agent.  
3. **02** – Write a Cypher pattern that finds all `User`s who `LIKES` a `Hotel` in *Paris* (one line).  
4. **02** – Difference between `CREATE` and `MERGE` when the pattern already exists?  
5. **03** – Which protocol and default port does the Neo4j Bolt driver use?  
6. **03** – Name two deployment options for Neo4j and one trade-off each.  
7. **04** – Why must the `neo4j-driver` instance be a singleton in a Node.js process?  
8. **04** – Show the pseudo-code for a safe parameterised `executeQuery` call.  
9. **05** – When should a concept become a separate `Node` instead of a `Property`? (decision rule)  
10. **05** – Explain why “Neo4j uses BFS for this query” is an oversimplification.  
11. **05** – How do you model a user preference that changed on 2025-01-15? (temporal edge)  
12. **06** – Write the `CREATE VECTOR INDEX` statement for 1536-dim cosine embeddings on `Document.embedding`.  
13. **06** – Why is context fusion (vector + graph) better than vector-only for multi-hop questions?  
14. **06** – What is the danger of `MATCH (a)-[*]-(b)` without bounds?  
15. **07** – Sketch the entity-resolution flow for a new mention “AAPL”.  
16. **07** – Which index makes “recent 30-min messages” fast?  
17. **07** – Difference between *episodic* and *semantic* memory in graph terms.  
18. **08** – What CI step should run before every deploy to catch full-scan Cypher queries?  
19. **08** – List the three files that must change if the embedding dimension changes from 1536 → 3072.  
20. **08** – How does the integration test prove “hybrid > dense-only”?

*(Answers: see the corresponding chapter files `notes/01…08_*.md`.)*

---

## 🔗 Chapter Files (detail lives here)

| # | File | One-Line Summary |
|---|------|------------------|
| 01 | `notes/01_Graph_Database_Fundamentals.md` | Graph basics, cognitive memory, paradigm comparison |
| 02 | `notes/02_Cypher_Query_Language.md` | Cypher syntax, CRUD, patterns, variable-length paths |
| 03 | `notes/03_Neo4j_Architecture_Deployment_LLM_Cypher.md` | Neo4j internals, Bolt, Aura/Docker, LLM→Cypher |
| 04 | `notes/04_Neo4j_NodeJS_Driver.md` | Driver lifecycle, sessions, transactions, injection safety |
| 05 | `notes/05_Advanced_Graph_Modeling_GraphRAG_Memory.md` | Node vs property, BFS/DFS, temporal memory, hybrid retrieval |
| 06 | `notes/06_GraphRAG_Hybrid_Retrieval.md` | Vector index, bounded graph hops, fusion, endpoint sketch |
| 07 | `notes/07_AI_Agent_Memory_Systems.md` | Memory taxonomy, entity resolution, profiles, indexing |
| 08 | `notes/08_End_to_End_Cognitive_Memory_App.md` | Repo layout, migrations, typed query lib, tests, Docker, prod checklist |

---

## 🛠️ Code & Assignment (from `prompt.md` Blocks 3-5)

- **Basic Code** – minimal Express + TS service under `code/Basic Code/` (see `implementation guide/`).  
- **Production Code** – hardened version under `code/Production Code/` with observability, retries, secrets.  
- **Assignment** – `Assignment/task.md` derived from roadmap **Build** & **Gate** (multi-hop QA test).

---

## ✅ Lecture 20 Checklist (from `README.md`)

| Step | Status |
|------|--------|
| Read every source note listed in the roadmap for Lecture 20 | ✅ |
| Write my own chapter notes in `notes/` | ✅ (01-08) |
| Build / rebuild the code in `code/` | ☐ (pending) |
| Pass the lecture's completion gate | ☐ (run integration test) |

---

*End of complete notes. For deep dives, open the individual chapter files linked above.*