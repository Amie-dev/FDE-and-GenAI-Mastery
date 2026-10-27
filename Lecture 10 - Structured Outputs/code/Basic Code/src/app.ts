import express, { NextFunction, Request, Response } from 'express';
import { router } from './routes/index.js';

export const app = express();

app.use(express.json({ limit: '1mb' }));

/** One log line per request; the timestamp is what you grep for later. */
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

/**
 * Chapter 06 §06.1 — the HTTP layer's own boundary.
 *
 * Note how little can reach it. By the time a request gets here, every model
 * failure — a refusal, a truncation, a shape error, exhausted repairs — has
 * ALREADY been converted into a typed outcome by `extract()`. Only request-shape
 * problems and genuine infrastructure faults can still become a 5xx.
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number((error as { status?: number }).status) || 500;
  const titles: Record<number, string> = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'The model refused the request',
    502: 'Provider returned an unusable response',
    503: 'Model credentials are not configured',
  };

  console.error(`❌ ${status} ${error.message}`);
  res.status(status).json({ error: titles[status] ?? 'Internal Server Error', message: error.message });
});
