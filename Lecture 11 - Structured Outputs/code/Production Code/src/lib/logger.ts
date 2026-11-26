import pino from 'pino';
import { config } from '../config/env.js';

/**
 * Chapter 09 §09.6 — STRUCTURED LOGGING.
 *
 * One line of JSON per event, so the log is queryable. The rule that matters most
 * is a NEGATIVE one: raw model output is never logged. Traces carry field PATHS
 * and error TYPES only (chapter 09 §09.6), which is what keeps a debug log from
 * becoming a compliance incident.
 */
export const logger = pino({
  name: config.SERVICE_NAME,
  level: config.LOG_LEVEL,
  base: { env: config.NODE_ENV, service: config.SERVICE_NAME },
  // Chapter 09 §09.6 — redact anything that could carry user content or a secret.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.text',
      'res.headers["set-cookie"]',
      '*.raw',
      '*.value',
      '*.text',
      'apiKey',
      'OPENAI_API_KEY',
      'GROQ_API_KEY',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;

/**
 * Chapter 09 §09.6.1 — THE TWO-STORE PATTERN, in code.
 *
 * The metrics store is durable and broadly accessible and contains NO values.
 * The debug store is opt-in, bounded, short-retention and holds the raw text, so
 * "why did this extraction fail?" is answerable without widening access to
 * everything else.
 */
export interface DebugRecord {
  readonly traceId: string;
  readonly tenantId: string;
  readonly at: string;
  readonly raw: string;
}

export class DebugStore {
  private readonly records = new Map<string, DebugRecord>();

  constructor(private readonly maxEntries: number) {}

  public put(record: DebugRecord): void {
    this.records.set(record.traceId, record);
    while (this.records.size > this.maxEntries) {
      const oldest = this.records.keys().next();
      if (oldest.done) break;
      this.records.delete(oldest.value);
    }
  }

  public get(traceId: string): DebugRecord | undefined {
    return this.records.get(traceId);
  }

  public size(): number {
    return this.records.size;
  }

  public clear(): void {
    this.records.clear();
  }
}
