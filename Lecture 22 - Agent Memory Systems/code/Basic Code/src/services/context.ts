import type { Message, Memory } from "../types";
import { config } from "../config/config";
import { countTokens } from "./ltm";

/** Context assembly (Chapter 4).
 *
 * Builds the final LLM prompt from four parts:
 *   System prompt → LTM memories → STM messages → current Query
 * Each part is trimmed so the total stays inside the token budget. Order
 * matters: recent STM first, persistent LTM next, current query last.
 */

export interface ContextOptions {
  systemPrompt: string;
  ltmMemories: Memory[];
  stmMessages: Message[];
  currentQuery: string;
  maxTokens?: number;
}

function itemTokens(item: { content: string }): number {
  return countTokens(item.content);
}

export function assembleContext(options: ContextOptions): {
  messages: { role: string; content: string }[];
  tokenBudget: { used: number; max: number };
} {
  const {
    systemPrompt,
    ltmMemories,
    stmMessages,
    currentQuery,
    maxTokens = config.maxContextTokens,
  } = options;

  const messages: { role: string; content: string }[] = [];
  let used = 0;

  // 1. System prompt — fixed cost, always first.
  const system = { role: "system", content: systemPrompt };
  used += itemTokens(system);
  messages.push(system);

  // 2. LTM memories — persistent facts, newest first.
  for (const memory of ltmMemories) {
    const item = { role: "system", content: `Memory: ${memory.content}` };
    if (used + itemTokens(item) > maxTokens) break;
    used += itemTokens(item);
    messages.push(item);
  }

  // 3. STM messages — recent conversation, oldest-first inside the window.
  for (let i = stmMessages.length - 1; i >= 0; i--) {
    const item = stmMessages[i];
    if (used + itemTokens(item) > maxTokens) break;
    used += itemTokens(item);
    messages.push(item);
  }

  // 4. Current query — added only if room remains.
  const query = { role: "user", content: currentQuery };
  if (used + itemTokens(query) <= maxTokens) {
    used += itemTokens(query);
    messages.push(query);
  }

  return { messages, tokenBudget: { used, max: maxTokens } };
}
