const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 01: Procedural vs Durable Multi-Agent Pipeline
 * Demonstrates step memoization and resumption after system failure.
 */
const proceduralVsDurableWorkflow = inngest.createFunction(
  {
    id: 'procedural-vs-durable-workflow',
    name: '01 - Procedural vs Durable Execution Pipeline',
  },
  { event: 'ai/durable-pipeline.requested' },
  async ({ event, step }) => {
    // Step 1: Input Preprocessing (Checkpoint 1)
    const inputData = await step.run('step-1-input-processing', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Deep Web Search Agent (Checkpoint 2)
    const webResearch = await step.run('step-2-deep-web-search', async () => {
      // Optional simulation flag: Simulate system crash on initial run if requested
      if (event.data.simulateCrashOnStep2 && !event.data.isRetryAttempt) {
        console.warn('  💥 [Simulated System Crash] Server lost connection during Agent 2 execution!');
        throw new Error('Simulated transient server crash mid-execution.');
      }
      return await agentService.runDeepWebSearchAgent(inputData.normalizedQuery);
    });

    // Step 3: Synthesis LLM Agent (Checkpoint 3)
    const synthesis = await step.run('step-3-llm-synthesis', async () => {
      return await agentService.runSynthesisLLMAgent({ web: webResearch });
    });

    // Step 4: Database Indexing Agent (Checkpoint 4)
    const dbRecord = await step.run('step-4-db-indexing', async () => {
      return await agentService.runDatabaseIndexingAgent(synthesis);
    });

    // Step 5: Notification Agent (Checkpoint 5)
    await step.run('step-5-user-notification', async () => {
      return await agentService.runNotificationAgent(
        inputData.userId,
        `Research complete for query "${inputData.normalizedQuery}"!`
      );
    });

    return {
      status: 'SUCCESS',
      jobId: inputData.jobId,
      result: synthesis,
      indexedRecord: dbRecord,
    };
  }
);

module.exports = { proceduralVsDurableWorkflow };
