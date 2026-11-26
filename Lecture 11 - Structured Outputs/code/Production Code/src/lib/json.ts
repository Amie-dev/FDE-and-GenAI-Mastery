/**
 * Chapter 03 §03.8.1 — SAFE PARSING, IN EXACTLY ONE PLACE.
 *
 * The basic lab could call `JSON.parse` directly because its provider always
 * returned clean JSON. In production, a JSON-mode provider occasionally emits a
 * fence, and a legacy path may still carry prose. The discipline that keeps this
 * from spreading is that the leniency lives HERE — one function, named, testable
 * and replaceable — and never as ad-hoc regexes at the call site.
 *
 * What this function deliberately does NOT do: it does not "repair" values. It
 * only removes *transport* noise (a fence, a prose prefix), because that is
 * unambiguous. Anything ambiguous is a `parse_error` and belongs to the repair
 * loop (chapter 06 §06.7).
 */

export type ParseResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: string };

const FENCE = /^\s*```(?:json)?\s*|\s*```\s*$/gi;

/**
 * Chapter 03 §03.8 — the two leniencies, and only these two.
 *
 * 1. strip a markdown fence (unambiguous: fences are never part of a value at the
 *    top level);
 * 2. if the text is not JSON, take the outermost `{...}` span.
 *
 * Everything else — trailing commas, single quotes, comments — is left alone,
 * because "fixing" those silently is how a correctness bug hides in a parser.
 */
export const safeJsonParse = (raw: string): ParseResult => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty response' };

  const candidates = new Set<string>([trimmed]);

  const unfenced = trimmed.replace(FENCE, '').trim();
  if (unfenced.length > 0) candidates.add(unfenced);

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) candidates.add(trimmed.slice(firstBrace, lastBrace + 1));

  let lastReason = 'not parseable JSON';
  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
  }

  return { ok: false, reason: lastReason };
};

/**
 * Chapter 09 §09.5 — the ±10-15% token estimator, used only when a provider does
 * not report usage. Named so nobody mistakes it for an exact figure.
 */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Chapter 06 §06.8 — the repair prompt includes the previous output verbatim. */
export const truncateForPrompt = (text: string, maxChars = 4_000): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n…[truncated for the repair prompt]`;
