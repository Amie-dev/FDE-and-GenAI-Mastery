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

