# 🔄 Chapter 02 — Procedural Code vs. Durable Execution

## 1. Chapter Overview

In this chapter, we analyze the fundamental difference between **procedural execution** and **durable step execution**.

We will examine [proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js), inspect how `step.run()` creates checkpoint boundaries, and test crash recovery using [demo-01-durable-pipeline.js](../src/demos/demo-01-durable-pipeline.js).

---

## 2. Procedural Code vs. Durable Execution

Let's compare how a 5-step multi-agent research pipeline executes in both paradigms:

```javascript
// ❌ TRADITIONAL PROCEDURAL APPROACH (Fragile)
async function runProceduralPipeline(eventData) {
  // Step 1: Preprocess Input
  const input = await agentService.runInputPreprocessingAgent(eventData);

  // Step 2: Deep Web Search (If server crashes here, Step 1 is lost!)
  const web = await agentService.runDeepWebSearchAgent(input.normalizedQuery);

  // Step 3: LLM Synthesis (If rate limited here, Steps 1 & 2 must re-run!)
  const synthesis = await agentService.runSynthesisLLMAgent({ web });

  // Step 4: DB Indexing
  const dbRecord = await agentService.runDatabaseIndexingAgent(synthesis);

  // Step 5: Notify User
  await agentService.runNotificationAgent(input.userId, 'Complete!');
}
```

### Why standard procedural code fails in multi-agent pipelines:
1. **No Checkpointing**: Variable state (`input`, `web`, `synthesis`) resides entirely in volatile server RAM.
2. **All-or-Nothing Retries**: A network drop at Step 4 forces a full restart, re-invoking Agent 1 and Agent 2 in [agentService.js](../src/services/agentService.js) and paying LLM API fees twice.
3. **HTTP Connection Lock-In**: The caller must maintain an active connection for the entire pipeline duration.

---

## 3. The Inngest Durable Implementation

Now let's examine how this same workflow is implemented durably in [proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js):

```javascript
const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 01: Procedural vs Durable Multi-Agent Pipeline
 * Demonstrates step memoization and resumption after system failure.
 */
const proceduralVsDurableWorkflow = inngest.createFunction(
  {
    id: 'procedural-vs-durable-workflow',
    name: '01 - Procedural vs Durable Execution Pipeline',
  },
  { event: 'ai/durable-pipeline.requested' },
  async ({ event, step }) => {
    // Step 1: Input Preprocessing (Checkpoint 1)
    const inputData = await step.run('step-1-input-processing', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Deep Web Search Agent (Checkpoint 2)
    const webResearch = await step.run('step-2-deep-web-search', async () => {
      // Optional simulation flag: Simulate system crash on initial run if requested
      if (event.data.simulateCrashOnStep2 && !event.data.isRetryAttempt) {
        console.warn('  💥 [Simulated System Crash] Server lost connection during Agent 2 execution!');
        throw new Error('Simulated transient server crash mid-execution.');
      }
      return await agentService.runDeepWebSearchAgent(inputData.normalizedQuery);
    });

    // Step 3: Synthesis LLM Agent (Checkpoint 3)
    const synthesis = await step.run('step-3-llm-synthesis', async () => {
      return await agentService.runSynthesisLLMAgent({ web: webResearch });
    });

    // Step 4: Database Indexing Agent (Checkpoint 4)
    const dbRecord = await step.run('step-4-db-indexing', async () => {
      return await agentService.runDatabaseIndexingAgent(synthesis);
    });

    // Step 5: Notification Agent (Checkpoint 5)
    await step.run('step-5-user-notification', async () => {
      return await agentService.runNotificationAgent(
        inputData.userId,
        `Research complete for query "${inputData.normalizedQuery}"!`
      );
    });

    return {
      status: 'SUCCESS',
      jobId: inputData.jobId,
      result: synthesis,
      indexedRecord: dbRecord,
    };
  }
);

module.exports = { proceduralVsDurableWorkflow };
```

---

## 4. How `step.run()` Works as a Checkpoint Boundary

Every call to `step.run(stepId, callback)` acts as an **isolated transaction checkpoint**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             step.run('step-1-input-processing')            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         Is result already in Inngest DB?
                                       │
                      ┌────────────────┴────────────────┐
                      │ YES                             │ NO
                      ▼                                 ▼
         [Return Memoized Result]             [Execute Callback Function]
         (Skip callback execution!)                     │
                                                        ▼
                                           [Serialize & Persist Result]
                                                        │
                                                        ▼
                                             [Proceed to Next Step]
