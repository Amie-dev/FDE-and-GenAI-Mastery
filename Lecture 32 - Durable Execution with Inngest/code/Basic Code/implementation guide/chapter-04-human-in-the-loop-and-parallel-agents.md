# 🔀 Chapter 04 — Parallel Agent Execution & Human-in-the-Loop Signals

## 1. Chapter Overview

In this chapter, we explore two advanced orchestration patterns essential for production multi-agent systems:

1. **Parallel Multi-Agent Execution (Fan-Out / Fan-In)**: Executing multiple specialized AI research agents concurrently using `Promise.all` and aggregating their outputs into a single synthesis step.
2. **Human-in-the-Loop Approval Signals**: Durably pausing a workflow for hours or days using `step.waitForEvent()` until an external human approval signal is published via REST API.

---

## 2. Parallel Multi-Agent Execution (Fan-Out / Fan-In)

When conducting deep research, running research agents sequentially is inefficient. For example, if Web Search takes 3s, ArXiv Search takes 3s, and GitHub Search takes 3s:
- **Sequential Execution**: $3s + 3s + 3s = 9s$ total latency.
- **Parallel Fan-Out Execution**: $\max(3s, 3s, 3s) = 3s$ total latency!

Let's inspect how [parallelMultiAgentWorkflow.js](../src/inngest/functions/parallelMultiAgentWorkflow.js) implements this pattern:

```text
                               ┌────────────────────────────────┐
                               │  Preprocess Query (Step 1)     │
                               └───────────────┬────────────────┘
                                               │
                                 Fan-Out (Promise.all)
                       ┌───────────────────────┼───────────────────────┐
                       ▼                       ▼                       ▼
            ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
            │   Web Search Agent │  │ ArXiv Academic Ag. │  │ GitHub Code Agent  │
            │  step.run('web')   │  │ step.run('arxiv')  │  │ step.run('code')   │
            └──────────┬─────────┘  └──────────┬─────────┘  └──────────┬─────────┘
                       │                       │                       │
                       └───────────────────────┼───────────────────────┘
                                               │
                                   Fan-In Aggregation (Step 3)
                                               ▼
                               ┌────────────────────────────────┐
                               │   LLM Synthesis Agent Step     │
                               └────────────────────────────────┘
```

### Source Code Analysis ([parallelMultiAgentWorkflow.js](../src/inngest/functions/parallelMultiAgentWorkflow.js)):

```javascript
const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 02: Parallel Multi-Agent Execution (Fan-Out / Fan-In)
 * Demonstrates parallel step execution using Promise.all followed by synthesis aggregation.
 */
const parallelMultiAgentWorkflow = inngest.createFunction(
  {
    id: 'parallel-multi-agent-workflow',
    name: '02 - Parallel Multi-Agent Execution Pipeline',
  },
  { event: 'ai/parallel-research.requested' },
  async ({ event, step }) => {
    // Step 1: Preprocess Input Query
    const input = await step.run('preprocess-input-query', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Parallel Multi-Agent Fan-Out (Web, ArXiv Academic, GitHub Code)
    const [webResults, academicResults, codeResults] = await Promise.all([
      step.run('agent-web-search', async () => {
        return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
      }),

      step.run('agent-arxiv-academic-search', async () => {
        return await agentService.runArxivAcademicAgent(input.normalizedQuery);
      }),

      step.run('agent-github-code-search', async () => {
        return await agentService.runGithubCodeAgent(input.normalizedQuery);
      }),
    ]);

    // Step 3: Fan-In Aggregation & Synthesis LLM Agent
    const finalReport = await step.run('synthesize-multi-agent-report', async () => {
      return await agentService.runSynthesisLLMAgent({
        web: webResults,
        academic: academicResults,
        code: codeResults,
      });
    });

    // Step 4: Index into Knowledge Graph Database
    const dbRecord = await step.run('index-to-knowledge-graph', async () => {
      return await agentService.runDatabaseIndexingAgent(finalReport);
    });

    return {
      status: 'SUCCESS',
      jobId: input.jobId,
      report: finalReport,
      dbRecord,
    };
  }
);

module.exports = { parallelMultiAgentWorkflow };
```

### How Inngest Handles `Promise.all`:
Each `step.run()` inside `Promise.all` registers a separate execution step with Inngest. Inngest dispatches all three steps concurrently, gathers their outputs as each completes, and resolves `Promise.all` when all three parallel steps have returned.

---

## 3. Human-in-the-Loop Approval Signals

Many enterprise AI applications require human authorization before publishing content, executing financial trades, or modifying production databases.

In traditional architectures, maintaining state across a 24-hour approval window requires setting up complex polling databases or external queue state machines. In Inngest, this is accomplished in **a single line of code** using `step.waitForEvent()`.

