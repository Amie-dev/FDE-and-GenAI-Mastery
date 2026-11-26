import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type {
  EvaluationContext,
  JsonValue,
  Provider,
  ResolutionDetails,
} from "@openfeature/server-sdk";

export interface FlagdFileSchema {
  $schema: string;
  flags: Record<
    string,
    {
      state: "ENABLED" | "DISABLED";
      variants: Record<string, JsonValue>;
      defaultVariant: string;
    }
  >;
}

/**
 * Deterministic 0..99 bucket from targetingKey so multi-turn sessions stay sticky
 * on either baseline or canary without flapping mid-conversation.
 */
function deterministicBucket(targetingKey: string): number {
  const hex = createHash("sha256").update(targetingKey).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) % 100;
}

/**
 * In-memory OpenFeature Provider backed by a flagd-schema JSON file.
 * Supports instant (< 1ms) runtime mutations for automated canary rollback.
 */
export class FlagdConfigProvider implements Provider {
  readonly metadata = { name: "flagd-in-memory-provider" } as const;
  private config: FlagdFileSchema;
  private canaryWeightPct: number;
  private autonomyOverride: "shadow" | "human_approved" | "autonomous" | null = null;

  constructor(flagFilePath: string) {
    const raw = readFileSync(flagFilePath, "utf8");
    this.config = JSON.parse(raw) as FlagdFileSchema;
    const weightFlag = this.config.flags["canary_weight_pct"];
    const defaultWeight = weightFlag
      ? Number(weightFlag.variants[weightFlag.defaultVariant] ?? 0)
      : 0;
    this.canaryWeightPct = defaultWeight;
  }

  getCanaryWeightPct(): number {
    return this.canaryWeightPct;
  }

  setCanaryWeightPct(pct: number): void {
    this.canaryWeightPct = Math.max(0, Math.min(100, pct));
  }

  setAutonomyMode(mode: "shadow" | "human_approved" | "autonomous"): void {
    this.autonomyOverride = mode;
  }

  getSnapshot(): {
    canaryWeightPct: number;
    autonomyMode: string;
    baselineModel: string;
    canaryModel: string;
  } {
    const modelFlag = this.config.flags["active_model"];
    const autonomyFlag = this.config.flags["autonomy_mode"];
    return {
      canaryWeightPct: this.canaryWeightPct,
      autonomyMode:
        this.autonomyOverride ??
        String(autonomyFlag?.variants[autonomyFlag.defaultVariant] ?? "human_approved"),
      baselineModel: String(modelFlag?.variants["baseline"] ?? "gpt-4o-2024-11-20"),
      canaryModel: String(modelFlag?.variants["canary"] ?? "claude-3-5-sonnet-20241022"),
    };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    if (flagKey === "active_model") {
      const flag = this.config.flags["active_model"];
      if (!flag || flag.state !== "ENABLED") {
        return { value: defaultValue, variant: "default", reason: "DISABLED" };
      }

      if (context["tier"] === "free") {
        return {
          value: String(flag.variants["budget"] ?? defaultValue),
          variant: "budget",
          reason: "TARGETING_MATCH",
        };
      }

      const key = String(context.targetingKey ?? context["tenantId"] ?? "anonymous");
      const bucket = deterministicBucket(key);
      if (bucket < this.canaryWeightPct) {
        return {
          value: String(flag.variants["canary"] ?? defaultValue),
          variant: "canary",
          reason: "SPLIT",
        };
      }

      return {
        value: String(flag.variants["baseline"] ?? defaultValue),
        variant: "baseline",
        reason: "DEFAULT",
      };
    }

    if (flagKey === "autonomy_mode") {
      if (this.autonomyOverride) {
        return {
          value: this.autonomyOverride,
          variant: "override",
          reason: "TARGETING_MATCH",
        };
      }
      const flag = this.config.flags["autonomy_mode"];
      if (!flag || flag.state !== "ENABLED") {
        return { value: defaultValue, variant: "default", reason: "DISABLED" };
      }
      if (context["cohort"] === "beta_auto") {
        return {
          value: String(flag.variants["auto"] ?? defaultValue),
          variant: "auto",
          reason: "TARGETING_MATCH",
        };
      }
      return {
        value: String(flag.variants[flag.defaultVariant] ?? defaultValue),
        variant: flag.defaultVariant,
        reason: "DEFAULT",
      };
    }

    const generic = this.config.flags[flagKey];
    if (!generic || generic.state !== "ENABLED") {
      return { value: defaultValue, reason: "DEFAULT" };
    }
    return {
      value: String(generic.variants[generic.defaultVariant] ?? defaultValue),
      variant: generic.defaultVariant,
      reason: "STATIC",
    };
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
  ): Promise<ResolutionDetails<boolean>> {
    const flag = this.config.flags[flagKey];
    if (!flag || flag.state !== "ENABLED") {
      return { value: defaultValue, reason: "DEFAULT" };
    }
    return {
      value: Boolean(flag.variants[flag.defaultVariant] ?? defaultValue),
      variant: flag.defaultVariant,
      reason: "STATIC",
    };
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
  ): Promise<ResolutionDetails<number>> {
    if (flagKey === "canary_weight_pct") {
      return { value: this.canaryWeightPct, variant: "dynamic", reason: "STATIC" };
    }
    const flag = this.config.flags[flagKey];
    if (!flag || flag.state !== "ENABLED") {
      return { value: defaultValue, reason: "DEFAULT" };
    }
    return {
      value: Number(flag.variants[flag.defaultVariant] ?? defaultValue),
      variant: flag.defaultVariant,
      reason: "STATIC",
    };
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    _flagKey: string,
    defaultValue: T,
  ): Promise<ResolutionDetails<T>> {
    return { value: defaultValue, reason: "DEFAULT" };
  }
}

