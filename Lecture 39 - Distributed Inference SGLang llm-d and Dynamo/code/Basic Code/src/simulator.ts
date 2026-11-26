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

