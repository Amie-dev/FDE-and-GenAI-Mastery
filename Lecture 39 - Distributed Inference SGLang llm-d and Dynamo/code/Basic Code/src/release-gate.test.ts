import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DistributedInferenceRouter } from "./router.js";
import { simulateCapacity } from "./simulator.js";
import type { GpuHardwareSpec, InferenceNode, WorkloadProfile } from "./types.js";

const WORKLOAD: WorkloadProfile = {
  peakRps: 20,
  avgInputTokens: 6000,
  avgOutputTokens: 300,
  kvCacheHitRate: 0.75,
  ttftSloMs: 400,
  tpotSloMs: 30,
};

const HW: GpuHardwareSpec = {
  prefillTokPerSecPerGpu: 20_000,
  decodeTokPerSecPerGpu: 2_500,
  baseTtftMs: 45,
  baseTpotMs: 18,
  nixlTransferMs: 25,
  gpuHourlyUsd: 3.5,
};

describe("Lecture 39 Release Gate", () => {
  it("Gate 1: Disaggregated P/D with 75% KV reuse meets < 400ms TTFT and < 30ms TPOT under peak load", () => {
    const disagg = simulateCapacity(WORKLOAD, HW, "DISAGGREGATED_PD");
    assert.ok(disagg.estimatedTtftMs < 400, `TTFT ${disagg.estimatedTtftMs}ms >= 400ms`);
    assert.ok(disagg.estimatedTpotMs < 30, `TPOT ${disagg.estimatedTpotMs}ms >= 30ms`);
    assert.equal(disagg.meetsTtftSlo, true);
    assert.equal(disagg.meetsTpotSlo, true);
  });

  it("Gate 2: Disaggregated P/D beats Monolithic serving on both SLO compliance and GPU cost", () => {
    const mono = simulateCapacity(WORKLOAD, HW, "MONOLITHIC");
    const disagg = simulateCapacity(WORKLOAD, HW, "DISAGGREGATED_PD");
    assert.equal(mono.meetsTpotSlo, false);
    assert.ok(disagg.totalGpusWithHa < mono.totalGpusWithHa);
    assert.ok(disagg.hourlyCostUsd < mono.hourlyCostUsd);
  });

  it("Gate 3: Residency router enforces fail-closed compliance (never spills IN/EU to US)", () => {
    const nodes: InferenceNode[] = [
      { nodeId: "us-1", region: "US", modelId: "llama-70b", role: "PREFILL", healthy: true, queueDepth: 0, warmPrefixHashes: ["px1"] },
    ];
    const router = new DistributedInferenceRouter(nodes);
    const res = router.route({ requestId: "req-in", requiredRegion: "IN", modelId: "llama-70b", prefixHash: "px1" });
    assert.equal(res.routed, false);
    assert.ok(res.reason.includes("503 ResidencyUnavailable"));
  });

  it("Gate 4: Prefix-affinity router selects warm KV node while avoiding overloaded hot-spot node", () => {
    const nodes: InferenceNode[] = [
      { nodeId: "eu-cold", region: "EU", modelId: "llama-70b", role: "PREFILL", healthy: true, queueDepth: 1, warmPrefixHashes: [] },
      { nodeId: "eu-warm-ok", region: "EU", modelId: "llama-70b", role: "PREFILL", healthy: true, queueDepth: 2, warmPrefixHashes: ["px1"] },
      { nodeId: "eu-warm-hot", region: "EU", modelId: "llama-70b", role: "PREFILL", healthy: true, queueDepth: 20, warmPrefixHashes: ["px1"] },
    ];
    const router = new DistributedInferenceRouter(nodes);
    const res = router.route({ requestId: "req-eu", requiredRegion: "EU", modelId: "llama-70b", prefixHash: "px1" });
    assert.equal(res.routed, true);
    assert.equal(res.selectedNodeId, "eu-warm-ok");
    assert.equal(res.cacheHit, true);
  });
});

