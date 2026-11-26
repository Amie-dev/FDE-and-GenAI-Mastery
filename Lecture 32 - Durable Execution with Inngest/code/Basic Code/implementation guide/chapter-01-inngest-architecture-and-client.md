# ⚡ Chapter 01 — Inngest Engine Architecture & SDK Setup

## 1. Chapter Overview

In this chapter, we explore the core communication architecture of Inngest and how it integrates into an Express.js web application hosted in [src/server.js](../src/server.js).

Understanding this architecture is critical for building production AI applications. Inngest does **not** require running a heavy background worker process (like Redis/BullMQ or Celery). Instead, it uses an **HTTP-based Webhook Architecture** where the Inngest Engine invokes standard HTTP endpoints exposed by your application.

---

## 2. Event-Driven Webhook Architecture

Let's examine how events flow between your client application, the Inngest Engine, and your server:

```text
                               ┌───────────────────────────┐
                               │       Inngest Engine      │
                               │  (State & Queue Manager)  │
                               └─────────────▲─────────────┘
                                             │
                       1. Send Event         │ 3. HTTP POST Webhook Call
                     inngest.send(...)       │    /api/inngest
                                             │
┌───────────────────────────┐                │               ┌───────────────────────────┐
│     Express Client App    ├────────────────┴───────────────►     Express Web Server    │
│  (e.g., Demo Script or    │                                │  (hosts serve() handler)  │
│     API Endpoint)         │                                └─────────────┬─────────────┘
└─────────────────────────┬─┘                                              │
                          │                                                │ 4. Executes
                          │ 2. HTTP 202 Accepted                           ▼    Step Code
                          └─────────────────────────────────────── [Inngest Function]
```

### Execution Steps Breakdown:

1. **Event Emission**: The client application triggers an asynchronous workflow by publishing a strongly-typed JSON event (`inngest.send({ name: 'ai/durable-pipeline.requested', data: { ... } })`).
2. **Immediate Acknowledgment**: The Inngest Engine accepts the event and immediately returns `202 Accepted` with a unique `eventId` to the caller. The caller is never blocked waiting for the background job to finish.
3. **HTTP Webhook Dispatch**: Inngest evaluates which registered workflow functions are listening for that event name. It dispatches an HTTP POST request to your application's `/api/inngest` webhook endpoint hosted in [src/server.js](../src/server.js) containing the step execution context.
4. **Step Execution & Response**: The Express server executes the step logic inside your function and returns the step output back to Inngest via HTTP response.

---

## 3. Inngest Client Initialization

The singleton Inngest client instance is created in [src/inngest/client.js](../src/inngest/client.js):

```javascript
const { Inngest } = require('inngest');
require('dotenv').config();

const APP_ID = process.env.INNGEST_APP_ID || 'ai-multiagent-platform';

/**
 * Singleton Inngest Client Instance
 */
const inngest = new Inngest({
  id: APP_ID,
  eventKey: process.env.INNGEST_EVENT_KEY,
});

module.exports = {
  inngest,
  APP_ID,
};
```

### Key Configuration Parameters:

- **`id` (`APP_ID`)**: A unique string identifier representing your application namespace across Inngest services (e.g., `'ai-multiagent-platform'`). All workflow functions declared under this client instance inherit this application identity.
- **`eventKey`**: A cryptographic security key configured in [.env](../.env) used to authorize event ingestion. In local development (`INNGEST_DEV=1`), a mock key (`dev-event-key`) is used automatically.

---

## 4. Webhook Middleware Registration in Express

In [src/server.js](../src/server.js#L18-L34), we mount the Inngest middleware into our Express application:

```javascript
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
```

### Registered Inngest Workflow Functions:
- 🔄 [proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js) — Workflow 01: Procedural vs Durable Pipeline.
- 🔀 [parallelMultiAgentWorkflow.js](../src/inngest/functions/parallelMultiAgentWorkflow.js) — Workflow 02: Parallel Multi-Agent Execution.
- ⏸️ [humanInTheLoopWorkflow.js](../src/inngest/functions/humanInTheLoopWorkflow.js) — Workflow 03: Human-in-the-Loop Approval.
- 🚦 [concurrencyRateLimitedWorkflow.js](../src/inngest/functions/concurrencyRateLimitedWorkflow.js) — Workflow 04: Per-Tenant Concurrency & Rate Limiting.
- 🛡️ [resilientFailureHandlingWorkflow.js](../src/inngest/functions/resilientFailureHandlingWorkflow.js) — Workflow 05: Error Recovery & Fallbacks.

### How `serve()` Works Under the Hood:

The `serve()` helper creates an HTTP handler that supports two key capabilities:

1. **Introspection (`GET /api/inngest`)**: When Inngest connects to your app, it issues a `GET` request to inspect registered functions, their event schemas, concurrency rules, and configuration metadata.
2. **Function Invocation (`POST /api/inngest`)**: When an event fires, Inngest sends a `POST` request containing payload signatures, run IDs, step states, and execution instructions.

---

## 5. REST API Trigger Endpoints

The Express web server in [src/server.js](../src/server.js#L36-L82) exposes REST endpoints to emit events into the Inngest system:

```javascript
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
```

### Key Architectural Benefit: Non-Blocking REST API

Notice how `/api/trigger-research` responds with HTTP `202 Accepted` in milliseconds, returning `sendResult.ids`. The API client does not wait for the multi-agent research pipeline (which takes several seconds) to complete. The pipeline runs durably in the background!

---

## 6. Development vs. Production Security

| Feature | Local Development (`INNGEST_DEV=1`) | Production Deployment |
| :--- | :--- | :--- |
| **Engine Target** | Local CLI (`localhost:8288`) | Cloud Platform (`api.inngest.com`) |
| **Signing Key Verification** | Disabled / Mock Keys | Enforced HMAC Signatures via `INNGEST_SIGNING_KEY` in [.env](../.env) |
| **Connection Method** | Automatic Polling / Localhost | Webhook URL registered in Dashboard |
| **SSL Requirements** | Plain HTTP (`http://localhost:3000`) | Enforced HTTPS (`https://your-domain.com`) |

In production, Inngest signs every HTTP request sent to `/api/inngest` using your project's `INNGEST_SIGNING_KEY`. The `serve()` middleware verifies this signature automatically, ensuring unauthorized third parties cannot trigger your workflow endpoints.

---

## 7. Summary & Next Steps

In this chapter, we covered:
- Inngest's HTTP-based Webhook Architecture.
- Initializing the singleton Inngest client in [src/inngest/client.js](../src/inngest/client.js).
- Mounting the `serve()` middleware in [src/server.js](../src/server.js).
- Dispatching asynchronous events using `inngest.send()`.

Next, move to [Chapter 02 — Procedural Code vs. Durable Execution](chapter-02-procedural-vs-durable-execution.md) to see step memoization and crash recovery in action!
