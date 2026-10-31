import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ResearchCompletedPayload } from "../types/types.js";

export const durablePipelineWorkflow = inngest.createFunction(
  {
    id: "research-durable-pipeline",
  },
  {
    event: EVENTS.RESEARCH_REQUESTED,
  },
  async ({ event, step }) => {
    const request = event.data as ResearchRequestedPayload;

    await step.run("input-preprocessor", async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        normalizedQuery: request.query.toLowerCase().trim(),
        timestamp: Date.now(),
      };
    });

    const webResults = await step.run("web-search-agent", async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        sourcesFound: 3,
        data: { websites: ["site1", "site2", "site3"] },
      };
    });

    const synthesis = await step.run("llm-synthesis-agent", async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        summaryTitle: `Analysis: ${request.query}`,
        content: "AI-generated synthesis content",
        citations: ["source1", "source2"],
      };
    });

    await step.sendEvent("publish-research", [
      {
        name: EVENTS.RESEARCH_COMPLETED,
        data: {
          jobId: request.jobId,
          userId: request.userId,
          report: synthesis,
        } as ResearchCompletedPayload,
      },
    ]);

    return {
      jobId: request.jobId,
      status: "completed",
      results: synthesis,
    };
  }
);