import { Router } from 'express';
import {
  getConversationHandler,
  getHealth,
  getMetrics,
  postChatBuffered,
  postChatStreamEvents,
  postChatStreamRaw,
} from '../controllers/chat.controller.js';
import { postDecode, postFrames, postTorture } from '../controllers/codec.controller.js';
import {
  chatRequestSchema,
  decodeRequestSchema,
  framesRequestSchema,
  tortureRequestSchema,
  validateBody,
} from '../middleware/validate.js';

export const router = Router();

/** Chapter 06 §06.2 — the wiring table: one row per hop, and every hop has an owner. */
router.get('/health', getHealth);

/** Chapter 07 §07.1 — the `String` return type: one value, at the end. */
router.post('/chat', validateBody(chatRequestSchema), postChatBuffered);

/** Chapter 05 §05.5 — the same stream as raw `text/plain`, chunked. */
router.post('/chat/stream', validateBody(chatRequestSchema), postChatStreamRaw);

/** Chapter 05 §05.3 — the same stream as `text/event-stream` with typed events. */
router.post('/chat/events', validateBody(chatRequestSchema), postChatStreamEvents);

/** Chapter 09 §09.2 — the dual-write proof: ONE assistant turn per exchange. */
router.get('/conversation/:conversationId', getConversationHandler);

/** Chapter 03 §03.5 — TTFT, ITL, TPS, frames, chars-per-frame, aborts, finish reasons. */
router.get('/metrics', getMetrics);

/** Chapter 04 §04.4 — the four granularities, and the UTF-8 split. */
router.post('/codec/decode', validateBody(decodeRequestSchema), postDecode);

/** Chapter 04 §04.3 — frame reassembly and the leftover buffer. */
router.post('/codec/frames', validateBody(framesRequestSchema), postFrames);

/** Chapter 04 §04.6 / chapter 09 §09.10 — the CI assertion, as an endpoint. */
router.post('/codec/torture', validateBody(tortureRequestSchema), postTorture);
