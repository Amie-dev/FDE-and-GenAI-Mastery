export type PermissionLevel = "READ_ONLY" | "SCOPED_WRITE" | "APPROVAL_REQUIRED" | "FORBIDDEN";

export interface LoopBudgetConfig {
  maxSteps: number;
  maxTokens: number;
  maxCostUsd: number;
  maxDurationMs: number;
  maxPivots: number;
}

export interface BudgetSnapshot {
  stepsUsed: number;
  tokensUsed: number;
  costUsd: number;
  elapsedMs: number;
}

export type ToolErrorClass = "transient" | "structural";

export interface PlanStep {
  id: string;
  toolName: string;
  args: Record<string, string>;
  permission: PermissionLevel;
  expectedPostCondition: string;
}

export interface ToolExecutionResult {
  ok: boolean;
  output?: string;
  error?: string;
  errorClass?: ToolErrorClass;
  tokensUsed: number;
  costUsd: number;
}

export type StuckDecision =
  | { action: "CONTINUE" }
  | { action: "RETRY"; reason: string }
  | { action: "PIVOT"; reason: string; bannedSignature: string }
  | { action: "ESCALATE"; reason: string; bannedSignature: string };

export interface EscalationPacket {
  reason: "STUCK_MAX_PIVOTS" | "BUDGET_EXCEEDED" | "APPROVAL_REQUIRED";
  goal: string;
  completedSteps: string[];
  lastError: string;
  suggestedHumanAction: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  tags: string[];
}

export interface AgentCard {
  name: string;
  url: string;
  version: string;
  skills: AgentSkill[];
}

export type A2ATaskState = "submitted" | "working" | "completed" | "failed";

export interface A2ATaskResult {
  taskId: string;
  agentName: string;
  state: A2ATaskState;
  required: boolean;
  artifact?: {
    verdict: "APPROVE" | "REJECT" | "INFO";
    summary: string;
  };
  error?: string;
  tokensUsed: number;
  costUsd: number;
}

export interface OrchestratorResult {
  status: "COMPLETED" | "ESCALATED" | "BUDGET_EXCEEDED";
  completedSteps: string[];
  pivotsUsed: number;
  budget: BudgetSnapshot;
  escalation?: EscalationPacket;
  a2aSummary?: {
    overallVerdict: "APPROVE" | "REJECT";
    results: A2ATaskResult[];
    warnings: string[];
  };
}

