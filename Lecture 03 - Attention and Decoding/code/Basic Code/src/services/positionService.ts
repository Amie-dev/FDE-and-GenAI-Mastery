import type { MaskKind, Matrix, Vector } from "../types";
import { dot, maskMatrix, round, roundVector } from "./attentionService";

/**
 * Chapter 09 - position, masking and attention geometry.
 *
 * Self-attention is permutation invariant: without a position signal, "Dog bites
 * man" and "Man bites dog" are the same input (§09.1). Every scheme in this file
 * solves that one problem differently, and the difference matters to you at
 * runtime: it decides whether a long context is usable or merely accepted (§09.8).
 */

/** §09.2 - the frequency ladder. Early pairs oscillate fast, later pairs very slowly. */
export function frequencies(dModel: number, base = 10000): number[] {
  return Array.from({ length: Math.floor(dModel / 2) }, (_, i) => 1 / Math.pow(base, (2 * i) / dModel));
}

/** PE(pos,2i) = sin(pos w_i), PE(pos,2i+1) = cos(pos w_i) - the 2017 scheme. */
export function sinusoidal(positions: number[], dModel: number): Matrix {
  const omega = frequencies(dModel);
  return positions.map((position) => {
    const vector: Vector = new Array(dModel).fill(0);
    omega.forEach((frequency, i) => {
      vector[2 * i] = round(Math.sin(position * frequency), 6); // even dimensions: sin
      vector[2 * i + 1] = round(Math.cos(position * frequency), 6); // odd dimensions: cos
    });
    return vector;
  });
}

/** X_pos = E_token + P_pos. Added, never concatenated, so d_model stays fixed (§09.2). */
export function addPosition(embeddings: Matrix, positional: Matrix): Matrix {
  return embeddings.map((row, i) => row.map((value, d) => round(value + positional[i][d], 6)));
}

/**
 * §09.2 - the linear-offset property, measured instead of asserted:
 * P_pos . P_(pos+k) = sum_i cos(w_i k), which depends only on k.
 * If every number in the array is the same, the property holds.
 */
export function linearOffsetProperty(dModel: number, k: number, positions: number[]) {
  const shifted = positions.map((position) => position + k);
  const encoded = sinusoidal([...positions, ...shifted], dModel);
  const values = positions.map((_, i) => round(dot(encoded[i], encoded[positions.length + i]), 6));
  return {
    k,
    values,
    dependsOnlyOnOffset: new Set(values).size === 1,
    note: "the same rotation works at every position, which is how an absolute encoding delivers relative distance",
  };
}

/**
 * §09.4 - RoPE: rotate each 2-D pair of the query and key by an angle
 * proportional to the token's position. Because the dot product of two rotated
 * vectors depends only on the DIFFERENCE of the angles, the score depends only on
 * j - i: absolute positions cancel, and no positional vector is ever added, so
 * the content stays uncontaminated.
 */
export function ropeRotate(vector: Vector, position: number, base = 10000): Vector {
  const d = vector.length;
  const out: Vector = new Array(d).fill(0);
  for (let m = 0; m < d / 2; m++) {
    const angle = position / Math.pow(base, (2 * m) / d);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = vector[2 * m];
    const y = vector[2 * m + 1];
    out[2 * m] = round(x * cos - y * sin, 6);
    out[2 * m + 1] = round(x * sin + y * cos, 6);
  }
  return out;
}

/** The relativity proof: pairs with the same offset j - i get the same score. */
export function ropeScoreProof(query: Vector, key: Vector, offsets: number[], base = 10000) {
  const rows = offsets.map((offset) => {
    // Same offset, two different absolute positions - the scores must match.
    const pairA = { i: 0, j: offset };
    const pairB = { i: 5, j: 5 + offset };
    const scoreOf = (i: number, j: number) => round(dot(ropeRotate(query, i, base), ropeRotate(key, j, base)), 6);
    return { offset, positions: [pairA, pairB], scores: [scoreOf(pairA.i, pairA.j), scoreOf(pairB.i, pairB.j)] };
  });
  return {
    rows,
    relative: rows.every((row) => Math.abs(row.scores[0] - row.scores[1]) < 1e-4),
    note: "absolute positions cancel, so the model reads distance rather than location - and RoPE adds zero parameters",
  };
}

