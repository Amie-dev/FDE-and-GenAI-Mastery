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

export interface Memory {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  hitCount: number;
  version: number;
  confidence: number;
  source: string;
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

export interface GraphRAGRequest {
  question: string;
  topK?: number;
  maxHops?: number;
}

export interface GraphRAGResponse {
  answer: string;
  citations: any[];
}

export interface ExpandDocContext {
  authors: string[];
  topics: string[];
}

export interface VectorSearchHit {
  id: string;
  title: string;
  snippet: string;
  score: number;
}