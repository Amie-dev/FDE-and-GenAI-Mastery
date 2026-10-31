import { Router } from "express";
import { workflowController } from "../controllers/workflowController.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/health", workflowController.healthCheck);

router.post(
  "/api/trigger-research",
  createRateLimiter({ windowMs: 60_000, maxRequests: 30 }),
  workflowController.triggerResearch
);

router.post(
  "/api/approve-job",
  createRateLimiter({ windowMs: 60_000, maxRequests: 100 }),
  workflowController.triggerApproval
);

export default router;