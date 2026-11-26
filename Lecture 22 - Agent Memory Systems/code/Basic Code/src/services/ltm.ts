import type { Memory, MemorySearchResult, MemorySourceType } from "../types";
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

const POISON_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /always\s+(send|forward|exfiltrate|post)\b/i,
  /\bexfiltrate\b/i,
  /<\/?system>/i,
  /\boverride\s+(policy|rules|safety)\b/i,
];

const SOURCE_TRUST: Record<MemorySourceType, number> = {
  user_explicit: 0.95,
  assistant_inferred: 0.75,
  external_tool: 0.3,
};

/**
 * Chapter 09 — write-validation guard against memory poisoning.
 * Blocks prompt-injected instructions and low-trust external tool writes before LTM consolidation.
 */
export function validateMemoryWrite(
  content: string,
  sourceType: MemorySourceType = "user_explicit"
): { ok: boolean; reason?: string; trustScore: number } {
  const trustScore = SOURCE_TRUST[sourceType];
  if (sourceType === "external_tool" || trustScore < 0.5) {
    return {
      ok: false,
      reason: `Untrusted sourceType '${sourceType}' (trustScore=${trustScore}) cannot write directly to LTM`,
      trustScore,
    };
  }

  for (const pattern of POISON_PATTERNS) {
    if (pattern.test(content)) {
      return {
        ok: false,
        reason: `Poisoned memory write blocked (matched ${pattern.source})`,
        trustScore,
      };
    }
  }

  return { ok: true, trustScore };
}

export function isExpired(memory: Memory, nowMs: number = Date.now()): boolean {
  if (memory.status !== "active") return true;
  if (!memory.expiresAt) return false;
  return new Date(memory.expiresAt).getTime() <= nowMs;
}

/** Checked write with poisoning validation, TTL expiry, and optional revision link. */
export function addMemoryChecked(input: {
  userId: string;
  content: string;
  confidence: number;
  source: string;
  sourceType?: MemorySourceType;
  ttlSeconds?: number;
  supersedesId?: string;
}): { memory: Memory | null; blocked: boolean; reason?: string } {
  const sourceType = input.sourceType ?? "user_explicit";
  const check = validateMemoryWrite(input.content, sourceType);
  if (!check.ok) {
    return { memory: null, blocked: true, reason: check.reason };
  }

  const nowMs = Date.now();
  const exists = memories.find(
    (m) =>
      m.userId === input.userId &&
      !isExpired(m, nowMs) &&
      m.content.toLowerCase() === input.content.toLowerCase()
  );
  if (exists) return { memory: null, blocked: false, reason: "Duplicate active memory" };

  let version = 1;
  if (input.supersedesId) {
    const prev = memories.find((m) => m.id === input.supersedesId && m.userId === input.userId);
    if (prev) {
      prev.status = "superseded";
      prev.updatedAt = now();
      version = prev.version + 1;
    }
  }

  const expiresAt =
    typeof input.ttlSeconds === "number" && input.ttlSeconds > 0
      ? new Date(nowMs + input.ttlSeconds * 1000).toISOString()
      : undefined;

  const memory: Memory = {
    id: uid(),
    userId: input.userId,
    content: input.content,
    createdAt: now(),
    updatedAt: now(),
    lastAccessedAt: now(),
    expiresAt,
    hitCount: 0,
    version,
    status: "active",
    supersedesId: input.supersedesId,
    confidence: input.confidence,
    source: input.source,
    sourceType,
    trustScore: check.trustScore,
  };
  memories.push(memory);
  return { memory, blocked: false };
}

/** Add one memory, skipping duplicates and blocking poisoned writes. */
export function addMemory(input: {
  userId: string;
  content: string;
  confidence: number;
  source: string;
  sourceType?: MemorySourceType;
  ttlSeconds?: number;
  supersedesId?: string;
}): Memory | null {
  return addMemoryChecked(input).memory;
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
  const nowMs = Date.now();
  const scored = memories
    .filter((m) => m.userId === userId && !isExpired(m, nowMs))
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

/** All active memories for a user (used by background reflection). */
export function getMemories(userId: string): Memory[] {
  const nowMs = Date.now();
  return memories.filter((m) => m.userId === userId && !isExpired(m, nowMs));
}

/** Chapter 09 — purge expired memories (TTL sweep). */
export function purgeExpiredMemories(userId?: string): number {
  const nowMs = Date.now();
  let purged = 0;
  for (let i = memories.length - 1; i >= 0; i--) {
    const m = memories[i]!;
    if (userId && m.userId !== userId) continue;
    if (m.expiresAt && new Date(m.expiresAt).getTime() <= nowMs) {
      m.status = "expired";
      memories.splice(i, 1);
      purged++;
    }
  }
  return purged;
}

/** Chapter 09 — GDPR cascade delete for all LTM records owned by `userId`. */
export function deleteUserMemories(userId: string): number {
  let deleted = 0;
  for (let i = memories.length - 1; i >= 0; i--) {
    if (memories[i]!.userId === userId) {
      memories.splice(i, 1);
      deleted++;
    }
  }
  return deleted;
}

export { embed };
