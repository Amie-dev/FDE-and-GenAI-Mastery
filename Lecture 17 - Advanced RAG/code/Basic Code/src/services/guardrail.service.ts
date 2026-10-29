/**
 * Chapter 08 — Production RAG: Guardrails
 *
 * Bidirectional PII masking + input/output defences (Chapter 08 §8.10).
 * Minimal implementation: mask emails/phones in input, scan output for
 * unsafe content before returning to the user.
 */

export interface GuardrailResult {
  text: string;
  masked: boolean;
  blocked: boolean;
  reason?: string;
}

/**
 * Input guardrail: mask PII (email, phone) before it reaches the system.
 */
export function inputGuardrail(text: string): GuardrailResult {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

  let masked = text;
  let changed = false;

  if (emailRegex.test(masked)) {
    masked = masked.replace(emailRegex, "[EMAIL_REDACTED]");
    changed = true;
  }
  if (phoneRegex.test(masked)) {
    masked = masked.replace(phoneRegex, "[PHONE_REDACTED]");
    changed = true;
  }

  return { text: masked, masked: changed, blocked: false };
}

/**
 * Output guardrail: scan model output for PII leakage or unsafe content.
 */
export function outputGuardrail(text: string): GuardrailResult {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

  if (emailRegex.test(text) || phoneRegex.test(text)) {
    return {
      text: "I cannot share that information.",
      masked: true,
      blocked: true,
      reason: "PII detected in output",
    };
  }

  return { text, masked: false, blocked: false };
}