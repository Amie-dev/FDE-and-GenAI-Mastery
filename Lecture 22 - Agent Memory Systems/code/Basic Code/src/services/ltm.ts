import type { Memory, MemorySearchResult } from "../types";
import { config } from "../config/config";

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** Rough token counter: 1 token ≈ 4 characters. */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Deterministic "embedding": a stable small vector from text so search works
 * without an external embedding API. (Swap for real embeddings in production,
 * as Chapter 3 describes.)
 */
function embed(text: string): number[] {
  const vector = new Array(8).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 8; i++) {
    vector[i] = ((hash >> (i * 4)) & 0xf) / 15;
  }
  return vector;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

const memories: Memory[] = [];

/** Long-Term Memory (Chapters 3, 4, 5).
 *
 * Stores extracted facts per user with metadata (timestamps, hit count,
 * confidence, version). Search returns only the most relevant memories so the
 * prompt stays small instead of loading everything every request.
 */

/** Add one memory, skipping exact duplicates already stored for this user. */
export function addMemory(input: {
  userId: string;
  content: string;
  confidence: number;
  source: string;
}): Memory | null {
  const exists = memories.find(
    (m) =>
      m.userId === input.userId &&
      m.content.toLowerCase() === input.content.toLowerCase()
  );
  if (exists) return null;

  const memory: Memory = {
    id: uid(),
    userId: input.userId,
    content: input.content,
    createdAt: now(),
    updatedAt: now(),
    lastAccessedAt: now(),
    hitCount: 0,
    version: 1,
    confidence: input.confidence,
    source: input.source,
  };
  memories.push(memory);
  return memory;
}

/** Search memories for a user. Simple semantic-style ranking via vector
 * similarity on the deterministic embedding. Returns top-K.
 */
export function searchMemories(
  userId: string,
  query: string,
  topK: number
): MemorySearchResult[] {
  const queryVec = embed(query);
  const scored = memories
    .filter((m) => m.userId === userId)
    .map((m) => ({
      memory: m,
      score: cosine(queryVec, embed(m.content)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  for (const result of scored) {
    result.memory.lastAccessedAt = now();
    result.memory.hitCount += 1;
  }
  return scored;
}

/** Record that a memory was used (updates hit tracking for eviction). */
export function recordHit(memoryId: string): void {
  const memory = memories.find((m) => m.id === memoryId);
  if (!memory) return;
  memory.lastAccessedAt = now();
  memory.hitCount += 1;
}

/** Score a memory: frequency + recency. Low scores are eviction candidates. */
export function memoryScore(memory: Memory): number {
  const ageDays =
    (Date.now() - new Date(memory.lastAccessedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 30 - ageDays);
  return memory.hitCount + recencyScore;
}

/** Find memories below the eviction score threshold. */
export function findEvictionCandidates(threshold: number): Memory[] {
  return memories.filter((m) => memoryScore(m) < threshold);
}

/** Delete a memory by id. */
export function deleteMemory(memoryId: string): boolean {
  const index = memories.findIndex((m) => m.id === memoryId);
  if (index === -1) return false;
  memories.splice(index, 1);
  return true;
}

/** All memories for a user (used by background reflection). */
export function getMemories(userId: string): Memory[] {
  return memories.filter((m) => m.userId === userId);
}

export { embed };
