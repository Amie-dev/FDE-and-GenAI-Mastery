import { z } from 'zod';
import type { Finding, PromptSlots, TicketVerdict } from '../types/prompt.types.js';

/**
 * Chapter 07 — prompt hygiene as code: delimiters, ordering, contradictions,
 * the output contract and the validation ladder.
 */

/**
 * Chapter 07 §07.3 — escape the closing delimiter inside user text.
 * Without this, a user can type `</data>` and forge their way out of the data block.
 */
export const escapeDelimiters = (text: string, tag: string): string =>
  text.replaceAll(`</${tag}>`, `<\\/${tag}>`).replaceAll(`<${tag}>`, `<\\${tag}>`);

/** Chapter 07 §07.3 — wrap untrusted data in a named, escaped block. */
export const delimit = (text: string, tag = 'data'): string =>
  `<${tag}>\n${escapeDelimiters(text, tag)}\n</${tag}>`;

/**
 * Chapter 01 §01.2 + chapter 07 §07.4 — build the trusted part of the prompt.
 * The five slots, in the canonical order, with the untrusted slot left out.
 */
export const assembleSystem = (slots: PromptSlots): string =>
  [
    slots.role ? `ROLE:\n${slots.role}` : '',
    `TASK:\n${slots.task}`,
    slots.constraints?.length
      ? `CONSTRAINTS:\n${slots.constraints.map((rule) => `- ${rule}`).join('\n')}`
      : '',
    slots.contract ? `OUTPUT CONTRACT:\n${slots.contract}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** Chapter 07 §07.4 — untrusted data goes LAST, and only here. */
export const buildUserBlock = (slots: PromptSlots): string =>
  slots.context ? `DATA:\n${delimit(slots.context)}` : '';

/**
 * Chapter 07 §07.5 — contradictions the model would otherwise resolve arbitrarily.
 * Each row is [one side, the other side, what the conflict is about].
 */
const CONTRADICTIONS: [RegExp, RegExp, string][] = [
  [/\b(concise|brief|short)\b/i, /\b(thorough|in depth|exhaustive|every detail)\b/i, 'length: concise vs thorough'],
  [/\b(json only|no prose|no markdown)\b/i, /\b(explain|commentary|introduction|friendly)\b/i, 'format: JSON only vs prose'],
  [/\b(one word|single word)\b/i, /\b(explain|reason|steps|detail)\b/i, 'length: one word vs explanation'],
  [/\bnever mention competitors\b/i, /\bcompare (all )?(vendors|alternatives)\b/i, 'scope: no competitors vs compare vendors'],
];

/** Chapter 07 §07.5 — report every contradictory pair found in the prompt. */
export const findContradictions = (prompt: string): Finding[] =>
  CONTRADICTIONS.filter(([a, b]) => a.test(prompt) && b.test(prompt)).map(([, , detail]) => ({
    rule: 'contradiction',
    severity: 'block' as const,
    detail,
  }));

/** Chapter 07 §07.6 — a "do not" hides the behaviour you actually want. */
export const toPositiveRule = (negative: string): string => {
  const hints: [RegExp, string][] = [
    [/\bverbose\b/i, 'Answer in at most 40 words.'],
    [/\bmarkdown\b/i, 'Return plain text with no formatting characters.'],
    [/\binvent|hallucinate\b/i, 'Use only values present in the data; if a value is missing, set it to null.'],
    [/\bcompetitors?\b/i, 'Discuss only our product; if asked to compare, say comparison is out of scope.'],
  ];

  const hit = hints.find(([re]) => re.test(negative));
  return hit ? hit[1] : 'State the behaviour you want instead of only forbidding the one you do not.';
};

/**
 * Chapter 07 §07.9 — the hygiene checklist, run as code.
 * This is the "prompt lint" that runs before a prompt is allowed to ship.
 */
export const runHygieneChecklist = (prompt: string): Finding[] => {
  const findings: Finding[] = [...findContradictions(prompt)];

  const check = (ok: boolean, rule: string, detail: string): void => {
    if (!ok) findings.push({ rule, severity: 'warn', detail });
  };

  check(/\bROLE:/i.test(prompt) || /^You are\b/im.test(prompt), 'slot-1-role', 'No role / persona slot — slot 1 is empty.');
  check(/\bTASK:/i.test(prompt), 'slot-2-task', 'No explicit TASK block — the goal is implicit.');
  check(/\bCONSTRAINTS:/i.test(prompt), 'slot-4-constraints', 'No CONSTRAINTS block — nothing bounds the answer.');
  check(/\bOUTPUT CONTRACT:/i.test(prompt), 'slot-5-contract', 'No OUTPUT CONTRACT — the answer shape is unspecified.');
  check(/<\/[a-z_]+>/i.test(prompt), 'data-delimited', 'No closing delimiter found — untrusted data may be unmarked.');
  check(
    !/DATA:/i.test(prompt) || /DATA:\s*<[a-z_]+>/is.test(prompt),
    'data-last',
    'The DATA block is not immediately delimited after its label (chapter 07 §07.4).',
  );
  check(!/\b(api[_-]?key|password|secret|token)\s*[:=]\s*\S+/i.test(prompt), 'no-secrets', 'The prompt appears to contain a credential.');
  check(
    !/\b(never|do not|don't)\b/i.test(prompt) || /\binstead\b|\bonly\b|at most/i.test(prompt),
    'positive-rules',
    'Negative rules are used without stating the wanted behaviour (chapter 07 §07.6).',
  );

  return findings;
};

/**
 * Chapter 07 §07.7 — the output contract.
 * This is the only part of a prompt a machine can verify, so it is written twice:
 * once as text for the model, once as a schema for the validator.
 */
export const TICKET_CONTRACT_TEXT = `Return JSON only. No markdown, no commentary, no preamble.
{
  "category":   "BILLING" | "TECHNICAL" | "ACCOUNT" | "OTHER",
  "summary":    string,   // max 2 sentences, max 240 characters
  "severity":   1 | 2 | 3 | 4 | 5,
  "needsHuman": boolean
}
If the data is empty or has no actionable content, return
{ "category": "OTHER", "summary": "", "severity": 1, "needsHuman": true }.
If severity is 5, needsHuman must be true.`;

export const ticketContractSchema = z.object({
  category: z.enum(['BILLING', 'TECHNICAL', 'ACCOUNT', 'OTHER']),
  summary: z.string().max(240),
  severity: z.number().int().min(1).max(5),
  needsHuman: z.boolean(),
});

/** Chapter 07 §07.7 — step 1 of the ladder: get JSON out of a chatty response. */
const extractJson = (raw: string): unknown => {
  const withoutFences = raw.replace(/```(?:json)?/gi, '').trim();
  const candidate = withoutFences.startsWith('{')
    ? withoutFences
    : (withoutFences.match(/\{[\s\S]*\}/)?.[0] ?? '');

  if (!candidate) return undefined;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return undefined;
  }
};

export interface ValidationResult {
  ok: boolean;
  step: 'parse' | 'schema' | 'semantics' | 'done';
  value?: TicketVerdict;
  detail?: string;
}

/**
 * Chapter 07 §07.7 — the validation ladder: parse → schema → semantics.
 * Step 4 (safety) lives in `services/guardrail.service.ts`, because it is a
 * different concern (chapter 08) applied to the same value.
 */
export const validateOutput = (raw: string): ValidationResult => {
  const parsed = extractJson(raw);

  if (parsed === undefined) {
    return { ok: false, step: 'parse', detail: 'Output was not valid JSON.' };
  }

  const schemaResult = ticketContractSchema.safeParse(parsed);

  if (!schemaResult.success) {
    return {
      ok: false,
      step: 'schema',
      detail: schemaResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    };
  }

  const value = schemaResult.data as TicketVerdict;

  // Semantics: rules a schema cannot express (chapter 07 §07.7).
  if (value.severity === 5 && !value.needsHuman) {
    return { ok: false, step: 'semantics', detail: 'severity 5 requires needsHuman: true.' };
  }

  return { ok: true, step: 'done', value };
};

