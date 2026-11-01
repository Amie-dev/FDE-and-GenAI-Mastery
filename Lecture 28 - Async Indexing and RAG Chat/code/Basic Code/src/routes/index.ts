import { Router } from "express";
import {
  createSource, getSource, listSources, reprocessSourceController,
  deleteSourceController, getChunksForSource,
} from "../controllers/source.controller";
import { chatStream, getConversation } from "../controllers/chat.controller";
import { previewChunk } from "../controllers/citation.controller";
import {
  createJobController, jobStatusStream, listJobsController,
  retryJobController, updateJobProgress, failJob, completeJob,
} from "../controllers/job.controller";

const router = Router();

// Sources (Chapter 1 & 2)
router.post("/sources", createSource);
router.get("/sources", listSources);
router.get("/sources/:id", getSource);
router.post("/sources/:id/reprocess", reprocessSourceController);
router.delete("/sources/:id", deleteSourceController);
router.get("/sources/:sourceId/chunks", getChunksForSource);

// Chat (Chapter 3)
router.post("/chat", chatStream);
router.get("/conversations/:id", getConversation);

// Citations preview (Chapter 4)
router.get("/sources/:sourceId/chunks/:chunkId", previewChunk);

// Jobs (Chapter 7)
router.post("/jobs", createJobController);
router.get("/jobs", listJobsController);
router.get("/jobs/:jobId/status", jobStatusStream);
router.post("/jobs/:id/retry", retryJobController);

// Demo job lifecycle endpoints (Chapter 7)
router.post("/jobs/:id/progress", (req, res) => {
  const { status, progress, message } = req.body;
  res.json(updateJobProgress(req.params.id, status, progress, message));
});
router.post("/jobs/:id/fail", (req, res) => res.json(failJob(req.params.id, req.body.error || "failed")));
router.post("/jobs/:id/complete", (req, res) => res.json(completeJob(req.params.id)));

export default router;