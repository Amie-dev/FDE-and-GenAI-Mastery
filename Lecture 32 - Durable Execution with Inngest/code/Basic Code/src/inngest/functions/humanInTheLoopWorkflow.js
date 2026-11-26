const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 03: Human-in-the-Loop Approval Workflow
 * Demonstrates durable workflow pausing using step.waitForEvent.
 */
const humanInTheLoopWorkflow = inngest.createFunction(
  {
    id: 'human-in-the-loop-workflow',
    name: '03 - Human-in-the-Loop Approval Pipeline',
  },
  { event: 'ai/human-approval.requested' },
  async ({ event, step }) => {
    // Step 1: Initial Research Draft
    const input = await step.run('preprocess-approval-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    const draftReport = await step.run('generate-draft-report', async () => {
      const web = await agentService.runDeepWebSearchAgent(input.normalizedQuery);
      return await agentService.runSynthesisLLMAgent({ web });
    });

    // Step 2: Notify Manager that Approval is Needed
    await step.run('notify-manager-for-approval', async () => {
      return await agentService.runNotificationAgent(
        'mgr_admin',
        `Approval required for job ${input.jobId}: "${draftReport.summaryTitle}"`
      );
    });

    // Step 3: Durable Pause — Wait up to 24 hours for matching signal event "ai/research.approved"
    console.log(`  ⏸️ [Human-in-the-Loop] Pausing workflow ${input.jobId}. Waiting for "ai/research.approved" event...`);

    const approvalSignal = await step.waitForEvent('wait-for-human-approval', {
      event: 'ai/research.approved',
      timeout: '24h',
      match: 'async.data.jobId', // Match payload jobId
    });

    // Handle Timeout Scenario
    if (!approvalSignal) {
      console.warn(`  ⌛ [Human-in-the-Loop Timeout] Job ${input.jobId} timed out after waiting for approval.`);
      
      await step.run('handle-approval-timeout', async () => {
        return await agentService.runNotificationAgent(
          input.userId,
          `Job ${input.jobId} cancelled due to approval timeout.`
        );
      });

      return { status: 'CANCELLED', reason: 'APPROVAL_TIMEOUT' };
    }

    // Approval Received Scenario
    console.log(`  ✅ [Human Approval Received] Approved by: ${approvalSignal.data.approvedBy}`);

    // Step 4: Publish & Index Final Report
    const publishedRecord = await step.run('publish-approved-report', async () => {
      return await agentService.runDatabaseIndexingAgent(draftReport);
    });

    await step.run('notify-user-success', async () => {
      return await agentService.runNotificationAgent(
        input.userId,
        `Your research report for "${input.normalizedQuery}" was approved and published!`
      );
    });

    return {
      status: 'PUBLISHED',
      jobId: input.jobId,
      approvedBy: approvalSignal.data.approvedBy,
      publishedRecord,
    };
  }
);

module.exports = { humanInTheLoopWorkflow };
