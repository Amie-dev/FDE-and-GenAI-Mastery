import { Router } from "express";
import * as memory from "../controllers/memory.controller";

/** Routes for the agent memory basic code (Lecture 19).
 *
 * POST /api/chat   send a message, get a memory-grounded reply (Chapters 2, 3, 4)
 * POST /api/dream  run background reflection for a user (Chapter 6)
 * GET  /api/health liveness check
 */

const router = Router();

router.get("/health", memory.health);
router.post("/chat", memory.chat);
router.post("/dream", memory.dream);

export default router;
