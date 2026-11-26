import type { Memory } from "../types";
import { config } from "../config/config";
import { addMemory } from "./ltm";

/** Fact extraction (Chapter 3).
 *
 * Turns raw conversation into persistent facts. This basic implementation uses
 * a small heuristic so it runs without an LLM key; swap in an LLM-based
 * extractor (as Chapter 3 describes) when a key is available.
 */

const FACT_PREFIXES = [
  "my name is",
  "i am",
  "i live in",
  "i prefer",
  "i like",
  "i work at",
  "i am allergic to",
];

function extractCandidateFacts(text: string): string[] {
  const lower = text.toLowerCase().trim();
  return FACT_PREFIXES.filter((prefix) => lower.startsWith(prefix)).map(
    (prefix) => {
      const rest = text.slice(prefix.length).trim();
      return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}${rest ? " " : ""}${rest}`;
    }
  );
}

/** Extract facts from a user message and store the confident ones in LTM. */
export function extractAndStoreFacts(input: {
  userId: string;
  message: string;
  source: string;
}): Memory[] {
  const facts: Memory[] = [];
  for (const content of extractCandidateFacts(input.message)) {
    const memory = addMemory({
      userId: input.userId,
      content,
      confidence: 0.8,
      source: input.source,
    });
    if (memory && memory.confidence >= config.factConfidenceThreshold) {
      facts.push(memory);
    }
  }
  return facts;
}