Let's examine [humanInTheLoopWorkflow.js](../src/inngest/functions/humanInTheLoopWorkflow.js):

```javascript
const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 03: Human-in-the-Loop Approval Workflow
 * Demonstrates durable workflow pausing using step.waitForEvent.
 */
const humanInTheLoopWorkflow = inngest.createFunction(
  {
    id: 'human-in-the-loop-workflow',
    name: '03 - Human-in-the-Loop Approval Pipeline',
  },
  { event: 'ai/human-approval.requested' },
  async ({ event, step }) => {
    // Step 1: Initial Research Draft
    const input = await step.run('preprocess-approval-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    const draftReport = await step.run('generate-draft-report', async () => {
      const web = await agentService.runDeepWebSearchAgent(input.normalizedQuery);
      return await agentService.runSynthesisLLMAgent({ web });
    });

    // Step 2: Notify Manager that Approval is Needed
    await step.run('notify-manager-for-approval', async () => {
      return await agentService.runNotificationAgent(
        'mgr_admin',
        `Approval required for job ${input.jobId}: "${draftReport.summaryTitle}"`
      );
    });

    // Step 3: Durable Pause — Wait up to 24 hours for matching signal event "ai/research.approved"
    console.log(`  ⏸️ [Human-in-the-Loop] Pausing workflow ${input.jobId}. Waiting for "ai/research.approved" event...`);

    const approvalSignal = await step.waitForEvent('wait-for-human-approval', {
      event: 'ai/research.approved',
      timeout: '24h',
      match: 'async.data.jobId', // Correlate payload jobId
    });

    // Handle Timeout Scenario
    if (!approvalSignal) {
      console.warn(`  ⌛ [Human-in-the-Loop Timeout] Job ${input.jobId} timed out after waiting for approval.`);
      
      await step.run('handle-approval-timeout', async () => {
        return await agentService.runNotificationAgent(
          input.userId,
          `Job ${input.jobId} cancelled due to approval timeout.`
        );
      });

      return { status: 'CANCELLED', reason: 'APPROVAL_TIMEOUT' };
    }

    // Approval Received Scenario
    console.log(`  ✅ [Human Approval Received] Approved by: ${approvalSignal.data.approvedBy}`);

    // Step 4: Publish & Index Final Report
    const publishedRecord = await step.run('publish-approved-report', async () => {
      return await agentService.runDatabaseIndexingAgent(draftReport);
    });

    await step.run('notify-user-success', async () => {
      return await agentService.runNotificationAgent(
        input.userId,
        `Your research report for "${input.normalizedQuery}" was approved and published!`
      );
    });

    return {
      status: 'PUBLISHED',
      jobId: input.jobId,
      approvedBy: approvalSignal.data.approvedBy,
      publishedRecord,
    };
  }
);

module.exports = { humanInTheLoopWorkflow };
```

---

## 4. Signal Correlation with `match: 'async.data.jobId'`

When multiple jobs are waiting for approval concurrently, how does Inngest route an incoming approval event to the correct workflow instance?

The parameter `match: 'async.data.jobId'` tells Inngest:
> "Only unpause this workflow run if the incoming `'ai/research.approved'` event has a `data.jobId` property that exactly matches this workflow instance's `event.data.jobId`!"

### Triggering Approval via REST Endpoint:

In [server.js](../src/server.js#L61-L82), an administrator approves a job by calling `/api/approve-job`:

```javascript
app.post('/api/approve-job', async (req, res) => {
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
});
```

---

## 5. Runnable Demos Walkthrough

### Running Demo 02 (Parallel Fan-Out):

```bash
npm run demo:parallel
```

Executes [demo-02-parallel-agents.js](../src/demos/demo-02-parallel-agents.js) and triggers concurrent research across Web, ArXiv, and GitHub.

### Running Demo 03 (Human-in-the-Loop Approval Flow):

```bash
npm run demo:human
```

Executes [demo-03-human-in-the-loop.js](../src/demos/demo-03-human-in-the-loop.js):
1. Emits `'ai/human-approval.requested'` to start the pipeline.
2. The workflow generates a draft and durably pauses.
3. The demo automatically waits 2 seconds, then sends a POST request to `/api/approve-job`.
4. Inngest receives the approval event, matches `jobId`, unpauses the workflow, and publishes the report!

---

## 6. Summary & Next Steps

In this chapter, we learned:
- Concurrent agent Fan-Out / Fan-In using `Promise.all` and `step.run`.
- Durable pausing using `step.waitForEvent()`.
- Event signal correlation using `match`.
- Handling timeout conditions gracefully.

Next, proceed to [Chapter 05 — Concurrency Control, Rate Limiting & Failure Resilience](chapter-05-concurrency-and-error-resilience.md)!
