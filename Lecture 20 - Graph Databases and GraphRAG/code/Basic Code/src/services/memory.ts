import { Memory, MemorySearchResult } from "../types";
import { config } from "../config/config";

/** Agent memory helpers (Chapter 07).
 * STM = short-term sliding window; LTM = long-term facts.
 */
export class AgentMemory {
  private stm = new Map<string, { messages: { role: string; content: string }[] }>();

  appendMessage(sessionId: string, message: { role: string; content: string }): void {
    let sess = this.stm.get(sessionId);
    if (!sess) {
      sess = { messages: [] };
      this.stm.set(sessionId, sess);
    }
    sess.messages.push(message);
  }

  recentMessages(sessionId: string, n: number): { role: string; content: string }[] {
    const sess = this.stm.get(sessionId);
    if (!sess) return [];
    return sess.messages.slice(-n);
  }

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

  searchFacts(userId: string, query: string, topK = config.ltmTopK): MemorySearchResult[] {
    // Production: query Neo4j graph for facts related to userId.
    // Basic code returns an empty list to keep the app minimal.
    return [];
  }
}