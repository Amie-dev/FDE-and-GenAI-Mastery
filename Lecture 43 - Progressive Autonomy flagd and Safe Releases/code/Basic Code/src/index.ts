import path from "node:path";
import { fileURLToPath } from "node:url";
import { OpenFeature } from "@openfeature/server-sdk";
import { FlagdConfigProvider } from "./flagd-provider.js";
import {
  CanaryRollbackController,
  runShadowComparison,
  verifyReleaseManifestSignature,
  type ReleaseArtifactBundle,
} from "./release-pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLAGD_PATH = path.resolve(__dirname, "../flags.flagd.json");
const SIGNING_SECRET = "demo-hmac-secret-change-in-prod";

const BASELINE_BUNDLE: ReleaseArtifactBundle = {
  gitCommit: "a8f31c9",
  modelId: "gpt-4o-2024-11-20",
  promptName: "support_triage_system",
  promptVersion: "2.4.0",
  promptText: "You are a support triage agent. Verify refund eligibility before acting.",
  skills: [
    { name: "kb_vector_search", version: "1.3.2" },
    { name: "refund_tool", version: "1.1.0" },
  ],
};

async function main() {
  const provider = new FlagdConfigProvider(FLAGD_PATH);
  await OpenFeature.setProviderAndWait(provider);
  const client = OpenFeature.getClient("lecture-43-agent");

  // 1. Resolve runtime routing via OpenFeature + flagd
  const modelForPaid = await client.getStringValue("active_model", "gpt-4o-2024-11-20", {
    targetingKey: "tenant_acme",
    tier: "enterprise",
  });
  const modelForFree = await client.getStringValue("active_model", "gpt-4o-2024-11-20", {
    targetingKey: "tenant_free_1",
    tier: "free",
  });
  console.log("[OpenFeature + flagd] Paid model:", modelForPaid, "| Free model:", modelForFree);

  // 2. Shadow Mode comparison (0 write side effects)
  const shadow = runShadowComparison(
    () => ({
      actionTool: "issue_refund",
      amountUsd: 18.5,
      schemaValid: true,
      latencyMs: 420,
      costUsd: 0.011,
    }),
    () => ({
      actionTool: "issue_refund",
      amountUsd: 18.5,
      schemaValid: true,
      latencyMs: 390,
      costUsd: 0.009,
    }),
  );
  console.log("[Shadow Mode]", JSON.stringify(shadow));

  // 3. Inject degraded canary -> trigger automatic flagd rollback < 30s + signed manifest
  provider.setCanaryWeightPct(10);
  provider.setAutonomyMode("autonomous");
  const controller = new CanaryRollbackController(provider, 500, SIGNING_SECRET);

  const degradedSamples = [
    { taskSuccess: true, schemaValid: true, latencyMs: 410, policyViolation: false },
    { taskSuccess: false, schemaValid: false, latencyMs: 890, policyViolation: false },
    { taskSuccess: false, schemaValid: false, latencyMs: 920, policyViolation: false },
    { taskSuccess: true, schemaValid: true, latencyMs: 440, policyViolation: false },
    { taskSuccess: false, schemaValid: true, latencyMs: 950, policyViolation: false },
  ];

  for (const sample of degradedSamples) {
    const decision = controller.recordAndEvaluate(sample, BASELINE_BUNDLE, 5);
    if (decision.rolledBack && decision.manifest) {
      const sigValid = verifyReleaseManifestSignature(decision.manifest, SIGNING_SECRET);
      console.log("\n[Auto-Rollback Triggered]", decision.reason);
      console.log("[Rollback Elapsed ms]", decision.rollbackElapsedMs);
      console.log("[Post-Rollback flagd Snapshot]", JSON.stringify(provider.getSnapshot()));
      console.log("[Signed Release Manifest Valid?]", sigValid);
      console.log(JSON.stringify(decision.manifest, null, 2));
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

