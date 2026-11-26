import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ResearchCompletedPayload } from "../types/types.js";

export const humanInTheLoopWorkflow = inngest.createFunction(
  {
    id: "research-human-approval",
  },
  {
    event: EVENTS.RESEARCH_REQUESTED,
  },
  async ({ event, step }) => {
    const request = event.data as ResearchRequestedPayload;

    const draft = await step.run("generate-draft-report", async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        summaryTitle: `Draft: ${request.query}`,
        content: "Draft report content pending approval",
        citations: [],
      };
    });

    await step.sendEvent("notify-approval-required", [
      {
        name: "analytics/approval.requested",
        data: {
          jobId: request.jobId,
          userId: request.userId,
        },
      },
    ]);

    const approval = await step.waitForEvent(
      "wait-for-human-approval",
      {
        event: EVENTS.RESEARCH_APPROVED,
        timeout: "24h",
        match: "async.data.jobId",
      }
    );

    if (!approval) {
      await step.run("handle-approval-timeout", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { message: "Approval timeout, moving to fallback mode" };
      });
      return { jobId: request.jobId, status: "timeout" };
    }

    await step.run("publish-approved-report", async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { message: `Report approved by ${approval.data.approvedBy}` };
    });

    await step.sendEvent("research-approved-broadcast", [
      {
        name: EVENTS.RESEARCH_COMPLETED,
        data: {
          jobId: request.jobId,
          userId: request.userId,
          report: draft,
        } as ResearchCompletedPayload,
      },
    ]);

    return {
      jobId: request.jobId,
      status: "approved",
      approvedBy: approval.data.approvedBy,
    };
  }
);