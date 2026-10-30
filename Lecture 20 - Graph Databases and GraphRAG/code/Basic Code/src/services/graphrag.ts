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