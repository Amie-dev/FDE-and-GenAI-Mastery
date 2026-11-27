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

