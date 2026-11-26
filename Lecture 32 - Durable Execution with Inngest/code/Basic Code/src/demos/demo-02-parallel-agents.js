const agentService = require('../services/agentService');

async function runParallelAgentsDemo() {
  console.log('===============================================================');
  console.log('  🔀 DEMO 02 — PARALLEL MULTI-AGENT EXECUTION (FAN-OUT / FAN-IN)');
  console.log('===============================================================\n');

  const query = 'Multi-Agent Orchestration & Vector Graph Indexing';
  console.log(`1️⃣ [Input Preprocessing] Target Query: "${query}"...\n`);

  const input = await agentService.runInputPreprocessingAgent({ query, userId: 'usr_bob' });

  console.log('2️⃣ [Parallel Fan-Out Execution] Triggering 3 Agents simultaneously via Promise.all...');
  const startTime = Date.now();

  const [webResults, academicResults, codeResults] = await Promise.all([
    agentService.runDeepWebSearchAgent(input.normalizedQuery),
    agentService.runArxivAcademicAgent(input.normalizedQuery),
    agentService.runGithubCodeAgent(input.normalizedQuery),
  ]);

  const elapsedTime = Date.now() - startTime;
  console.log(`   ⚡ Parallel Execution Finished in ${elapsedTime} ms!`);
  console.log(`      - Web Search Found: ${webResults.sourcesFound} sources`);
  console.log(`      - ArXiv Found: ${academicResults.papersFound} papers`);
  console.log(`      - GitHub Found: ${codeResults.reposAnalyzed} repositories\n`);

  console.log('3️⃣ [Fan-In Aggregation & Synthesis LLM Agent]');
  const finalReport = await agentService.runSynthesisLLMAgent({
    web: webResults,
    academic: academicResults,
    code: codeResults,
  });

  console.log('   Synthesized Report Summary:\n', JSON.stringify(finalReport, null, 2));

  console.log('\n🎉 Demo 02 Parallel Execution Completed!');
  console.log('===============================================================\n');
}

module.exports = { runParallelAgentsDemo };

if (require.main === module) {
  runParallelAgentsDemo().then(() => process.exit(0));
}
