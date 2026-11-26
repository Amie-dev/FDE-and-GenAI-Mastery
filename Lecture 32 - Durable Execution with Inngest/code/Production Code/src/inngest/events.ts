export const EVENTS = {
  RESEARCH_REQUESTED: "ai/research.requested",
  PARALLEL_RESEARCH_REQUESTED: "ai/parallel-research.requested",
  RESEARCH_APPROVED: "ai/research.approved",
  RESEARCH_COMPLETED: "ai/research.completed",
  RESEARCH_FAILED: "ai/research.failed",
  DEAD_LETTER: "ai/research.dead-letter",
  FALLBACK_USED: "ai/research.fallback-used",
  CDC_RECORD_CHANGED: "cdc/record.changed",
  CDC_DLQ_REPLAY: "cdc/dlq.replay",
} as const;

export interface ResearchRequestedPayload {
  query: string;
  userId: string;
  jobId: string;
}

export interface ParallelResearchRequestedPayload extends ResearchRequestedPayload {
  parallel: true;
}

export interface ResearchApprovedPayload {
  jobId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface ResearchCompletedPayload {
  jobId: string;
  userId: string;
  report: unknown;
}

export interface DeadLetterPayload {
  jobId: string;
  error: string;
  attempts: number;
  timestamp: string;
}

export interface CdcRecordChangedPayload {
  table: string;
  op: "INSERT" | "UPDATE" | "DELETE";
  recordId: string;
  lsn: number;
  idempotencyKey: string;
  after?: { title: string; content: string } | null;
  simulateFailure?: boolean;
}