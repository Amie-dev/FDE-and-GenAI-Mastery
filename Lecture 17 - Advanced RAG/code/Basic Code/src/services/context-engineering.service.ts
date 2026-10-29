/**
 * Chapter 07 — Context Engineering (Ordering, Budget, Framing)
 *
 * Decides what goes in the prompt, in what order, with what labels,
 * and which precedence rules apply — so the model follows the specific
 * policy over the general one.
 */

import { Candidate } from "./retrieval.service";

export interface ContextChunk {
  label: string;       // [1], [2], ...
  text: string;
  source: string;      // document title / id
  tokens: number;
}

export interface AssembledContext {
  chunks: ContextChunk[];
  totalTokens: number;
  systemPrompt: string;
}

/**
 * Four explicit precedence rules (Chapter 07 §7.5).
 * These go in the system prompt so the model knows which rule wins.
 */
const PRECEDENCE_RULES = `
PRECEDENCE RULES:
1. A category-specific rule overrides a general rule.
2. The most recent effective date wins when policies conflict.
3. If evidence is insufficient, say you cannot answer — do not guess.
4. Always cite the source label [n] for every claim.
`.trim();

/**
 * Assemble context: order specific-first, general-last, apply token budget,
 * label each chunk, and attach precedence rules.
 */
export function assembleContext(
  candidates: Candidate[],
  { maxTokens = 3000, maxChunks = 5 }: { maxTokens?: number; maxChunks?: number } = {}
): AssembledContext {
  // Order: more specific categories first, then general (Chapter 07 §7.4)
  const ordered = [...candidates].sort((a, b) => {
    const aSpec = a.metadata.category === "electronics" ? 1 : 0;
    const bSpec = b.metadata.category === "electronics" ? 1 : 0;
    return bSpec - aSpec;
  });

  const chunks: ContextChunk[] = [];
  let totalTokens = 0;

  ordered.forEach((c, i) => {
    if (chunks.length >= maxChunks) return;
    const label = `[${i + 1}]`;
    const text = c.text;
    const tokens = Math.ceil(text.length / 4);

    if (totalTokens + tokens > maxTokens) return; // drop whole chunk (Ch 07 §7.7)

    chunks.push({ label, text, source: c.id, tokens });
    totalTokens += tokens;
  });

  const systemPrompt = `
You are a helpful assistant. Answer using ONLY the provided context.

${PRECEDENCE_RULES}

CONTEXT:
${chunks.map((c) => `${c.label} ${c.text} (source: ${c.source})`).join("\n")}

Answer the question and cite sources as [n].
`.trim();

  return { chunks, totalTokens, systemPrompt };
}