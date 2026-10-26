import type { AttentionWeights, MaskKind, Matrix, Vector } from "../types";

/**
 * Chapters 01-03 - the attention engine, and the arithmetic primitives that the
 * other services import. Everything here is plain TypeScript: no matrix library,
 * no model weights, nothing to install. That is the point of "attention by hand".
 *
 * The one thing to keep in mind while reading: every function below either
 * PRODUCES a vector/matrix or CONSUMES one. Nothing mutates its input.
 */

const round = (value: number, digits = 4): number => Number(value.toFixed(digits));
export { round };

// ---------------------------------------------------------------------------
// Deterministic numbers  (ch08 §08.11: the same request must give the same draw)
// ---------------------------------------------------------------------------

/** A tiny seeded PRNG (mulberry32). Same seed in, same sequence out - always. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a word to a seed, so "mat" gets the SAME vector in every sentence (ch02 §02.4). */
export function seedOf(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** A vector of `d` values in [-scale, scale]. Stands in for a learned embedding row. */
export function randomVector(d: number, seed: number, scale = 1): Vector {
  const next = rng(seed);
  return Array.from({ length: d }, () => round((next() * 2 - 1) * scale));
}

/** A rows x cols matrix. Stands in for a learned projection matrix W_Q / W_K / W_V. */
export function randomMatrix(rows: number, cols: number, seed: number, scale = 0.5): Matrix {
  const next = rng(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => round((next() * 2 - 1) * scale)));
}

/** One embedding per token, keyed by the token's own text (§02.4). */
export function tokenVectors(tokens: string[], dModel: number): Matrix {
  return tokens.map((token) => randomVector(dModel, seedOf(token)));
}

// ---------------------------------------------------------------------------
// Linear algebra - the six operations attention is built from (§02.3, §03.1)
// ---------------------------------------------------------------------------

/** Sum of element-wise products. The relevance score of one query against one key. */
export const dot = (a: Vector, b: Vector): number => a.reduce((total, value, i) => total + value * b[i], 0);

/** (rows x inner) x (inner x cols). Every projection in the model is one of these. */
export function matmul(a: Matrix, b: Matrix): Matrix {
  const bt = transpose(b);
  return a.map((row) => bt.map((column) => round(dot(row, column), 6)));
}

/** Swap rows and columns. Q x K^T is a matmul with K transposed (§02.6). */
export const transpose = (a: Matrix): Matrix => a[0].map((_, column) => a.map((row) => row[column]));

/** Element-wise addition - what a residual connection does (§05.2). */
export const add = (a: Vector, b: Vector): Vector => a.map((value, i) => round(value + b[i], 6));

/** Multiply every element by a constant - what temperature and 1/sqrt(d_k) do. */
export const scale = (a: Vector, factor: number): Vector => a.map((value) => round(value * factor, 6));

export const roundVector = (a: Vector, digits = 4): Vector => a.map((value) => round(value, digits));
export const roundMatrix = (a: Matrix, digits = 4): Matrix => a.map((row) => roundVector(row, digits));

/** The index of the largest value - how greedy decoding picks a token (§08.2). */
export const argmax = (a: Vector): number => a.reduce((best, value, i) => (value > a[best] ? i : best), 0);

// ---------------------------------------------------------------------------
// Softmax - an attention row IS a probability distribution (§01.7, §03.3, §07.4)
// ---------------------------------------------------------------------------

/** The naive form: e^z / sum(e^z). Shown so §03.6 can show why it overflows. */
export function softmaxNaive(scores: Vector): Vector {
  const exponents = scores.map((value) => Math.exp(value));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => round(value / total, 6));
}

/**
 * The form every implementation actually uses. Subtracting the row maximum is
 * EXACTLY equivalent (softmax is shift invariant, §07.5) and stops exp() from
 * overflowing on a large logit.
 */
export function softmax(scores: Vector): Vector {
  const max = Math.max(...scores);
  const exponents = scores.map((value) => Math.exp(value - max));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => round(value / total, 6));
}

/** Percentage form, rounded for reading - 0.3868 -> 38.7. */
export const percent = (probability: number, digits = 1): number => round(probability * 100, digits);

// ---------------------------------------------------------------------------
// Chapter 01 §01.2 - static vectors cannot be context-dependent
// ---------------------------------------------------------------------------

