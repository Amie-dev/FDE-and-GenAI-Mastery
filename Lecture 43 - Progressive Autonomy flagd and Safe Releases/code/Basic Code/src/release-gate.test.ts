import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OpenFeature } from "@openfeature/server-sdk";
import { FlagdConfigProvider } from "./flagd-provider.js";
import {
  CanaryRollbackController,
  createSignedReleaseManifest,
  runShadowComparison,
  verifyReleaseManifestSignature,
  type ReleaseArtifactBundle,
} from "./release-pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLAGD_PATH = path.resolve(__dirname, "../flags.flagd.json");
const SECRET = "test-signing-secret";

const BASELINE_BUNDLE: ReleaseArtifactBundle = {
  gitCommit: "c0ffee1",
  modelId: "gpt-4o-2024-11-20",
  promptName: "support_triage_system",
  promptVersion: "2.4.0",
  promptText: "Triage tickets safely.",
  skills: [{ name: "refund_tool", version: "1.1.0" }],
};

test("Release Gate 1: OpenFeature + flagd routes free tier to budget and splits paid deterministically", async () => {
  const provider = new FlagdConfigProvider(FLAGD_PATH);
  provider.setCanaryWeightPct(50);
  await OpenFeature.setProviderAndWait(provider);
  const client = OpenFeature.getClient("test-client");

  const freeModel = await client.getStringValue("active_model", "fallback", {
    targetingKey: "tenant_free",
    tier: "free",
  });
  assert.equal(freeModel, "gpt-4o-mini");

  const run1 = await client.getStringValue("active_model", "fallback", {
    targetingKey: "tenant_sticky_123",
    tier: "enterprise",
  });
  const run2 = await client.getStringValue("active_model", "fallback", {
    targetingKey: "tenant_sticky_123",
    tier: "enterprise",
  });
  assert.equal(run1, run2);
});

test("Release Gate 2: Shadow Mode executes 0 write side effects while comparing candidate action", () => {
  const result = runShadowComparison(
    () => ({
      actionTool: "issue_refund",
      amountUsd: 20,
      schemaValid: true,
      latencyMs: 400,
      costUsd: 0.01,
    }),
    () => ({
      actionTool: "issue_refund",
      amountUsd: 20,
      schemaValid: true,
      latencyMs: 350,
      costUsd: 0.008,
    }),
  );

  assert.equal(result.baselineExecutedWriteCount, 1);
  assert.equal(result.shadowExecutedWriteCount, 0);
  assert.equal(result.actionAgreement, true);
  assert.equal(result.latencyDeltaMs, -50);
});

test("Release Gate 3: Degraded canary triggers automatic flagd rollback to baseline within 30s and emits signed manifest", () => {
  const provider = new FlagdConfigProvider(FLAGD_PATH);
  provider.setCanaryWeightPct(10);
  provider.setAutonomyMode("autonomous");

  const controller = new CanaryRollbackController(provider, 500, SECRET);
  const badRuns = [
    { taskSuccess: true, schemaValid: true, latencyMs: 450, policyViolation: false },
    { taskSuccess: false, schemaValid: false, latencyMs: 900, policyViolation: false },
    { taskSuccess: false, schemaValid: false, latencyMs: 950, policyViolation: false },
    { taskSuccess: true, schemaValid: true, latencyMs: 480, policyViolation: false },
    { taskSuccess: false, schemaValid: true, latencyMs: 880, policyViolation: false },
  ];

  let finalDecision;
  for (const run of badRuns) {
    finalDecision = controller.recordAndEvaluate(run, BASELINE_BUNDLE, 5);
  }

  assert.ok(finalDecision?.rolledBack);
  assert.ok((finalDecision.rollbackElapsedMs ?? 99999) < 30_000);
  assert.equal(provider.getCanaryWeightPct(), 0);
  assert.equal(provider.getSnapshot().autonomyMode, "human_approved");
  assert.ok(finalDecision.manifest);
  assert.equal(finalDecision.manifest.status, "ROLLBACK");
  assert.equal(verifyReleaseManifestSignature(finalDecision.manifest, SECRET), true);
});

test("Release Gate 4: Signed release manifest detects tampering", () => {
  const provider = new FlagdConfigProvider(FLAGD_PATH);
  const manifest = createSignedReleaseManifest(
    "rel_001",
    "PROMOTED",
    BASELINE_BUNDLE,
    provider.getSnapshot(),
    SECRET,
  );
  assert.equal(verifyReleaseManifestSignature(manifest, SECRET), true);

  manifest.artifacts.modelId = "tampered-model";
  assert.equal(verifyReleaseManifestSignature(manifest, SECRET), false);
});

