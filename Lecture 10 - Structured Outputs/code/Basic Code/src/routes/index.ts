import { Router } from 'express';
import { getHealth, getMetrics, getSchema, postExtract } from '../controllers/extraction.controller.js';
import { extractBodySchema, validateBody } from '../middleware/validate.js';

export const router = Router();

/** Chapter 05 §05.7 — which enforcement rung this process is on, and why. */
router.get('/health', getHealth);

/** Chapter 02 §02.6 / chapter 04 — the wire contract, the closed sets, the silent limits. */
router.get('/schema', getSchema);

/** Chapter 06 §06.2 — extract, validate, repair, and fall back if you must. */
router.post('/extract', validateBody(extractBodySchema), postExtract);

/** Chapter 09 §09.2 — first-pass validity, repair rate, issue distribution, cost. */
router.get('/metrics', getMetrics);
