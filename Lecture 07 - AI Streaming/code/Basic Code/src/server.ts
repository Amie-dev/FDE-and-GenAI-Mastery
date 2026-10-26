import { app } from './app.js';
import { config, PUMP_POLICY } from './config/config.js';
import { isOffline } from './lib/llm.js';
import { activeStreams } from './services/metrics.service.js';

const server = app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 07 — Basic AI Streaming Lab');
  console.log(`📡 Server           : http://localhost:${config.PORT}`);
  console.log(`🌐 Browser client   : http://localhost:${config.PORT}/  (chapter 08)`);
  console.log(`🤖 Provider         : ${config.AI_PROVIDER} · ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 Mode             : ${isOffline() ? 'OFFLINE stub — every endpoint still works' : 'LIVE provider'}`);
  console.log(`⚙️  Cadence (offline): prefill ${config.OFFLINE_TTFT_MS} ms (TTFT) · decode ${config.OFFLINE_ITL_MS} ms (ITL)`);
  console.log(`🚚 Stream pump      : coalesce on ${PUMP_POLICY.flushIntervalMs} ms OR ${PUMP_POLICY.flushBytes} bytes · first piece always immediate`);
  console.log(`💓 Heartbeat        : SSE comment every ${config.HEARTBEAT_MS} ms`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET    /api/health                       (wiring + the 7 invariants)');
  console.log('📦 POST   /api/chat                         (buffered — ch 02 §02.2)');
  console.log('📄 POST   /api/chat/stream                  (raw text/plain — ch 05 §05.5)');
  console.log('⚡ POST   /api/chat/events                   (SSE text/event-stream — ch 05 §05.3)');
  console.log('🗂️  GET    /api/conversation/:conversationId  (dual-write proof — ch 09 §09.2)');
  console.log('📈 GET    /api/metrics                      (TTFT · ITL · TPS · frames — ch 03 §03.5)');
  console.log('🧬 POST   /api/codec/decode                 (naive vs streaming decode — ch 04 §04.4)');
  console.log('🧩 POST   /api/codec/frames                 (leftover buffer — ch 04 §04.3)');
  console.log('🔥 POST   /api/codec/torture                (fragmentation test — ch 04 §04.6)');
  console.log('=======================================================');
});

/**
 * Chapter 09 §09.7 item 21 — graceful shutdown.
 *
 * A deploy must not truncate a live conversation. Stop accepting new streams,
 * let the in-flight ones drain for a bounded grace period, then close.
 */
let shuttingDown = false;

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;

  const inFlight = activeStreams();
  console.log(`\n${signal} received — draining ${inFlight} in-flight stream(s) (grace ${config.SHUTDOWN_GRACE_MS} ms)`);

  // Stop accepting new connections; existing responses keep writing.
  server.close(() => {
    console.log('✅ HTTP server closed cleanly.');
    process.exit(0);
  });

  const deadline = Date.now() + config.SHUTDOWN_GRACE_MS;
  const drain = setInterval(() => {
    if (activeStreams() > 0 && Date.now() < deadline) return;

    clearInterval(drain);
    if (activeStreams() > 0) console.warn(`⚠️  Grace period expired with ${activeStreams()} stream(s) still open.`);
    // Keep-alive sockets would otherwise hold `close()` open forever.
    server.closeAllConnections?.();
  }, 100);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
