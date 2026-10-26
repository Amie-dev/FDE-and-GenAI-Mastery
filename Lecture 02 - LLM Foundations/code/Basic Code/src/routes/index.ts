import { Router } from "express";
import { config } from "../config/config";
import * as bpe from "../controllers/bpeController";
import * as context from "../controllers/contextController";
import * as count from "../controllers/countController";
import * as embedding from "../controllers/embeddingController";
import * as pipeline from "../controllers/pipelineController";
import * as positional from "../controllers/positionalController";
import * as strategy from "../controllers/strategyController";
import * as tokenizer from "../controllers/tokenizerController";

/**
 * Every route, grouped by the chapter of Lecture 02 it demonstrates.
 * Nothing else lives here: a route names a controller and nothing more.
 */
const router = Router();

/** Setup check: is the server up, and with what configuration? */
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    dModel: config.dModel,
    defaultModel: config.defaultModel,
    models: config.models.map((model) => model.id),
  });
});

// Chapter 01 - next-token prediction and the autoregressive loop
router.post("/pipeline/generate", pipeline.generate);
router.post("/pipeline/training-step", pipeline.trainingStep);

// Chapter 02 - the text pipeline: text -> tokens -> ids, and back
router.post("/tokenizer/encode", tokenizer.encode);
router.post("/tokenizer/decode", tokenizer.decode);

// Chapter 03 - word vs character vs subword
router.post("/strategies/compare", strategy.compare);

// Chapter 04 - BPE: train the merges, encode with them, and the "strawberry" problem
router.post("/bpe/train", bpe.train);
router.post("/bpe/encode", bpe.encode);
router.post("/bpe/count-letters", bpe.countLetters);

// Chapter 05 - token counting, budget and cost
router.post("/tokens/count", count.count);

// Chapter 06 - embedding lookup and similarity
router.post("/embeddings/lookup", embedding.lookup);
router.post("/embeddings/similarity", embedding.similarity);

// Chapter 07 - positional encoding
router.post("/positional", positional.encodePositions);

// Chapter 08 - context window cost and truncation policy
router.post("/context/cost", context.cost);
router.post("/context/fit", context.fit);

export default router;
