/** Shared types for the Lecture 22 (Agent Memory Systems) basic code.
 * Kept in one file so every service and controller agrees on the shapes.
 */

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  userId: string;
  messages: Message[];
  updatedAt: string;
}

export type MemorySourceType = "user_explicit" | "assistant_inferred" | "external_tool";
export type MemoryStatus = "active" | "superseded" | "expired";

export interface Memory {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  expiresAt?: string;
  hitCount: number;
  version: number;
  status: MemoryStatus;
  supersedesId?: string;
  confidence: number;
  source: string;
  sourceType: MemorySourceType;
  trustScore: number;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  stmMessages: number;
  ltmMemories: number;
}
