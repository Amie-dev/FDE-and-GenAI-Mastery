# Chapter 01: Project Setup, Types & Capacity Simulator

> **Chapter goal:** configure `package.json` / `tsconfig.json` / `src/types.ts` and implement `simulateCapacity()` (`src/simulator.ts`).
> **Notes chapters covered:** 01, 02, & 07.

---

## 1.1 Full code: `package.json`, `tsconfig.json` & `src/types.ts`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-39-distributed-inference-simulator",
  "version": "1.0.0",
  "description": "Lecture 40 Basic Code — Distributed Inference Capacity (TTFT/TPOT) Simulator & Prefix-Affinity/Residency Router",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "distributed-inference",
    "sglang",
    "llm-d",
    "nvidia-dynamo",
    "ttft",
    "tpot",
    "typescript"
  ],
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

File path: `code/Basic Code/src/types.ts`

```ts
export type ResidencyRegion = "EU" | "IN" | "US";
export type NodeRole = "PREFILL" | "DECODE" | "MONOLITHIC";

export interface WorkloadProfile {
  peakRps: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  kvCacheHitRate: number; // e.g., 0.75 for 75% prefix reuse
  ttftSloMs: number;      // e.g., 400
  tpotSloMs: number;      // e.g., 30
}

export interface GpuHardwareSpec {
  prefillTokPerSecPerGpu: number;
  decodeTokPerSecPerGpu: number;
  baseTtftMs: number;
  baseTpotMs: number;
  nixlTransferMs: number;
  gpuHourlyUsd: number;
}

export interface CapacitySizingReport {
  architecture: "MONOLITHIC" | "DISAGGREGATED_PD";
  prefillGpus: number;
  decodeGpus: number;
  totalGpusWithHa: number;
  estimatedTtftMs: number;
  estimatedTpotMs: number;
  meetsTtftSlo: boolean;
  meetsTpotSlo: boolean;
  hourlyCostUsd: number;
}

export interface InferenceNode {
  nodeId: string;
  region: ResidencyRegion;
  modelId: string;
  role: NodeRole;
  healthy: boolean;
  queueDepth: number;
  warmPrefixHashes: string[];
}

export interface RoutingRequest {
  requestId: string;
  requiredRegion: ResidencyRegion;
  modelId: string;
  prefixHash: string;
}

export interface RoutingDecision {
  routed: boolean;
  selectedNodeId?: string;
  region: ResidencyRegion;
  cacheHit: boolean;
  reason: string;
}
```

---

## 1.2 Full code: `src/simulator.ts`

File path: `code/Basic Code/src/simulator.ts`

```ts
import type { CapacitySizingReport, GpuHardwareSpec, WorkloadProfile } from "./types.js";

/**
 * Models capacity, TTFT, TPOT, and hourly cost for Monolithic vs. Disaggregated P/D serving
 * with SGLang RadixAttention / LMCache prefix reuse.
 */
export function simulateCapacity(
  workload: WorkloadProfile,
  hw: GpuHardwareSpec,
  mode: "MONOLITHIC" | "DISAGGREGATED_PD"
): CapacitySizingReport {
  const totalDecodeTokPerSec = workload.peakRps * workload.avgOutputTokens;

  if (mode === "MONOLITHIC") {
    // Monolithic: zero cross-node prefix affinity + prefill-decode interference penalty
    const totalPrefillTokPerSec = workload.peakRps * workload.avgInputTokens;
    const prefillGpusNeeded = Math.ceil(totalPrefillTokPerSec / hw.prefillTokPerSecPerGpu);
    const decodeGpusNeeded = Math.ceil(totalDecodeTokPerSec / hw.decodeTokPerSecPerGpu);
    const baseGpus = Math.max(prefillGpusNeeded, decodeGpusNeeded);
    const totalGpusWithHa = Math.ceil(baseGpus * 1.2); // +20% HA headroom

    // Interference: long prefills stall decode batches on shared GPUs
    const estimatedTtftMs = Number((hw.baseTtftMs + (workload.avgInputTokens / hw.prefillTokPerSecPerGpu) * 1000 * 1.8).toFixed(1));
    const estimatedTpotMs = Number((hw.baseTpotMs * 2.1).toFixed(1));

    return {
      architecture: "MONOLITHIC",
      prefillGpus: baseGpus,
      decodeGpus: 0,
      totalGpusWithHa,
      estimatedTtftMs,
      estimatedTpotMs,
      meetsTtftSlo: estimatedTtftMs <= workload.ttftSloMs,
      meetsTpotSlo: estimatedTpotMs <= workload.tpotSloMs,
      hourlyCostUsd: Number((totalGpusWithHa * hw.gpuHourlyUsd).toFixed(2)),
    };
  }

  // Disaggregated P/D + RadixAttention / LMCache KV reuse
  const effectivePrefillTokPerSec = workload.peakRps * workload.avgInputTokens * (1 - workload.kvCacheHitRate);
  const prefillGpus = Math.ceil(effectivePrefillTokPerSec / hw.prefillTokPerSecPerGpu);
  const decodeGpus = Math.ceil(totalDecodeTokPerSec / hw.decodeTokPerSecPerGpu);
  const totalGpusWithHa = Math.ceil((prefillGpus + decodeGpus) * 1.2); // +20% HA headroom

  const uncachedTokens = workload.avgInputTokens * (1 - workload.kvCacheHitRate);
  const estimatedTtftMs = Number(
    (hw.baseTtftMs + (uncachedTokens / hw.prefillTokPerSecPerGpu) * 1000 + hw.nixlTransferMs).toFixed(1)
  );
  // Decode pool has zero prefill interference!
  const estimatedTpotMs = Number(hw.baseTpotMs.toFixed(1));

  return {
    architecture: "DISAGGREGATED_PD",
    prefillGpus,
    decodeGpus,
    totalGpusWithHa,
    estimatedTtftMs,
    estimatedTpotMs,
    meetsTtftSlo: estimatedTtftMs <= workload.ttftSloMs,
    meetsTpotSlo: estimatedTpotMs <= workload.tpotSloMs,
    hourlyCostUsd: Number((totalGpusWithHa * hw.gpuHourlyUsd).toFixed(2)),
  };
}
```

### Explanation
- **Monolithic vs. Disaggregated:** `DISAGGREGATED_PD` scales prefill by `(1 - kvCacheHitRate)` and eliminates the `2.1×` decode interference penalty, meeting `< 400ms` TTFT and `< 30ms` TPOT with fewer total GPUs.

