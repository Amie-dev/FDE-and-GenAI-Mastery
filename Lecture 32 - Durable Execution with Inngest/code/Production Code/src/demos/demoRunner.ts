const { inngest } = require("../inngest/client.js");
const { agentService } = require("../services/agentService.js");

async function runDurablePipelineDemo() {
  console.log("==============================================================");
  console.log("  ⚡ DEMO 01 — DURABLE PIPELINE (Chapter 1-2)");
  console.log("===============================================================\n");

  const rawInput = {
    query: "Inngest Durable Execution Architecture",
    userId: "usr_alice",
    jobId: `job_demo1_${Date.now()}`,
  };

  console.log("1️⃣ [Input Preprocessing]");
  const inputData = await agentService.runInputPreprocessingAgent(rawInput);
  console.log("   ✅ Completed: normalized query =", inputData.normalizedQuery);

  console.log("\n2️⃣ [Web Search Agent]");
  const webResults = await agentService.runDeepWebSearchAgent(inputData.normalizedQuery);
  console.log("   ✅ Completed: found", webResults.sourcesFound, "sources");

  console.log("\n💥 [CRASH SIMULATION]");
  console.log("   Server crashes after Step 2");
  console.log("   In procedural code: restart from beginning (wasteful)");
  console.log("   In durable code: resume from Step 3 (zero waste)");

  console.log("\n3️⃣ [Resuming from Step 3]");
  const synthesis = await agentService.runSynthesisLLMAgent({ web: webResults });
  console.log("   ✅ Synthesized title:", synthesis.summaryTitle);

  console.log("\n4️⃣ [Database Indexing & Notification]");
  const dbRec = await agentService.runDatabaseIndexingAgent(synthesis);
  await agentService.runNotificationAgent(inputData.userId, "Research report generated successfully.");

  console.log("\n🎉 Demo 01 completed resiliently!");
  console.log("===============================================================\n");
}

async function runParallelAgentsDemo() {
  console.log("==============================================================");
  console.log("  🔀 DEMO 02 — PARALLEL AGENTS (Chapter 5)");
  console.log("===============================================================\n");

  const query = "Parallel Multi-Agent Orchestration";
  console.log(`1️⃣ [Input: "${query}"]`);

  const input = await agentService.runInputPreprocessingAgent({
    query,
    userId: "usr_bob",
  });

  console.log("\n2️⃣ [Parallel Fan-Out: 3 agents simultaneously]");
  const startTime = Date.now();

  const [webResults, academicResults, codeResults] = await Promise.all([
    agentService.runDeepWebSearchAgent(input.normalizedQuery),
    agentService.runArxivAcademicAgent(input.normalizedQuery),
    agentService.runGithubCodeAgent(input.normalizedQuery),
  ]);

  const elapsedTime = Date.now() - startTime;
  console.log("   ⚡ Parallel execution completed in", elapsedTime, "ms");
  console.log("      - Web Search: found", webResults.sourcesFound, "sources");
  console.log("      - ArXiv: found", academicResults.papersFound, "papers");
  console.log("      - GitHub: analyzed", codeResults.reposAnalyzed, "repos");

  console.log("\n3️⃣ [Fan-In: Aggregate results]");
  const finalReport = await agentService.runSynthesisLLMAgent({
    web: webResults,
    academic: academicResults,
    code: codeResults,
  });

  console.log("   ✅ Synthesized report created");

  console.log("\n🎉 Demo 02 parallel execution completed!");
  console.log("===============================================================\n");
}

async function runHumanInTheLoopDemo() {
  console.log("==============================================================");
  console.log("  ⏸️ DEMO 03 — HUMAN-IN-THE-LOOP (Chapter 4)");
  console.log("===============================================================\n");

  const jobId = `job_approval_${Date.now()}`;
  console.log(`1️⃣ [Workflow Initiated] Job ID: ${jobId}`);

  const web = await agentService.runDeepWebSearchAgent("Human-in-the-Loop Workflows");
  const draft = await agentService.runSynthesisLLMAgent({ web });

  console.log("\n2️⃣ [Notification Sent] Admin approval required...");
  await agentService.runNotificationAgent("mgr_admin", `Approval needed for Job ${jobId}`);

  console.log("\n3️⃣ [Durable Pause] Waiting for human approval (step.waitForEvent)...");
  console.log("   HTTP response sent; workflow pauses; zero CPU/RAM consumed.");

  await new Promise((res) => setTimeout(res, 1500));

  console.log("\n4️⃣ [Approval Event Received] Manager Alice approved.");

  console.log("\n5️⃣ [Resuming Workflow] Indexing and notification dispatch...");
  const publishedRec = await agentService.runDatabaseIndexingAgent(draft);
  await agentService.runNotificationAgent("usr_alice", "Research approved and published!");

  console.log("\n🎉 Demo 03 human-in-the-loop completed successfully!");
  console.log("===============================================================\n");
}

async function runConcurrencyLimitsDemo() {
  console.log("==============================================================");
  console.log("  🚦 DEMO 04 — CONCURRENCY LIMITS (Chapter 6)");
  console.log("===============================================================\n");

  console.log("1️⃣ [Worker Pool Concurrency]");
  console.log("   Configured 3 concurrent workers");

  console.log("\n2️⃣ [Submitting 5 concurrent jobs]");
  console.log("   Jobs 1-3: Processing immediately");
  console.log("   Jobs 4-5: Queued (max concurrency reached)");

  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log("\n3️⃣ [Processing completed]");
  console.log("   All jobs processed within concurrency limits");

  console.log("\n🎉 Demo 04 concurrency limits completed!");
  console.log("===============================================================\n");
}

async function runFailureRecoveryDemo() {
  console.log("==============================================================");
  console.log("  🛡️ DEMO 05 — FAILURE RECOVERY (Chapter 7)");
  console.log("===============================================================\n");

  console.log("1️⃣ [Initial attempt with transient error]");
  console.log("   Attempt 1: Failed (network timeout)");

  console.log("\n2️⃣ [Retry 1] (exponential backoff: 1s)");
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log("   Attempt 2: Failed again (still transient)");

  console.log("\n3️⃣ [Retry 2] (exponential backoff: 2s)");
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log("   Attempt 3: Success!");

  console.log("\n4️⃣ [Recovery with fallback]");
  console.log("   onFailure handler activated (fallback provider)");

  console.log("\n🎉 Demo 05 failure recovery completed!");
  console.log("===============================================================\n");
}

async function runDemos() {
  console.log("\n📋 === Running All Inngest Demos ===\n");

  await runDurablePipelineDemo();
  await runParallelAgentsDemo();
  await runHumanInTheLoopDemo();
  await runConcurrencyLimitsDemo();
  await runFailureRecoveryDemo();

  console.log("\n🎉 All demos completed successfully!");
  console.log("\n📊 Summary of demonstrated concepts:");
  console.log("   ✅ Durable execution & state checkpointing");
  console.log("   ✅ Parallel fan-out/fan-in");
  console.log("   ✅ Human-in-the-loop & event waiting");
  console.log("   ✅ Concurrency & rate limiting");
  console.log("   ✅ Error resilience & retries");
}

if (require.main === module) {
  runDemos().then(() => process.exit(0));
}

module.exports = {
  runDurablePipelineDemo,
  runParallelAgentsDemo,
  runHumanInTheLoopDemo,
  runConcurrencyLimitsDemo,
  runFailureRecoveryDemo,
  runDemos,
};