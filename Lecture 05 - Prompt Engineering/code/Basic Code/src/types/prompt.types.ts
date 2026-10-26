/**
 * Lecture 05 — shared types.
 *
 * Every type in this file exists to make one notes chapter's idea concrete:
 * a slot, an exemplar, a persona, a pattern, a chat format, a metric, a registry entry.
 */

/**
 * Chapter 01 — the five slots of a well-formed prompt.
 * Slots 1, 2, 4 and 5 are written by the application and are TRUSTED.
 * Slot 3 (`context`) is written by someone else and is UNTRUSTED (chapter 07).
 */
export interface PromptSlots {
  role?: string; // 1 · who is answering
  task: string; // 2 · what exactly must be done
  context?: string; // 3 · the data to work from — always delimited
  constraints?: string[]; // 4 · what is mandatory / forbidden
  contract?: string; // 5 · the exact shape of a valid answer
}

/** Chapter 03 — an exemplar is one input→output demonstration, not a sentence. */
export interface Exemplar {
  input: string;
  output: string;
  label?: string; // used by the class-coverage rule (chapter 03, §03.7)
}

/** Chapter 05 — a persona is a small specification: seven fields plus a fallback. */
export interface Persona {
  id: string;
  version: string;
  identity: string;
  expertise: string[];
  audience: string;
  tone: string[];
  rules: string[];
  outputFormat: string;
  fallback: string;
}

/** Chapters 02–05 — the four techniques this lab builds and compares. */
export type Pattern = 'zero-shot' | 'few-shot' | 'cot' | 'persona';

/** Chapter 06 — the four chat templates this lab can render for inspection. */
export type ChatFormat = 'chatml' | 'alpaca' | 'inst' | 'flan';

/** Chapter 06 — one conversation turn, before it becomes a model-specific token sequence. */
export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Chapter 07 — the exact shape a caller can rely on. */
export interface TicketVerdict {
  category: 'BILLING' | 'TECHNICAL' | 'ACCOUNT' | 'OTHER';
  summary: string;
  severity: 1 | 2 | 3 | 4 | 5;
  needsHuman: boolean;
}

/** Chapter 08 — one hygiene or guardrail finding. */
export interface Finding {
  rule: string;
  severity: 'block' | 'warn';
  detail: string;
}

/** Chapter 09 — the six metrics that decide whether a prompt change is an improvement. */
export interface Metrics {
  formatValidity: number; // parseable + contract-valid
  taskAccuracy: number; // correct label on the golden set
  refusalRate: number; // legitimate requests declined
  injectionSuccessRate: number; // adversarial fixtures that changed behaviour (target: 0)
  avgInputTokens: number;
  avgOutputTokens: number;
  p95LatencyMs: number;
}

/** Chapter 09 — one registry entry: id, version, status, owner, template, metrics, changelog. */
export interface PromptRecord {
  id: string;
  version: string;
  status: 'draft' | 'canary' | 'active' | 'deprecated';
  owner: string;
  pattern: Pattern;
  personaId?: string;
  slots: PromptSlots;
  exemplars?: Exemplar[];
  changelog: { version: string; date: string; change: string; evalDelta: string }[];
  metrics?: Metrics;
}

/** Chapter 09 — one golden-set case. `stratum` is the bucket it belongs to. */
export interface GoldenCase {
  id: string;
  stratum: string;
  input: string;
  expectedCategory: TicketVerdict['category'];
  adversarial?: boolean;
  injectedToken?: string; // if this token appears in the output, the injection worked
}
