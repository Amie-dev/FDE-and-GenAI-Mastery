import type { InferenceNode, RoutingDecision, RoutingRequest } from "./types.js";

/**
 * llm-d / Dynamo style router:
 * 1. Fail-closed Data Residency filter (EU/IN/US traffic NEVER spills across borders)
 * 2. Model-aware filter
 * 3. Prefix-affinity + queue-load scoring to maximize KV reuse without hot-spotting
 */
export class DistributedInferenceRouter {
  constructor(private readonly nodes: InferenceNode[]) {}

  route(req: RoutingRequest): RoutingDecision {
    // 1. Strict fail-closed residency + health + model filter
    const eligible = this.nodes.filter(
      (n) => n.healthy && n.region === req.requiredRegion && n.modelId === req.modelId
    );

    if (eligible.length === 0) {
      return {
        routed: false,
        region: req.requiredRegion,
        cacheHit: false,
        reason: `503 ResidencyUnavailable: zero healthy '${req.modelId}' nodes in region '${req.requiredRegion}' (fail-closed; cross-region spill blocked)`,
      };
    }

    // 2. Score = (cacheHit ? 100 : 0) - (queueDepth * 8)
    let bestNode = eligible[0];
    let bestScore = -Infinity;
    let bestHit = false;

    for (const node of eligible) {
      const hit = node.warmPrefixHashes.includes(req.prefixHash);
      const score = (hit ? 100 : 0) - node.queueDepth * 8;
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
        bestHit = hit;
      }
    }

    return {
      routed: true,
      selectedNodeId: bestNode.nodeId,
      region: bestNode.region,
      cacheHit: bestHit,
      reason: bestHit
        ? `Prefix-affinity hit on ${bestNode.nodeId} (queue=${bestNode.queueDepth})`
        : `Cold route to least-loaded ${bestNode.nodeId} (queue=${bestNode.queueDepth})`,
    };
  }
}

