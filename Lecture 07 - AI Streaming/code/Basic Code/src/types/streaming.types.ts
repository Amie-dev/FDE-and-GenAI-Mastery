/**
 * Lecture 07 — shared types.
 *
 * Every type here makes one notes chapter concrete: a turn, a typed stream
 * event, a metrics row, a persisted turn, a decode/frame/torture report.
 */

/** Chapter 09 §09.1 — one turn exactly as the provider receives it. */
export type Role = 'system' | 'user' | 'assistant';

export interface ChatTurn {
  role: Role;
  content: string;
}

/** Chapter 01 §01.2.4 — why generation stopped. It MUST reach the client. */
export type FinishReason = 'stop' | 'length' | 'error' | 'aborted';

/**
 * Chapter 09 §09.5 — usage is not known until generation ends, so the stream
 * fills this holder: estimate during, reconcile at the end.
 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * Chapter 07 §07.7 — the in-band event contract.
 *
 * Once `200 OK` and the first byte have left the server the status is frozen,
 * so every mid-stream signal travels INSIDE the stream as a typed event.
 */
export type StreamEvent =
  | {
      event: 'status';
      data: { phase: 'generating'; model: string; conversationId: string };
    }
  | { event: 'token'; data: { text: string } }
  | { event: 'usage'; data: Usage }
  | { event: 'error'; data: { code: string; message: string; recoverable: boolean } }
  | {
      event: 'done';
      data: { finishReason: FinishReason; ttftMs: number | null; itlMs: number | null };
    };

/**
 * Chapter 03 §03.5 — the numbers you must log, per stream.
 * A single "request took 7.4s" cannot tell you which layer to fix.
 */
export interface StreamMetrics {
  at: number;
  conversationId: string;
  /** Chapter 07 §07.1/§07.2 — the delivery shape, and therefore the return type. */
  transport: 'buffered' | 'raw' | 'sse';
  ttftMs: number | null;
  itlMs: number | null;
  tps: number | null;
  totalMs: number;
  /** Chapter 07 §07.6 — frames written to the socket after coalescing. */
  frames: number;
  chars: number;
  /** Chapter 04 §04.6 — the buffering smoke alarm. */
  charsPerFrame: number;
  promptTokens: number;
  completionTokens: number;
  finishReason: FinishReason;
  aborted: boolean;
  /** Chapter 03 §03.3 — true when TPS already exceeds human reading speed. */
  fasterThanReading: boolean;
}

/** Chapter 09 §09.4 — a partial answer the user already read is still a turn. */
export type TurnStatus = 'complete' | 'length' | 'interrupted';

/** Chapter 09 §09.6 — the persisted turn. One per role per exchange. */
export interface PersistedTurn {
  messageId: string;
  role: Role;
  content: string;
  status: TurnStatus;
  finishReason: FinishReason | null;
  usage: Usage | null;
  createdAt: number;
  firstTokenAt: number | null;
  completedAt: number | null;
}

/** Chapter 09 §09.2 — the conversation store the model does not have. */
export interface Conversation {
  conversationId: string;
  createdAt: number;
  turns: PersistedTurn[];
}

/** Chapter 04 §04.4 — naive vs streaming decode, side by side. */
export interface DecodeReport {
  payload: string;
  byteLength: number;
  chunks: number;
  naive: string;
  streaming: string;
  naiveIsCorrect: boolean;
  streamingIsCorrect: boolean;
}

/** Chapter 04 §04.3/§04.5 — frame reassembly with and without a leftover buffer. */
export interface FrameReport {
  payload: string;
  chunks: number;
  correct: { frames: number; text: string; leftover: string };
  naive: { frames: number; text: string };
  equal: boolean;
}

/** Chapter 04 §04.6 — one row of the fragmentation torture test. */
export interface TortureCase {
  strategy: string;
  mode: 'raw' | 'sse';
  chunks: number;
  ok: boolean;
  actual: string;
  expected: string;
}

export interface TortureReport {
  payload: string;
  cases: TortureCase[];
  ok: boolean;
}
