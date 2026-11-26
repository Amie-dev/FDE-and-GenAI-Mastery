const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 04: Per-Tenant Concurrency & Rate-Limited Workflow
 * Demonstrates declarative concurrency control and throttling rules.
 */
const concurrencyRateLimitedWorkflow = inngest.createFunction(
  {
    id: 'concurrency-rate-limited-workflow',
    name: '04 - Concurrency & Rate-Limited Multi-Agent Pipeline',
    // Declarative Concurrency Control Rules
    concurrency: [
      {
        // Max 2 concurrent execution slots per individual user/tenant
        limit: 2,
        key: 'event.data.userId',
      },
      {
        // Global system cap across all tenants
        limit: 10,
      },
    ],
    // Throttle: Max 5 runs per 1 minute per tenant
    throttle: {
      limit: 5,
      period: '1m',
      key: 'event.data.userId',
    },
  },
  { event: 'ai/concurrency-task.requested' },
  async ({ event, step }) => {
    const input = await step.run('preprocess-concurrency-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    console.log(`  🚦 [Concurrency Managed] Executing job ${input.jobId} for tenant "${input.userId}"...`);

    const research = await step.run('run-heavy-agent', async () => {
      return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
    });

    // Simulate heavy multi-agent processing step
    await step.sleep('simulate-heavy-workload', '2s');

    const synthesis = await step.run('synthesize-concurrency-result', async () => {
      return await agentService.runSynthesisLLMAgent({ web: research });
    });

    return {
      status: 'COMPLETED',
      jobId: input.jobId,
      userId: input.userId,
      synthesis,
    };
  }
);

module.exports = { concurrencyRateLimitedWorkflow };
