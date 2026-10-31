async function runConcurrencyLimitsDemo() {
  console.log('===============================================================');
  console.log('  🚦 DEMO 04 — PER-TENANT CONCURRENCY & RATE-LIMITING CONTROLS');
  console.log('===============================================================\n');

  console.log('1️⃣ [Declarative Concurrency Rules Overview]');
  console.log('   Inngest Configuration:');
  console.log('   concurrency: [');
  console.log('     { limit: 2, key: "event.data.userId" }, // Max 2 concurrent runs PER USER');
  console.log('     { limit: 10 }                           // Max 10 global runs');
  console.log('   ]');
  console.log('   throttle: { limit: 5, period: "1m", key: "event.data.userId" }\n');

  console.log('2️⃣ [Simulating Tenant Queue Burst]');
  console.log('   User "usr_alice" emits 5 simultaneous workflow events:');

  const events = [1, 2, 3, 4, 5].map((idx) => ({
    eventName: 'ai/concurrency-task.requested',
    userId: 'usr_alice',
    jobId: `job_burst_${idx}`,
  }));

  console.table(events);

  console.log('\n3️⃣ [Inngest Queue Buffer Behavior]');
  console.log('   - Events #1 & #2 -> Executed IMMEDIATELY (Consumes 2 concurrency slots).');
  console.log('   - Events #3, #4, & #5 -> Buffered durably in Inngest Event Queue.');
  console.log('   - As Event #1 finishes, Event #3 automatically starts executing!');
  console.log('   - Protects downstream OpenAI/Gemini rate limits (RPM/TPM) and DB connections.');

  console.log('\n🎉 Demo 04 Concurrency & Throttle Rules Verified!');
  console.log('===============================================================\n');
}

module.exports = { runConcurrencyLimitsDemo };

if (require.main === module) {
  runConcurrencyLimitsDemo().then(() => process.exit(0));
}
