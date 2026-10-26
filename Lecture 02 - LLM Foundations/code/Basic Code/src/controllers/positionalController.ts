import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { requireText } from "../middleware/validate";
import * as countService from "../services/countService";
import { cosine, embedAll, preview } from "../services/embeddingService";
import * as positional from "../services/positionalService";
import { encode, normalize, pieceOf } from "../services/tokenizerService";

/** Chapter 07 - where word order enters the model, and how to prove it did. */

const round = (value: number): number => Number(value.toFixed(6));

/** POST /api/positional   { "text": "the cat sat on the mat", "model": "gpt-4o" } */
export const encodePositions = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  const model = countService.modelFrom((req.body as { model?: unknown }).model);

  const encoded = encode(text);
  const ids = encoded.ids;
  const positions = ids.map((_, index) => index);

  const vectors = embedAll(ids);
  const positionalVectors = positional.sinusoidalEncoding(positions, config.dModel);
  const inputVectors = positional.addPositions(vectors, positionalVectors);

  // §07.7: a token that appears twice gets ONE embedding but TWO input vectors.
  const laterIndex = ids.findIndex((id, index) => ids.indexOf(id) !== index);
  const earlierIndex = laterIndex === -1 ? -1 : ids.indexOf(ids[laterIndex]);
  const repeatedToken =
    laterIndex > 0
      ? {
          token: pieceOf(ids[laterIndex]),
          id: ids[laterIndex],
          positions: [earlierIndex, laterIndex],
          embeddingsIdentical: String(vectors[earlierIndex]) === String(vectors[laterIndex]),
          inputsIdentical: String(inputVectors[earlierIndex]) === String(inputVectors[laterIndex]),
          cosineBetweenInputs: round(cosine(inputVectors[earlierIndex], inputVectors[laterIndex])),
        }
      : null;

  res.json({
    text: normalize(text),
    tokens: encoded.tokens,
    ids,
    dModel: config.dModel,
    table: ids.map((id, index) => ({
      position: index,
      token: pieceOf(id),
      id,
      embedding: preview(vectors[index]),
      positional: preview(positionalVectors[index]),
      input: preview(inputVectors[index]),
    })),
    repeatedToken,
    offsetProperty: {
      claim: "P_pos . P_(pos+k) depends only on k, not on pos, so relative offsets are learnable (§07.3)",
      k1: positional.offsetDotProducts(config.dModel, 1, [0, 1, 2, 3]),
      k3: positional.offsetDotProducts(config.dModel, 3, [0, 1, 2, 3]),
    },
    guardRail: positional.trainedLengthWarning(ids.length, model.contextWindow),
    note: "Every row above is E_token + P_pos. Position is added, never concatenated, so d_model stays fixed (§07.2).",
  });
});
