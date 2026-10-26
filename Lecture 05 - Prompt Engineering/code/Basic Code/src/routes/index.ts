import { Router } from 'express';
import {
  getHealth,
  getPromptById,
  getPrompts,
  postAudit,
  postCompare,
  postEval,
  postPreview,
} from '../controllers/prompt.controller.js';
import {
  auditRequestSchema,
  evalRequestSchema,
  labRequestSchema,
  validateBody,
} from '../middleware/validate.js';

export const router = Router();

/** Chapter 09 — what the registry holds, and which model this process is pinned to. */
router.get('/health', getHealth);

/** Chapter 09 §09.2 — the prompt registry. */
router.get('/prompts', getPrompts);
router.get('/prompts/:id', getPromptById);

/**
 * Chapter 01 §01.7 — the lab, in two steps:
 *   preview = draft and lint (no model call, no cost)
 *   compare = test and measure (the comparison table from chapter 09 §09.10)
 */
router.post('/lab/preview', validateBody(labRequestSchema), postPreview);
router.post('/lab/compare', validateBody(labRequestSchema), postCompare);

/** Chapters 07 + 08 — prompt hygiene and guardrails on arbitrary text. */
router.post('/audit', validateBody(auditRequestSchema), postAudit);

/** Chapter 09 §09.5–09.8 — the golden set, the six metrics and the regression gate. */
router.post('/eval/run', validateBody(evalRequestSchema), postEval);
