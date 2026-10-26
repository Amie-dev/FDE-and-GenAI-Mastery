import { randomUUID } from 'node:crypto';
import type { UserFact } from '../types/chat.types.js';
import { contentWords } from './token.service.js';

/**
 * Chapter 04 — application memory.
 *
 * Prompting does not train the model: the weights are frozen (chapter 04 §04.5).
 * So "the assistant remembered my preference" is always this module — a durable,
 * auditable, *deletable* store that is read per request and injected as context.
 *
 * In production this is PostgreSQL (durable) plus Redis (hot). Here: a Map.
 */

const memory = new Map<string, UserFact[]>();

/** Chapter 04 §04.9 — facts are typed, categorised and carry provenance. */
export const saveFact = (userId: string, fact: Omit<UserFact, 'factId' | 'recordedAt'>): UserFact => {
  const stored: UserFact = { ...fact, factId: randomUUID(), recordedAt: Date.now() };
  memory.set(userId, [...(memory.get(userId) ?? []), stored]);
  return stored;
};

/**
 * Chapter 02 §02.9 tier 1 + chapter 04 §04.9 — top-K facts, never all facts.
 * Facts compete for the token budget, so rank by query overlap and recency,
 * and drop anything whose retention window has expired.
 */
export const getFactsForUser = (userId: string, limit: number, query = ''): UserFact[] => {
  const now = Date.now();
  const terms = contentWords(query);

  return (memory.get(userId) ?? [])
    .filter((fact) => fact.expiresAt === undefined || fact.expiresAt > now)
    .map((fact) => {
      const overlap = terms.filter((term) => fact.content.toLowerCase().includes(term)).length;
      return { fact, score: overlap * 1_000 + fact.recordedAt / 1e9 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.fact);
};

/** Chapter 04 §04.8 — GDPR right to be forgotten. */
export const deleteUserMemory = (userId: string): number => {
  const removed = (memory.get(userId) ?? []).length;
  memory.delete(userId);
  return removed;
};

/** Chapter 04 §04.8 — DSAR: a subject access request needs a machine-readable export. */
export const exportUserMemory = (userId: string): UserFact[] => memory.get(userId) ?? [];

/**
 * Chapter 04 §04.9 step 2 — synthesise the hydrated system block.
 * The last line matters: without it the model narrates its own plumbing
 * ("according to the list I was given...").
 */
export const renderFacts = (facts: UserFact[]): string => {
  const lines = facts.map((fact) => `- (${fact.category}) ${fact.content}`);
  return ['[PERSISTENT USER MEMORY & PREFERENCES]', ...lines, 'Use these facts naturally. Do not mention that you were given a list.'].join('\n');
};
