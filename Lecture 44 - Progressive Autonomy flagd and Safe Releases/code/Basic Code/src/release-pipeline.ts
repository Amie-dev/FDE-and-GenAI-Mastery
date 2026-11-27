import { createHash, createHmac } from "node:crypto";
import type { FlagdConfigProvider } from "./flagd-provider.js";

export interface AgentProposal {
  actionTool: string;
  amountUsd: number;
  schemaValid: boolean;
  latencyMs: number;
  costUsd: number;
}

export interface ShadowComparisonResult {
  baselineExecutedWriteCount: number;
  shadowExecutedWriteCount: number;
  actionAgreement: boolean;
  latencyDeltaMs: number;
  costDeltaUsd: number;
}

/**
 * Runs baseline synchronously (real write allowed if authorized) and runs the
 * candidate model in Shadow Mode with write tools dry-run mocked (0 side effects).
 */
export function runShadowComparison(
  baselineRun: () => AgentProposal,
  candidateShadowRun: () => AgentProposal,
): ShadowComparisonResult {
  const baseline = baselineRun();
  const baselineExecutedWriteCount = baseline.schemaValid ? 1 : 0;

  // Candidate runs under shadow proxy: write tools are intercepted and mocked.
  const candidate = candidateShadowRun();
  const shadowExecutedWriteCount = 0;

  const actionAgreement =
    candidate.schemaValid &&
    candidate.actionTool === baseline.actionTool &&
    candidate.amountUsd === baseline.amountUsd;

  return {
    baselineExecutedWriteCount,
    shadowExecutedWriteCount,
    actionAgreement,
    latencyDeltaMs: candidate.latencyMs - baseline.latencyMs,
    costDeltaUsd: Number((candidate.costUsd - baseline.costUsd).toFixed(6)),
  };
}

export interface CanaryObservation {
  taskSuccess: boolean;
  schemaValid: boolean;
  latencyMs: number;
  policyViolation: boolean;
}

export interface ReleaseArtifactBundle {
  gitCommit: string;
  modelId: string;
  promptName: string;
  promptVersion: string;
  promptText: string;
  skills: Array<{ name: string; version: string }>;
}

export interface SignedReleaseManifest {
  manifestVersion: "1.0";
  releaseId: string;
  createdAt: string;
  status: "PROMOTED" | "ROLLBACK";
  rollbackReason?: string;
  rollbackElapsedMs?: number;
  artifacts: {
    gitCommit: string;
    modelId: string;
    prompt: { name: string; version: string; sha256: string };
    skills: Array<{ name: string; version: string }>;
  };
  flagdSnapshot: ReturnType<FlagdConfigProvider["getSnapshot"]>;
  signature: {
    algorithm: "HMAC-SHA256";
    keyId: string;
    digest: string;
  };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function signPayload(payload: object, secretKey: string): string {
  return createHmac("sha256", secretKey)
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function createSignedReleaseManifest(
  releaseId: string,
  status: "PROMOTED" | "ROLLBACK",
  bundle: ReleaseArtifactBundle,
  flagdSnapshot: ReturnType<FlagdConfigProvider["getSnapshot"]>,
  signingSecret: string,
  rollbackReason?: string,
  rollbackElapsedMs?: number,
): SignedReleaseManifest {
  const unsigned = {
    manifestVersion: "1.0" as const,
    releaseId,
    createdAt: new Date().toISOString(),
    status,
    ...(rollbackReason ? { rollbackReason } : {}),
    ...(rollbackElapsedMs !== undefined ? { rollbackElapsedMs } : {}),
    artifacts: {
      gitCommit: bundle.gitCommit,
      modelId: bundle.modelId,
      prompt: {
        name: bundle.promptName,
        version: bundle.promptVersion,
        sha256: sha256(bundle.promptText),
      },
      skills: bundle.skills,
    },
    flagdSnapshot,
  };

  return {
    ...unsigned,
    signature: {
      algorithm: "HMAC-SHA256",
      keyId: "release-signer-v1",
      digest: signPayload(unsigned, signingSecret),
    },
  };
}

export function verifyReleaseManifestSignature(
  manifest: SignedReleaseManifest,
  signingSecret: string,
): boolean {
  const { signature, ...unsigned } = manifest;
  const expected = signPayload(unsigned, signingSecret);
  return signature.digest === expected;
}

export interface CanaryEvaluationDecision {
  rolledBack: boolean;
  reason?: string;
  rollbackElapsedMs?: number;
  manifest?: SignedReleaseManifest;
}

/**
 * Monitors canary observations and automatically reverts flagd canary weight
 * to 0% + downgrades autonomy to human_approved if quality/latency/policy degrades.
 */
export class CanaryRollbackController {
  private readonly observations: CanaryObservation[] = [];

  constructor(
    private readonly provider: FlagdConfigProvider,
    private readonly baselineP95Ms: number,
    private readonly signingSecret: string,
  ) {}

  recordAndEvaluate(
    obs: CanaryObservation,
    baselineBundle: ReleaseArtifactBundle,
    minSamplesBeforeTrip = 5,
  ): CanaryEvaluationDecision {
    this.observations.push(obs);

    if (obs.policyViolation) {
      return this.triggerRollback(
        "Policy violation detected in canary cohort",
        baselineBundle,
      );
    }

    if (this.observations.length < minSamplesBeforeTrip) {
      return { rolledBack: false };
    }

    const total = this.observations.length;
    const successRate =
      this.observations.filter((o) => o.taskSuccess).length / total;
    const schemaFailRate =
      this.observations.filter((o) => !o.schemaValid).length / total;
    const sortedLatencies = [...this.observations]
      .map((o) => o.latencyMs)
      .sort((a, b) => a - b);
    const p95Latency =
      sortedLatencies[Math.min(total - 1, Math.floor(total * 0.95))];

    if (successRate < 0.9) {
      return this.triggerRollback(
        `Canary taskSuccessRate ${(successRate * 100).toFixed(1)}% < 90.0%`,
        baselineBundle,
      );
    }
    if (schemaFailRate > 0.03) {
      return this.triggerRollback(
        `Canary schemaFailRate ${(schemaFailRate * 100).toFixed(1)}% > 3.0%`,
        baselineBundle,
      );
    }
    if (p95Latency > this.baselineP95Ms * 1.25) {
      return this.triggerRollback(
        `Canary p95 latency ${p95Latency}ms > 1.25x baseline (${this.baselineP95Ms}ms)`,
        baselineBundle,
      );
    }

    return { rolledBack: false };
  }

  private triggerRollback(
    reason: string,
    baselineBundle: ReleaseArtifactBundle,
  ): CanaryEvaluationDecision {
    const startNs = performance.now();
    this.provider.setCanaryWeightPct(0);
    this.provider.setAutonomyMode("human_approved");
    const rollbackElapsedMs = Number((performance.now() - startNs).toFixed(3));

    const manifest = createSignedReleaseManifest(
      `rel_rollback_${Date.now()}`,
      "ROLLBACK",
      baselineBundle,
      this.provider.getSnapshot(),
      this.signingSecret,
      reason,
      rollbackElapsedMs,
    );

    return {
      rolledBack: true,
      reason,
      rollbackElapsedMs,
      manifest,
    };
  }
}

