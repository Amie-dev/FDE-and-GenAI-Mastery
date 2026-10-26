/**
 * Lecture 06 — shared types.
 *
 * Every type in this file makes one notes chapter concrete: a role, a turn, a
 * session, a budget, a context policy, a memory fact, a citation, a finding.
 */

/**
 * Chapter 01 §01.5 — roles are *authority levels*, not formatting.
 * `system` = trusted standing policy · `user` = untrusted input ·
 * `assistant` = the model's own prior commitments.
 */
export type Role = 'system' | 'user' | 'assistant';

/** Chapter 01 §01.5 — one message exactly as the provider receives it. */
export interface ChatTurn {
  role: Role;
  content: string;
}

/**
 * Chapter 02 §02.9 — the input-budget tiers.
 * The notes' tier 3 (tool outputs) belongs to Lecture 08; this lab has no tools.
 */
export type Tier = 'system' | 'memory' | 'grounded' | 'history' | 'current';

/**
 * Chapter 01 §01.2 — the application, not the model, owns conversation state.
 * The model is stateless; this object is the memory it does not have.
 */
export interface SessionState {
  sessionId: string;
  userId: string;
  createdAt: number;
  turns: ChatTurn[]; // hot path: anchor + recent window (chapter 01 §01.6)
  compacted: ChatTurn[]; // cold path: the durable transcript, kept for audit and recall
  runningSummary: string; // compressed older turns (chapter 03 §03.4)
  ledger: TurnLedger[]; // budget telemetry (chapter 02 §02.9 step 4)
}

/** Chapter 02 §02.9 step 4 — instrument the budget, don't guess it. */
export interface TurnLedger {
  at: number;
  inputTokens: number;
  outputTokens: number;
  tokensByTier: Record<Tier, number>;
  historyTrimmed: number;
  refused: boolean; // chapter 06 §06.9 / chapter 07 §07.9 — over-refusal is a metric
  ttftMs?: number; // chapter 05 §05.3
  itlMs?: number; // chapter 05 §05.3
}

/** Chapter 03 §03.8 — one manager, declarative policy, no bespoke code paths. */
export interface ContextPolicy {
  budgetTokens: number; // B — the history-tier budget (the elastic tier)
  anchorTurns: number; // K — first K turns pinned (0 = disabled)
  recentTurns: number; // M — most recent turns kept verbatim
  summarise: boolean; // enable rolling compaction (off the hot path)
  summariseThreshold: number; // compact when raw turns exceed this
  semanticRecall: number; // top-k old turns recalled (0 = disabled)
}

/**
 * Chapters 02 + 03 — what the assembly actually did.
 * The payload alone is not enough: you cannot debug a budget you cannot see.
 */
export interface AssemblyReport {
  messages: ChatTurn[];
  tokensByTier: Record<Tier, number>;
  inputTokens: number;
  outputReserve: number;
  contextWindow: number;
  historyKept: number;
  historyTrimmed: number;
  anchorTurns: number;
  recalledTurns: number;
  summaryPresent: boolean;
  fits: boolean;
  notes: string[];
}

/**
 * Chapter 04 §04.9 — a durable fact: typed, categorised, with provenance,
 * and deletable. This is what "the model remembered" actually means.
 */
export interface UserFact {
  factId: string;
  category: 'preference' | 'constraint' | 'identity';
  content: string;
  source: 'explicit-user' | 'inferred';
  recordedAt: number;
  expiresAt?: number;
}

/** Chapter 07 §07.4 — one retrievable chunk; every chunk carries a source id. */
export interface KbChunk {
  id: string;
  title: string;
  text: string;
  score?: number;
}

/** Chapters 07 + 08 — one guardrail finding. `block` stops, `warn` advises. */
export interface Finding {
  rule: string;
  severity: 'block' | 'warn';
  detail: string;
}

/** Chapter 07 §07.8 — the verdict of the deterministic post-generation verifier. */
export interface Verification {
  ok: boolean;
  checked: number; // cited claims examined
  ratio: number; // worst keyword-overlap ratio seen
  problems: string[]; // claims that failed the threshold
}

/** Chapter 07 §07.11 — what the grounded engine returns. */
export interface GroundedAnswer {
  answer: string;
  isRefusal: boolean;
  citations: string[];
  verification: Verification;
  findings: Finding[];
}
