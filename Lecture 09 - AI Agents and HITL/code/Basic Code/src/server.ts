import { app } from './app.js';
import { AGENCY_SPECTRUM, BRAKES, QUOTAS, config } from './config/config.js';
import { isOffline } from './lib/llm.js';
import { describeRegistry } from './services/registry.service.js';

const server = app.listen(config.PORT, () => {
  const level = config.AGENCY_LEVEL as 1 | 2 | 3 | 4;

  console.log('=======================================================');
  console.log('🚀 Lecture 09 — Basic AI Agents & HITL Lab');
  console.log(`📡 Server        : http://localhost:${config.PORT}`);
  console.log(`🤖 Model         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode          : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`🪜 Agency        : Level ${level} — ${AGENCY_SPECTRUM[level].name}  (chapter 01 §01.2)`);
  console.log(`🛑 Brakes        : steps ${BRAKES.maxSteps} · deadline ${BRAKES.requestTimeoutMs} ms · tokens ${BRAKES.tokenCeiling} · repeat ${BRAKES.repeatedCallLimit} · tool ${BRAKES.toolTimeoutMs} ms`);
  console.log(`📦 Jail          : ${config.WORKSPACE_ROOT}`);
  console.log(`📊 Quotas        : ${QUOTAS.maxFileBytes} B/file · ${QUOTAS.maxWorkspaceBytes} B total · ${QUOTAS.maxFiles} files · depth ${QUOTAS.maxDepth}`);
  console.log(`🧰 Tools         : ${describeRegistry().map((tool) => `${tool.name}[T${tool.tier}]`).join(' · ')}`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health                 (agency level · 6 components · brakes · quotas)');
  console.log('🧰 GET    /api/tools                  (the role-FILTERED registry — ch 08 §08.2.2)');
  console.log('🔁 POST   /api/agent/run              (the loop + state machine + trace + ledger — ch 03/04)');
  console.log('📁 POST   /api/workspace/write        (safePath sandbox — try "../../src/server.ts" — ch 05)');
  console.log('📂 GET    /api/workspace/files        (listFiles — perception — ch 06)');
  console.log('🛂 GET    /api/approvals              (the durable Tier 3 queue — ch 07)');
  console.log('✅ POST   /api/agent/resume           (the resumption webhook, idempotent — ch 07)');
  console.log('🛡️  POST   /api/guard/scan             (input risk score + output gate — ch 08)');
  console.log('📜 GET    /api/audit                  (the security event log — ch 08 §08.9)');
  console.log('=======================================================');
});

/**
 * Chapter 09 §09.6 — "the application is the kernel".
 *
 * A clean stop, and a reminder that the approval queue is DURABLE state, not
 * request state: in production it lives in Postgres, so a restart is survivable.
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
