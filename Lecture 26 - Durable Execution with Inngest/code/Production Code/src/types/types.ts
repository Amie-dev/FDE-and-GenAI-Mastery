export interface ResearchRequest {
  query: string;
  userId: string;
  jobId: string;
}

export interface AgentResult {
  sourcesFound: number;
  papersFound?: number;
  reposAnalyzed?: number;
  data: Record<string, unknown>;
}

export interface SynthesisResult {
  summaryTitle: string;
  content: string;
  citations: string[];
}

export interface ApprovalEvent {
  jobId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface DeadLetterEvent {
  jobId: string;
  error: string;
  attempts: number;
  timestamp: string;
}