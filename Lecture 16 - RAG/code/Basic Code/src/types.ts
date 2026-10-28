/** Shared types for the Lecture 16 (RAG) basic code.
 * Kept in one file so every service and controller agrees on the shapes.
 */

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  tenantId: string;
  messages: Message[];
  updatedAt: string;
}

/** One retrieval-ready piece of a document, exactly as Chapter 03 describes. */
export interface Chunk {
  text: string;
  metadata: {
    source: string;
    docId: string;
    chunk: number;
    page?: number;
    section?: string;
  };
}

/** What the in-memory vector index stores: id + vector + flat metadata. */
export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface IngestResult {
  file: string;
  chunks: number;
  embedded: number;
}

export interface Match {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface QueryContext {
  tenantId: string;
  roles: string[];
  sessionId: string;
}