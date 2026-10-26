import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalInteger, requireMask, requireTokens, shapeId } from "../middleware/validate";
import { project, tokenVectors } from "../services/attentionService";
import * as position from "../services/positionService";

/** Chapter 09 - position, masking and attention geometry. */

/** POST /api/position/encode  { "tokens": [...], "shape": "toy-tiny", "k": 3 } */
export const encode = asyncHandler((req: Request, res: Response) => {
  const tokens = requireTokens(req);
  const shape = config.shape(shapeId(req));
  const k = optionalInteger(req, "k", 3, 1, 64) ?? 3;
  const positions = tokens.map((_, i) => i);

  const embeddings = tokenVectors(tokens, shape.dModel);
  const positional = position.sinusoidal(positions, shape.dModel);
  const input = position.addPosition(embeddings, positional);
  const { Q, K } = project(embeddings, config.dHead(shape), config.seed);

  res.json({
    chapter: "09 - position, masking and attention geometry",
    shape: shape.id,
    dModel: shape.dModel,
    tokens,
    frequencies: position.frequencies(shape.dModel),
    table: tokens.map((token, i) => ({
      position: i,
      token,
      embedding: embeddings[i],
      positional: positional[i],
      input: input[i],
    })),
    linearOffset: [1, k].map((offset) => position.linearOffsetProperty(shape.dModel, offset, positions)),
    rope: {
      rotatedQuery: position.ropeRotate(Q[0], 0),
      rotatedKeyAtTwo: position.ropeRotate(K[0], 2),
      proof: position.ropeScoreProof(Q[0], K[0], [1, 2, 3, 5]),
      note: "RoPE adds no parameters and never touches the residual stream: it rotates Q and K in place.",
    },
    alibi: {
      slopes: position.alibiSlopes(shape.nHeads),
      biasHeadZero: position
        .alibiBias(tokens.length, shape.nHeads)
        .map((row) => row.map((value) => (value === -Infinity ? "-Infinity" : value))),
      note: "score_ij = Q_i . K_j / sqrt(d_k) - m_h (i - j): a distance penalty instead of a position vector.",
    },
    schemes: position.schemes(),
    contextExtension: position.contextExtension(),
    positionEffects: position.positionEffects(),
    note: "Position is ADDED to the embedding (sinusoidal) or applied to Q and K (RoPE) - never concatenated.",
  });
});

/** POST /api/position/mask  { "n": 6, "mask": "sliding", "window": 3 } */
export const mask = asyncHandler((req: Request, res: Response) => {
  const n = optionalInteger(req, "n", config.nTokens, 1, 24) ?? config.nTokens;
  const kind = requireMask(req);
  const window = optionalInteger(req, "window", 3, 1, 24) ?? 3;

  res.json({
    chapter: "09 §09.6 - the geometry of masks",
    n,
    chosen: kind,
    window,
    all: (["none", "causal", "sliding", "padding"] as const).map((each) => position.maskGeometry(n, each, window)),
    vocabularyMask:
      "The same -Infinity trick hides VOCABULARY entries instead of positions. That is the second axis, and it is " +
      "how a JSON schema or a grammar is enforced at the logit level (ch07 §07.7).",
    note: "The mask is applied to the scores before the softmax, so a blocked position gets weight exactly 0.",
  });
});
