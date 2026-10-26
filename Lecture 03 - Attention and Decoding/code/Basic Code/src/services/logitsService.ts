import type { Candidate, Vector } from "../types";
import { argmax, dot, percent, randomMatrix, round, softmax } from "./attentionService";

/**
 * Chapter 07 - from the last hidden state to a probability distribution.
 *
 * H_final (d_model) --W_lm--> logits (|V|) --softmax--> probabilities --decoder--> one token
 *
 * The warning that runs through this whole file: a logit is NOT a probability.
 * It is an unnormalised score in log-space. Dividing logits by their sum, or
 * comparing logits across two providers, are the two classic bugs here (§07.3).
 */

/** §07.3 - the lecture's own logits for "The capital of India is". */
export const LECTURE_LOGITS: { token: string; logit: number; sourcePercent: number }[] = [
  { token: "Delhi", logit: 12.8, sourcePercent: 92.0 },
  { token: "Mumbai", logit: 8.1, sourcePercent: 5.0 },
  { token: "Kolkata", logit: 5.2, sourcePercent: 2.0 },
  { token: "Punjab", logit: 3.4, sourcePercent: 1.0 },
  { token: "banana", logit: -4.1, sourcePercent: 0.000004 },
  { token: "<EOS>", logit: -8.3, sourcePercent: 0.0 },
];

/**
 * §07.1 - the LM head. One matrix of shape d_model x |V| projects the final
 * hidden state onto the whole vocabulary. It adds no magic: it is the same
 * matmul as every other projection in the model.
 */
export function lmHead(hidden: Vector, vocabulary: string[], seed: number): Candidate[] {
  const W_lm = randomMatrix(hidden.length, vocabulary.length, seed + 21);
  return vocabulary.map((token, id) => ({ id, token, logit: round(dot(hidden, W_lm.map((row) => row[id])), 4) }));
}

/** §07.4 - e^z and P(y_i), the two columns between logits and a distribution. */
export function softmaxTable(candidates: { token: string; logit: number }[], sourcePercent?: number[]) {
  const logits = candidates.map((candidate) => candidate.logit);
  const probabilities = softmax(logits);
  const max = Math.max(...logits);

  return candidates.map((candidate, i) => ({
    token: candidate.token,
    logit: candidate.logit,
    exponent: round(Math.exp(candidate.logit - max), 6), // e^(z - max), the stable form
    probability: probabilities[i],
    percent: percent(probabilities[i], 4),
    sourcePercent: sourcePercent?.[i],
  }));
}

/**
 * §07.5 - the three softmax properties, each one MEASURED on the request's own
 * logits rather than asserted. Shift invariance is what makes the row-max
 * subtraction free; scale sensitivity is what makes temperature work.
 */
export function properties(logits: Vector) {
  const base = softmax(logits);
  const shifted = softmax(logits.map((value) => value + 100));
  const halved = softmax(logits.map((value) => value / 0.5));
  const doubled = softmax(logits.map((value) => value / 2));

  return {
    shiftInvariance: {
      claim: "softmax(z + c) = softmax(z)",
      identical: base.every((value, i) => Math.abs(value - shifted[i]) < 1e-6),
      note: "this is why subtracting the row max is exactly equivalent, and free (§03.6)",
    },
    scaleSensitivity: {
      claim: "softmax(z / T) != softmax(z) in general",
      changed: base.some((value, i) => Math.abs(value - halved[i]) > 1e-6),
      note: "T < 1 sharpens, T > 1 flattens - this is Chapter 08's main knob",
    },
    rankingPreserved: {
      claim: "z_i > z_j  =>  P_i > P_j",
      argmaxBefore: argmax(logits),
      argmaxAfter: argmax(base),
      identical: argmax(logits) === argmax(base),
      note: "softmax never reorders the model's preferences - so greedy decoding is unaffected by temperature",
    },
    sharpened: halved.map((value) => percent(value)),
    flattened: doubled.map((value) => percent(value)),
    original: base.map((value) => percent(value)),
  };
}

/** §07.6 - log probabilities: the number an API actually returns. */
export function logprobs(candidates: { token: string; logit: number }[]) {
  const probabilities = softmax(candidates.map((candidate) => candidate.logit));
  return candidates.map((candidate, i) => ({
    token: candidate.token,
    logit: candidate.logit,
    probability: probabilities[i],
    logprob: round(Math.log(probabilities[i]), 4),
    note: "log P is negative for every token; it is the additive form used to score whole sequences",
  }));
}

/**
 * §07.7 - logit bias and vocabulary masking. Adding a constant to specific token
 * ids, before the softmax, is how a schema forbids a token (bias -Infinity) or
 * nudges the model towards one. Structural constraints go first in the pipeline
 * (§08.10), because they are the only step that can make a token impossible.
 */
export function applyBias(candidates: { token: string; logit: number }[], bias: Record<string, number>) {
  const biased = candidates.map((candidate) => ({
    token: candidate.token,
    logit: candidate.logit + (bias[candidate.token] ?? 0),
    bias: bias[candidate.token] ?? 0,
  }));
  return {
    bias,
    before: softmaxTable(candidates),
    after: softmaxTable(biased),
    changed: biased.some((candidate) => candidate.bias !== 0),
    note: "A bias of -Infinity makes a token impossible; a small positive bias only tilts the distribution.",
  };
}

/** The lecture's table, with the formula's answer beside the source's printed one. */
export function lectureTable() {
  const rows = softmaxTable(LECTURE_LOGITS, LECTURE_LOGITS.map((row) => row.sourcePercent));
  const dominant = rows[argmax(rows.map((row) => row.logit))].token;
  return {
    prompt: "The capital of India is",
    rows,
    dominant,
    reconciles: rows.every((row) => Math.abs(row.percent - (row.sourcePercent ?? 0)) <= 1),
    vocabularySliceSize: LECTURE_LOGITS.length,
    note:
      "These six tokens are a SLICE of a real vocabulary of about 100,000. The softmax denominator is the sum over " +
      "the WHOLE vocabulary (§07.4), and the tokens not listed here absorb the remaining mass - which is exactly " +
      "why the source's percentages (92 / 5 / 2 / 1) are lower than this six-token slice's (99 / 0.9 / 0.05 / 0.01) " +
      "for the same logits. Both are correct; the difference is |V|, not the arithmetic. Raise the temperature to " +
      "see the same smoothing effect without touching the vocabulary (ch08 §08.5).",
  };
}
