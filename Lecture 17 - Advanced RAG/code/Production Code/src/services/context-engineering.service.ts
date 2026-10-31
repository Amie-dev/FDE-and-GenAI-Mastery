import { Candidate, ContextChunk, AssembledContext } from "../types/index";
import { config } from "../config/config";

const PRECEDENCE_RULES = `
PRECEDENCE RULES:
1. A category-specific rule overrides a general rule.
2. The most recent effective date wins when policies conflict.
3. If evidence is insufficient, say you cannot answer — do not guess.
4. Always cite the source label [n] for every claim.
`.trim();

export function assembleContext(
  candidates: Candidate[],
  { maxTokens = config.MAX_CONTEXT_TOKENS, maxChunks = config.MAX_CHUNKS }: { maxTokens?: number; maxChunks?: number } = {}
): AssembledContext {
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

    if (totalTokens + tokens > maxTokens) return;

    chunks.push({ label, text, source: c.id, tokens, metadata: c.metadata });
    totalTokens += tokens;
  });

  const systemPrompt = `
You are a helpful assistant. Answer using ONLY the provided context.

${PRECEDENCE_RULES}

CONTEXT:
${chunks.map((c) => `${c.label} ${c.text} (source: ${c.source})`).join("\n")}

Answer the question and cite sources as [n].
`.trim();

  return { chunks, totalTokens, systemPrompt, userPrompt: "" };
}