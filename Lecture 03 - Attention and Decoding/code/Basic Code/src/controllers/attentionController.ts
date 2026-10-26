import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalInteger, optionalNumberArray, optionalString, optionalTokens, requireMask, requireTokens, shapeId } from "../middleware/validate";
import * as attention from "../services/attentionService";

/** Chapters 01-03 - why attention exists, Q/K/V, and the formula by hand. */

/** Projection matrices are only echoed for the toy shape: 768 x 768 is not a response. */
const includeWeights = (dModel: number): boolean => dModel <= 32;

/** POST /api/attention/why  { "word": "it", "sentenceA": [...], "sentenceB": [...] } */
export const why = asyncHandler((req: Request, res: Response) => {
  const word = optionalString(req, "word", "it");
  const shape = config.shape(shapeId(req));
  const sentenceA = optionalTokens(req, "sentenceA", ["it", "was", "too", "tired"]);
  const sentenceB = optionalTokens(req, "sentenceB", ["it", "was", "too", "wide"]);

  res.json({
    chapter: "01 - why attention: from static vectors to dynamic context",
    shape: shape.id,
    dModel: shape.dModel,
    ...attention.explainStaticVsDynamic(word, sentenceA, sentenceB, shape.dModel, config.dHead(shape), config.seed),
  });
});

/** POST /api/attention/qkv  { "tokens": ["The","cat","sat","on","the","mat"] } */
export const qkv = asyncHandler((req: Request, res: Response) => {
  const tokens = requireTokens(req);
  const shape = config.shape(shapeId(req));
  const dHead = config.dHead(shape);

  const X = attention.tokenVectors(tokens, shape.dModel);
  const { W_Q, W_K, W_V, Q, K, V } = attention.project(X, dHead, config.seed);

  res.json({
    chapter: "02 - queries, keys and values: the attention search engine",
    shape: shape.id,
    dModel: shape.dModel,
    dHead,
    shapes: {
      X: `${tokens.length} x ${shape.dModel}`,
      "W_Q, W_K, W_V": `${shape.dModel} x ${dHead}`,
      "Q, K": `${tokens.length} x ${dHead}`,
      V: `${tokens.length} x ${dHead}`,
      "Q x K^T": `${tokens.length} x ${tokens.length}`,
    },
    tokens,
    X,
    weights: includeWeights(shape.dModel) ? { W_Q, W_K, W_V } : "omitted: too large for the JSON response",
    Q,
    K,
    V,
    projectionParameters: attention.projectionParameters(shape.dModel),
    perToken: tokens.map((token, i) => ({
      token,
      embedding: X[i],
      Q: Q[i],
      K: K[i],
      V: V[i],
      role: "Q = what I am looking for · K = what I can be found by · V = what I contribute",
    })),
    kvCacheBytes: attention.kvCacheBytes(tokens.length, shape.layers, shape.dModel),
    note:
      "One token vector, three learned projections. W_Q must differ from W_K, or every token would be its own " +
      "best match. The KV cache stores K and V only: Q is used once, K and V are used again by every later token.",
  });
});

/** POST /api/attention/scores  { "tokens": [...], "mask": "causal" } */
export const scores = asyncHandler((req: Request, res: Response) => {
  const tokens = requireTokens(req);
  const shape = config.shape(shapeId(req));
  const mask = requireMask(req);
  const window = optionalInteger(req, "window", 3, 1, 12) ?? 3;
  const padCount = optionalInteger(req, "padCount", 0, 0, 12) ?? 0;
  const dHead = config.dHead(shape);

  const X = attention.tokenVectors(tokens, shape.dModel);
  const { Q, K, V } = attention.project(X, dHead, config.seed);
  const result = attention.attention(Q, K, V, dHead, mask, { window, padCount });
  const unmasked = attention.attention(Q, K, V, dHead, "none");

  res.json({
    chapter: "03 §03.5 - the score matrix, and the mask that hides the future",
    shape: shape.id,
    tokens,
    mask,
    maskMatrix: attention.maskMatrix(tokens.length, mask, { window, padCount }),
    divisor: result.divisor,
    scores: result.scores,
    scaled: result.scaled,
    masked: result.masked.map((row) => row.map((value) => (value === -Infinity ? "-Infinity" : value))),
    weights: result.weights,
    rows: attention.weightRows(tokens, result.weights),
    output: result.output,
    withoutMask: { weights: unmasked.weights, rows: attention.weightRows(tokens, unmasked.weights) },
    note:
      "The mask writes -Infinity into the scores BEFORE the softmax, so exp() turns it into exactly 0 and the " +
      "row is renormalised over the positions that remain. Every row still sums to 1.",
  });
});

/** POST /api/attention/trace  { "scores": [0.1,0.5,1.8,0.2,2.4], "dK": 3 } */
export const trace = asyncHandler((req: Request, res: Response) => {
  const rawScores = optionalNumberArray(req, "scores", [...attention.LECTURE_TRACE.rawScores]);
  const dK = optionalInteger(req, "dK", attention.LECTURE_TRACE.dK, 1, 512) ?? attention.LECTURE_TRACE.dK;
  const divisor = Math.sqrt(dK);
  const scaled = rawScores.map((value) => attention.round(value / divisor, 4));
  const weights = attention.softmax(scaled);

  res.json({
    chapter: "03 §03.3-§03.6 - scaled dot-product attention, step by step",
    steps: {
      oneRawScores: rawScores,
      twoScaled: scaled,
      threeSoftmax: weights,
      fourPercent: weights.map((value) => attention.percent(value)),
      sumOfWeights: attention.round(weights.reduce((sum, value) => sum + value, 0), 6),
    },
    lectureTrace: attention.lectureTrace(),
    scaling: attention.scalingEffect(dK),
    stability: attention.stabilityDemo(rawScores),
    note:
      "Step 4 is the answer: a weighted sum of the value vectors, Z_i = sum_j w_ij V_j. The weights came from " +
      "learned geometry - no grammar rule was written anywhere.",
  });
});

/** POST /api/attention/cost  { "n": 4096, "shape": "gpt2-small" } */
export const cost = asyncHandler((req: Request, res: Response) => {
  const shape = config.shape(shapeId(req));
  const n = optionalInteger(req, "n", config.nTokens, 1, 1_000_000) ?? config.nTokens;

  res.json({
    chapter: "03 §03.7 - the cost model: why context length is the expensive variable",
    shape: shape.id,
    ...attention.attentionCost(n, shape.dModel, shape.layers),
    quadraticGrowth: [n, n * 2, n * 4].map((length) => ({
      n: length,
      scoreMatrixEntries: length * length,
      totalOps: attention.attentionCost(length, shape.dModel, shape.layers).totalOps,
      kvCacheMB: attention.attentionCost(length, shape.dModel, shape.layers).kvCacheMB,
    })),
    note:
      "The weights are a FIXED cost that scales with d_model^2; the score matrix is a PER-REQUEST cost that " +
      "scales with N^2. That separation is why batching, caching and shorter prompts are the levers you have.",
  });
});

