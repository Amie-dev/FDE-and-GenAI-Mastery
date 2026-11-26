import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ResearchCompletedPayload, DeadLetterEvent } from "../types/types.js";

export const resilientFailureHandlingWorkflow = inngest.createFunction(
  {
    id: "research-resilient-with-recoveries",
  },
  {
    event: EVENTS.RESEARCH_REQUESTED,
  },
  async ({ event, step }) => {
    const request = event.data as ResearchRequestedPayload;

    const input = await step.run(
      "preprocess-input",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { normalizedQuery: request.query.trim().toLowerCase() };
      }
    );

    const research = await step.run(
      "call-ai-provider",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { data: "AI response data", tokens: 2000 };
      },
      {
        retries: {
          maxAttempts: 4,
          delay: 1,
          jitter: true,
          shouldRetry: (error) => error.type !== "validation",
        },
        onFailure: async (context) => {
          await step.sendEvent("activate-fallback", [
            {
              name: EVENTS.FALLBACK_USED,
              data: {
                jobId: request.jobId,
                fallbackActivated: true,
                error: context.error.message,
              },
            },
          ]);
        },
      }
    );

    await step.sendEvent("research-completed-with-fallback", [
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
      status: "completed-with-recoveries",
      provider: "ai-provider",
      tokens: research.tokens,
    };
  }
);