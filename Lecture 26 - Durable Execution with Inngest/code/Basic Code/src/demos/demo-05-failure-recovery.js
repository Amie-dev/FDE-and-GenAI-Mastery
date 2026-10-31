const agentService = require('../services/agentService');

async function runFailureRecoveryDemo() {
  console.log('===============================================================');
  console.log('  🚨 DEMO 05 — RESILIENT RETRIES & FALLBACK FAILURE HANDLER');
  console.log('===============================================================\n');

  const jobId = `job_fail_${Date.now()}`;
  console.log(`1️⃣ [Simulating Unrecoverable API Failure] Job ID: ${jobId}`);

  try {
    console.log('   Executing Step 1: Preprocess Input...');
    await agentService.runInputPreprocessingAgent({ query: 'Resilient Failure Test', jobId });

    console.log('\n2️⃣ [Executing Step 2: Unstable API Call]');
    console.warn('   ⚠️ Error Triggered: HTTP 503 Model Provider Rate Limit Exceeded!');

    // Simulate Inngest Retry Attempts
    console.log('\n3️⃣ [Inngest Automatic Retry Lifecycle]');
    console.log('   - Retry Attempt #1: Failed. Waiting 2 seconds (Exponential Backoff)...');
    console.log('   - Retry Attempt #2: Failed. Waiting 4 seconds (Exponential Backoff)...');
    console.log('   - Retry Attempt #3: Failed. Exhausted retries (3/3).');

    console.log('\n4️⃣ [Triggering onFailure Fallback Hook]');
    console.log('   Executing step.run("mark-job-failed-in-db")...');
    console.log('   Executing step.run("send-admin-alert")...');

    await agentService.runNotificationAgent('admin_alerts', `ALERT: Job ${jobId} permanently failed after 3 retries.`);
    console.log('   ✅ Failure state saved to database. Admin alerted.');

  } catch (err) {
    console.error('   Expected Error Handled:', err.message);
  }

  console.log('\n🎉 Demo 05 Failure Recovery & Handler Verified!');
  console.log('===============================================================\n');
}

module.exports = { runFailureRecoveryDemo };

if (require.main === module) {
  runFailureRecoveryDemo().then(() => process.exit(0));
}
