import type { Memory } from "../types";
import { config } from "../config/config";
import {
  getMemories,
  deleteMemory,
  findEvictionCandidates,
  memoryScore,
} from "./ltm";

/** Memory dreaming / background reflection (Chapter 6).
 *
 * Runs outside the user request path. It loads a user's memories, cleans
 * duplicates and low-value memories, and reports what it did.
 */

export interface DreamResult {
  totalMemories: number;
  duplicatesRemoved: number;
  evicted: number;
  actions: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Run one reflection cycle for a user. */
export function runDream(userId: string): DreamResult {
  const memories = getMemories(userId);
  const actions: string[] = [];
  let duplicatesRemoved = 0;
  let evicted = 0;

  // 1. Remove exact duplicates, keeping the first occurrence.
  const seen = new Set<string>();
  for (const memory of memories) {
    const key = normalize(memory.content);
    if (seen.has(key)) {
      deleteMemory(memory.id);
      duplicatesRemoved += 1;
      actions.push(`removed duplicate: ${memory.content}`);
    } else {
      seen.add(key);
    }
  }

  // 2. Evict low-value memories (few hits and old last access).
  const remaining = getMemories(userId);
  for (const memory of findEvictionCandidates(config.evictionScoreThreshold)) {
    if (!remaining.some((m) => m.id === memory.id)) continue;
    deleteMemory(memory.id);
    evicted += 1;
    actions.push(
      `evicted low-value memory (score ${memoryScore(memory)}): ${memory.content}`
    );
  }

  return {
    totalMemories: memories.length,
    duplicatesRemoved,
    evicted,
    actions,
  };
}
