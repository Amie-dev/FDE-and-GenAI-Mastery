import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { optionalNumberArray, optionalTokens } from "../middleware/validate";
import { round, tokenVectors } from "../services/attentionService";
import * as logits from "../services/logitsService";

/** Chapter 07 - from the last hidden state to a probability distribution. */

/**
 * POST /api/logits
 *   { "tokens": ["Delhi","Mumbai","Kolkata","Punjab","banana","<EOS>"],
 *     "logits": [12.8, 8.1, 5.2, 3.4, -4.1, -8.3] }
 * Omit both to use the lecture's own logits for "The capital of India is".
 */
export const softmax = asyncHandler((req: Request, res: Response) => {
  const defaults = logits.LECTURE_LOGITS;
  const tokens = optionalTokens(req, "tokens", defaults.map((row) => row.token));
  const values = optionalNumberArray(req, "logits", defaults.map((row) => row.logit));
  if (tokens.length !== values.length) {
    throw badRequest(`"tokens" (${tokens.length}) and "logits" (${values.length}) must be the same length.`);
  }

  const candidates = tokens.map((token, id) => ({ id, token, logit: values[id] }));

  // §07.1 - the LM head, on a toy vocabulary: H_final -> one logit per entry.
  const vectors = tokenVectors(tokens, config.dModel);
  const hidden = vectors[0].map((_, d) =>
    round(vectors.reduce((sum, row) => sum + row[d], 0) / vectors.length, 6),
  );

  res.json({
    chapter: "07 - logits, the LM head and softmax",
    prompt: "The capital of India is",
    candidates,
    table: logits.softmaxTable(candidates),
    properties: logits.properties(values),
    logprobs: logits.logprobs(candidates),
    lectureTable: logits.lectureTable(),
    lmHead: {
      hiddenState: hidden,
      vocabulary: tokens,
      logits: logits.lmHead(hidden, tokens, config.seed).map((candidate) => ({ token: candidate.token, logit: candidate.logit })),
      note: "one matrix of shape d_model x |V|; the same matmul as every other projection in the model",
    },
    note:
      "A logit is an unnormalised score in log-space, not a probability. Softmax turns the vector into a valid " +
      "distribution, and because it is order-preserving, argmax is identical before and after.",
  });
});

/**
 * POST /api/logits/bias
 *   { "tokens": ["Yes","No"], "logits": [4, 4], "bias": { "No": -Infinity } }
 */
export const bias = asyncHandler((req: Request, res: Response) => {
  const defaults = logits.LECTURE_LOGITS;
  const tokens = optionalTokens(req, "tokens", defaults.map((row) => row.token));
  const values = optionalNumberArray(req, "logits", defaults.map((row) => row.logit));
  const raw = (req.body as { bias?: unknown } | undefined)?.bias;

  if (raw === undefined || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw badRequest('Body must contain "bias" as an object of token -> number, e.g. { "banana": -Infinity }.');
  }
  const biasMap: Record<string, number> = {};
  for (const [token, delta] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof delta !== "number") throw badRequest(`"bias.${token}" must be a number (use -Infinity to forbid it).`);
    biasMap[token] = delta;
  }

  const candidates = tokens.map((token, id) => ({ id, token, logit: values[id] }));

  res.json({
    chapter: "07 §07.7 - logit bias and constrained decoding",
    candidates,
    ...logits.applyBias(candidates, biasMap),
    note:
      "Bias is applied BEFORE the softmax, and before temperature and the pool trimming (§08.10). A bias of " +
      "-Infinity is how a JSON schema makes an invalid token impossible rather than merely unlikely.",
  });
});
