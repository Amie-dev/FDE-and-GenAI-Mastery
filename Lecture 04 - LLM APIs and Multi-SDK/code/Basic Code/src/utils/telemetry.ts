import type { SlopReport } from '../guards/slop.guard.js';
import type { TokenUsage } from '../lib/client.js';
import type { CostBreakdown } from '../services/token.service.js';

/**
 * Chapter 04 + 08 — the fields you can never reconstruct later, so log them on
 * every single call: provider, model, latency, token counts and cost.
 */
export interface TelemetryRecord {
  at: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedInputTokens: number;
  costUsd: number;
  slopScore: number;
}

export interface TelemetryInput {
  provider: string;
  model: string;
  latencyMs: number;
  usage: TokenUsage;
  estimatedInputTokens: number;
  cost: CostBreakdown;
  slop: SlopReport;
}

/** One structured line per call — grep-able now, dashboard-able later. */
export const recordTelemetry = (input: TelemetryInput): TelemetryRecord => {
  const record: TelemetryRecord = {
    at: new Date().toISOString(),
    provider: input.provider,
    model: input.model,
    latencyMs: input.latencyMs,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    totalTokens: input.usage.totalTokens,
    estimatedInputTokens: input.estimatedInputTokens,
    costUsd: Number(input.cost.totalCost.toFixed(6)),
    slopScore: input.slop.slopScore,
  };

  console.log(`[telemetry] ${JSON.stringify(record)}`);
  return record;
};
