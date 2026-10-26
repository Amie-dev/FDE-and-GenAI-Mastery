import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalInteger, shapeId } from "../middleware/validate";
import {
  attentionModes,
  chooseFamily,
  contextReach,
  families,
  prefixLm,
  trainingVsInference,
  whatWasGivenUp,
  whyDecoderOnly,
} from "../services/architectureService";

/** Chapter 06 - the three families, the three masks, and why GPT is decoder-only. */

/** POST /api/architecture/compare  { "n": 6, "shape": "toy-tiny", "task": "summarise a contract" } */
export const compare = asyncHandler((req: Request, res: Response) => {
  const shape = config.shape(shapeId(req));
  const n = optionalInteger(req, "n", config.nTokens, 1, 32) ?? config.nTokens;
  const asked = (req.body as { task?: unknown } | undefined)?.task;
  const task = typeof asked === "string" && asked.trim().length > 0 ? asked : "generate text, chat, use tools";

  res.json({
    chapter: "06 - encoder-decoder vs decoder-only, and why GPT is decoder-only",
    shape: shape.id,
    n,
    families: families(),
    attentionModes: attentionModes(n),
    contextReach: contextReach(n),
    trainingVsInference: trainingVsInference(n, shape),
    whyDecoderOnly: whyDecoderOnly(),
    whatWasGivenUp: whatWasGivenUp(),
    prefixLm: prefixLm(),
    decision: chooseFamily(task),
    note:
      "The three families differ in exactly one place: which positions a token may read. Everything else - blocks, " +
      "heads, FFN, logits - is the same machinery. Choose the family by the mask the task needs.",
  });
});
