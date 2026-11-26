import { RISK_BANDS } from '../config/config.js';
import type { OutputVerdict, RiskAssessment, SecurityEvent } from '../types/agent.types.js';

/**
 * Chapter 08 §08.7 — the defensive wrapper.
 *
 * A guard checks people before they enter the building, and checks what leaves the
 * building too. The model is never directly exposed to every request, and the user
 * never directly talks to the model.
 *
 * WARNING, straight from the notes: this is a DEMONSTRATION, not a security layer.
 * Keyword matching is weak (paraphrase defeats it) and must never be your
 * authorization mechanism. It is one signal among many.
 */

/** §08.7.2 — the six prompt-injection patterns, as scoreable signals. */
const SIGNALS: { id: string; weight: number; pattern: RegExp; reason: string }[] = [
  {
    id: 'instructionOverride',
    weight: 30,
    pattern: /(ignore|disregard|forget)\s+(all\s+)?(previous|prior|earlier|above)\s+(instructions|rules|directives)/i,
    reason: 'Instruction override attempt (+30)',
  },
  {
    id: 'promptExtraction',
    weight: 30,
    pattern: /(system\s*prompt|hidden\s+instructions|your\s+instructions)/i,
    reason: 'System-prompt extraction attempt (+30)',
  },
  {
    id: 'rolePlay',
    weight: 20,
    pattern: /(pretend\s+you\s+are|act\s+as\s+if|you\s+are\s+now\s+a|safety\s+rules\s+don'?t\s+apply|without\s+restrictions)/i,
    reason: 'Role-play / restriction bypass (+20)',
  },
  {
    id: 'fakeAuthority',
    weight: 20,
    pattern: /(i\s+am\s+the\s+(system\s+)?admin|ceo\s+has\s+authorised|ceo\s+has\s+authorized|on\s+behalf\s+of\s+the\s+administrator)/i,
    reason: 'Fake-authority claim (+20)',
  },
  {
    id: 'researchFraming',
    weight: 10,
    pattern: /(for\s+educational\s+purposes|only\s+for\s+a\s+university\s+project|hypothetically)/i,
    reason: 'Educational / research framing (+10)',
  },
];

/** §08.7.2 pattern 6 — repeated probing, tracked per user. */
const probeHistory = new Map<string, number[]>();
const PROBE_WINDOW_MS = 120_000;

/** §08.7.3 — the band for a score. Configurable, because thresholds are policy. */
export const bandFor = (score: number): RiskAssessment['band'] => {
  if (score >= RISK_BANDS.blockMin) return 'block';
  if (score >= RISK_BANDS.restrictMin) return 'restrict';
  if (score > RISK_BANDS.allowMax) return 'extraChecks';
  return 'allow';
};

/**
 * §08.7.3 — a risk score from 0 to 100, NOT a binary verdict.
 *
 * The binary model is why teams over-block legitimate users and under-detect real
 * attackers: "SAFE / UNSAFE" cannot express "this is unusual, look closer".
 */
export const analyzeInput = (input: string, actor = 'anonymous'): RiskAssessment => {
  let score = 0;
  const reasons: string[] = [];

  for (const signal of SIGNALS) {
    if (signal.pattern.test(input)) {
      score += signal.weight;
      reasons.push(signal.reason);
    }
  }

  // Pattern 6 — five individually-innocuous requests that together look like probing.
  const now = Date.now();
  const recent = (probeHistory.get(actor) ?? []).filter((at) => now - at < PROBE_WINDOW_MS);
  recent.push(now);
  probeHistory.set(actor, recent);
  if (recent.length >= 5) {
    score += 20;
    reasons.push(`Repeated probing: ${recent.length} requests in ${PROBE_WINDOW_MS / 1000}s (+20)`);
  }

  const bounded = Math.min(100, score);
  return { score: bounded, reasons, band: bandFor(bounded) };
};

/**
 * §08.7.4 — the output gate. The model's response does not go straight to the user.
 * The notes' list: sensitive information, unsafe instructions, internal system
 * information, unexpected data, tool commands, policy violations.
 */
const SECRET_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/g, label: 'provider API key' },
  { pattern: /(postgres|mysql|mongodb):\/\/[^\s"']+/gi, label: 'database connection string' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: 'email address (PII)' },
  { pattern: /\b(?:\d[ -]?){13,16}\b/g, label: 'card-like number (PII)' },
];

export const outputGate = (response: string): OutputVerdict => {
  const lower = response.toLowerCase();

  // §08.7.4 — internal system information must never leave.
  if (lower.includes('internal system prompt') || lower.includes('my system prompt is')) {
    return { allowed: false, reason: 'Possible internal system-prompt exposure.', redacted: '[blocked by output gate]' };
  }

  // §03.10.2 rule 3 — errors must never leak secrets. Redact, then decide.
  let redacted = response;
  const hits: string[] = [];
  for (const { pattern, label } of SECRET_PATTERNS) {
    if (pattern.test(redacted)) {
      hits.push(label);
      redacted = redacted.replace(pattern, '[redacted]');
    }
  }

  if (hits.length) {
    return { allowed: true, reason: `Redacted before delivery: ${hits.join(', ')}.`, redacted };
  }

  return { allowed: true, redacted };
};

/**
 * §08.9 — the audit log. Every denial is a security event, not a silent failure.
 * In production this ships to a SIEM; here it is an array you can GET.
 */
const auditLog: SecurityEvent[] = [];
const AUDIT_LIMIT = 200;

export const audit = (event: Omit<SecurityEvent, 'at'>): void => {
  auditLog.unshift({ at: Date.now(), ...event });
  if (auditLog.length > AUDIT_LIMIT) auditLog.pop();
};

export const getAuditLog = (): SecurityEvent[] => auditLog;
