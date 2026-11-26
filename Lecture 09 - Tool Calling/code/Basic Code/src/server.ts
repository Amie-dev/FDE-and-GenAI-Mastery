import { app } from './app.js';
import { BRAKES, config } from './config/config.js';
import { isOffline } from './lib/llm.js';
import { describeRegistry } from './services/registry.service.js';

const server = app.listen(config.PORT, () => {
  const tools = describeRegistry();

  console.log('=======================================================');
  console.log('🚀 Lecture 08 — Basic Tool Calling Lab');
  console.log(`📡 Server        : http://localhost:${config.PORT}`);
  console.log(`🤖 Model         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode          : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`🧭 tool_choice   : ${config.TOOL_CHOICE}  (chapter 07 §07.2)`);
  console.log(`🛑 Brakes        : steps ${BRAKES.maxSteps} · deadline ${BRAKES.requestTimeoutMs} ms · token ceiling ${BRAKES.tokenCeiling} · repeat ${BRAKES.repeatedCallLimit}`);
  console.log(`🧰 Tools         : ${tools.map((tool) => `${tool.name}[${tool.tier}]`).join(' · ')}`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health                 (wiring · registry · tiers · brakes)');
  console.log('📜 GET    /api/tools                  (the contract the model receives — ch 02)');
  console.log('🔧 POST   /api/tools/:name/call       (one call through executeSafely — ch 03/06)');
  console.log('🔄 POST   /api/agent/run              (the 5-step loop + trace + ledger — ch 03/05)');
  console.log('📊 POST   /api/eval/routing           (routing fixtures + confusion matrix — ch 07)');
  console.log('💰 GET    /api/ledger                 (cost · halt reasons · p50/p95 — ch 08)');
  console.log('🛂 GET    /api/approvals              (the Tier 3 queue — ch 08)');
  console.log('✅ POST   /api/approvals/:id          (approve or reject, once — ch 08)');
  console.log('=======================================================');
});

/**
 * Chapter 08 §08.8 item 24 — a clean stop, and a reminder that the approval queue
 * is durable state, not request state (Lecture 09 owns the durable version).
 */
let shuttingDown = false;

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — closing the HTTP server.`);
  server.close(() => {
    console.log('✅ HTTP server closed cleanly.');
    process.exit(0);
  });
  server.closeAllConnections?.();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
