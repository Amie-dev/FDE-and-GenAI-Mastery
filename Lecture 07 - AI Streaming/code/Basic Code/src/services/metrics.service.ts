import { READING_TPS } from '../config/config.js';
import type { FinishReason, StreamMetrics } from '../types/streaming.types.js';

/**
 * Chapter 03 §03.5 — the numbers you must log.
 *
 * A buffered endpoint and a broken-streaming endpoint look IDENTICAL in an
 * aggregate latency dashboard, so one total number is diagnostically useless.
 * This service keeps a bounded in-memory ledger of per-stream rows.
 *
 * Chapter 09 §09.8 — in production this is one structured log line per stream
 * (plus a p95 alert). Here it is an endpoint you can read.
 */

const LEDGER_LIMIT = 500;
const ledger: StreamMetrics[] = [];

/** Chapter 09 §09.7 item 21 — in-flight streams, so shutdown can drain them. */
let active = 0;
let aborted = 0;

export const beginStream = (): void => {
  active += 1;
};

export const endStream = (): void => {
  active = Math.max(0, active - 1);
};

export const activeStreams = (): number => active;

export const recordStream = (metrics: StreamMetrics): void => {
  if (metrics.aborted) aborted += 1;
  ledger.push(metrics);
  if (ledger.length > LEDGER_LIMIT) ledger.shift();
};

/** Nearest-rank percentile over a sorted copy. */
const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? null;
};

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1));

/**
 * Chapter 09 §09.8 — the streaming-specific metrics that detect regressions.
 * Note what is missing: a client-side TTFT. Only the browser knows it, which is
 * why the TTFT *gap* is the one alert worth having (see `public/index.html`).
 */
export const metricsSummary = () => {
  const ttfts = ledger.map((row) => row.ttftMs).filter((value): value is number => value !== null);
  const itls = ledger.map((row) => row.itlMs).filter((value): value is number => value !== null);
  const tpss = ledger.map((row) => row.tps).filter((value): value is number => value !== null);

  const byFinishReason = ledger.reduce<Record<FinishReason, number>>(
    (counts, row) => ({ ...counts, [row.finishReason]: (counts[row.finishReason] ?? 0) + 1 }),
    { stop: 0, length: 0, error: 0, aborted: 0 },
  );

  return {
    streams: ledger.length,
    activeStreams: active,
    abortedStreams: aborted,
    abortRate: ledger.length ? Number((aborted / ledger.length).toFixed(2)) : 0,
    byFinishReason,
    ttftMs: { p50: percentile(ttfts, 50), p95: percentile(ttfts, 95) },
    itlMs: mean(itls),
    tps: mean(tpss),
    /** Chapter 03 §03.3 — above reading speed, more TPS buys the user nothing. */
    readingSpeedTps: READING_TPS,
    fasterThanReadingRate: ledger.length
      ? Number((ledger.filter((row) => row.fasterThanReading).length / ledger.length).toFixed(2))
      : 0,
    /**
     * Chapter 04 §04.6 — the buffering smoke alarm.
     * A narrow distribution of small frames is healthy; one giant frame is not.
     */
    charsPerFrame: {
      avg: mean(ledger.map((row) => row.charsPerFrame)),
      p95: percentile(ledger.map((row) => row.charsPerFrame), 95),
    },
    lastStream: ledger[ledger.length - 1] ?? null,
  };
};
