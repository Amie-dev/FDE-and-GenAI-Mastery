import { Driver } from "neo4j-driver";
import { CypherService } from "./cypher";
import { embed } from "./embedding";
import { config } from "../config/config";
import { ragRequestsTotal, ragLatencyHistogram, vectorSearchHits, graphExpansionNodes } from "../observability/metrics";

/** GraphRAG service — hybrid vector + graph retrieval (Chapter 06). */
export class GraphRAGService {
  private cypher: CypherService;

  constructor(private driver: Driver) {
    this.cypher = new CypherService(driver);
  }

  async answer(question: string): Promise<{ answer: string; context: any[] }> {
    const phaseTimer = (phase: string) => ragLatencyHistogram.startTimer({ phase });
    const tVector = phaseTimer("vector_search");
    const tGraph = phaseTimer("graph_expansion");
    const tFuse = phaseTimer("context_fusion");

    try {
      // 1. Embed question
      const qEmb = await embed(question);

      // 2. Vector search for anchors
      const vecDocs = await this.cypher.similarDocs(qEmb);
      vectorSearchHits.set(vecDocs.length);
      tVector();
      ragRequestsTotal.inc({ status: "vector_ok" });

      const docIds = vecDocs.map((d) => d.id);
      if (docIds.length === 0) {
        return { answer: "No relevant documents found.", context: [] };
      }

      // 3. Bounded graph expansion
      const expanded = await this.cypher.expandDocContext(docIds);
      graphExpansionNodes.set(
        expanded.reduce((sum, e) => sum + e.authors.length + e.topics.length, 0)
      );
      tGraph();

      // 4. Fuse context (vector + graph)
      const fused: any[] = [];
      for (const d of vecDocs) {
        fused.push({ source: "vector", title: d.title, snippet: d.snippet, score: d.score });
      }
      for (const { authors, topics } of expanded) {
        for (const a of authors) fused.push({ source: "graph", title: a, snippet: `author: ${a}`, score: 1 });
        for (const t of topics) fused.push({ source: "graph", title: t, snippet: `topic: ${t}`, score: 1 });
      }

      fused.sort((a, b) => b.score - a.score);
      tFuse();

      const contextLines = fused.map((c) => `${c.source}: ${c.title} – ${c.snippet}`).join("\n");
      const prompt = `Answer the question using the context below.\n\nQuestion: ${question}\nContext: ${contextLines}`;

      // 5. LLM call (optional — stubbed here)
      let answer = prompt;
      if (config.OPENAI_API_KEY) {
        answer = await this.callLLM(prompt);
      }

      ragRequestsTotal.inc({ status: "success" });
      return { answer, context: fused };
    } catch (err) {
      ragRequestsTotal.inc({ status: "error" });
      throw err;
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: config.MAX_CONTEXT_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content ?? "";
  }
}
