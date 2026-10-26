import { app } from './app.js';
import { config, CONTEXT_POLICY } from './config/config.js';
import { isOffline } from './lib/llm.js';

app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 06 — Basic Chatbot & Context Lab');
  console.log(`📡 Server           : http://localhost:${config.PORT}`);
  console.log(`🤖 Provider         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode             : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`🪟 Context window   : ${config.CONTEXT_WINDOW_TOKENS} tokens · output reserve ${config.AI_MAX_TOKENS}`);
  console.log(`💰 Input budget     : ${config.INPUT_BUDGET} tokens (10% safety margin)`);
  console.log(`🧠 Context policy   : window ${CONTEXT_POLICY.budgetTokens} tokens · anchor K=${CONTEXT_POLICY.anchorTurns} · recent M=${CONTEXT_POLICY.recentTurns}`);
  console.log(`🗜️  Compaction       : at ${CONTEXT_POLICY.summariseThreshold} turns, recall k=${CONTEXT_POLICY.semanticRecall}`);
  console.log(`🛡️  Guardrails       : ${config.MAX_INPUT_CHARS} char cap · citation threshold ${config.CITATION_MATCH_THRESHOLD} · strict=${config.STRICT_VERIFICATION}`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health');
  console.log('🆕 POST   /api/session                       (x-user-id header required)');
  console.log('📜 GET    /api/session/:sessionId            (transcript + cost + refusal rate)');
  console.log('🗑️  DELETE /api/session/:sessionId            (right to be forgotten)');
  console.log('🧠 POST   /api/session/:sessionId/memory     (durable fact)');
  console.log('🔎 POST   /api/context/preview               (no model call)');
  console.log('📈 POST   /api/context/projection            (O(N^2) vs bounded)');
  console.log('💬 POST   /api/chat                          (buffered, verified)');
  console.log('⚡ POST   /api/chat/stream                   (SSE: text/event-stream)');
  console.log('=======================================================');
});
