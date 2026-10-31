import { Request, Response } from "express";
import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ParallelResearchRequestedPayload } from "../types/types.js";

export const workflowController = {
  async triggerResearch(req: Request, res: Response) {
    try {
      const { query, userId, parallel } = req.body;

      if (!query || !userId) {
        return res.status(400).json({
          success: false,
          error: "query and userId are required",
        });
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const eventName = parallel ? EVENTS.PARALLEL_RESEARCH_REQUESTED : EVENTS.RESEARCH_REQUESTED;

      const payload: ResearchRequestedPayload | ParallelResearchRequestedPayload = {
        query,
        userId,
        jobId,
      };

      if (parallel) {
        (payload as ParallelResearchRequestedPayload).parallel = true;
      }

      const sendResult = await inngest.send({
        name: eventName,
        data: payload,
      });

      return res.status(202).json({
        success: true,
        message: "Research event emitted to Inngest engine.",
        eventIds: sendResult.ids,
        jobId,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async triggerApproval(req: Request, res: Response) {
    try {
      const { jobId, approvedBy } = req.body;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: "jobId is required",
        });
      }

      const sendResult = await inngest.send({
        name: EVENTS.RESEARCH_APPROVED,
        data: {
          jobId,
          approvedBy: approvedBy || "System Admin",
          approvedAt: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        message: `Approval event sent for jobId: ${jobId}`,
        eventIds: sendResult.ids,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async healthCheck(_req: Request, res: Response) {
    return res.json({
      status: "healthy",
      service: "Inngest Durable Workflows Server",
      inngestEndpoint: "/api/inngest",
      timestamp: new Date().toISOString(),
    });
  },
};