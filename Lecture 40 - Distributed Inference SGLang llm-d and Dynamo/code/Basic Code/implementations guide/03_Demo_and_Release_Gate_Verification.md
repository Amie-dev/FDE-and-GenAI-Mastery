# Chapter 03: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run the capacity & routing demo (`src/index.ts`) and verify all 4 release gates (`src/release-gate.test.ts`).
> **Notes chapters covered:** 01–07.

---

## 3.1 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
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
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
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

describe("Lecture 40 Release Gate", () => {
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
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

