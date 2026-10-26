import { Router } from 'express';
import {
  getHealth,
  getSession,
  postChat,
  postChatStream,
  postMemory,
  postPreview,
  postProjection,
  postSession,
  removeSession,
} from '../controllers/chat.controller.js';
import {
  chatRequestSchema,
  memoryRequestSchema,
  previewRequestSchema,
  projectionRequestSchema,
  validateBody,
} from '../middleware/validate.js';

export const router = Router();

/** Chapter 08 §08.5 — the live wiring and the active policy, in one response. */
router.get('/health', getHealth);

/** Chapter 01 §01.2 — the session store is the memory the model does not have. */
router.post('/session', postSession);
router.get('/session/:sessionId', getSession);
router.delete('/session/:sessionId', removeSession); // chapter 04 §04.8

/** Chapter 04 §04.9 — durable, typed, categorised, deletable facts. */
router.post('/session/:sessionId/memory', validateBody(memoryRequestSchema), postMemory);

/** Chapters 02 + 03 + 07 — inspect the payload and the budget. No model call, no writes. */
router.post('/context/preview', validateBody(previewRequestSchema), postPreview);

/** Chapter 02 §02.5 — the O(N^2) accumulation projection. */
router.post('/context/projection', validateBody(projectionRequestSchema), postProjection);

/** Chapter 08 §08.6 — one message, end to end, buffered. */
router.post('/chat', validateBody(chatRequestSchema), postChat);

/** Chapter 05 §05.7 — the same turn, streamed over SSE. */
router.post('/chat/stream', validateBody(chatRequestSchema), postChatStream);
