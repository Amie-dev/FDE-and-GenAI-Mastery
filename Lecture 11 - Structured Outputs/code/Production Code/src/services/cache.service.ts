import { createHash } from 'node:crypto';
import { LRUCache } from 'lru-cache';
import { CACHE, config } from '../config/env.js';
import { SCHEMA_VERSION, type Meeting } from '../domain/meeting.schema.js';
import type { Outcome } from '../domain/outcome.js';

/**
 * Chapter 05 §05.8.1 — THE EXTRACTION CACHE.
 *
 * Three production rules, and the first is the one that prevents a data-leak
 * incident rather than a performance problem:
 *
 *   1. the key is scoped per TENANT, so one customer's text can never return
 *      another customer's object;
 *   2. the key includes the SCHEMA VERSION and the MODEL, so a rollout can never
 *      serve an object produced under a different contract;
 *   3. only successful outcomes are cached — caching a refusal or a degraded
 *      object would freeze a transient failure for the whole TTL.
 */

export type CacheableOutcome = Extract<Outcome<Meeting>, { kind: 'ok' | 'repaired' }>;

export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly entries: number;
  readonly enabled: boolean;
  readonly hitRate: number;
}

export interface CacheKeyInput {
  readonly tenantId: string;
  readonly text: string;
  readonly model: string;
}

export class ExtractionCache {
  private hits = 0;
  private misses = 0;
  private readonly store: LRUCache<string, CacheableOutcome>;

  constructor(
    private readonly enabled: boolean = CACHE.enabled,
    maxEntries: number = CACHE.maxEntries,
    private readonly ttlMs: number = CACHE.ttlMs,
  ) {
    this.store = new LRUCache<string, CacheableOutcome>({ max: maxEntries, ttl: ttlMs });
  }

  /**
   * Chapter 05 §05.8.1 — the key is a pure function of (tenant, text, model,
   * schema version). Nothing about the request id, the attempt count or the
   * clock, so the same logical request always maps to the same entry.
   */
  public key({ tenantId, text, model }: CacheKeyInput): string {
    return createHash('sha256')
      .update([tenantId, SCHEMA_VERSION, model, text].join('\u0000'))
      .digest('hex');
  }

  public get(key: string): CacheableOutcome | undefined {
    if (!this.enabled) return undefined;
    const hit = this.store.get(key);
    if (hit) this.hits += 1;
    else this.misses += 1;
    return hit;
  }

  public set(key: string, outcome: CacheableOutcome): void {
    if (!this.enabled) return;
    this.store.set(key, outcome, { ttl: this.ttlMs });
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      entries: this.store.size,
      enabled: this.enabled,
      hitRate: total === 0 ? 0 : Number((this.hits / total).toFixed(4)),
    };
  }

  /** Chapter 09 §09.7 — a rollout must not serve objects from the previous contract. */
  public invalidateAll(): number {
    const removed = this.store.size;
    this.store.clear();
    return removed;
  }
}

/**
 * Chapter 09 §09.2 — the two inputs that decide whether a cache entry is even
 * admissible. Exported so a test can assert the policy rather than the behaviour.
 */
export const isCacheable = <T extends { kind: string }>(outcome: T): outcome is T & CacheableOutcome =>
  (outcome.kind === 'ok' || outcome.kind === 'repaired') && !('cached' in outcome && outcome.cached === true);

export const cacheConfig = (): { enabled: boolean; maxEntries: number; ttlMs: number } => ({
  enabled: CACHE.enabled,
  maxEntries: CACHE.maxEntries,
  ttlMs: CACHE.ttlMs,
});

export const schemaVersionForCache = (): string => `${config.AI_MODEL}:${SCHEMA_VERSION}`;
