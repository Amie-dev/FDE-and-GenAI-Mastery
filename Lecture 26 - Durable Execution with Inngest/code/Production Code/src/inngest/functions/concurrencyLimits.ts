import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ResearchCompletedPayload, DeadLetterEvent } from "../types/types.js";

export const concurrencyLimitedWorkflow = inngest.createFunction(
  {
    id: "research-concurrency-limited",
    concurrency: {
      limit: 3,
    },
  },
  {
    event: EVENTS.RESEARCH_REQUESTED,
  },
  async ({ event, step }) => {
    const request = event.data as ResearchRequestedPayload;

    const startTime = Date.now();

    const research = await step.run(
      "call-openai-gpt-4o",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { response: "Concurrent research completion", tokens: 1500 };
      },
      {
        retries: {
          maxAttempts: 2,
          delay: 1,
          jitter: true,
        },
        onFailure: async (context) => {
          await step.sendEvent("analytics/failure-detected", [
            {
              name: EVENTS.RESEARCH_FAILED,
              data: {
                jobId: request.jobId,
                error: context.error.message,
                timestamp: new Date().toISOString(),
              } as DeadLetterEvent,
            },
          ]);
        },
      }
    );

    await step.sendEvent("research-completed", [
      {
        name: EVENTS.RESEARCH_COMPLETED,
        data: {
          jobId: request.jobId,
          userId: request.userId,
          report: research,
        } as ResearchCompletedPayload,
      },
    ]);

    return {
      jobId: request.jobId,
      status: "completed",
      provider: "openai",
      tokens: research.tokens,
      duration: Date.now() - startTime,
    };
  }
);