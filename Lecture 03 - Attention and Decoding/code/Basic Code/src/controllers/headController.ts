import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { requireMask, requireTokens, shapeId } from "../middleware/validate";
import { tokenVectors } from "../services/attentionService";
import * as head from "../services/headService";

/** Chapter 04 - multi-head attention: h views of the same tokens. */

/** POST /api/heads  { "tokens": [...], "shape": "toy-tiny", "mask": "causal" } */
export const heads = asyncHandler((req: Request, res: Response) => {
  const tokens = requireTokens(req);
  const shape = config.shape(shapeId(req));
  const mask = requireMask(req);

  const X = tokenVectors(tokens, shape.dModel);
  const result = head.multiHeadAttention(X, shape, config.seed, mask);

  res.json({
    chapter: "04 - multi-head attention and head specialisation",
    shape: shape.id,
    tokens,
    mask,
    dModel: result.dModel,
    nHeads: result.nHeads,
    dHead: result.dHead,
    widthPreserved: result.widthPreserved,
    heads: result.heads.map((one) => ({
      head: one.head,
      dHead: one.dHead,
      Q: one.Q,
      K: one.K,
      V: one.V,
      weights: one.weights,
      output: one.output,
    })),
    concatenated: result.concatenated,
    W_O: shape.dModel <= 32 ? result.W_O : "omitted: too large for the JSON response",
    mixed: result.mixed,
    cost: head.costComparison(tokens.length, shape),
    kvCache: head.kvCacheVariants(tokens.length, shape),
    headRoles: head.headRoles(),
    headCountGuide: head.headCountGuide(),
    note: result.note,
  });
});
