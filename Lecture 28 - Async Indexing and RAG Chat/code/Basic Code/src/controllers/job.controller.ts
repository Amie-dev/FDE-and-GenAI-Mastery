import { Request, Response } from "express";
import { store } from "../store/memory-store";
import { createJob, updateJobProgress, failJob, completeJob, retryJob, listJobs } from "../services/job.service";

// Chapter 7: Job status + SSE (notes 07)
export function createJobController(req: Request, res: Response) {
  const job = createJob(req.body.type || "SourceJob");
  res.status(201).json(job);
}

export function jobStatusStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  const send = (job: any) => res.write(`data: ${JSON.stringify(job)}\n\n`);

  const job = storeJob(req.params.jobId);
  if (!job) return res.status(404).end();
  send(job);

  const id = setInterval(() => {
    const current = storeJob(req.params.jobId);
    if (!current) { res.end(); clearInterval(id); return; }
    send(current);
    if (current.status === "COMPLETED" || current.status === "FAILED") { res.end(); clearInterval(id); }
  }, 1000);
  res.on("close", () => clearInterval(id));
}

export function listJobsController(_req: Request, res: Response) {
  res.json(listJobs());
}

export function retryJobController(req: Request, res: Response) {
  try {
    const job = retryJob(req.params.id);
    res.json(job);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

function storeJob(id: string) {
  return store.getJob(id);
}

// Exposed for the service layer to drive demo jobs
export { updateJobProgress, failJob, completeJob };