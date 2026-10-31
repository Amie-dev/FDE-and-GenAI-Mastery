const { runDurablePipelineDemo } = require('./src/demos/demo-01-durable-pipeline');
const { runParallelAgentsDemo } = require('./src/demos/demo-02-parallel-agents');
const { runHumanInTheLoopDemo } = require('./src/demos/demo-03-human-in-the-loop');
const { runConcurrencyLimitsDemo } = require('./src/demos/demo-04-concurrency-limits');
const { runFailureRecoveryDemo } = require('./src/demos/demo-05-failure-recovery');

async function main() {
  console.log(`
====================================================================
  🚀 WEEK 07 — DAY 13: INNGEST WORKFLOWS & DURABLE EXECUTION SUITE
====================================================================
  Modules:
  1. Procedural vs Durable Multi-Agent Pipeline & Crash Resumption
  2. Parallel Multi-Agent Execution (Fan-Out / Fan-In via Promise.all)
  3. Human-in-the-Loop Approval Workflow (step.waitForEvent)
  4. Per-Tenant Concurrency Control & Throttling
  5. Resilient Error Handling, Exponential Backoff & onFailure Hook
====================================================================
  `);

  await runDurablePipelineDemo();
  await runParallelAgentsDemo();
  await runHumanInTheLoopDemo();
  await runConcurrencyLimitsDemo();
  await runFailureRecoveryDemo();

  console.log('\n====================================================================');
  console.log('  🎉 ALL DAY 13 INNGEST DEMONSTRATIONS EXECUTED SUCCESSFULLY!');
  console.log('====================================================================\n');
}

main().catch((err) => {
  console.error('❌ Master Application Execution Error:', err);
  process.exit(1);
});
