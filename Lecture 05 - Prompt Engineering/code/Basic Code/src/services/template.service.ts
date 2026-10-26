import type { ChatFormat, ChatTurn } from '../types/prompt.types.js';

/**
 * Chapter 06 — chat templates.
 *
 * IMPORTANT: a `messages` array never reaches the transformer. A chat template
 * serialises it into a model-specific token sequence first. The renderers below
 * exist so you can SEE that sequence while debugging — they are **not** used on
 * the request path, because sending a pre-templated string to a chat API is the
 * "double templating" bug (chapter 06 §06.8).
 */

/** Chapter 06 §06.3 — the generation prompt: the marker that invites the assistant's turn. */
export const GENERATION_PROMPT = '<|im_start|>assistant';

/** Chapter 06 §06.5 — ChatML: explicit role boundaries around every turn. */
export const renderChatMl = (turns: ChatTurn[]): string =>
  `${turns.map((t) => `<|im_start|>${t.role}\n${t.content}\n<|im_end|>`).join('\n')}\n${GENERATION_PROMPT}`;

/** Chapter 06 §06.5 — Alpaca: Instruction / Input / Response. There is no role concept. */
export const renderAlpaca = (turns: ChatTurn[]): string => {
  const system = turns.filter((t) => t.role === 'system').map((t) => t.content).join('\n');
  const user = turns.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
  const assistant = turns.filter((t) => t.role === 'assistant').map((t) => t.content).join('\n');

  // The system prompt is folded into the instruction — that is the Alpaca weakness.
  return `### Instruction:\n${[system, user].filter(Boolean).join('\n\n')}\n\n### Input:\n\n### Response:\n${assistant}`;
};

/** Chapter 06 §06.5 — Llama 2 INST: the <<SYS>> block is valid only at the start, once. */
export const renderInst = (turns: ChatTurn[]): string => {
  const system = turns.filter((t) => t.role === 'system').map((t) => t.content).join('\n');
  const rest = turns.filter((t) => t.role !== 'system');

  const body = rest
    .map((t) => (t.role === 'user' ? `[INST]\n${t.content}\n[/INST]` : t.content))
    .join('\n');

  return system ? `<<SYS>>\n${system}\n<</SYS>>\n\n${body}` : body;
};

/** Chapter 06 §06.5 — FLAN-T5: the instruction IS the prefix; text-to-text, no roles. */
export const renderFlan = (turns: ChatTurn[]): string =>
  turns
    .filter((t) => t.role !== 'assistant')
    .map((t) => t.content)
    .join('\n\n');

/** Chapter 06 §06.5 — all four, side by side, for the debugging endpoint. */
export const renderAll = (turns: ChatTurn[]): Record<ChatFormat, string> => ({
  chatml: renderChatMl(turns),
  alpaca: renderAlpaca(turns),
  inst: renderInst(turns),
  flan: renderFlan(turns),
});
