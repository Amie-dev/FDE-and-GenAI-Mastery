import { store } from "../store/memory-store";

// Chapter 7: Job status tracking + SSE (notes 07)
export function createJob(type: string) {
  return store.createJob({ type, status: "PENDING", retries: 0 });
}

export function updateJobProgress(jobId: string, status: string, progress: number, message: string) {
  return store.updateJob(jobId, { status: status as any, progress, message });
}

export function failJob(jobId: string, error: string) {
  return store.updateJob(jobId, { status: "FAILED", error });
}

export function completeJob(jobId: string) {
  return store.updateJob(jobId, { status: "COMPLETED", progress: 100 });
}

export function retryJob(jobId: string) {
  const job = store.getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (!["FAILED", "RETRYING"].includes(job.status)) throw new Error("Only failed jobs can be retried");
  return store.updateJob(jobId, { status: "PENDING", retries: (job.retries ?? 0) + 1, error: undefined });
}

export function listJobs() {
  return store.listJobs();
}