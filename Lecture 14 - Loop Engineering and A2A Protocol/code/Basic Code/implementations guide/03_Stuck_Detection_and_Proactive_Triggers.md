# Chapter 03: Stuck Detection & Proactive Triggers

> **Chapter goal:** implement `StuckDetector` (`src/stuck-detector.ts`) and `ProactiveTriggerGate` (`src/triggers.ts`).
> **Notes chapters covered:** 03 (Proactive Triggers) & 04 (Stuck Detection, Retry, Pivot & Escalation).

---

## 3.1 Full code: `src/stuck-detector.ts`

File path: `code/Basic Code/src/stuck-detector.ts`

```ts
import { createHash } from "node:crypto";
import type { StuckDecision, ToolErrorClass } from "./types.js";

interface TrajectoryEntry {
  signature: string;
  ok: boolean;
  errorClass?: ToolErrorClass;
}

/**
 * Detects exact-repeat loops, A-B-A-B oscillations, and zero-progress error streaks
 * within <= 3 iterations and recommends RETRY, PIVOT, or ESCALATE.
 */
export class StuckDetector {
  private readonly history: TrajectoryEntry[] = [];
  private readonly bannedSignatures = new Set<string>();
  private pivotsUsed = 0;

  constructor(private readonly maxPivots: number) {}

  static buildSignature(toolName: string, args: Record<string, string>): string {
    const canonical = JSON.stringify(
      Object.keys(args)
        .sort()
        .reduce<Record<string, string>>((acc, k) => {
          acc[k] = args[k];
          return acc;
        }, {})
    );
    return createHash("sha256").update(`${toolName}:${canonical}`).digest("hex").slice(0, 12);
  }

  isBanned(signature: string): boolean {
    return this.bannedSignatures.has(signature);
  }

  getPivotsUsed(): number {
    return this.pivotsUsed;
  }

  observe(toolName: string, args: Record<string, string>, ok: boolean, errorClass?: ToolErrorClass): StuckDecision {
    const signature = StuckDetector.buildSignature(toolName, args);
    this.history.push({ signature, ok, errorClass });

    if (ok) {
      return { action: "CONTINUE" };
    }

    // Check 1: Transient error with < 2 consecutive failures -> RETRY
    const lastTwo = this.history.slice(-2);
    if (errorClass === "transient" && lastTwo.filter((h) => !h.ok && h.signature === signature).length < 2) {
      return { action: "RETRY", reason: "Transient infrastructure failure; eligible for backoff retry" };
    }

    // Check 2: Exact repeat (>= 2 identical failing signatures) OR 3 consecutive errors
    const consecutiveFails = this.countTrailingFailures();
    const repeatCount = this.history.slice(-3).filter((h) => !h.ok && h.signature === signature).length;
    const isOscillating = this.detectOscillation();

    if (repeatCount >= 2 || isOscillating || consecutiveFails >= 3) {
      const reason = isOscillating
        ? "A-B-A-B oscillation detected"
        : repeatCount >= 2
          ? `Exact-repeat failure (${repeatCount}x) on signature ${signature}`
          : `Zero-progress streak (${consecutiveFails} consecutive failures)`;

      if (this.pivotsUsed < this.maxPivots) {
        this.pivotsUsed += 1;
        this.bannedSignatures.add(signature);
        return { action: "PIVOT", reason, bannedSignature: signature };
      }

      return {
        action: "ESCALATE",
        reason: `${reason}; max pivots (${this.maxPivots}) exhausted`,
        bannedSignature: signature,
      };
    }

    return { action: "CONTINUE" };
  }

  private countTrailingFailures(): number {
    let count = 0;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].ok) break;
      count += 1;
    }
    return count;
  }

  private detectOscillation(): boolean {
    if (this.history.length < 4) return false;
    const [a, b, c, d] = this.history.slice(-4);
    return !a.ok && !b.ok && !c.ok && !d.ok && a.signature === c.signature && b.signature === d.signature && a.signature !== b.signature;
  }
}
```

### Explanation
- **`buildSignature()`:** Sorts argument keys before hashing with SHA-256 so `{ a: "1", b: "2" }` and `{ b: "2", a: "1" }` produce the same canonical signature.
- **`observe()`:** Transient errors get 1 `RETRY`; structural repeats (`>= 2` identical failing calls), `A-B-A-B` oscillations, or 3-step error streaks trigger `PIVOT` (banning the failing signature) or `ESCALATE` once `maxPivots` is exhausted.

---

## 3.2 Full code: `src/triggers.ts`

File path: `code/Basic Code/src/triggers.ts`

```ts
/**
 * Proactive trigger gate: enforces $0 deterministic pre-flight filtering,
 * idempotency deduplication, and per-entity cooldowns before waking an LLM.
 */
export class ProactiveTriggerGate {
  private readonly processedKeys = new Set<string>();
  private readonly lastRunByEntity = new Map<string, number>();

  constructor(private readonly cooldownMs: number) {}

  shouldTrigger(params: {
    triggerType: "heartbeat" | "cron" | "webhook";
    entityId: string;
    eventVersion: string;
    hasActionableDelta: boolean;
    nowMs?: number;
  }): { run: true } | { run: false; skipReason: string } {
    const now = params.nowMs ?? Date.now();

    // 1. $0 deterministic pre-flight filter
    if (!params.hasActionableDelta) {
      return { run: false, skipReason: "No actionable delta in pre-flight check ($0 skipped)" };
    }

    // 2. Idempotency key deduplication
    const idempotencyKey = `${params.triggerType}:${params.entityId}:${params.eventVersion}`;
    if (this.processedKeys.has(idempotencyKey)) {
      return { run: false, skipReason: `Duplicate event ignored (${idempotencyKey})` };
    }

    // 3. Per-entity cooldown window
    const lastRun = this.lastRunByEntity.get(params.entityId);
    if (lastRun !== undefined && now - lastRun < this.cooldownMs) {
      return { run: false, skipReason: `Entity '${params.entityId}' in cooldown window` };
    }

    this.processedKeys.add(idempotencyKey);
    this.lastRunByEntity.set(params.entityId, now);
    return { run: true };
  }
}
```

### Explanation
- **Three-stage gate:** (1) skip idle ticks at `$0` when `hasActionableDelta === false`, (2) deduplicate retries via `idempotencyKey`, and (3) suppress alert storms within `cooldownMs`.

