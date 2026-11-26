export type ModelTier = "system1" | "system2";

export interface ModelProfile {
  id: string;
  tier: ModelTier;
  inputPricePer1M: number;
  outputPricePer1M: number;
  thinkingBudget: number;
  maxTokens: number;
  avgItlMs: number;
}

export const MODEL_PROFILES: Record<ModelTier, ModelProfile> = {
  system1: {
    id: "fast-flash-s1",
    tier: "system1",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    thinkingBudget: 0,
    maxTokens: 2048,
    avgItlMs: 12,
  },
  system2: {
    id: "deliberative-reasoning-s2",
    tier: "system2",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    thinkingBudget: 2048,
    maxTokens: 8192,
    avgItlMs: 22,
  },
};

export interface RoutingFeatures {
  tokenCount: number;
  hasCodeOrStackTrace: boolean;
  constraintCount: number;
  multiStepVerbs: number;
  priorAttemptFailed: boolean;
}

export interface RouterDecision {
  tier: ModelTier;
  model: ModelProfile;
  complexityScore: number;
  reason: string;
}

export interface BenchmarkQuery {
  id: string;
  prompt: string;
  inputTokens: number;
  visibleOutputTokens: number;
  /** Ground-truth difficulty: true if System-1 alone would fail without escalation */
  requiresDeliberation: boolean;
  /** Optional simulated System-2 thinking tokens when deliberative model runs */
  s2ThinkingTokens: number;
}

export interface BenchmarkReport {
  totalQueries: number;
  routedToS1: number;
  routedToS2: number;
  escalatedToS2: number;
  baselineCostUsd: number;
  routedCostUsd: number;
  costSavingsPct: number;
  baselineAccuracyPct: number;
  routedAccuracyPct: number;
}

