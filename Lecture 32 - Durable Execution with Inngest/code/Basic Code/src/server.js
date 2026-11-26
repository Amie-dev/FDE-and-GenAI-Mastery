const express = require('express');
const { serve } = require('inngest/express');
const { inngest } = require('./inngest/client');

// Import Inngest Background Functions
const { proceduralVsDurableWorkflow } = require('./inngest/functions/proceduralVsDurableWorkflow');
const { parallelMultiAgentWorkflow } = require('./inngest/functions/parallelMultiAgentWorkflow');
const { humanInTheLoopWorkflow } = require('./inngest/functions/humanInTheLoopWorkflow');
const { concurrencyRateLimitedWorkflow } = require('./inngest/functions/concurrencyRateLimitedWorkflow');
const { resilientFailureHandlingWorkflow } = require('./inngest/functions/resilientFailureHandlingWorkflow');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Register Inngest Functions List
const functions = [
  proceduralVsDurableWorkflow,
  parallelMultiAgentWorkflow,
  humanInTheLoopWorkflow,
  concurrencyRateLimitedWorkflow,
  resilientFailureHandlingWorkflow,
];

// Serve Inngest Functions via Webhook Middleware at /api/inngest
app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions,
  })
);

// REST Endpoint: Trigger Multi-Agent Pipeline
app.post('/api/trigger-research', async (req, res) => {
  try {
    const { query, userId, parallel } = req.body;
    const eventName = parallel ? 'ai/parallel-research.requested' : 'ai/durable-pipeline.requested';

    const sendResult = await inngest.send({
      name: eventName,
      data: {
        query: query || 'GraphRAG Inngest Architecture',
        userId: userId || 'usr_alice',
        jobId: `job_${Date.now()}`,
      },
    });

    return res.status(202).json({
      success: true,
      message: 'Event emitted to Inngest engine.',
      eventIds: sendResult.ids,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// REST Endpoint: Emit Human Approval Signal Event
app.post('/api/approve-job', async (req, res) => {
  try {
    const { jobId, approvedBy } = req.body;

    const sendResult = await inngest.send({
      name: 'ai/research.approved',
      data: {
        jobId,
        approvedBy: approvedBy || 'Manager Alice',
        approvedAt: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Approval event sent for jobId: ${jobId}`,
      eventIds: sendResult.ids,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Day 13 Inngest Workflows Server',
    inngestEndpoint: '/api/inngest',
    registeredFunctionsCount: functions.length,
  });
});

function startServer() {
  return app.listen(PORT, () => {
    console.log(`\n🚀 [Express Server] Listening on http://localhost:${PORT}`);
    console.log(`🔌 [Inngest Webhook] Registered endpoint at http://localhost:${PORT}/api/inngest`);
    console.log(`📊 Total Registered Functions: ${functions.length}\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, functions };
