import { app } from './app.js';
import { ENFORCEMENT_LADDER, SEMANTIC_POLICY, config } from './config/config.js';
import { chooseEnforcement, enforcementReason, isOffline } from './lib/llm.js';
import { MEETING_TYPES, SCHEMA_VERSION, SILENT_LIMITS } from './schema/meeting.schema.js';

const server = app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 10 — Basic Structured Outputs Lab');
  console.log(`📡 Server        : http://localhost:${config.PORT}`);
  console.log(`🤖 Model         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode          : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`📐 Schema        : ${SCHEMA_VERSION}  (one declaration -> type + validator + wire contract — ch 02 §02.6)`);
  console.log(`🔒 Enforcement   : ${chooseEnforcement()}  of [${ENFORCEMENT_LADDER.join(' > ')}]  (ch 05 §05.7)`);
  console.log(`   └─ why        : ${enforcementReason()}`);
  console.log(`🎯 Closed set    : ${MEETING_TYPES.join(' | ')}  (ch 04 §04.4)`);
  console.log(`🔁 Loop          : ${config.MAX_REPAIRS} bounded repair(s) then the fallback ladder (ch 06 §06.7, §06.9)`);
  console.log(`🧪 Semantics     : duration > ${SEMANTIC_POLICY.reviewDurationMinutes} min -> review · start in the past -> block (ch 06 §06.6)`);
  console.log(`⚠️  Silent limits : ${SILENT_LIMITS.length} keywords the decoder does NOT enforce — Zod does (ch 05 §05.4.3)`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health    (enforcement rung · silent limits · semantic policy)');
  console.log('📐 GET    /api/schema    (the wire contract + the three artefacts — ch 02 §02.6)');
  console.log('🧾 POST   /api/extract   (validate -> repair -> accept | degraded — ch 06 §06.2)');
  console.log('📊 GET    /api/metrics   (validity · repair rate · issue distribution — ch 09 §09.2)');
  console.log('=======================================================');
  console.log('Try:');
  console.log('  curl -s -X POST localhost:' + config.PORT + '/api/extract \\');
  console.log('    -H "content-type: application/json" \\');
  console.log('    -d \'{"text":"Schedule a Docker discussion with Rahul tomorrow at 4 PM for 30 minutes"}\'');
  console.log('  ...now omit the duration and watch the repair loop fix a wrong TYPE (ch 03 §03.2 #7).');
});

/**
 * Chapter 09 §09.8 — a clean stop.
 *
 * The traces and metrics are IN-MEMORY state, which is fine for a lab and wrong
 * for production: in a real system they go to the metrics store (chapter 09
 * §09.6), and the extraction cache is keyed per tenant.
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