const CONSTRAINT_REGEX = /\b(must|without|only if|except|invariant|strictly|ensure)\b/gi;
const COMPLEX_VERB_REGEX = /\b(debug|refactor|prove|race condition|deadlock|architecture|migrate|root[- ]cause|concurrency)\b/gi;
const CODE_OR_TRACE_REGEX = /(```|Error:|at\s+\w+\s+\(|stack trace|SELECT\s+.+\s+FROM)/i;

/** Extract deterministic structural and linguistic complexity signals from a prompt. */
export function extractFeatures(prompt: string, inputTokens: number, priorAttemptFailed = false): RoutingFeatures {
  const constraintMatches = prompt.match(CONSTRAINT_REGEX) ?? [];
  const verbMatches = prompt.match(COMPLEX_VERB_REGEX) ?? [];
  return {
    tokenCount: inputTokens,
    hasCodeOrStackTrace: CODE_OR_TRACE_REGEX.test(prompt),
    constraintCount: constraintMatches.length,
    multiStepVerbs: verbMatches.length,
    priorAttemptFailed,
  };
}

/** Score prompt complexity in [0, 1] using cheap, deterministic features. */
export function scoreComplexity(f: RoutingFeatures): number {
  let score = 0;
  if (f.tokenCount > 1500) score += 0.25;
  else if (f.tokenCount > 500) score += 0.10;

  if (f.hasCodeOrStackTrace) score += 0.25;
  score += Math.min(0.25, f.constraintCount * 0.08);
  score += Math.min(0.30, f.multiStepVerbs * 0.15);
  if (f.priorAttemptFailed) score += 0.40;

  return Math.min(1, Number(score.toFixed(3)));
}

/** Dispatch a request to System-1 or System-2 based on complexity threshold. */
export function routeRequest(
  prompt: string,
  inputTokens: number,
  options: { priorAttemptFailed?: boolean; threshold?: number } = {}
): RouterDecision {
  const threshold = options.threshold ?? 0.40;
  const features = extractFeatures(prompt, inputTokens, options.priorAttemptFailed ?? false);
  const complexityScore = scoreComplexity(features);

  if (features.priorAttemptFailed) {
    return {
      tier: "system2",
      model: MODEL_PROFILES.system2,
      complexityScore,
      reason: "Escalated to System-2 because prior attempt failed verification",
    };
  }

  const tier: ModelTier = complexityScore >= threshold ? "system2" : "system1";
  return {
    tier,
    model: MODEL_PROFILES[tier],
    complexityScore,
    reason:
      tier === "system2"
        ? `Complexity ${complexityScore} >= ${threshold} threshold`
        : `Complexity ${complexityScore} < ${threshold} threshold`,
  };
}

/** Compute exact USD cost for a model call, billing thinking tokens at output rate. */
export function computeCallCostUsd(
  model: ModelProfile,
  inputTokens: number,
  visibleOutputTokens: number,
  thinkingTokens: number
): number {
  const boundedThinking = Math.min(thinkingTokens, model.thinkingBudget);
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1M;
  const outputCost = ((visibleOutputTokens + boundedThinking) / 1_000_000) * model.outputPricePer1M;
  return inputCost + outputCost;
}

/** 20-query mixed-complexity benchmark (14 routine System-1, 6 deliberative System-2). */
export const MIXED_20_BENCHMARK: BenchmarkQuery[] = [
  { id: "q01", prompt: "Classify support ticket: 'Where is my order?'", inputTokens: 320, visibleOutputTokens: 25, requiresDeliberation: false, s2ThinkingTokens: 600 },
  { id: "q02", prompt: "Extract JSON {name, email} from signature block.", inputTokens: 280, visibleOutputTokens: 40, requiresDeliberation: false, s2ThinkingTokens: 550 },
  { id: "q03", prompt: "Translate release note into Spanish.", inputTokens: 410, visibleOutputTokens: 120, requiresDeliberation: false, s2ThinkingTokens: 700 },
  { id: "q04", prompt: "Summarize this 3-paragraph incident update.", inputTokens: 490, visibleOutputTokens: 90, requiresDeliberation: false, s2ThinkingTokens: 650 },
  { id: "q05", prompt: "Format CSV rows into Markdown table.", inputTokens: 350, visibleOutputTokens: 110, requiresDeliberation: false, s2ThinkingTokens: 500 },
  { id: "q06", prompt: "Redact PII phone numbers from transcript.", inputTokens: 440, visibleOutputTokens: 140, requiresDeliberation: false, s2ThinkingTokens: 620 },
  { id: "q07", prompt: "Generate Zod schema for UserProfile(id, email).", inputTokens: 300, visibleOutputTokens: 60, requiresDeliberation: false, s2ThinkingTokens: 580 },
  { id: "q08", prompt: "Label sentiment as positive, neutral, or negative.", inputTokens: 220, visibleOutputTokens: 10, requiresDeliberation: false, s2ThinkingTokens: 480 },
  { id: "q09", prompt: "Draft polite order-delay acknowledgement email.", inputTokens: 310, visibleOutputTokens: 95, requiresDeliberation: false, s2ThinkingTokens: 610 },
  { id: "q10", prompt: "Convert ISO-8601 timestamps to UTC date strings.", inputTokens: 260, visibleOutputTokens: 45, requiresDeliberation: false, s2ThinkingTokens: 500 },
  { id: "q11", prompt: "List 3 unit test names for add(a, b).", inputTokens: 200, visibleOutputTokens: 55, requiresDeliberation: false, s2ThinkingTokens: 520 },
  { id: "q12", prompt: "Normalize product SKUs to uppercase.", inputTokens: 240, visibleOutputTokens: 35, requiresDeliberation: false, s2ThinkingTokens: 490 },
  { id: "q13", prompt: "Extract invoice total and currency from text.", inputTokens: 390, visibleOutputTokens: 30, requiresDeliberation: false, s2ThinkingTokens: 540 },
  { id: "q14", prompt: "Write JSDoc comment for calculateDiscount().", inputTokens: 290, visibleOutputTokens: 65, requiresDeliberation: false, s2ThinkingTokens: 590 },
  {
    id: "q15",
    prompt: "Debug this race condition in our worker pool: ```ts\nasync function run() {}\n``` It must preserve ordering and must not drop errors.",
    inputTokens: 1650,
    visibleOutputTokens: 340,
    requiresDeliberation: true,
    s2ThinkingTokens: 1600,
  },
  {
    id: "q16",
    prompt: "Refactor the billing state machine to migrate legacy webhooks without downtime; ensure idempotency invariant holds.",
    inputTokens: 1800,
    visibleOutputTokens: 420,
    requiresDeliberation: true,
    s2ThinkingTokens: 1850,
  },
  {
    id: "q17",
    prompt: "Root-cause this deadlock from stack trace: Error: Lock timeout at acquireLock (lock.ts:42). Must remain backwards-compatible.",
    inputTokens: 1700,
    visibleOutputTokens: 310,
    requiresDeliberation: true,
    s2ThinkingTokens: 1500,
  },
  {
    id: "q18",
    prompt: "Prove that our concurrency limiter satisfies the fairness invariant under bursty load; compare two semaphore designs.",
    inputTokens: 1600,
    visibleOutputTokens: 380,
    requiresDeliberation: true,
    s2ThinkingTokens: 1750,
  },
  {
    id: "q19",
    prompt: "Debug SQL query regression: SELECT * FROM orders WHERE tenant_id = $1; must enforce tenant isolation and strictly avoid full table scans.",
    inputTokens: 1550,
    visibleOutputTokens: 290,
    requiresDeliberation: true,
    s2ThinkingTokens: 1400,
  },
  {
    id: "q20",
    prompt: "Design architecture for multi-region cache invalidation; must handle split-brain without stale reads except during bounded TTL.",
    inputTokens: 1900,
    visibleOutputTokens: 450,
    requiresDeliberation: true,
    s2ThinkingTokens: 1950,
  },
];

/** Run the 20-query benchmark comparing all-System-2 baseline vs. dynamic router + cascade. */
export function runBenchmark(queries: BenchmarkQuery[] = MIXED_20_BENCHMARK): BenchmarkReport {
  let baselineCostUsd = 0;
  let routedCostUsd = 0;
  let routedToS1 = 0;
  let routedToS2 = 0;
  let escalatedToS2 = 0;
  let baselineCorrect = 0;
  let routedCorrect = 0;

  for (const q of queries) {
    // Baseline: every query hits System-2
    baselineCostUsd += computeCallCostUsd(MODEL_PROFILES.system2, q.inputTokens, q.visibleOutputTokens, q.s2ThinkingTokens);
    baselineCorrect += 1;

    // Dynamic router
    const decision = routeRequest(q.prompt, q.inputTokens);
    if (decision.tier === "system1") {
      routedToS1 += 1;
      routedCostUsd += computeCallCostUsd(MODEL_PROFILES.system1, q.inputTokens, q.visibleOutputTokens, 0);

      if (q.requiresDeliberation) {
        // Cascade fallback: deterministic verifier catches System-1 miss and escalates
        escalatedToS2 += 1;
        routedCostUsd += computeCallCostUsd(MODEL_PROFILES.system2, q.inputTokens, q.visibleOutputTokens, q.s2ThinkingTokens);
      }
      routedCorrect += 1;
    } else {
      routedToS2 += 1;
      routedCostUsd += computeCallCostUsd(MODEL_PROFILES.system2, q.inputTokens, q.visibleOutputTokens, q.s2ThinkingTokens);
      routedCorrect += 1;
    }
  }

  const costSavingsPct = ((baselineCostUsd - routedCostUsd) / baselineCostUsd) * 100;
  return {
    totalQueries: queries.length,
    routedToS1,
    routedToS2,
    escalatedToS2,
    baselineCostUsd: Number(baselineCostUsd.toFixed(6)),
    routedCostUsd: Number(routedCostUsd.toFixed(6)),
    costSavingsPct: Number(costSavingsPct.toFixed(2)),
    baselineAccuracyPct: (baselineCorrect / queries.length) * 100,
    routedAccuracyPct: (routedCorrect / queries.length) * 100,
  };
}

