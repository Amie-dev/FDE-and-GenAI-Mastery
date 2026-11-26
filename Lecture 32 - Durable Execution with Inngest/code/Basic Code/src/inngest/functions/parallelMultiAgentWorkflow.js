const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 02: Parallel Multi-Agent Execution (Fan-Out / Fan-In)
 * Demonstrates parallel step execution using Promise.all followed by synthesis aggregation.
 */
const parallelMultiAgentWorkflow = inngest.createFunction(
  {
    id: 'parallel-multi-agent-workflow',
    name: '02 - Parallel Multi-Agent Execution Pipeline',
  },
  { event: 'ai/parallel-research.requested' },
  async ({ event, step }) => {
    // Step 1: Preprocess Input Query
    const input = await step.run('preprocess-input-query', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Parallel Multi-Agent Fan-Out (Web, ArXiv Academic, GitHub Code)
    const [webResults, academicResults, codeResults] = await Promise.all([
      step.run('agent-web-search', async () => {
        return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
      }),

      step.run('agent-arxiv-academic-search', async () => {
        return await agentService.runArxivAcademicAgent(input.normalizedQuery);
      }),

      step.run('agent-github-code-search', async () => {
        return await agentService.runGithubCodeAgent(input.normalizedQuery);
      }),
    ]);

    // Step 3: Fan-In Aggregation & Synthesis LLM Agent
    const finalReport = await step.run('synthesize-multi-agent-report', async () => {
      return await agentService.runSynthesisLLMAgent({
        web: webResults,
        academic: academicResults,
        code: codeResults,
      });
    });

    // Step 4: Index into Knowledge Graph Database
    const dbRecord = await step.run('index-to-knowledge-graph', async () => {
      return await agentService.runDatabaseIndexingAgent(finalReport);
    });

    return {
      status: 'SUCCESS',
      jobId: input.jobId,
      report: finalReport,
      dbRecord,
    };
  }
);

module.exports = { parallelMultiAgentWorkflow };
