const agentService = require('../services/agentService');

async function runHumanInTheLoopDemo() {
  console.log('===============================================================');
  console.log('  ⏸️ DEMO 03 — HUMAN-IN-THE-LOOP APPROVAL WORKFLOW');
  console.log('===============================================================\n');

  const jobId = `job_approval_${Date.now()}`;
  console.log(`1️⃣ [Workflow Initiated] Research Job ID: ${jobId}`);

  // Draft report generation
  const web = await agentService.runDeepWebSearchAgent('Human-in-the-Loop AI Workflows');
  const draft = await agentService.runSynthesisLLMAgent({ web });

  console.log('\n2️⃣ [Notification Sent] Alerting Admin Manager that approval is required...');
  await agentService.runNotificationAgent('mgr_admin', `Approval needed for Job ${jobId}`);

  console.log('\n3️⃣ [Durable Pause] Workflow invoking step.waitForEvent("wait-for-human-approval")...');
  console.log('   Inngest pauses HTTP function execution. Zero CPU/RAM consumed while waiting.');
  console.log('   Simulating approval signal event receipt after 1.5 seconds delay...');

  await new Promise((res) => setTimeout(res, 1500));

  // Simulate Approval Event
  const approvalEvent = {
    name: 'ai/research.approved',
    data: {
      jobId,
      approvedBy: 'Manager Alice (Lead AI Architect)',
      approvedAt: new Date().toISOString(),
    },
  };

  console.log(`\n4️⃣ [Signal Event Received] Event: "${approvalEvent.name}"`);
  console.log(`   Approved By: ${approvalEvent.data.approvedBy}`);

  console.log('\n5️⃣ [Resuming Workflow Execution]');
  const publishedRec = await agentService.runDatabaseIndexingAgent(draft);
  await agentService.runNotificationAgent('usr_alice', 'Your research was approved and published!');

  console.log('\n🎉 Demo 03 Human-in-the-Loop Completed Successfully!');
  console.log('===============================================================\n');
}

module.exports = { runHumanInTheLoopDemo };

if (require.main === module) {
  runHumanInTheLoopDemo().then(() => process.exit(0));
}
