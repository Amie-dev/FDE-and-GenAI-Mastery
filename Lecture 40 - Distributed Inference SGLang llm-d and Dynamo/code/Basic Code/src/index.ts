import { DistributedInferenceRouter } from "./router.js";
import { simulateCapacity } from "./simulator.js";
import type { GpuHardwareSpec, InferenceNode, WorkloadProfile } from "./types.js";

function main(): void {
  const workload: WorkloadProfile = {
    peakRps: 20,
    avgInputTokens: 6000,
    avgOutputTokens: 300,
    kvCacheHitRate: 0.75,
    ttftSloMs: 400,
    tpotSloMs: 30,
  };

  const hardware: GpuHardwareSpec = {
    prefillTokPerSecPerGpu: 20_000,
    decodeTokPerSecPerGpu: 2_500,
    baseTtftMs: 45,
    baseTpotMs: 18,
    nixlTransferMs: 25,
    gpuHourlyUsd: 3.5,
  };

  console.log("=== 1. Capacity Sizing Sheet: Monolithic vs. Disaggregated P/D ===");
  console.log("Monolithic:", simulateCapacity(workload, hardware, "MONOLITHIC"));
  console.log("Disaggregated P/D:", simulateCapacity(workload, hardware, "DISAGGREGATED_PD"));

  console.log("\n=== 2. Prefix-Affinity & Fail-Closed Residency Routing ===");
  const nodes: InferenceNode[] = [
    { nodeId: "eu-p1", region: "EU", modelId: "llama-3.3-70b", role: "PREFILL", healthy: true, queueDepth: 2, warmPrefixHashes: ["px_sys_v1"] },
    { nodeId: "eu-p2", region: "EU", modelId: "llama-3.3-70b", role: "PREFILL", healthy: true, queueDepth: 18, warmPrefixHashes: ["px_sys_v1"] },
    { nodeId: "us-p1", region: "US", modelId: "llama-3.3-70b", role: "PREFILL", healthy: true, queueDepth: 0, warmPrefixHashes: ["px_sys_v1"] },
  ];

  const router = new DistributedInferenceRouter(nodes);
  console.log("EU warm route:", router.route({ requestId: "r1", requiredRegion: "EU", modelId: "llama-3.3-70b", prefixHash: "px_sys_v1" }));
  console.log("IN fail-closed route:", router.route({ requestId: "r2", requiredRegion: "IN", modelId: "llama-3.3-70b", prefixHash: "px_sys_v1" }));
}

main();

