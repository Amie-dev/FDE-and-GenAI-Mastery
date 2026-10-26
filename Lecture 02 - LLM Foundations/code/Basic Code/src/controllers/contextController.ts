import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalNumber, requireParts } from "../middleware/validate";
import * as contextService from "../services/contextService";
import * as countService from "../services/countService";

/** Chapter 08 - the context window: what it costs, and what to drop when it overflows. */

/** POST /api/context/cost   { "tokens": 4000, "model": "gpt-4o", "layers": 12 } */
export const cost = asyncHandler((req: Request, res: Response) => {
  const model = countService.modelFrom((req.body as { model?: unknown }).model);
  const tokens = optionalNumber(req, "tokens", 4_000, 1, 2_000_000);
  const layers = optionalNumber(req, "layers", 12, 1, 200);
  const expectedOutputTokens = optionalNumber(req, "expectedOutputTokens", 512, 0, 200_000);

  res.json({
    model: model.id,
    dModel: config.dModel,
    tokens,
    attentionOps: contextService.attentionOps(tokens),
    kvCache: contextService.kvCache(tokens, { layers }),
    money: countService.estimateCost(tokens, expectedOutputTokens, model),
    note: "Three independent costs grow with N: attention is O(N^2 * d_model), the KV cache is O(N * layers * d_model), and the bill is linear in tokens (§08.2).",
  });
});

/** POST /api/context/fit   { window?, outputReserve?, parts | text } */
export const fit = asyncHandler((req: Request, res: Response) => {
  const model = countService.modelFrom((req.body as { model?: unknown }).model);
  const window = optionalNumber(req, "window", model.contextWindow, 1, 2_000_000);
  const outputReserve = optionalNumber(req, "outputReserve", 1_024, 0, 200_000);

  const parts = countService.countParts(requireParts(req));
  const result = contextService.fitToWindow(parts, { window, outputReserve });

  res.json({
    model: model.id,
    window,
    outputReserve,
    inputParts: parts,
    ...result,
    droppedTokens: result.dropped.reduce((sum, part) => sum + part.tokens, 0),
    note: "Retrieve fewer and better tokens first, compact history second, slide the window third, map-reduce last (§08.3). Whatever you drop, log it.",
  });
});
