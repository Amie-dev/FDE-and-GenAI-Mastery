/**
 * Lecture 14 — Subagent Architecture Demo (DeepAgents / Claude Code / Antigravity SDK pattern)
 *
 * Demonstrates:
 *  1. defineSubagent() with scoped tools, model tier, and recursion guard (allowNestedSubagents = false)
 *  2. Context Quarantine: child executes noisy intermediate steps, returns only a concise summary
 *  3. Workspace isolation check: parallel writers require 'share' or 'branch' (never 'inherit')
 */

export type WorkspaceMode = 'inherit' | 'share' | 'branch';

export interface SubagentDefinition {
  typeName: string;
  description: string;
  model: 'flash' | 'pro';
  enableWriteTools: boolean;
  allowNestedSubagents: boolean;
  defaultWorkspace: WorkspaceMode;
}

export interface SubagentInvocationResult {
  conversationId: string;
  typeName: string;
  workspace: WorkspaceMode;
  internalTokensUsed: number;
  summaryReturnedToParent: string;
  parentContextTokensAdded: number;
}

export class SubagentRuntime {
  private readonly registry = new Map<string, SubagentDefinition>();
  private counter = 0;

  defineSubagent(def: SubagentDefinition): void {
    this.registry.set(def.typeName, def);
  }

  invokeSubagent(params: {
    typeName: string;
    prompt: string;
    workspace?: WorkspaceMode;
    isParallelWrite?: boolean;
    callerIsSubagent?: boolean;
  }): SubagentInvocationResult {
    const def = this.registry.get(params.typeName);
    if (!def) {
      throw new Error(`Unknown subagent type: ${params.typeName}`);
    }
    if (params.callerIsSubagent && !def.allowNestedSubagents) {
      throw new Error(`Recursion blocked: subagent "${params.typeName}" cannot be spawned by another subagent`);
    }

    const workspace = params.workspace ?? def.defaultWorkspace;
    if (params.isParallelWrite && def.enableWriteTools && workspace === 'inherit') {
      throw new Error('Parallel write subagents must use "share" or "branch" workspace isolation, not "inherit"');
    }

    this.counter += 1;
    const summary = `[${def.typeName}] Completed "${params.prompt.slice(0, 40)}" cleanly.`;
    return {
      conversationId: `sub-${this.counter}`,
      typeName: def.typeName,
      workspace,
      internalTokensUsed: 18_000, // Noisy intermediate searches stay quarantined in child
      summaryReturnedToParent: summary,
      parentContextTokensAdded: 120, // Only concise summary enters parent context
    };
  }
}

