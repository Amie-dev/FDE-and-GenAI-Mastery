const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 05: Resilient Error Handling & Failure Callback Workflow
 * Demonstrates retries, exponential backoff, and the onFailure fallback hook.
 */
const resilientFailureHandlingWorkflow = inngest.createFunction(
  {
    id: 'resilient-failure-handling-workflow',
    name: '05 - Resilient Error Handling & Fallback Pipeline',
    // Retry configuration
    retries: 3,
    // Failure Handler Hook: Executed durably when all 3 retries fail!
    onFailure: async ({ event, step, error }) => {
      console.error(`  🚨 [onFailure Triggered] Job ${event.data.jobId || 'unknown'} exhausted all retries!`);
      console.error(`     Reason: ${error.message}`);

      await step.run('mark-job-failed-in-db', async () => {
        console.log('     💾 Marking job as FAILED in persistent database record...');
        return {
          jobId: event.data.jobId,
          status: 'FAILED',
          failedAt: new Date().toISOString(),
          errorMessage: error.message,
        };
      });

      await step.run('send-admin-alert', async () => {
        return await agentService.runNotificationAgent(
          'admin_alerts',
          `ALERT: Pipeline ${event.data.jobId} permanently failed. Error: ${error.message}`
        );
      });
    },
  },
  { event: 'ai/resilient-task.requested' },
  async ({ event, step }) => {
    const input = await step.run('preprocess-resilient-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Unstable API Step Simulation
    const research = await step.run('unstable-external-api-step', async () => {
      if (event.data.shouldFailPermanently) {
        console.warn('  ⚠️ [Simulated External Error] External LLM Provider threw HTTP 503 Service Unavailable!');
        throw new Error('HTTP 503: Model provider rate limit exceeded (Unrecoverable).');
      }

      return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
    });

    const synthesis = await step.run('synthesize-resilient-results', async () => {
      return await agentService.runSynthesisLLMAgent({ web: research });
    });

    return {
      status: 'SUCCESS',
      jobId: input.jobId,
      synthesis,
    };
  }
);

module.exports = { resilientFailureHandlingWorkflow };