/** One sentence, run through Q/K/V projection and attention. */
type Run = { tokens: string[]; X: Matrix; Q: Matrix; K: Matrix; V: Matrix; result: AttentionResult; index: number };

function runSentence(tokens: string[], dModel: number, dHead: number, seed: number): Run {
  const X = tokenVectors(tokens, dModel);
  const { Q, K, V } = project(X, dHead, seed);
  return { tokens, X, Q, K, V, result: attention(Q, K, V, dHead, "none"), index: 0 };
}

/** One readable attention row: where this token's weight went, strongest first. */
function describeRow(run: Run, word: string) {
  const index = run.tokens.findIndex((token) => token === word);
  if (index < 0) return null;
  const row = run.result.weights[index];
  return {
    queryToken: word,
    reads: run.tokens
      .map((token, j) => ({ token, weight: row[j], percent: percent(row[j]) }))
      .sort((left, right) => right.weight - left.weight),
    output: roundVector(run.result.output[index]),
  };
}

/**
 * The whole argument of Chapter 01, measured. The focus word gets ONE embedding
 * (its vector is derived from its own text), yet its attention OUTPUT differs
 * between the two sentences - because the neighbours it reads are different.
 * That difference is the "dynamic context" the lecture is about.
 */
export function explainStaticVsDynamic(word: string, sentenceA: string[], sentenceB: string[], dModel: number, dHead: number, seed: number) {
  const a = runSentence(sentenceA, dModel, dHead, seed);
  const b = runSentence(sentenceB, dModel, dHead, seed);
  const indexA = a.tokens.indexOf(word);
  const indexB = b.tokens.indexOf(word);
  const found = indexA >= 0 && indexB >= 0;

  return {
    word,
    staticVector: found ? a.X[indexA] : null,
    staticVectorNote: "One embedding per token, keyed on the token's own text - identical in both sentences (§02.4).",
    sentenceA: describeRow(a, word),
    sentenceB: describeRow(b, word),
    sameEmbedding: found && String(a.X[indexA]) === String(b.X[indexB]),
    sameOutput: found && String(a.result.output[indexA]) === String(b.result.output[indexB]),
    conclusion:
      "Same token, same embedding, different context-aware vector. Nothing about the token changed - the " +
      "neighbours did. That is why attention turns a static lookup into a dynamic representation.",
    whatAttentionDoesNotDo:
      "It does not store facts, retrieve documents or decide truth - it moves existing information between positions (§01.8).",
  };
}

// ---------------------------------------------------------------------------
// Chapter 02 - Q, K and V: one vector, three projections (§02.1-§02.5)
// ---------------------------------------------------------------------------

export type QKV = { W_Q: Matrix; W_K: Matrix; W_V: Matrix; Q: Matrix; K: Matrix; V: Matrix };

/**
 * The whole of Chapter 02 in one function:
 *   Q = X W_Q   (what this token is looking for)
 *   K = X W_K   (what this token can be found by)
 *   V = X W_V   (what this token contributes)
 * The SAME X is projected three times, and W_Q must differ from W_K (§02.7) -
 * otherwise every token would be its own best match.
 */
export function project(X: Matrix, dHead: number, seed: number): QKV {
  const dModel = X[0].length;
  const W_Q = randomMatrix(dModel, dHead, seed + 1);
  const W_K = randomMatrix(dModel, dHead, seed + 2);
  const W_V = randomMatrix(dModel, dHead, seed + 3);
  return { W_Q, W_K, W_V, Q: matmul(X, W_Q), K: matmul(X, W_K), V: matmul(X, W_V) };
}

