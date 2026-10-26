import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction, Request, Response } from 'express';
import { router } from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(express.json({ limit: '1mb' }));

/**
 * Chapter 08 — the one browser client.
 * Served so the lecture's completion gate ("render a stream and cancel it
 * mid-flight") is testable without writing any client code yourself.
 * `../public` resolves from both `src/` (tsx) and `dist/` (compiled).
 */
app.use(express.static(path.join(here, '..', 'public')));

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
 * Chapter 02 §02.8 — map an error to the status the client can act on.
 * Everything that can be a 400 is a 400 here, BEFORE any stream has started:
 * after the first byte the status is frozen and errors must travel in-band
 * (chapter 07 §07.7).
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number((error as { status?: number }).status) || 500;
  const titles: Record<number, string> = {
    400: 'Bad Request',
    404: 'Not Found',
    502: 'Provider returned an unusable response',
    503: 'Model credentials are not configured',
  };

  console.error(`❌ ${status} ${error.message}`);
  res.status(status).json({ error: titles[status] ?? 'Internal Server Error', message: error.message });
});
