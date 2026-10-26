import { NextFunction, Request, Response } from 'express';
import { config } from '../config/config.js';
import { audit, compare, evaluate, preview } from '../services/prompt.service.js';
import { GOLDEN_SET_META, listPrompts, getPrompt, PERSONAS } from '../services/registry.service.js';

/** Chapter 01 §01.7 — controllers stay thin: no prompt text, no provider details, no metrics maths. */

/** Shows the live wiring and what the registry currently holds. */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    endpoint: config.AI_ENDPOINT,
    temperature: config.AI_TEMPERATURE,
    maxOutputTokens: config.AI_MAX_TOKENS,
    maxInputChars: config.MAX_INPUT_CHARS,
    hasApiKey: Boolean(config.AI_API_KEY),
    prompts: listPrompts().length,
    personas: PERSONAS.length,
    goldenSet: GOLDEN_SET_META,
    uptimeSeconds: Math.floor(process.uptime()),
  });
};

/** Chapter 09 §09.2 — every prompt version, with its status and metrics. */
export const getPrompts = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: listPrompts().map((record) => ({
      id: record.id,
      version: record.version,
      status: record.status,
      pattern: record.pattern,
      owner: record.owner,
      metrics: record.metrics,
    })),
  });
};

/** Chapter 09 §09.3 — a version is only useful if the changelog records the metric delta. */
export const getPromptById = (req: Request, res: Response): void => {
  const id = String(req.params.id ?? '');
  const version = typeof req.query.version === 'string' ? req.query.version : undefined;
  const record = getPrompt(id, version);

  if (!record) {
    res.status(404).json({ error: 'Not Found', message: `No registry entry for "${id}".` });
    return;
  }

  res.status(200).json({ success: true, data: record });
};

/** Chapters 01–07 — build every pattern and template, with no model call. */
export const postPreview = (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({ success: true, data: preview(req.body) });
  } catch (error) {
    next(error);
  }
};

/** Chapters 02–05 + 09 — run the four patterns over the golden set and compare them. */
export const postCompare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: await compare(req.body) });
  } catch (error) {
    next(error);
  }
};

/** Chapters 07 + 08 — lint a prompt and screen data / output. */
export const postAudit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({ success: true, data: audit(req.body) });
  } catch (error) {
    next(error);
  }
};

/** Chapter 09 — evaluate a registry version and apply the regression gate. */
export const postEval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: await evaluate(req.body.promptId, req.body.version) });
  } catch (error) {
    next(error);
  }
};
