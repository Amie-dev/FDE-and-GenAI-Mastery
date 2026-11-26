import { v4 as uuidv4 } from "uuid";
import { Source, Chunk, Message, Conversation, Job, Artifact } from "../types";

class MemoryStore {
  sources = new Map<string, Source>();
  chunks = new Map<string, Chunk[]>();
  conversations = new Map<string, Conversation>();
  jobs = new Map<string, Job>();
  artifacts = new Map<string, Artifact>();

  now = () => new Date();

  // ---- Sources ----
  createSource(data: Omit<Source, "id" | "status" | "createdAt" | "updatedAt">): Source {
    const source: Source = { ...data, id: uuidv4(), status: "PENDING", createdAt: this.now(), updatedAt: this.now() };
    this.sources.set(source.id, source);
    return source;
  }
  getSource(id: string): Source | undefined {
    return this.sources.get(id);
  }
  updateSource(id: string, patch: Partial<Source>): Source | undefined {
    const source = this.sources.get(id);
    if (!source) return undefined;
    const updated = { ...source, ...patch, updatedAt: this.now() };
    this.sources.set(id, updated);
    return updated;
  }
  deleteSource(id: string): boolean {
    this.chunks.delete(id);
    return this.sources.delete(id);
  }
  listSources(workspaceId: string): Source[] {
    return [...this.sources.values()].filter((s) => s.workspaceId === workspaceId);
  }

  // ---- Chunks ----
  saveChunks(sourceId: string, chunks: Chunk[]): void {
    this.chunks.set(sourceId, chunks);
  }
  getChunks(sourceId: string): Chunk[] {
    return this.chunks.get(sourceId) ?? [];
  }
  deleteChunks(sourceId: string): void {
    this.chunks.delete(sourceId);
  }
  getChunkById(sourceId: string, chunkId: string): Chunk | undefined {
    return this.getChunks(sourceId).find((c) => c.id === chunkId);
  }

  // simple in-memory "vector" search: keyword overlap score
  searchChunks(workspaceId: string, query: string, topK = 6): Chunk[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const candidates: { chunk: Chunk; score: number }[] = [];
    for (const source of this.listSources(workspaceId)) {
      for (const chunk of this.getChunks(source.id)) {
        let score = 0;
        const text = chunk.content.toLowerCase();
        for (const term of terms) if (text.includes(term)) score += 1;
        if (score > 0) candidates.push({ chunk, score });
      }
    }
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((c) => c.chunk);
  }

  // ---- Conversations / Messages ----
  createConversation(data: Omit<Conversation, "id" | "messages" | "createdAt" | "updatedAt">): Conversation {
    const conversation: Conversation = { ...data, id: uuidv4(), messages: [], createdAt: this.now(), updatedAt: this.now() };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }
  addMessage(conversationId: string, message: Omit<Message, "id" | "createdAt">): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const msg: Message = { ...message, id: uuidv4(), createdAt: this.now() };
    conversation.messages.push(msg);
    conversation.updatedAt = this.now();
    this.conversations.set(conversationId, conversation);
    return msg;
  }

  // ---- Jobs ----
  createJob(data: Omit<Job, "id" | "createdAt" | "updatedAt">): Job {
    const job: Job = { ...data, id: uuidv4(), retries: 0, createdAt: this.now(), updatedAt: this.now() };
    this.jobs.set(job.id, job);
    return job;
  }
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }
  updateJob(id: string, patch: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...patch, updatedAt: this.now() };
    this.jobs.set(id, updated);
    return updated;
  }
  listJobs(): Job[] {
    return [...this.jobs.values()];
  }

  // ---- Artifacts ----
  createArtifact(data: Omit<Artifact, "id" | "generatedAt">): Artifact {
    const artifact: Artifact = { ...data, id: uuidv4(), generatedAt: this.now() };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }
  listArtifacts(conversationId: string): Artifact[] {
    return [...this.artifacts.values()].filter((a) => a.conversationId === conversationId);
  }
}

export const store = new MemoryStore();