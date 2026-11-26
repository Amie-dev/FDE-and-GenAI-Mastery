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

