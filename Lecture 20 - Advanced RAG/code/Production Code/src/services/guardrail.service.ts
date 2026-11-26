import { GuardrailResult } from "../types/index";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

function detectPII(text: string): Array<{ type: string; value: string; span: [number, number] }> {
  const results: Array<{ type: string; value: string; span: [number, number] }> = [];

  let match;
  while ((match = EMAIL_REGEX.exec(text)) !== null) {
    results.push({ type: "email", value: match[0], span: [match.index, match.index + match[0].length] });
  }
  while ((match = PHONE_REGEX.exec(text)) !== null) {
    results.push({ type: "phone", value: match[0], span: [match.index, match.index + match[0].length] });
  }

  return results;
}

export function inputGuardrail(text: string): GuardrailResult {
  const pii = detectPII(text);
  let masked = text;

  if (pii.length > 0) {
    masked = text.replace(EMAIL_REGEX, "[EMAIL_REDACTED]").replace(PHONE_REGEX, "[PHONE_REDACTED]");
    return { text: masked, masked: true, blocked: false, piiDetected: pii };
  }

  return { text, masked: false, blocked: false };
}

export function outputGuardrail(text: string): GuardrailResult {
  const pii = detectPII(text);

  if (pii.length > 0) {
    return {
      text: "I cannot share that information.",
      masked: true,
      blocked: true,
      reason: "PII detected in output",
      piiDetected: pii,
    };
  }

  return { text, masked: false, blocked: false };
}