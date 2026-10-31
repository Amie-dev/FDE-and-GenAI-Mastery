import { Memory, MemorySearchResult } from "../types";
import { config } from "../config/config";
import { getDriver } from "../db/driver";

/** Agent memory helpers (Chapter 07). */
export class AgentMemory {
  private driver = getDriver();

  /** Append a message to STM (in-memory, short-term). */
  appendMessage(sessionId: string, message: { role: string; content: string }): void {
    const now = Date.now();
    // STM is kept in-memory; real implementation persists to Redis or neo4j.
    // Pseudo code:
    // await this.neo4j.run(
    //   `MERGE (s:Session {id: $sid})
    //    CREATE (s)-[:HAS_MESSAGE]->(m:Message {role: $role, content: $content, ts: datetime()})`,
    //   { sid: sessionId, ...message }
    // );
    console.log(`[STM] Message appended to session ${sessionId}`, { ...message, ts: now });
  }

  /** Retrieve recent N messages from STM. */
  recentMessages(sessionId: string, n: number = config.STM_WINDOW_SIZE): { role: string; content: string }[] {
    // Pseudo code for production:
    // const result = await this.driver.executeQuery(
    //   `MATCH (s:Session {id: $sid})-[:HAS_MESSAGE]->(m:Message)
    //    RETURN m ORDER BY m.ts DESC LIMIT $n`,
    //   { sid: sessionId, n }
    // );
    // return result.records.map(r => r.get('m'));
    return [];
  }

  /** Add a factual memory (LTM). */
  addFact(fact: {
    userId: string;
    content: string;
    confidence?: number;
    source?: string;
  }): Memory {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      userId: fact.userId,
      content: fact.content,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      hitCount: 0,
      version: 1,
      confidence: fact.confidence ?? 0.8,
      source: fact.source ?? "user",
    };
  }

  /** Search LTM facts. */
  searchFacts(userId: string, query: string, topK: number = config.LTM_TOP_K): MemorySearchResult[] {
    // Production: query Neo4j graph for facts related to userId.
    return [];
  }
}