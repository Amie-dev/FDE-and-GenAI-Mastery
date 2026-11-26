import { createHash } from "node:crypto";

export interface PromptSegments {
  /** Immutable static prefix: system prompt + sorted tools + AGENTS.md */
  staticPrefix: string;
  staticPrefixTokens: number;
  /** Volatile suffix: turn history + timestamps + current user query */
  dynamicSuffix: string;
  dynamicSuffixTokens: number;
}

export interface CacheTurnResult {
  turn: number;
  cacheStatus: "WRITE" | "HIT" | "BYPASS_TOO_SHORT";
  cachedReadTokens: number;
  uncachedInputTokens: number;
  uncachedCostUsd: number;
  cachedCostUsd: number;
}

export interface CacheSessionSummary {
  turns: CacheTurnResult[];
  totalUncachedCostUsd: number;
  totalCachedCostUsd: number;
  savingsPct: number;
  cacheHitRatePct: number;
}

const MIN_CACHEABLE_PREFIX_TOKENS = 1024;
const WRITE_MULTIPLIER = 1.25;
const READ_MULTIPLIER = 0.10;

/**
 * Tracks causal prompt-prefix KV cache hits across multi-turn agent sessions.
 * Any single-byte mutation in `staticPrefix` changes its SHA-256 key and triggers a cache miss.
 */
export class PrefixCacheTracker {
  private readonly seenPrefixHashes = new Set<string>();
  private readonly inputPricePer1M: number;

  constructor(inputPricePer1M = 3.0) {
    this.inputPricePer1M = inputPricePer1M;
  }

  private hashPrefix(prefix: string): string {
    return createHash("sha256").update(prefix).digest("hex");
  }

  recordTurn(turn: number, segments: PromptSegments): CacheTurnResult {
    const totalTokens = segments.staticPrefixTokens + segments.dynamicSuffixTokens;
    const uncachedCostUsd = (totalTokens / 1_000_000) * this.inputPricePer1M;

    if (segments.staticPrefixTokens < MIN_CACHEABLE_PREFIX_TOKENS) {
      return {
        turn,
        cacheStatus: "BYPASS_TOO_SHORT",
        cachedReadTokens: 0,
        uncachedInputTokens: totalTokens,
        uncachedCostUsd,
        cachedCostUsd: uncachedCostUsd,
      };
    }

    const prefixKey = this.hashPrefix(segments.staticPrefix);
    const isHit = this.seenPrefixHashes.has(prefixKey);

    if (!isHit) {
      this.seenPrefixHashes.add(prefixKey);
      const cachedCostUsd =
        (segments.staticPrefixTokens / 1_000_000) * (this.inputPricePer1M * WRITE_MULTIPLIER) +
        (segments.dynamicSuffixTokens / 1_000_000) * this.inputPricePer1M;
      return {
        turn,
        cacheStatus: "WRITE",
        cachedReadTokens: 0,
        uncachedInputTokens: totalTokens,
        uncachedCostUsd,
        cachedCostUsd,
      };
    }

    const cachedCostUsd =
      (segments.staticPrefixTokens / 1_000_000) * (this.inputPricePer1M * READ_MULTIPLIER) +
      (segments.dynamicSuffixTokens / 1_000_000) * this.inputPricePer1M;

    return {
      turn,
      cacheStatus: "HIT",
      cachedReadTokens: segments.staticPrefixTokens,
      uncachedInputTokens: segments.dynamicSuffixTokens,
      uncachedCostUsd,
      cachedCostUsd,
    };
  }

  runSession(turns: PromptSegments[]): CacheSessionSummary {
    const results = turns.map((seg, idx) => this.recordTurn(idx + 1, seg));
    const totalUncachedCostUsd = results.reduce((sum, r) => sum + r.uncachedCostUsd, 0);
    const totalCachedCostUsd = results.reduce((sum, r) => sum + r.cachedCostUsd, 0);
    const hits = results.filter((r) => r.cacheStatus === "HIT").length;
    const savingsPct =
      totalUncachedCostUsd > 0 ? ((totalUncachedCostUsd - totalCachedCostUsd) / totalUncachedCostUsd) * 100 : 0;

    return {
      turns: results,
      totalUncachedCostUsd: Number(totalUncachedCostUsd.toFixed(6)),
      totalCachedCostUsd: Number(totalCachedCostUsd.toFixed(6)),
      savingsPct: Number(savingsPct.toFixed(2)),
      cacheHitRatePct: Number(((hits / Math.max(1, results.length)) * 100).toFixed(2)),
    };
  }
}

