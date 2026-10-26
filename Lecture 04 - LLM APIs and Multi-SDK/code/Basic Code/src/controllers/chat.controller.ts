import { NextFunction, Request, Response } from 'express';
import { config } from '../config/config.js';
import { buildMessages, chat } from '../services/chat.service.js';
import { countMessageTokens, estimateTokens } from '../services/token.service.js';

/** Chapter 08 — controllers stay thin: no prompt text, no provider details, no token maths. */
export const postChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await chat(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Chapter 05 — the same budget maths as /api/chat, but with no network call,
 * so you can price a prompt before spending anything.
 */
export const postTokenCount = (req: Request, res: Response): void => {
  const messages = buildMessages(req.body);

  res.status(200).json({
    success: true,
    data: {
      estimatedInputTokens: countMessageTokens(messages),
      budget: config.AI_MAX_INPUT_TOKENS,
      withinBudget: countMessageTokens(messages) <= config.AI_MAX_INPUT_TOKENS,
      perMessage: messages.map((message) => ({
        role: message.role,
        characters: message.content.length,
        estimatedTokens: estimateTokens(message.content),
      })),
    },
  });
};
