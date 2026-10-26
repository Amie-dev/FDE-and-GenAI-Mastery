import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { requireMask, requireTokens, shapeId } from "../middleware/validate";
import { tokenVectors } from "../services/attentionService";
import { abstractionLayers, parameterBudget, transformerBlock } from "../services/blockService";

/** Chapter 05 - one transformer block, stage by stage, and where its parameters live. */

/** POST /api/block  { "tokens": [...], "shape": "toy-tiny", "mask": "causal" } */
export const block = asyncHandler((req: Request, res: Response) => {
  const tokens = requireTokens(req);
  const shape = config.shape(shapeId(req));
  const mask = requireMask(req);

  const H_in = tokenVectors(tokens, shape.dModel);
  const result = transformerBlock(H_in, shape, config.seed, mask);

  res.json({
    chapter: "05 - the transformer block and the residual stream",
    shape: shape.id,
    tokens,
    mask,
    dModel: shape.dModel,
    dFF: shape.dFF,
    stages: {
      oneLayerNorm: result.ln1,
      twoMultiHeadAttention: result.attentionOutput,
      threeResidual: result.H_mid,
      fourLayerNorm: result.ln2,
      fiveFeedForward: result.ffnOutput,
      sixResidual: result.H_out,
    },
    checks: result.checks,
    parameterBudget: parameterBudget(shape),
    abstractionLayers: abstractionLayers(),
    note:
      result.note +
      " A Transformer is not attention (§05.1): the block is six operations, and the FFN - not attention - " +
      "is where most of the parameters sit and where the only non-linear feature computation happens.",
  });
});
