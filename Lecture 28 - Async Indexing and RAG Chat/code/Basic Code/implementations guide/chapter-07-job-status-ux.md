# Chapter 7: Job Status, Partial Failure & UX

Based on `notes/07_Job_Status_Partial_Failure_UX.md`.

## 7.1 Files involved

- `src/services/job.service.ts` — job CRUD + status transitions
- `src/controllers/job.controller.ts` — job endpoints + SSE status stream
- `src/routes/index.ts` — mounts job routes + demo lifecycle endpoints

## 7.2 Commands

```bash
# Create a job
curl -X POST http://localhost:4000/api/jobs -H 'Content-Type: application/json' -d '{"type":"SourceJob"}'

# List all jobs
curl http://localhost:4000/api/jobs

# Stream a job's status (SSE)
curl -N http://localhost:4000/api/jobs/<jobId>/status

# Update job progress
curl -X POST http://localhost:4000/api/jobs/<id>/progress -H 'Content-Type: application/json' -d '{"status":"RUNNING","progress":50,"message":"chunking..."}'

# Mark failed / complete / retry
curl -X POST http://localhost:4000/api/jobs/<id>/fail -H 'Content-Type: application/json' -d '{"error":"boom"}'
curl -X POST http://localhost:4000/api/jobs/<id>/complete
curl -X POST http://localhost:4000/api/jobs/<id>/retry
```

## 7.3 Full code — src/services/job.service.ts

```ts
import { store } from "../store/memory-store";

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
```

## 7.4 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `createJob` | Creates a `PENDING` job with `retries: 0`. |
| `updateJobProgress` | Updates status/progress/message — used during chunking/embedding steps to show users progress. |
| `failJob` / `completeJob` | Terminal states. |
| `retryJob` | Only allows retry if the job is `FAILED`/`RETRYING`, increments `retries`, clears the error, and resets to `PENDING` (exponential backoff idea from the notes). |
| `listJobs` | Workspace-level job dashboard data. |

## 7.5 How it works

`GET /api/jobs/:jobId/status` streams status updates over SSE so the frontend shows a live progress indicator. The state flow is `PENDING → RUNNING → COMPLETED/FAILED`, with `FAILED → RETRYING → RUNNING` allowed on retry — matching the notes state diagram.