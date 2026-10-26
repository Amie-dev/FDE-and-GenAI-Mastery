import { REFUSAL_TEXT } from '../config/prompts.js';
import type { Finding, KbChunk, Verification } from '../types/chat.types.js';

/**
 * Chapter 07 §07.3 + §07.8 — layers 1 and 6.
 *
 * Layer 1 stops hostile input before it becomes context.
 * Layer 6 refuses to trust the model's output: it verifies it in code.
 * Both must be deterministic and cheap, because both run on every request.
 */

/** §07.3 — invisible characters hide injections from human review. */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;

/** §07.3 — the "ignore previous instructions" family, plus delimiter breakout. */
const INJECTION_PATTERNS: { rule: string; pattern: RegExp }[] = [
  { rule: 'injection_ignore', pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i },
  { rule: 'injection_disregard', pattern: /disregard\s+(all\s+)?(previous|prior|the\s+)?(instructions?|rules?)/i },
  { rule: 'injection_role_switch', pattern: /you\s+are\s+now\s+(a|an|the)\b/i },
  { rule: 'injection_prompt_leak', pattern: /(reveal|print|repeat|show)\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions?)/i },
  { rule: 'injection_marker', pattern: /\bpwned\b|jailbreak|developer\s+mode/i },
];

/** §07.3 — PII detection and redaction, for data minimisation and compliance. */
const PII_PATTERNS: { rule: string; pattern: RegExp; replacement: string }[] = [
  { rule: 'pii_email', pattern: /[\w.+-]+@[\w-]+\.[\w.]+/g, replacement: '[REDACTED:EMAIL]' },
  { rule: 'pii_card', pattern: /\b(?:\d[ -]?){13,16}\b/g, replacement: '[REDACTED:CARD]' },
  { rule: 'pii_phone', pattern: /\+?\d[\d\s-]{8,}\d/g, replacement: '[REDACTED:PHONE]' },
];

export interface InputScreen {
  ok: boolean;
  text: string;
  findings: Finding[];
}

/** Chapter 07 §07.3 — the input gate: limits → normalise → classify → redact. */
export const sanitizeInput = (raw: string, maxChars: number): InputScreen => {
  const findings: Finding[] = [];

  if (raw.trim().length === 0) {
    findings.push({ rule: 'input_empty', severity: 'block', detail: 'The message is empty.' });
  }
  // Length caps prevent budget exhaustion and cost attacks (§07.3).
  if (raw.length > maxChars) {
    findings.push({ rule: 'input_too_long', severity: 'block', detail: `${raw.length} characters exceeds the ${maxChars} cap.` });
  }

  let text = raw.normalize('NFKC').replace(INVISIBLE, '');
  if (text.length !== raw.length) {
    findings.push({ rule: 'unicode_stripped', severity: 'warn', detail: `${raw.length - text.length} invisible character(s) removed.` });
  }

  // Escape our own delimiters so user text cannot break out of the data block.
  text = text.replace(/```/g, "'''").replace(/\[\s*(system|context|assistant)\s*\]/gi, '(marker)');

  for (const { rule, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      findings.push({ rule, severity: 'block', detail: `Matched ${pattern}. This layer reduces risk; it does not eliminate it.` });
    }
  }

  for (const { rule, pattern, replacement } of PII_PATTERNS) {
    const before = text;
    text = text.replace(pattern, replacement);
    if (text !== before) {
      findings.push({ rule, severity: 'warn', detail: 'PII redacted before it reached the context window.' });
    }
  }

  return { ok: !findings.some((finding) => finding.severity === 'block'), text, findings };
};

/** §07.8 — the CITATIONS line the refusal policy asks the model to emit. */
const CITATION_LINE = /^[ \t]*CITATIONS?[ \t]*:[ \t]*(.*)$/im;

/**
 * Chapter 07 §07.8 — keyword/entity overlap.
 * A claim whose content words are not in the retrieved evidence is not
 * "probably wrong", it is *unsupported* — and that is checkable in pure string ops.
 */
export const verifyClaims = (answer: string, sources: KbChunk[], threshold: number): Verification => {
  if (sources.length === 0) {
    return { ok: false, checked: 0, ratio: 0, problems: ['no source chunks were retrieved'] };
  }

  const sourceText = sources.map((chunk) => chunk.text).join(' ').toLowerCase();
  const sentences = answer.split(/[.!?]+\s+/).map((sentence) => sentence.trim()).filter(Boolean);

  const problems: string[] = [];
  let worst = 1;

  for (const sentence of sentences) {
    const terms = sentence
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4);
    if (terms.length === 0) continue;

    const ratio = terms.filter((term) => sourceText.includes(term)).length / terms.length;
    worst = Math.min(worst, ratio);
    if (ratio < threshold) problems.push(sentence);
  }

  return { ok: problems.length === 0, checked: sentences.length, ratio: Number(worst.toFixed(2)), problems };
};

export interface OutputScreen {
  answer: string;
  isRefusal: boolean;
  citations: string[];
  verification: Verification;
  findings: Finding[];
}

/**
 * Chapter 07 §07.8 — run the verifier on every non-refusal answer.
 * `strict` is the policy switch from §07.8: fail closed, or log only and ship.
 */
export const screenOutput = (raw: string, sources: KbChunk[], threshold: number, strict: boolean): OutputScreen => {
  const findings: Finding[] = [];

  const citations = (raw.match(CITATION_LINE)?.[1] ?? '')
    .split(',')
    .map((id) => id.trim().replace(/[[\]]/g, ''))
    .filter(Boolean);

  // The CITATIONS line is machine-readable plumbing; strip it before the customer sees it.
  const answer = raw.replace(CITATION_LINE, '').trim();
  const isRefusal = answer.toLowerCase().includes(REFUSAL_TEXT.toLowerCase().slice(0, 40));

  // Schema invariant (§07.8): a refusal must not also carry citations.
  if (isRefusal && citations.length > 0) {
    findings.push({ rule: 'schema_refusal_with_citations', severity: 'warn', detail: 'A refusal carried citations.' });
  }

  // Citation existence (§07.8): you cannot cite a chunk that was never retrieved.
  const retrieved = new Set(sources.map((chunk) => chunk.id));
  const unknown = citations.filter((id) => !retrieved.has(id));
  if (unknown.length > 0) {
    findings.push({ rule: 'citation_not_retrieved', severity: 'block', detail: `Cited but never retrieved: ${unknown.join(', ')}.` });
  }

  const verification = verifyClaims(answer, sources, threshold);

  if (!isRefusal && !verification.ok) {
    findings.push({
      rule: 'possible_hallucination',
      severity: strict ? 'block' : 'warn',
      detail: `Overlap ${verification.ratio} < ${threshold} for: ${verification.problems.join(' | ')}`,
    });
  }

  return { answer, isRefusal, citations, verification, findings };
};

/** §07.8 — a `block` stops the pipeline; a `warn` is advisory. */
export const hasBlocking = (findings: Finding[]): boolean => findings.some((finding) => finding.severity === 'block');

