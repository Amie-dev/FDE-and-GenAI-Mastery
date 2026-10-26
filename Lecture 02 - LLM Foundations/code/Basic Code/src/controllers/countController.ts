import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalNumber, requireParts } from "../middleware/validate";
import * as countService from "../services/countService";

/** Chapter 05 - count before you send: the pre-flight check that turns a surprise bill into a decision. */

/** POST /api/tokens/count   { model?, desiredOutputTokens?, parts | text } */
export const count = asyncHandler((req: Request, res: Response) => {
  const model = countService.modelFrom((req.body as { model?: unknown }).model);
  const desiredOutputTokens = optionalNumber(req, "desiredOutputTokens", 512, 1, 200_000);
  const expectedOutputTokens = optionalNumber(req, "expectedOutputTokens", desiredOutputTokens, 1, 200_000);

  const parts = countService.countParts(requireParts(req));
  const totalTokens = parts.reduce((sum, part) => sum + part.tokens, 0);
  const budget = countService.promptBudget(model, desiredOutputTokens);

  res.json({
    model,
    tokenizer: countService.TOKENIZER_META,
    parts,
    totalTokens,
    budget,
    cost: countService.estimateCost(totalTokens, expectedOutputTokens, model),
    fits: totalTokens <= budget.availableForPrompt,
    note: "Reserve the output FIRST, then spend what is left on context. Reserve nothing and the answer gets cut off mid-sentence (§05.6).",
  });
});
