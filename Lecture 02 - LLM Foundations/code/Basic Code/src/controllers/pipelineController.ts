import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { optionalNumber, requireText } from "../middleware/validate";
import * as pipeline from "../services/pipelineService";

/** Chapter 01 - the generation loop, and Chapter 08 - the training step next to it. */

/** POST /api/pipeline/generate   { "prompt": "the capital of india is", "maxTokens": 6 } */
export const generate = asyncHandler((req: Request, res: Response) => {
  const prompt = requireText(req, "prompt");
  const maxTokens = optionalNumber(req, "maxTokens", 6, 1, 64);

  res.json({
    pipelineTrace: pipeline.runPipeline(prompt),
    generation: pipeline.generate(prompt, maxTokens),
  });
});

/** POST /api/pipeline/training-step   { "text": "the capital of india is delhi ." } */
export const trainingStep = asyncHandler((req: Request, res: Response) => {
  const text = requireText(req);
  res.json(pipeline.trainingStep(text));
});
