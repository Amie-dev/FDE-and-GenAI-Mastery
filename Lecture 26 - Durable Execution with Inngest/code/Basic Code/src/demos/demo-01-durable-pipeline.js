const agentService = require('../services/agentService');

async function runDurablePipelineDemo() {
  console.log('===============================================================');
  console.log('  ⚡ DEMO 01 — PROCEDURAL VS DURABLE EXECUTION & RESUMPTION');
  console.log('===============================================================\n');

  const rawInput = {
    query: 'Inngest Durable Execution vs Procedural Code',
    userId: 'usr_alice',
    jobId: `job_demo1_${Date.now()}`,
  };

  console.log('1️⃣ [Sequential Multi-Agent Step Execution]');
  
  // Step 1: Preprocess
  const inputData = await agentService.runInputPreprocessingAgent(rawInput);
  console.log('   ✅ Step 1 Completed (Checkpoint 1: Input Preprocessor)\n');

  // Step 2: Deep Web Search Agent
  console.log('2️⃣ [Executing Agent 2: Web Search]');
  const webResults = await agentService.runDeepWebSearchAgent(inputData.normalizedQuery);
  console.log('   ✅ Step 2 Completed (Checkpoint 2: Web Research Agent)\n');

  // Simulate System Crash Notice
  console.log('💥 [CRASH SIMULATION SCENARIO]');
  console.log('   In procedural code, if a server crashes at Step 2, restart requires re-executing Step 1 & Step 2.');
  console.log('   In Inngest Durable Execution, Step 1 & Step 2 are cached in state.');
  console.log('   Resumption skips Step 1 & Step 2 in 0 ms at $0.00 token cost!\n');

  // Step 3: LLM Synthesis Agent
  console.log('3️⃣ [Resuming Execution from Checkpoint 3: LLM Synthesis]');
  const synthesis = await agentService.runSynthesisLLMAgent({ web: webResults });
  console.log('   Synthesized Title:', synthesis.summaryTitle);

  // Step 4 & 5: Indexing & Notification
  console.log('\n4️⃣ [Step 4 & 5: DB Indexing & Notification Dispatch]');
  const dbRec = await agentService.runDatabaseIndexingAgent(synthesis);
  await agentService.runNotificationAgent(inputData.userId, 'Research report generated successfully.');

  console.log('\n🎉 Demo 01 Execution Completed Resiliently!');
  console.log('===============================================================\n');
}

module.exports = { runDurablePipelineDemo };

if (require.main === module) {
  runDurablePipelineDemo().then(() => process.exit(0));
}
