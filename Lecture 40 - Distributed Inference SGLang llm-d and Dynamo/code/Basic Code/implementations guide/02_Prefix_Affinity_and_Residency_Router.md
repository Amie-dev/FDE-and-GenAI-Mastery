# Chapter 02: Prefix-Affinity & Residency Router

> **Chapter goal:** implement `DistributedInferenceRouter` (`src/router.ts`) with fail-closed residency and `llm-d` prefix-affinity scoring.
> **Notes chapters covered:** 04 (`llm-d` Routing) & 06 (Data Residency).

---

## 2.1 Full code: `src/router.ts`

File path: `code/Basic Code/src/router.ts`

```ts
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
```

### Block-by-block explanation
1. **Fail-Closed Residency Filter:** Filters `n.healthy && n.region === req.requiredRegion && n.modelId === req.modelId` *first*, returning `503 ResidencyUnavailable` if no nodes exist in that jurisdiction.
2. **Anti-Hot-Spot Scoring:** Rewards warm KV prefixes (`+100`) while penalizing deep queues (`-8 * queueDepth`) so an overloaded warm node (`queue = 20`, score `-60`) loses to a healthy warm node (`queue = 2`, score `+84`).

