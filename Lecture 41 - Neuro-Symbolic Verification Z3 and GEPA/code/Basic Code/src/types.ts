export interface ActionStep {
  tool: "getOrder" | "verifyPolicy" | "requestHitlApproval" | "refundOrder";
  amountUsd?: number;
}

export interface AgentActionPlan {
  goal: string;
  steps: ActionStep[];
  hasHitlApproval: boolean;
}

export interface TrajectoryScore {
  toolRecall: number;
  preconditionOrderOk: boolean;
  argumentAccuracy: number;
  stepEfficiency: number;
  overallScore: number;
}

export interface Z3VerificationResult {
  sat: boolean;
  violatedPolicies: string[];
}

export interface GepaEvalCase {
  id: string;
  goal: string;
  expectedAmountUsd: number;
}

export interface GepaOptimizationReport {
  baselinePassRate: number;
  optimizedPassRate: number;
  baselineTokens: number;
  optimizedTokens: number;
  evolvedInstructions: string[];
}

