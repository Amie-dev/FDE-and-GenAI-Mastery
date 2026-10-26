import { Request, Response, Router } from 'express';
import { config } from '../config/config.js';
import { postChat, postTokenCount } from '../controllers/chat.controller.js';
import { chatRequestSchema, validateBody } from '../middleware/validate.js';

export const router = Router();

/** Chapter 02 + 08 — shows the live wiring of the four invariant components, free of charge. */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    temperature: config.AI_TEMPERATURE,
    maxOutputTokens: config.AI_MAX_TOKENS,
    inputBudget: config.AI_MAX_INPUT_TOKENS,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/** Chapter 03 + 04 + 06 + 07 + 09 — validated, budgeted, retried, priced, screened. */
router.post('/chat', validateBody(chatRequestSchema), postChat);

/** Chapter 05 — count tokens and check the budget without calling a provider. */
router.post('/tokens/count', validateBody(chatRequestSchema), postTokenCount);
