import { randomUUID } from 'node:crypto';
import type { ChatTurn, Conversation, FinishReason, PersistedTurn, Usage } from '../types/streaming.types.js';

/**
 * Chapter 09 §09.2 — the conversation store the model does not have.
 *
 * Two rules keep this multi-user safe (chapter 07 §07.8):
 *   1. state is scoped to a CONVERSATION, never to a shared service field;
 *   2. every write to one conversation is serialised by a per-conversation lock,
 *      so two parallel tabs cannot interleave and corrupt the transcript.
 *
 * In a real system this is a database; here it is a Map so the whole lecture is
 * observable from an endpoint.
 */

const store = new Map<string, Conversation>();
const locks = new Map<string, Promise<unknown>>();

/**
 * Chapter 07 §07.8 — the lock key is the conversationId, never the userId:
 * one user legitimately runs several conversations in parallel.
 */
export const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(() => fn());
  // Never let a rejected turn poison the chain for the next one.
  locks.set(
    key,
    run.catch(() => undefined),
  );
  return run;
};

export const loadOrCreate = (conversationId: string): Conversation => {
  const existing = store.get(conversationId);
  if (existing) return existing;

  const conversation: Conversation = { conversationId, createdAt: Date.now(), turns: [] };
  store.set(conversationId, conversation);
  return conversation;
};

export const getConversation = (conversationId: string): Conversation | null =>
  store.get(conversationId) ?? null;

export const listConversations = (): Conversation[] => [...store.values()];

/**
 * Chapter 09 §09.1 — the history the next prompt is built from.
 *
 * Notice what is NOT here: transport chunks. One exchange produces exactly one
 * user turn and exactly one assistant turn, so the prompt never accumulates
 * hundreds of redundant `assistant:` role markers.
 */
export const toMessages = (conversation: Conversation): ChatTurn[] =>
  conversation.turns.map((turn) => ({ role: turn.role, content: turn.content }));

/** Chapter 09 §09.3 — the user turn is recorded BEFORE the model call. */
export const appendUserTurn = (conversation: Conversation, content: string): PersistedTurn => {
  const turn: PersistedTurn = {
    messageId: randomUUID(),
    role: 'user',
    content,
    status: 'complete',
    finishReason: null,
    usage: null,
    createdAt: Date.now(),
    firstTokenAt: null,
    completedAt: Date.now(),
  };
  conversation.turns.push(turn);
  return turn;
};

export interface AssistantTurnInput {
  messageId: string;
  content: string;
  status: 'complete' | 'length' | 'interrupted';
  finishReason: FinishReason;
  usage: Usage;
  startedAt: number;
  firstTokenAt: number | null;
}

/**
 * Chapter 09 §09.6 — ONE atomic, idempotent write per exchange.
 *
 * The `messageId` is generated BEFORE streaming and the write is an upsert, so a
 * retry after a network failure cannot duplicate the turn.
 *
 * Chapter 09 §09.4 — an interrupted answer is still persisted: the user already
 * read it, and the next prompt depends on that text being present.
 */
export const upsertAssistantTurn = (conversation: Conversation, input: AssistantTurnInput): PersistedTurn => {
  const turn: PersistedTurn = {
    messageId: input.messageId,
    role: 'assistant',
    content: input.content,
    status: input.status,
    finishReason: input.finishReason,
    usage: input.usage,
    createdAt: input.startedAt,
    firstTokenAt: input.firstTokenAt,
    completedAt: Date.now(),
  };

  const index = conversation.turns.findIndex((existing) => existing.messageId === input.messageId);
  if (index >= 0) conversation.turns[index] = turn;
  else conversation.turns.push(turn);

  return turn;
};