```

### Execution Lifecycle of a Step:

1. **Step Evaluation**: Inngest checks if `step-1-input-processing` has already completed for this specific `runId`.
2. **Execution**: If not found in cache, the inner async callback function runs (`await agentService.runInputPreprocessingAgent(...)`).
3. **State Persist**: The JSON return value is serialized and stored in Inngest state storage.
4. **Next Step**: Execution continues to Step 2.

---

## 5. Crash Recovery & Step Memoization in Action

Let's trace what happens when `simulateCrashOnStep2: true` is set:

### Run 1: Initial Attempt (Fails at Step 2)

1. `step-1-input-processing`: Executes successfully. Result cached by Inngest.
2. `step-2-deep-web-search`: Throws `'Simulated transient server crash mid-execution.'`.
3. Inngest catches the unhandled exception, pauses the run, and schedules an automatic retry.

```text
[Attempt 1 Logs]
  🤖 [Agent 1: Input Preprocessor] Validating & normalizing query input...
  💥 [Simulated System Crash] Server lost connection during Agent 2 execution!
```

### Run 2: Automatic Retry (Resumes from Step 2)

1. `step-1-input-processing`: **SKIPPED!** Inngest injects cached `inputData` directly into memory without re-running `runInputPreprocessingAgent` in [agentService.js](../src/services/agentService.js).
2. `step-2-deep-web-search`: Executes callback function. Succeeds!
3. `step-3-llm-synthesis`: Executes successfully.
4. `step-4-db-indexing`: Executes successfully.
5. `step-5-user-notification`: Executes successfully.

```text
[Attempt 2 Logs (Retry)]
  🤖 [Agent 2: Web Search Agent] Searching web sources for: "graphrag inngest architecture"...
  🤖 [Agent 5: LLM Synthesis Agent] Combining multi-agent research outputs into final summary...
  🤖 [Agent 6: Database Indexer] Storing research report in Knowledge Base...
  🤖 [Agent 7: Notification Dispatcher] Delivering notification to user "usr_alice"
```

Notice that Agent 1 was **NEVER** re-executed during Attempt 2!

---

## 6. Financial & Technical Benefits for AI Pipelines

| Metric | Procedural Pipeline | Inngest Durable Pipeline |
| :--- | :--- | :--- |
| **Recovery Mechanism** | Complete restart from Step 1 | Resumes from exact failed step |
| **LLM Token Billing** | Pays twice for pre-failure steps | Pays once per step; completed outputs memoized |
| **Server Crash Impact** | All progress lost | Zero data loss; state persisted on Inngest Engine |
| **Developer Complexity** | Requires manual DB status tracking & state machines | Declarative: wrap async code in `step.run()` |

---

## 7. Runnable Demo Walkthrough (`demo-01-durable-pipeline.js`)

To execute and observe this workflow, run the demo script in [demo-01-durable-pipeline.js](../src/demos/demo-01-durable-pipeline.js):

```bash
npm run demo:durable
```

### Demo Script Code:

```javascript
const { inngest } = require('../inngest/client');

async function runDemo() {
  console.log('🚀 Triggering Workflow 01: Procedural vs Durable Execution Pipeline...');

  const sendResult = await inngest.send({
    name: 'ai/durable-pipeline.requested',
    data: {
      query: 'GraphRAG Inngest Architecture',
      userId: 'usr_alice',
      jobId: `job_demo1_${Date.now()}`,
      simulateCrashOnStep2: false, // Set to true to test crash recovery!
    },
  });

  console.log('✅ Event successfully emitted to Inngest engine!');
  console.log('  Event ID:', sendResult.ids[0]);
  console.log('  Check Inngest Dashboard at http://localhost:8288 to view step memoization!');
}

runDemo();
```

---

## 8. Summary & Next Steps

In this chapter, we learned:
- How `step.run()` establishes durable execution checkpoints in [proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js).
- How step memoization prevents duplicate LLM token expenses.
- How automatic retries resume workflows from the exact step where an error occurred.

Next, head to [Chapter 03 — Steps API & Memoization Mechanics](chapter-03-steps-api-and-memoization.md) to master all Inngest step primitives and internal re-hydration mechanics!
