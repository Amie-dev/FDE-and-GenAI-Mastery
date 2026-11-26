import { randomUUID } from "node:crypto";
import type { A2ATaskResult, AgentCard } from "./types.js";

export type A2APeerHandler = (payload: string) => Promise<{
  verdict: "APPROVE" | "REJECT" | "INFO";
  summary: string;
  tokensUsed: number;
  costUsd: number;
}>;

interface RegisteredPeer {
  card: AgentCard;
  handler: A2APeerHandler;
}

export interface DelegationRequest {
  requiredTag: string;
  payload: string;
  required: boolean;
  timeoutMs: number;
}

/**
 * In-process A2A (Agent-to-Agent) registry and parallel fan-out/fan-in orchestrator.
 * Supports Agent Card discovery, per-branch timeouts, Promise.allSettled, and veto precedence.
 */
export class A2AClientRegistry {
  private readonly peers: RegisteredPeer[] = [];

  registerPeer(card: AgentCard, handler: A2APeerHandler): void {
    this.peers.push({ card, handler });
  }

  discoverByTag(tag: string): AgentCard | undefined {
    return this.peers.find((p) => p.card.skills.some((s) => s.tags.includes(tag)))?.card;
  }

  async delegateOne(req: DelegationRequest): Promise<A2ATaskResult> {
    const taskId = randomUUID().slice(0, 8);
    const peer = this.peers.find((p) => p.card.skills.some((s) => s.tags.includes(req.requiredTag)));
    if (!peer) {
      return {
        taskId,
        agentName: "UNRESOLVED",
        state: "failed",
        required: req.required,
        error: `No A2A peer advertises tag '${req.requiredTag}'`,
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    try {
      const result = await Promise.race([
        peer.handler(req.payload),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${req.timeoutMs}ms`)), req.timeoutMs)
        ),
      ]);
      return {
        taskId,
        agentName: peer.card.name,
        state: "completed",
        required: req.required,
        artifact: { verdict: result.verdict, summary: result.summary },
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
      };
    } catch (err) {
      return {
        taskId,
        agentName: peer.card.name,
        state: "failed",
        required: req.required,
        error: (err as Error).message,
        tokensUsed: 0,
        costUsd: 0,
      };
    }
  }

  async delegateParallelAndSynthesize(requests: DelegationRequest[]): Promise<{
    overallVerdict: "APPROVE" | "REJECT";
    results: A2ATaskResult[];
    warnings: string[];
    totalTokensUsed: number;
    totalCostUsd: number;
  }> {
    const settled = await Promise.allSettled(requests.map((r) => this.delegateOne(r)));
    const results: A2ATaskResult[] = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : {
            taskId: "err",
            agentName: "UNKNOWN",
            state: "failed",
            required: requests[i].required,
            error: String(s.reason),
            tokensUsed: 0,
            costUsd: 0,
          }
    );

    const warnings: string[] = [];
    let rejected = false;

    for (const r of results) {
      if (r.state === "failed") {
        if (r.required) rejected = true;
        warnings.push(`${r.agentName} failed (${r.required ? "required" : "best_effort"}): ${r.error}`);
      } else if (r.artifact?.verdict === "REJECT") {
        // Veto precedence: any REJECT overrides APPROVE
        rejected = true;
      }
    }

    return {
      overallVerdict: rejected ? "REJECT" : "APPROVE",
      results,
      warnings,
      totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
      totalCostUsd: Number(results.reduce((sum, r) => sum + r.costUsd, 0).toFixed(6)),
    };
  }
}

