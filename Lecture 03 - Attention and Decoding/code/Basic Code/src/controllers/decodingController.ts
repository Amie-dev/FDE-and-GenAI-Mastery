import type { Request, Response } from "express";
import { config } from "../config/config";
import { asyncHandler, badRequest } from "../middleware/errorHandler";
import { optionalInteger, optionalNumber, optionalNumberArray, optionalTokens, requireSettings } from "../middleware/validate";
import { softmax } from "../services/attentionService";
import * as decoding from "../services/decodingService";

/** Chapter 08 - decoding strategies and sampling controls. */

const DEFAULT_TOKENS = ["Python", "Java", "JavaScript", "C++", "Rust"];
const DEFAULT_LOGITS = [5, 4, 3, 2, 1];

/** Both endpoints take the same pair of arrays, so validate them in one place. */
function candidatesFrom(req: Request) {
  const tokens = optionalTokens(req, "tokens", DEFAULT_TOKENS);
  const logits = optionalNumberArray(req, "logits", DEFAULT_LOGITS);
  if (tokens.length !== logits.length) {
    throw badRequest(`"tokens" (${tokens.length}) and "logits" (${logits.length}) must be the same length.`);
  }
  return { tokens, logits };
}

/** POST /api/decoding/controls  { "logits": [5,4,3,2,1], "topK": 3, "topP": 0.9, "minP": 0.1 } */
export const controls = asyncHandler((req: Request, res: Response) => {
  const { tokens, logits } = candidatesFrom(req);
  const topK = optionalInteger(req, "topK", 3, 1, 20) ?? 3;
  const topP = optionalNumber(req, "topP", config.topP, 0, 1);
  const minP = optionalNumber(req, "minP", 0.1, 0, 1);
  const full = softmax(logits);

  res.json({
    chapter: "08 §08.5-§08.8 - temperature, top-k, top-p and min-p",
    tokens,
    rawLogits: logits,
    fullDistribution: full,
    lectureTemperature: decoding.lectureTemperature(),
    panels: [0.5, 1, 2].map((temperature) => decoding.temperaturePanel(logits, temperature)),
    pools: {
      topK: { k: topK, probabilities: decoding.renormalise(decoding.keepTopK(full, topK)) },
      topP: { p: topP, probabilities: decoding.renormalise(decoding.keepNucleus(full, topP)) },
      minP: { minP, probabilities: decoding.renormalise(decoding.keepAboveRelative(full, minP)) },
    },
    nucleusExample: decoding.nucleusExample(),
    recipes: decoding.recipes(),
    streaming: decoding.streamingNote(),
    note:
      "Top-k is shape-blind and top-p is blind to how confident the leader is; min-p is a relative threshold " +
      "that behaves like greedy when the model is sure and like sampling when it is not.",
  });
});

/**
 * POST /api/decoding/sample
 *   { "logits": [5,4,3,2,1], "strategy": "sample", "temperature": 0.7,
 *     "topP": 0.9, "presencePenalty": 1, "seed": 42, "generated": [0] }
 */
export const sample = asyncHandler((req: Request, res: Response) => {
  const { tokens, logits } = candidatesFrom(req);
  const settings = requireSettings(req, { temperature: config.temperature, topP: config.topP, seed: config.seed });

  const rawGenerated = (req.body as { generated?: unknown } | undefined)?.generated;
  const generated = Array.isArray(rawGenerated) ? (rawGenerated as unknown[]).map(Number).filter(Number.isInteger) : [0];
  const rawSteps = (req.body as { steps?: unknown } | undefined)?.steps;
  const steps = Array.isArray(rawSteps) && rawSteps.length > 0 ? (rawSteps as number[][]) : [logits, logits];

  const result = decoding.decodeStep(logits, generated, settings);
  const chosen = result.selected >= 0 && result.selected < tokens.length ? tokens[result.selected] : String(result.selected);

  res.json({
    chapter: "08 §08.2-§08.10 - greedy, beam and sampling, in the order that matters",
    tokens,
    rawLogits: logits,
    generatedIds: generated,
    settings,
    selected: { id: result.selected, token: chosen, mode: result.mode },
    poolSize: result.poolSize,
    distribution: result.distribution,
    trace: result.trace,
    greedy: decoding.greedy(logits),
    beam: decoding.beamSearch(steps, 2),
    orderOfOperations: [
      "logit bias / vocabulary mask",
      "penalties (from what has already been generated)",
      "temperature",
      "top-k, then top-p, then min-p",
      "softmax and renormalise",
      "sample or argmax",
      "stop check, append, repeat",
    ],
    note:
      "The order is fixed because the operations do not commute: trimming the pool must happen AFTER temperature, " +
      "because the pool is chosen by probability and temperature is what shapes those probabilities.",
  });
});
