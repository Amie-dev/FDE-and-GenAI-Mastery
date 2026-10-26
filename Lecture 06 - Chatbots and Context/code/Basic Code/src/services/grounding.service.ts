import { REFUSAL_POLICY, SYSTEM_PROMPT } from '../config/prompts.js';
import type { KbChunk } from '../types/chat.types.js';

/**
 * Chapter 07 §07.4 — layer 2: RAG grounding.
 *
 * Grounding is the only defence that changes what the model *can* say: it moves
 * the answer from parametric memory (frozen, unverifiable) to retrieved evidence
 * (current, citable, auditable).
 *
 * This lab uses keyword overlap as the retriever. Production uses hybrid
 * vector + BM25 search with re-ranking (Lecture 16) — the interface is identical,
 * and every chunk still carries a source id.
 */

const KNOWLEDGE_BASE: KbChunk[] = [
  {
    id: 'kb_delivery_areas',
    title: 'Service areas',
    text: 'Tomato operates in Delhi, Mumbai and Bangalore. Hyderabad, Pune and Chennai are not currently served.',
  },
  {
    id: 'kb_tracking',
    title: 'Order tracking',
    text: 'Live tracking is available in the app under Orders, then Track. A rider is assigned about 10 minutes before pickup.',
  },
  {
    id: 'kb_late_order',
    title: 'Late delivery policy',
    text: 'If an order arrives more than 20 minutes past the promised ETA, the customer may claim a delivery-fee credit of up to 75 rupees via Orders, then Help, then Late delivery.',
  },
  {
    id: 'kb_missing_item',
    title: 'Missing item policy',
    text: 'A missing item must be reported within 60 minutes of delivery via Orders, then Help, then Missing item. Verified reports are refunded to the original payment method within 3 to 5 working days.',
  },
  {
    id: 'kb_compensation_cap',
    title: 'Compensation ceiling',
    text: 'Compensation is capped at the value of the order. Support agents may not promise any amount above that cap; requests above it must be routed to a human supervisor.',
  },
  {
    id: 'kb_rider_privacy',
    title: 'Rider privacy',
    text: 'Rider personal data, including full name, phone number and documents, is never disclosed to customers. Only the masked first name and the vehicle number are visible after assignment.',
  },
];

/** Chapter 07 §07.8 — the verifier needs the raw text of exactly these chunks. */
export const getChunk = (id: string): KbChunk | undefined => KNOWLEDGE_BASE.find((chunk) => chunk.id === id);

/**
 * Chapter 07 §07.4 — retrieve the top-k chunks for a query.
 * Chunks are ranked, then capped by `k`; the budget tier then caps them by tokens.
 */
export const searchKnowledge = (query: string, k: number): KbChunk[] => {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return KNOWLEDGE_BASE.map((chunk) => {
    const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { ...chunk, score };
  })
    .filter((chunk) => (chunk.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, Math.max(0, k));
};

/** Chapter 07 §07.4 — every chunk is rendered *with its source id*, or it cannot be cited. */
export const renderContext = (chunks: KbChunk[]): string =>
  chunks.length === 0
    ? '(no matching records were retrieved)'
    : chunks.map((chunk) => `[${chunk.id}] ${chunk.title}: ${chunk.text}`).join('\n');

/**
 * Chapter 07 §07.11 step 4 — the calibrated, grounded system prompt.
 * Layer 0 (identity + rules) is deploy-time; only the evidence rules and the
 * context block change per request.
 */
export const buildGroundedSystemPrompt = (): string => `${SYSTEM_PROMPT}\n\n${REFUSAL_POLICY}`;