/** Parameters in W_Q + W_K + W_V = 3 x d_model^2, independent of sequence length (§02.3). */
export function projectionParameters(dModel: number): number {
  return 3 * dModel * dModel;
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.5 / ch09 §09.6 - the mask: one mechanism on two axes
// ---------------------------------------------------------------------------

export type MaskOptions = { window?: number; padCount?: number };

/**
 * The mask decides which positions a token is ALLOWED to read. It is applied to
 * the SCORES, before the softmax, by writing -Infinity - so that after exp() the
 * weight becomes exactly 0 and the token is never attended to.
 */
export function applyMask(scores: Matrix, kind: MaskKind, options: MaskOptions = {}): Matrix {
  const n = scores.length;
  const window = options.window ?? 3;
  const padFrom = options.padCount ? n - options.padCount : n;

  return scores.map((row, i) =>
    row.map((score, j) => {
      if (kind === "none") return score;
      if (j > i) return -Infinity; // causal: never read the future
      if (kind === "sliding" && i - j >= window) return -Infinity; // long-range positions dropped
      if (kind === "padding" && j >= padFrom) return -Infinity; // pad tokens are invisible
      return score;
    }),
  );
}

/** A readable picture of a mask: 1 = allowed, 0 = blocked. */
export function maskMatrix(n: number, kind: MaskKind, options: MaskOptions = {}): number[][] {
  const allowed = applyMask(
    Array.from({ length: n }, () => new Array(n).fill(0)),
    kind,
    options,
  );
  return allowed.map((row) => row.map((value) => (value === -Infinity ? 0 : 1)));
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.1-§03.3 - the five steps, in order
// ---------------------------------------------------------------------------

export type AttentionResult = {
  scores: Matrix; // step 1: Q x K^T
  divisor: number; // step 2: sqrt(d_k)
  scaled: Matrix; // step 2: scores / sqrt(d_k)
  masked: Matrix; // step 3: -Infinity where the mask blocks
  weights: AttentionWeights; // step 4: row-wise softmax - every row sums to 1
  output: Matrix; // step 5: weights x V
};

/**
 * softmax( Q K^T / sqrt(d_k) ) V - the formula of §03.1, as five lines of code.
 * The order matters: scale, then mask, then softmax. Masking after the softmax
 * would leave the blocked tokens with non-zero weight that no longer sums to 1.
 */
export function attention(Q: Matrix, K: Matrix, V: Matrix, dK: number, mask: MaskKind = "none", options: MaskOptions = {}): AttentionResult {
  const scores = matmul(Q, transpose(K)); // step 1
  const divisor = Math.sqrt(dK); // step 2
  const scaled = scores.map((row) => scale(row, 1 / divisor));
  const masked = applyMask(scaled, mask, options); // step 3
  const weights = masked.map((row) => softmax(row)); // step 4
  const output = matmul(weights, V); // step 5
  return { scores, divisor: round(divisor), scaled, masked, weights, output };
}

/** One attention row, spelled out: token, score, weight, percent (§01.7). */
export function weightRows(tokens: string[], weights: AttentionWeights) {
  return weights.map((row, i) => ({
    queryToken: tokens[i],
    row: row.map((weight, j) => ({
      keyToken: tokens[j],
      weight,
      percent: percent(weight),
      blocked: weight === 0,
    })),
    sum: round(row.reduce((total, weight) => total + weight, 0), 6),
  }));
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.3 - the lecture's own trace, reproduced exactly
// ---------------------------------------------------------------------------

/**
 * The lecture computes attention for "on" in "The cat sat on the mat" with
 * d_k = 3. These are its numbers, hard-coded so the endpoint can show them
 * beside the numbers the formula actually produces.
 */
export const LECTURE_TRACE = {
  tokens: ["The", "cat", "sat", "the", "mat"],
  queryToken: "on",
  queryVector: [0.2, 0.4, -0.5],
  rawScores: [0.1, 0.5, 1.8, 0.2, 2.4],
  dK: 3,
  /** The hand-drawn percentages printed in the lecture notes. */
  handDrawnPercent: [3, 9, 20, 4, 64],
} as const;

/**
 * Run the formula on the lecture's own scores. Hand-rounded teaching numbers do
 * not always reconcile with the exact softmax - what must survive is the SHAPE:
 * "mat" dominates and "The" is the weakest. This function shows both, so the
 * discrepancy is visible instead of hidden.
 */
export function lectureTrace() {
  const { rawScores, dK, tokens, handDrawnPercent } = LECTURE_TRACE;
  const divisor = round(Math.sqrt(dK));
  const scaled = scale(rawScores as unknown as Vector, 1 / Math.sqrt(dK));
  const weights = softmax(scaled);
  const computedPercent = weights.map((weight) => percent(weight));
  const handDrawn = handDrawnPercent as unknown as Vector;

  return {
    divisor,
    steps: tokens.map((token, i) => ({
      token,
      rawScore: rawScores[i],
      scaled: scaled[i],
      weight: weights[i],
      computedPercent: computedPercent[i],
      handDrawnPercent: handDrawnPercent[i],
    })),
    dominance: {
      computed: tokens[argmax(weights)],
      handDrawn: tokens[argmax(handDrawn)],
      agree: argmax(weights) === argmax(handDrawn),
    },
    reconciles: computedPercent.every((value, i) => Math.abs(value - handDrawnPercent[i]) <= 1),
    note:
      "Both columns agree on the ranking and on which token dominates - that is the lesson. " +
      "The lecture's percentages are hand-rounded for teaching, so they need not match the formula to the last digit.",
  };
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.4 - why divide by sqrt(d_k)?
// ---------------------------------------------------------------------------

/**
 * The variance argument, measured instead of asserted. Two random vectors of
 * length d_k have a dot product whose variance grows with d_k. Dividing by
 * sqrt(d_k) puts the variance back at ~1, which is what keeps the softmax from
 * saturating (a saturated softmax is a near-one-hot row whose gradient is ~0).
 */
export function scalingEffect(dK: number, samples = 200, seed = 7) {
  const next = rng(seed);
  const raw: number[] = [];
  for (let i = 0; i < samples; i++) {
    const a = Array.from({ length: dK }, () => next() * 2 - 1);
    const b = Array.from({ length: dK }, () => next() * 2 - 1);
    raw.push(dot(a, b));
  }

  const divisor = Math.sqrt(dK);
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  const variance = raw.reduce((sum, value) => sum + (value - mean) ** 2, 0) / raw.length;

  return {
    dK,
    samples,
    divisor: round(divisor),
    rawVariance: round(variance),
    scaledVariance: round(variance / dK),
    claim: "Var(Q . K) ~= d_k, so Var(Q . K / sqrt(d_k)) ~= 1",
    measured: `raw ${round(variance)} -> scaled ${round(variance / dK)}`,
    gradientNote:
      "A softmax whose inputs have variance d_k is nearly one-hot, and its gradient is nearly zero. " +
      "The scaling is a training-stability fix, not a normalisation trick.",
  };
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.6 - numerical stability
// ---------------------------------------------------------------------------

/** The same softmax, computed naively and safely, on the same input. */
export function stabilityDemo(scores: Vector) {
  const max = Math.max(...scores);
  const naive = softmaxNaive(scores);
  const safe = softmax(scores);
  return {
    scores,
    rowMax: max,
    naiveExponentials: scores.map((value) => round(Math.exp(value), 4)),
    safeExponentials: scores.map((value) => round(Math.exp(value - max), 4)),
    softmaxNaive: naive,
    softmaxSafe: safe,
    identical: naive.every((value, i) => Math.abs(value - safe[i]) < 1e-6),
    note:
      "softmax(z + c) = softmax(z) for any constant c, so subtracting the row max changes nothing but " +
      "stops exp() from overflowing once logits reach the hundreds.",
  };
}

// ---------------------------------------------------------------------------
// Chapter 03 §03.7 - the cost model
// ---------------------------------------------------------------------------

/**
 * The KV cache, and why Q is not in it (ch02 §02.8). At each new token the model
 * needs its own Q once, but the K and V of every previous token again - so those
 * are the two matrices worth storing.
 */
export function kvCacheBytes(n: number, layers: number, dModel: number, bytesPerValue = 2): number {
  return 2 * n * layers * dModel * bytesPerValue;
}

/**
 * Why context length is the expensive variable: the score matrix has N x N
 * entries, so the work grows with N^2 while the weights are a fixed cost (§02.3).
 */
export function attentionCost(n: number, dModel: number, layers: number, bytesPerValue = 2) {
  const perLayerOps = 2 * n * n * dModel; // Q K^T plus weights x V, each ~N^2 d_model
  const kvBytes = kvCacheBytes(n, layers, dModel, bytesPerValue);
  return {
    n,
    dModel,
    layers,
    scoreMatrixEntries: n * n,
    perLayerOps,
    totalOps: perLayerOps * layers,
    kvCacheBytes: kvBytes,
    kvCacheMB: round(kvBytes / 1024 / 1024, 3),
    growth: "score matrix entries = N^2, so doubling the context quadruples the attention work",
  };
}
