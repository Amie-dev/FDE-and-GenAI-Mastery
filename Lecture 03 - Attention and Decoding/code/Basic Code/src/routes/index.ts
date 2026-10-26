import { Router } from "express";
import { config } from "../config/config";
import * as architecture from "../controllers/architectureController";
import * as attention from "../controllers/attentionController";
import * as block from "../controllers/blockController";
import * as decoding from "../controllers/decodingController";
import * as head from "../controllers/headController";
import * as logits from "../controllers/logitsController";
import * as position from "../controllers/positionController";

/**
 * Every route, grouped by the chapter of Lecture 03 it demonstrates.
 * Nothing else lives here: a route names a controller and nothing more.
 */
const router = Router();

/** Setup check: is the server up, and with what configuration? */
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    defaultShape: config.defaultShape,
    shapes: config.shapes.map((shape) => ({
      id: shape.id,
      dModel: shape.dModel,
      nHeads: shape.nHeads,
      dHead: config.dHead(shape),
      dFF: shape.dFF,
      layers: shape.layers,
      contextWindow: shape.contextWindow,
    })),
    decodingDefaults: { temperature: config.temperature, topP: config.topP, seed: config.seed },
  });
});

// Chapter 01 - why attention: static vectors cannot be context-dependent
router.post("/attention/why", attention.why);

// Chapter 02 - Q, K, V: one vector, three projections
router.post("/attention/qkv", attention.qkv);

// Chapter 03 - the score matrix, the mask, the by-hand trace, the cost model
router.post("/attention/scores", attention.scores);
router.post("/attention/trace", attention.trace);
router.post("/attention/cost", attention.cost);

// Chapter 04 - multi-head attention: h views of the same tokens
router.post("/heads", head.heads);

// Chapter 05 - the transformer block and the residual stream
router.post("/block", block.block);

// Chapter 06 - encoder-decoder vs encoder-only vs decoder-only
router.post("/architecture/compare", architecture.compare);

// Chapter 07 - logits, softmax and logit bias
router.post("/logits", logits.softmax);
router.post("/logits/bias", logits.bias);

// Chapter 08 - temperature, top-k, top-p, min-p and the decode step
router.post("/decoding/controls", decoding.controls);
router.post("/decoding/sample", decoding.sample);

// Chapter 09 - position (sinusoidal, RoPE, ALiBi) and mask geometry
router.post("/position/encode", position.encode);
router.post("/position/mask", position.mask);

export default router;
