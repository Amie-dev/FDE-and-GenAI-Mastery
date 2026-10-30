import { Driver } from "neo4j-driver";
import { config } from "../config/config";

/** Typed Cypher query library (Chapter 04, 06).
 * Wraps driver.session.run() and returns plain JS objects so routes
 * never have to deal with raw Neo4j Record APIs.
 */
export class CypherService {
  constructor(private driver: Driver) {}

  /** Find documents similar to a query embedding (Chapter 06). */
  async similarDocs(
    embedding: number[],
    k = 5,
    index = config.vectorIndex
  ): Promise<{ id: string; title: string; snippet: string; score: number }[]> {
    const session = this.driver.session({ database: config.neo4jDatabase });
    try {
      const result = await session.run(
        `CALL db.index.vector.queryNodes($index, $k, $embedding)
         YIELD node AS doc, score
         RETURN doc.id AS id, doc.title AS title, doc.content AS content, score
         ORDER BY score DESC`,
        { index, k, embedding }
      );
      return result.records.map((r) => ({
        id: r.get("id"),
        title: r.get("title"),
        snippet: r.get("content").slice(0, 160),
        score: r.get("score"),
      }));
    } finally {
      await session.close();
    }
  }

  /** Expand a retrieved document one hop: author & topics (Chapter 06). */
  async expandDocContext(
    docIds: string[]
  ): Promise<{ authors: string[]; topics: string[] }[]> {
    const session = this.driver.session({ database: config.neo4jDatabase });
    try {
      const result = await session.run(
        `UNWIND $ids AS id
         MATCH (d:Document {id: id})
         OPTIONAL MATCH (d)-[:WRITTEN_BY]->(author:User)
         OPTIONAL MATCH (d)-[:ABOUT]->(topic:Topic)
         RETURN d.id AS docId, collect(DISTINCT author.name) AS authors, collect(DISTINCT topic.name) AS topics`,
        { ids: docIds }
      );
      return result.records.map((r) => ({
        authors: r.get("authors") || [],
        topics: r.get("topics") || [],
      }));
    } finally {
      await session.close();
    }
  }
}