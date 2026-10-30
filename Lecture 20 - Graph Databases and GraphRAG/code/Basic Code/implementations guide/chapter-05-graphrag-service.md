# Chapter 05 — GraphRAG Service

**Notes source:** `notes/06_GraphRAG_Hybrid_Retrieval.md`

**Goal:** Implement the hybrid retrieval pipeline: embed question → vector top-k → graph hop → fuse → LLM prompt.

---

## 1. `src/services/graphrag.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/graphrag.ts` |
| Chapter | 05 (supports Chapters 06–07) |
| What it does | Orchestrates GraphRAG retrieval and builds an LLM prompt. |

### Full code

```ts
import { Driver } from "neo4j-driver";
import { CypherService } from "./cypher";
import { embed } from "./embedding";
import { config } from "../config/config";

/** GraphRAG service – hybrid vector + graph retrieval (Chapter 06).
 * Pipeline: embed question → vector top-k → graph hop → fuse → LLM prompt.
 */
export class GraphRAGService {
  private cypher: CypherService;

  constructor(driver: Driver) {
    this.cypher = new CypherService(driver);
  }

  async answer(question: string): Promise<{ answer: string; context: any[] }> {
    const qEmb = embed(question);
    const vecDocs = await this.cypher.similarDocs(qEmb, config.vectorTopK);

    const docIds = vecDocs.map((d) => d.id);
    const expanded = docIds.length
      ? await this.cypher.expandDocContext(docIds)
      : [{ authors: [], topics: [] }];

    const fused: any[] = [];
    for (const d of vecDocs) {
      fused.push({
        source: "vector",
        title: d.title,
        snippet: d.snippet,
        score: d.score,
      });
    }

    for (const { authors, topics } of expanded) {
      for (const a of authors) {
        fused.push({ source: "graph", title: a, snippet: `author: ${a}`, score: 1 });
      }
      for (const t of topics) {
        fused.push({ source: "graph", title: t, snippet: `topic: ${t}`, score: 1 });
      }
    }

    fused.sort((a, b) => a.score - b.score);
    const contextLines = fused.map((c) => `${c.source}: ${c.title} – ${c.snippet}`).join("\n");
    const prompt = `Answer the question using the context below.\n\nQuestion: ${question}\nContext: ${contextLines}`;

    return { answer: prompt, context: fused };
  }
}
```

### Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `constructor(driver: Driver)` | Creates `CypherService` with the Neo4j driver. |
| `embed(question)` | Turns the user question into a vector. |
| `similarDocs(...)` | Queries Neo4j vector index for top-K similar documents. |
| `expandDocContext(...)` | Does one graph hop from each doc to its authors and topics. |
| `fused` | Merges vector results + graph results into one context list. |
| `fused.sort(...)` | Sorts fused results by score (vector scores first, then graph). |
| `contextLines` / `prompt` | Builds the LLM prompt from fused context. |
| `return` | Returns the answer (prompt placeholder) and the context array. |

### Command

```bash
npm run typecheck
```

### Self-check

1. Why is context fusion needed? → vector gives semantics, graph gives relationships.