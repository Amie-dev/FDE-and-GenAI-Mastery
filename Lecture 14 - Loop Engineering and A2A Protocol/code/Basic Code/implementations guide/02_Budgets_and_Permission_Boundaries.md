# Chapter 02: Bounded Budgets & Tool Permission Boundaries

> **Chapter goal:** implement `BudgetGuard` in `src/budgets.ts` so no loop can exceed its step, token, dollar, or time caps, or invoke forbidden tools.
> **Notes chapter covered:** 02 (Bounded Goal Loops & Budget Enforcement).

---

## 2.1 Full code: `src/budgets.ts`

File path: `code/Basic Code/src/budgets.ts`

```ts
import type { BudgetSnapshot, LoopBudgetConfig, PermissionLevel } from "./types.js";

/**
 * Enforces 4-dimensional loop budgets (steps, tokens, cost, wall-clock time)
 * and harness-level tool permission boundaries.
 */
export class BudgetGuard {
  private stepsUsed = 0;
  private tokensUsed = 0;
  private costUsd = 0;
  private readonly startTimeMs = Date.now();
  private readonly toolCalls = new Map<string, number>();

  constructor(private readonly config: LoopBudgetConfig) {}

  canStartStep(estimatedNextTokens = 0): { allowed: true } | { allowed: false; reason: string } {
    if (this.stepsUsed >= this.config.maxSteps) {
      return { allowed: false, reason: `Step budget reached (${this.stepsUsed}/${this.config.maxSteps})` };
    }
    if (this.tokensUsed + estimatedNextTokens > this.config.maxTokens) {
      return {
        allowed: false,
        reason: `Token budget exceeded (${this.tokensUsed + estimatedNextTokens}/${this.config.maxTokens})`,
      };
    }
    if (this.costUsd >= this.config.maxCostUsd) {
      return { allowed: false, reason: `Dollar budget reached ($${this.costUsd.toFixed(4)}/$${this.config.maxCostUsd})` };
    }
    const elapsed = Date.now() - this.startTimeMs;
    if (elapsed >= this.config.maxDurationMs) {
      return { allowed: false, reason: `Wall-clock timeout (${elapsed}ms/${this.config.maxDurationMs}ms)` };
    }
    return { allowed: true };
  }

  checkPermission(toolName: string, permission: PermissionLevel, maxCallsPerRun = 5): void {
    if (permission === "FORBIDDEN") {
      throw new Error(`PermissionDeniedError: tool '${toolName}' is FORBIDDEN.`);
    }
    if (permission === "APPROVAL_REQUIRED") {
      throw new Error(`ApprovalRequiredError: tool '${toolName}' requires HITL sign-off.`);
    }
    const count = (this.toolCalls.get(toolName) ?? 0) + 1;
    if (count > maxCallsPerRun) {
      throw new Error(`RateCapError: tool '${toolName}' exceeded maxCallsPerRun (${maxCallsPerRun}).`);
    }
    this.toolCalls.set(toolName, count);
  }

  recordUsage(tokens: number, costUsd: number): void {
    this.stepsUsed += 1;
    this.tokensUsed += tokens;
    this.costUsd += costUsd;
  }

  snapshot(): BudgetSnapshot {
    return {
      stepsUsed: this.stepsUsed,
      tokensUsed: this.tokensUsed,
      costUsd: Number(this.costUsd.toFixed(6)),
      elapsedMs: Date.now() - this.startTimeMs,
    };
  }
}
```

---

## 2.2 Block-by-block explanation

1. **`canStartStep(estimatedNextTokens)`:** Runs *before* dispatching the next tool or LLM call. Checking `this.tokensUsed + estimatedNextTokens > this.config.maxTokens` reserves headroom so a call does not overshoot the cap mid-flight.
2. **`checkPermission(toolName, permission, maxCallsPerRun)`:** Enforces capability boundaries in harness code rather than relying on system-prompt instructions. `FORBIDDEN` and `APPROVAL_REQUIRED` throw immediately; `maxCallsPerRun` stops a runaway tool from spamming external APIs.
3. **`recordUsage()` & `snapshot()`:** Increments counters after each step and returns an immutable `BudgetSnapshot` for observability and escalation packets.

