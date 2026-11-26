import OpenAI from "openai";
import { config } from "../config/config";
import type { Match, Message } from "../types";

/**
 * Generation service — Chapter 06 (grounded generation + prompt contract).
 *
 * The prompt is the contract: role + verbatim context + [n] citation grammar +
 * an explicit refusal. The model answers ONLY from the context, or says it does
 * not know. Citations are verified against the chunks actually placed in the
 * prompt so the model can never cite a chunk it did not see.
 */

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an internal support assistant. Answer using ONLY the context below.
If the answer is not in the context, say "I don't have that information." and stop.
Cite every fact with [n] where n is the context chunk number.
Never cite a chunk you did not use. Do not invent.`;

export function buildPrompt(question: string, chunks: Match[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${String(c.metadata.source ?? c.id)})\n${String(c.metadata.text ?? "")}`)
    .join("\n\n");

  return [
    SYSTEM_PROMPT,
    "",
    "=== CONTEXT ===",
    context || "(no relevant context found)",
    "",
    "=== QUESTION ===",
    question,
    "",
    "=== ANSWER ===",
  ].join("\n");
}

/** Generate a grounded answer. Returns answer text plus the chunk ids it cited. */
export async function generate(params: {
  question: string;
  chunks: Match[];
  history?: Message[];
}): Promise<{ answer: string; citedChunkIds: string[]; refused: boolean }> {
  const { question, chunks, history = [] } = params;
  const prompt = buildPrompt(question, chunks);

  let answer: string;
  if (!config.openaiApiKey) {
    // Offline learning mode: deterministic, clearly grounded answer.
    answer =
      chunks.length > 0
        ? `Based on the provided context, here is what the documents say:\n\n` +
          chunks
            .map((c, i) => `[${i + 1}] ${String(c.metadata.text ?? "").slice(0, 120)}...`)
            .join("\n")
        : "I don't have that information.";
  } else {
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: prompt },
    ];
    const res = await getClient().chat.completions.create({
      model: config.chatModel,
      messages,
      temperature: 0.2,
      max_tokens: 512,
    });
    answer = res.choices[0]?.message?.content ?? "";
  }

  const refused = /i don't have that information/i.test(answer);
  // Citations used in the answer, verified against chunks present in the prompt (Chapter 06).
  const citedChunkIds = chunks
    .filter((_c, i) => answer.includes(`[${i + 1}]`))
    .map((c) => c.id);

  return { answer, citedChunkIds, refused };
}