import type { TracedAgentRun } from "./otel.js";

export interface ModelRate {
  inputPer1M: number;
  cacheReadPer1M: number;
  outputPer1M: number;
  providerDisplayName: string;
}

export const MODEL_RATE_CARD: Record<string, ModelRate> = {
  "gpt-4o": {
    inputPer1M: 2.5,
    cacheReadPer1M: 1.25,
    outputPer1M: 10.0,
    providerDisplayName: "OpenAI",
  },
  "gpt-4o-mini": {
    inputPer1M: 0.15,
    cacheReadPer1M: 0.075,
    outputPer1M: 0.6,
    providerDisplayName: "OpenAI",
  },
  "claude-3-5-sonnet": {
    inputPer1M: 3.0,
    cacheReadPer1M: 0.3,
    outputPer1M: 15.0,
    providerDisplayName: "Anthropic",
  },
};

export function calculateModelCostUsd(
  model: string,
  uncachedInputTokens: number,
  cacheReadInputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATE_CARD[model];
  if (!rate) {
    throw new Error(`Unknown model in rate card: ${model}`);
  }
  const cost =
    (uncachedInputTokens * rate.inputPer1M +
      cacheReadInputTokens * rate.cacheReadPer1M +
      outputTokens * rate.outputPer1M) /
    1_000_000;
  return Number(cost.toFixed(6));
}

export type BudgetDecisionStatus = "ALLOW" | "WARN" | "BLOCK";

export interface BudgetCheckResult {
  allowed: boolean;
  status: BudgetDecisionStatus;
  tenantId: string;
  usedUsd: number;
  limitUsd: number;
  utilizationRatio: number;
}

/**
 * Enforces per-tenant hard budgets with soft warnings at 80% and hard
 * circuit-breaker blocking at 100%, using reserve/reconcile for concurrency.
 */
export class TenantBudgetGuard {
  private readonly limits = new Map<string, number>();
  private readonly spend = new Map<string, number>();

  setTenantBudget(tenantId: string, limitUsd: number): void {
    this.limits.set(tenantId, limitUsd);
    if (!this.spend.has(tenantId)) {
      this.spend.set(tenantId, 0);
    }
  }

  checkAndReserve(tenantId: string, estimatedCostUsd: number): BudgetCheckResult {
    const limitUsd = this.limits.get(tenantId);
    if (limitUsd === undefined) {
      throw new Error(`No budget configured for tenant: ${tenantId}`);
    }
    const current = this.spend.get(tenantId) ?? 0;
    const projected = current + estimatedCostUsd;
    const utilizationRatio = limitUsd > 0 ? projected / limitUsd : 1;

    if (current >= limitUsd || projected > limitUsd) {
      return {
        allowed: false,
        status: "BLOCK",
        tenantId,
        usedUsd: Number(current.toFixed(6)),
        limitUsd,
        utilizationRatio: Number((current / limitUsd).toFixed(4)),
      };
    }

    this.spend.set(tenantId, projected);
    const status: BudgetDecisionStatus = utilizationRatio >= 0.8 ? "WARN" : "ALLOW";

    return {
      allowed: true,
      status,
      tenantId,
      usedUsd: Number(projected.toFixed(6)),
      limitUsd,
      utilizationRatio: Number(utilizationRatio.toFixed(4)),
    };
  }

  reconcile(tenantId: string, reservedUsd: number, actualUsd: number): number {
    const current = this.spend.get(tenantId) ?? 0;
    const updated = Math.max(0, current - reservedUsd + actualUsd);
    this.spend.set(tenantId, updated);
    return Number(updated.toFixed(6));
  }
}

export interface CpstReport {
  totalRuns: number;
  successfulTasks: number;
  failedTasks: number;
  totalSpendUsd: number;
  failedSpendUsd: number;
  cpstUsd: number | null;
  failureTaxRatio: number;
}

/**
 * Computes Cost per Successful Task (CPST):
 *   Total spend across ALL runs (succeeded + failed) / count(taskSuccess === true).
 */
export function computeCpstMetrics(runs: TracedAgentRun[]): CpstReport {
  let totalSpendUsd = 0;
  let failedSpendUsd = 0;
  let successfulTasks = 0;
  let failedTasks = 0;

  for (const run of runs) {
    totalSpendUsd += run.totalCostUsd;
    if (run.taskSuccess) {
      successfulTasks += 1;
    } else {
      failedTasks += 1;
      failedSpendUsd += run.totalCostUsd;
    }
  }

  const cpstUsd =
    successfulTasks > 0
      ? Number((totalSpendUsd / successfulTasks).toFixed(6))
      : null;
  const failureTaxRatio =
    totalSpendUsd > 0 ? Number((failedSpendUsd / totalSpendUsd).toFixed(4)) : 0;

  return {
    totalRuns: runs.length,
    successfulTasks,
    failedTasks,
    totalSpendUsd: Number(totalSpendUsd.toFixed(6)),
    failedSpendUsd: Number(failedSpendUsd.toFixed(6)),
    cpstUsd,
    failureTaxRatio,
  };
}

export interface FocusCostRecord {
  BillingAccountId: string;
  BillingPeriodStart: string;
  BillingPeriodEnd: string;
  ChargePeriodStart: string;
  ChargePeriodEnd: string;
  ProviderName: string;
  ServiceCategory: "AI and Machine Learning";
  ServiceName: string;
  ResourceId: string;
  ChargeCategory: "Usage";
  PricingCategory: "On-Demand";
  PricingQuantity: number;
  PricingUnit: "Tokens";
  ListCost: number;
  EffectiveCost: number;
  BilledCost: number;
  Tags: Record<string, string>;
  x_TraceId: string;
  x_TenantId: string;
  x_FeatureId: string;
  x_TaskSuccess: boolean;
}

/**
 * Converts OTel-traced agent runs into FinOps FOCUS v1.0-aligned cost rows,
 * preserving full trace-to-ledger lineage via x_TraceId.
 */
export function toFocusRecords(
  runs: TracedAgentRun[],
  billingAccountId: string,
  billingPeriodStart: string,
  billingPeriodEnd: string,
  discountMultiplier = 0.9,
): FocusCostRecord[] {
  return runs.map((run) => {
    const rate = MODEL_RATE_CARD[run.model];
    const providerName = rate?.providerDisplayName ?? run.provider;
    const totalTokens =
      run.totalInputTokens + run.totalCacheReadTokens + run.totalOutputTokens;
    const listCost = run.totalCostUsd;
    const effectiveCost = Number((listCost * discountMultiplier).toFixed(6));

    return {
      BillingAccountId: billingAccountId,
      BillingPeriodStart: billingPeriodStart,
      BillingPeriodEnd: billingPeriodEnd,
      ChargePeriodStart: run.startedAtIso,
      ChargePeriodEnd: run.endedAtIso,
      ProviderName: providerName,
      ServiceCategory: "AI and Machine Learning",
      ServiceName: `${providerName} Foundation Models`,
      ResourceId: run.model,
      ChargeCategory: "Usage",
      PricingCategory: "On-Demand",
      PricingQuantity: totalTokens,
      PricingUnit: "Tokens",
      ListCost: listCost,
      EffectiveCost: effectiveCost,
      BilledCost: effectiveCost,
      Tags: {
        tenant_id: run.tenantId,
        feature_id: run.featureId,
        cost_center: run.costCenter,
        environment: run.environment,
        task_success: String(run.taskSuccess),
      },
      x_TraceId: run.traceId,
      x_TenantId: run.tenantId,
      x_FeatureId: run.featureId,
      x_TaskSuccess: run.taskSuccess,
    };
  });
}

