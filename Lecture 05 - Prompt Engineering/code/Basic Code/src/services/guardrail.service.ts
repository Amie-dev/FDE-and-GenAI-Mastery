import { config } from '../config/config.js';
import type { Finding } from '../types/prompt.types.js';

/**
 * Chapter 08 — guardrails as code.
 *
 * The rule the whole chapter turns on: *prompts guide the model; application
 * code enforces security.* Everything in this file is enforcement, not advice.
 */

/** Chapter 08 §08.4 — the classic direct-injection patterns. */
const INJECTION_PATTERNS: { rule: string; re: RegExp }[] = [
  { rule: 'instruction-override', re: /\b(ignore|disregard|forget)\b[^.]{0,30}\b(previous|prior|above|all)\b[^.]{0,20}\b(instruction|rule|prompt)/i },
  { rule: 'role-switch', re: /\b(you are now|from now on you are|act as|pretend to be)\b[^.]{0,40}\b(admin|administrator|developer mode|unrestricted|dan)\b/i },
  { rule: 'context-reset', re: /\b(the (previous|above) (instructions|rules) (were|are) a test|new system prompt)\b/i },
  { rule: 'disclosure-request', re: /\b(print|repeat|show|reveal|output)\b[^.]{0,30}\b(system prompt|initial instruction|your rules)\b/i },
  { rule: 'fake-role-tag', re: /<\/?(system|assistant|im_start|im_end)\b/i },
];

/**
 * Chapter 08 §08.8 — a moderation stub.
 * A real service calls a moderation / safety API here (and on retrieved content
 * too, not just on user text). This list exists only to show *where* it goes.
 */
const UNSAFE_TERMS = ['kill yourself', 'bomb making', 'credit card dump'];

/**
 * Chapter 08 §08.7 — INPUT guardrails: everything that runs before the model
 * sees the request. A blocking finding means we never spend a token.
 */
export const scanInput = (text: string): Finding[] => {
  const findings: Finding[] = [];

  // Length limit: oversized input is a cost and a dilution problem, not a feature.
  if (text.length > config.MAX_INPUT_CHARS) {
    findings.push({
      rule: 'input-length',
      severity: 'block',
      detail: `Input is ${text.length} chars, over the ${config.MAX_INPUT_CHARS} limit.`,
    });
  }

  // Injection: untrusted content that reads like an instruction (chapter 08 §08.3–08.6).
  for (const { rule, re } of INJECTION_PATTERNS) {
    const match = text.match(re);
    if (match) {
      findings.push({
        rule: `injection:${rule}`,
        severity: 'warn',
        detail: `Untrusted text contains an instruction-like phrase: "${match[0].slice(0, 80)}".`,
      });
    }
  }

  // Moderation (chapter 08 §08.8).
  const lowered = text.toLowerCase();
  const unsafe = UNSAFE_TERMS.find((term) => lowered.includes(term));
  if (unsafe) {
    findings.push({ rule: 'moderation:input', severity: 'block', detail: `Unsafe term detected: "${unsafe}".` });
  }

  return findings;
};

/** Chapter 08 §08.7 — output guardrails: PII and secrets must never leave the service. */
const PII_PATTERNS: { rule: string; re: RegExp }[] = [
  { rule: 'pii:email', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { rule: 'pii:phone', re: /\+?\d[\d\s-]{8,}\d/ },
  { rule: 'pii:card', re: /\b(?:\d[ -]*?){13,16}\b/ },
];

const SECRET_PATTERNS: { rule: string; re: RegExp }[] = [
  { rule: 'secret:openai-key', re: /\bsk-[A-Za-z0-9_-]{12,}/ },
  { rule: 'secret:bearer', re: /\bBearer\s+[A-Za-z0-9._-]{12,}/i },
  { rule: 'secret:assignment', re: /\b(api[_-]?key|password|secret)\s*[:=]\s*\S{6,}/i },
];

/**
 * Chapter 08 §08.7 — OUTPUT guardrails, plus two markers that matter for
 * prompt-injection work: a leaked system prompt, and a refusal.
 */
export const scanOutput = (text: string): Finding[] => {
  const findings: Finding[] = [];

  for (const { rule, re } of [...PII_PATTERNS, ...SECRET_PATTERNS]) {
    const match = text.match(re);
    if (match) {
      findings.push({ rule, severity: 'block', detail: `Output leaked: "${match[0].slice(0, 40)}".` });
    }
  }

  // Chapter 08 §08.9 — prompt extraction: did the model echo our own rules back?
  if (/\bOUTPUT CONTRACT:|\bCONSTRAINTS:\s*-/i.test(text)) {
    findings.push({ rule: 'prompt-extraction', severity: 'block', detail: 'Output appears to contain system-prompt text.' });
  }

  return findings;
};

/** Chapter 08 §08.9 — a refusal is a legitimate outcome, not an error. */
export const isRefusal = (text: string): boolean =>
  /\b(i can'?t|i cannot|i'm unable|unable to help|i won'?t|not able to assist)\b/i.test(text);

/**
 * Chapter 08 §08.10 — TOOL guardrails.
 * The model *proposes* a tool call; the risk class decides who may execute it.
 */
export const TOOL_RISK: Record<string, 'read' | 'write' | 'critical'> = {
  searchTickets: 'read',
  getCustomer: 'read',
  updateTicket: 'write',
  issueRefund: 'critical',
  deleteAccount: 'critical',
};

export interface ToolDecision {
  allowed: boolean;
  requiresHuman: boolean;
  reason: string;
}

/** Chapter 08 §08.10 — least privilege + human-in-the-loop for irreversible actions. */
export const authoriseTool = (tool: string, args: Record<string, unknown>): ToolDecision => {
  const risk = TOOL_RISK[tool];

  if (!risk) {
    return { allowed: false, requiresHuman: false, reason: `Tool "${tool}" is not on the allow-list.` };
  }

  // Least privilege: a write tool may never receive a wildcard scope (chapter 08 §08.10).
  if (args.scope === '*' || args.all === true) {
    return { allowed: false, requiresHuman: false, reason: 'Wildcard scope rejected: least privilege is required.' };
  }

  if (risk === 'critical') {
    return { allowed: false, requiresHuman: true, reason: `"${tool}" is irreversible — human approval required.` };
  }

  return {
    allowed: true,
    requiresHuman: risk === 'write',
    reason: risk === 'write' ? 'Write executed with audit + notification.' : 'Read-only call permitted.',
  };
};

/** Any `block` finding means the pipeline must stop, not warn. */
export const hasBlocking = (findings: Finding[]): boolean => findings.some((f) => f.severity === 'block');
