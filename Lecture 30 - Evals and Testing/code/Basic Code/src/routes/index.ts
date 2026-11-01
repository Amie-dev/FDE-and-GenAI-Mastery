// routes/index.ts — Mount all feature routes onto the app
// Maps to Lecture 30 notes: all chapters (exposes eval runner over HTTP)

import { Router, Request, Response } from "express";
import { evalController } from "../controllers/evalController.js";

const router = Router();

/** GET /api/health — simple health check for the service */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "fde-lecture-30-evals-testing",
    status: "ok",
  });
});

/** POST /api/eval/run — run a deterministic eval suite (Chapter 02 + Chapter 04) */
router.post("/eval/run", evalController.runEval);

export default router;