/**
 * §09.5 - ALiBi: no positional vectors at all. A negative bias proportional to
 * distance is added straight to the scores, with a fixed per-head slope, so
 * nearby tokens are preferred and the model can be tested far beyond its
 * training length.
 */
export function alibiSlopes(nHeads: number): number[] {
  return Array.from({ length: nHeads }, (_, head) => round(Math.pow(2, (-8 * (head + 1)) / nHeads), 6));
}

export function alibiBias(n: number, nHeads: number): Matrix {
  const slopes = alibiSlopes(nHeads);
  const slope = slopes[0]; // head 0 for display; each head uses its own
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j > i ? -Infinity : round(-slope * (i - j), 4))),
  );
}

/** §09.6 - the geometry of masks. One mechanism, two axes: positions and vocabulary. */
export function maskGeometry(n: number, kind: MaskKind, window = 3) {
  const mask = maskMatrix(n, kind, { window });
  const allowed = mask.flat().reduce((sum, value) => sum + value, 0);
  return {
    kind,
    window: kind === "sliding" ? window : null,
    mask,
    allowedPairs: allowed,
    totalPairs: n * n,
    density: round(allowed / (n * n), 4),
    note: "the same -Infinity trick that hides positions also hides vocabulary entries - that is how a JSON schema is enforced",
  };
}

/** §09.3 - the four positional schemes, and what each costs you. */
export function schemes() {
  return [
    { scheme: "sinusoidal", relative: "implicit, via the linear-offset property", parameters: 0, extension: "weak", used: "the original 2017 Transformer" },
    { scheme: "learned", relative: "none - absolute positions only", parameters: "context length x d_model", extension: "none beyond the trained length", used: "GPT-2, BERT" },
    { scheme: "rope", relative: "exact - the score depends on j - i", parameters: 0, extension: "strong, via frequency rescaling", used: "LLaMA, Mistral, Qwen, most open models" },
    { scheme: "alibi", relative: "a distance penalty, not a representation", parameters: 0, extension: "strong out of the box", used: "BLOOM, MPT, some long-context models" },
  ];
}

/** §09.4 - how a short-context model is stretched to a long one. */
export function contextExtension() {
  return [
    { technique: "position interpolation", idea: "compress positions so a 32k-trained model accepts 128k", tradeOff: "cheap; quality drops without fine-tuning" },
    { technique: "NTK-aware scaling", idea: "scale the frequencies instead of the positions", tradeOff: "better quality retention" },
    { technique: "YaRN", idea: "interpolation plus a per-frequency-band attention-temperature adjustment", tradeOff: "current best practice for many models" },
    { technique: "fine-tune on long data", idea: "train on the target length", tradeOff: "most reliable; costs compute" },
  ];
}

/**
 * §09.8 - why this chapter is not academic. Every one of these shows up as a bug
 * report, and none of them is a model defect: they are consequences of geometry.
 */
export function positionEffects() {
  return [
    { effect: "lost in the middle", cause: "attention decays with offset, so the edges are read more reliably than the centre", fix: "put the instruction last, and the most relevant evidence first or last" },
    { effect: "chunk order changes answers", cause: "the same documents in a different order are a different input", fix: "rank chunks before you assemble the prompt, and keep the order stable" },
    { effect: "long context is not usable context", cause: "an advertised window is a capacity limit, not a quality guarantee", fix: "measure recall on your own tasks before you rely on 128k" },
    { effect: "position affects more than retrieval", cause: "format-following and refusal behaviour also drift with position", fix: "keep the schema and the safety instruction at the end of the prompt" },
  ];
}

