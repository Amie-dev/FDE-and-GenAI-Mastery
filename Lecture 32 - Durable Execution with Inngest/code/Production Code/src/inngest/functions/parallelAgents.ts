import { inngest } from "../inngest/client.js";
import { EVENTS } from "../inngest/events.js";
import { ResearchRequestedPayload, ResearchCompletedPayload } from "../types/types.js";

export const parallelMultiAgentWorkflow = inngest.createFunction(
  {
    id: "research-parallel-agents",
  },
  {
    event: EVENTS.PARALLEL_RESEARCH_REQUESTED,
  },
  async ({ event, step }) => {
    const request = event.data as ResearchRequestedPayload;

    const startTime = Date.now();

    const parallelResults = await step.run(
      "parallel-agent-executions",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const [webResults, academicResults, codeResults] = await Promise.all([
          step.run("web-search", async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { sourcesFound: 3, data: { websites: ["site1", "site2", "site3"] } };
          }),

          step.run("arxiv-search", async () => {
            await new Promise((resolve) => setTimeout(resolve, 150));
            return { papersFound: 2, data: { papers: ["paper1", "paper2"] } };
          }),

          step.run("github-search", async () => {
            await new Promise((resolve) => setTimeout(resolve, 180));
            return { reposAnalyzed: 5, data: { repos: ["repo1", "repo2", "repo3", "repo4", "repo5"] } };
          }),
        ]);

        return {
          webResults,
          academicResults,
          codeResults,
          startTime,
        };
      }
    );

    const synthesis = await step.run("combine-results", async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return {
        summaryTitle: `Parallel Analysis: ${request.query}`,
        content: "Synthesized report from parallel agents",
        citations: ["web1", "arxiv1", "github1"],
      };
    });

    await step.sendEvent("research-completed", [
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
      status: "parallel-completed",
      totalTime: Date.now() - parallelResults.startTime,
      sources: {
        web: parallelResults.webResults.sourcesFound,
        academic: parallelResults.academicResults.papersFound,
        code: parallelResults.codeResults.reposAnalyzed,
      },
    };
  }
);