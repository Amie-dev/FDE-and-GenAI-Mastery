export type SourceStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type SourceType = "TEXT" | "MARKDOWN" | "PDF" | "WEBSITE" | "YOUTUBE";
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRYING";
export type ArtifactType = "FLASHCARD" | "QUIZ" | "SUMMARY" | "AUDIO_OVERVIEW";

export interface Source {
  id: string;
  workspaceId: string;
  title: string;
  type: SourceType;
  content?: string;
  status: SourceStatus;
  chunkCount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chunk {
  id: string;
  sourceId: string;
  index: number;
  content: string;
  tokenCount?: number;
  page?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ChatCitation {
  sourceId?: string;
  sourceTitle: string;
  sourceType: string;
  chunkId?: string;
  chunkIndex?: number;
  page?: number;
  excerpt: string;
  score?: number;
  url?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: ChatCitation[];
  createdAt: Date;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string;
  title?: string;
  summary?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  metadata?: Record<string, any>;
  error?: string;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  conversationId: string;
  workspaceId: string;
  userId: string;
  content: any;
  generatedAt: Date;
}