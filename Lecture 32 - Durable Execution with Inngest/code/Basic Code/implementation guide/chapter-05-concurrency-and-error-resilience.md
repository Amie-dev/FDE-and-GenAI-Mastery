# 🛡️ Chapter 05 — Concurrency Control, Rate Limiting & Failure Resilience

## 1. Chapter Overview

In this final chapter, we cover two enterprise governance requirements for multi-tenant AI systems:

1. **Declarative Concurrency Control & Throttling**: Protecting downstream LLM APIs (e.g., OpenAI, Anthropic) from rate-limit exhaustion by enforcing tenant-level concurrency limits and burst caps.
2. **Resilient Error Recovery & Failure Callbacks**: Configuring automatic retries with exponential backoff, and using the `onFailure` fallback hook to handle permanent failure scenarios (database updates, notification alerts).

---

## 2. Declarative Concurrency & Throttling Rules

In multi-tenant SaaS applications, a single user issuing hundreds of concurrent research tasks can starve other users or trigger global HTTP 429 rate limit errors from LLM providers.

Inngest handles concurrency natively at the engine level without requiring custom Redis queues or semaphore locks.

Let's examine [concurrencyRateLimitedWorkflow.js](../src/inngest/functions/concurrencyRateLimitedWorkflow.js):

```javascript
const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 04: Per-Tenant Concurrency & Rate-Limited Workflow
 * Demonstrates declarative concurrency control and throttling rules.
 */
const concurrencyRateLimitedWorkflow = inngest.createFunction(
  {
    id: 'concurrency-rate-limited-workflow',
    name: '04 - Concurrency & Rate-Limited Multi-Agent Pipeline',
    // Declarative Concurrency Control Rules
    concurrency: [
      {
        // Rule 1: Max 2 concurrent execution slots per individual user/tenant
        limit: 2,
        key: 'event.data.userId',
      },
      {
        // Rule 2: Global system cap across all tenants combined
        limit: 10,
      },
    ],
    // Declarative Throttle: Max 5 runs per 1 minute per tenant
    throttle: {
      limit: 5,
      period: '1m',
      key: 'event.data.userId',
    },
  },
  { event: 'ai/concurrency-task.requested' },
  async ({ event, step }) => {
    const input = await step.run('preprocess-concurrency-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    console.log(`  🚦 [Concurrency Managed] Executing job ${input.jobId} for tenant "${input.userId}"...`);

    const research = await step.run('run-heavy-agent', async () => {
      return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
    });

    // Simulate heavy multi-agent processing step
    await step.sleep('simulate-heavy-workload', '2s');

    const synthesis = await step.run('synthesize-concurrency-result', async () => {
      return await agentService.runSynthesisLLMAgent({ web: research });
    });

    return {
      status: 'COMPLETED',
      jobId: input.jobId,
      userId: input.userId,
      synthesis,
    };
  }
);

module.exports = { concurrencyRateLimitedWorkflow };
```

### Explanation of Configuration Parameters:

1. **Per-Tenant Concurrency (`concurrency: [{ limit: 2, key: 'event.data.userId' }]`)**:
   - Limits user `'usr_alice'` to at most **2 active workflow executions** at any point in time.
   - If user `'usr_alice'` submits a 3rd job, Inngest automatically queues the 3rd job in state storage until one of the active 2 jobs completes.
2. **Global System Cap (`limit: 10`)**:
   - Ensures the overall platform never exceeds **10 total active runs** across all users combined.
3. **Throttling (`throttle: { limit: 5, period: '1m', key: 'event.data.userId' }`)**:
   - Enforces a rate limit of at most 5 workflow invocations per 1-minute window per tenant.

---

## 3. Resilient Error Handling & Fallback Callbacks

When external APIs fail (e.g., HTTP 503 Service Unavailable or network timeouts), Inngest automatically retries failed steps using an **exponential backoff algorithm**.

However, if all retries fail, what happens? Instead of letting the error crash silently, Inngest provides the **`onFailure` Hook**.

Let's examine [resilientFailureHandlingWorkflow.js](../src/inngest/functions/resilientFailureHandlingWorkflow.js):

```javascript
const { inngest } = require('../client');
const agentService = require('../../services/agentService');

/**
 * Workflow 05: Resilient Error Handling & Failure Callback Workflow
 * Demonstrates retries, exponential backoff, and the onFailure fallback hook.
 */
const resilientFailureHandlingWorkflow = inngest.createFunction(
  {
    id: 'resilient-failure-handling-workflow',
    name: '05 - Resilient Error Handling & Fallback Pipeline',
    // Retry configuration: Retry up to 3 times before declaring permanent failure
    retries: 3,
    // Failure Handler Hook: Executed durably when all 3 retries fail!
    onFailure: async ({ event, step, error }) => {
      console.error(`  🚨 [onFailure Triggered] Job ${event.data.jobId || 'unknown'} exhausted all retries!`);
      console.error(`     Reason: ${error.message}`);

      await step.run('mark-job-failed-in-db', async () => {
        console.log('     💾 Marking job as FAILED in persistent database record...');
        return {
          jobId: event.data.jobId,
          status: 'FAILED',
          failedAt: new Date().toISOString(),
          errorMessage: error.message,
        };
      });

      await step.run('send-admin-alert', async () => {
        return await agentService.runNotificationAgent(
          'admin_alerts',
          `ALERT: Pipeline ${event.data.jobId} permanently failed. Error: ${error.message}`
        );
      });
    },
  },
  { event: 'ai/resilient-task.requested' },
  async ({ event, step }) => {
    const input = await step.run('preprocess-resilient-input', async () => {
      return await agentService.runInputPreprocessingAgent(event.data);
    });

    // Step 2: Unstable API Step Simulation
    const research = await step.run('unstable-external-api-step', async () => {
      if (event.data.shouldFailPermanently) {
        console.warn('  ⚠️ [Simulated External Error] External LLM Provider threw HTTP 503 Service Unavailable!');
        throw new Error('HTTP 503: Model provider rate limit exceeded (Unrecoverable).');
      }

      return await agentService.runDeepWebSearchAgent(input.normalizedQuery);
    });

    const synthesis = await step.run('synthesize-resilient-results', async () => {
      return await agentService.runSynthesisLLMAgent({ web: research });
    });

    return {
      status: 'SUCCESS',
      jobId: input.jobId,
      synthesis,
    };
  }
);

module.exports = { resilientFailureHandlingWorkflow };
```

---

## 4. Execution Lifecycle of the `onFailure` Hook

When `shouldFailPermanently: true` is passed:

```text
Attempt 1 (Fails) ──► Retries: 2 Left (Wait 1s Backoff)
Attempt 2 (Fails) ──► Retries: 1 Left (Wait 4s Backoff)
Attempt 3 (Fails) ──► Retries: 0 Left (Wait 16s Backoff)
Attempt 4 (Fails) ──► EXHAUSTED RETRIES!
                           │
                           ▼
                  [Inngest Triggers onFailure Hook]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  step.run('mark-job-failed')  step.run('send-admin-alert')
```

### Key Architectural Benefits of `onFailure`:
1. **Durable Execution Context**: The `onFailure` hook is itself an Inngest function handler! You can use `step.run()` inside `onFailure` to write cleanup records or notify admins durably.
2. **Full Error Details**: Provides access to `error.message`, `error.stack`, and the original triggering `event`.

---

## 5. Runnable Demos Walkthrough

### Running Demo 04 (Concurrency & Rate Limits):

```bash
npm run demo:concurrency
```

Executes [demo-04-concurrency-limits.js](../src/demos/demo-04-concurrency-limits.js), emitting 5 concurrent jobs for user `'usr_alice'`.
Observation: Inngest executes 2 jobs concurrently and queues the remaining 3 jobs in the dashboard until active slots open up!

### Running Demo 05 (Failure Recovery & Callbacks):

```bash
npm run demo:failure
```

Executes [demo-05-failure-recovery.js](../src/demos/demo-05-failure-recovery.js):
1. Runs a success scenario to demonstrate smooth execution.
2. Emits a second event with `shouldFailPermanently: true` to trigger automatic retries and the `onFailure` fallback handler!

---

## 6. Summary & Conclusion

Congratulations! You have completed the **Day 13 Implementation Guide**.

Throughout this guide, we covered:
- 🏗️ **Architecture & Setup**: Webhook architecture, Express middleware integration, and event ingestion.
- 🔄 **Procedural vs. Durable Execution**: Step memoization and crash recovery.
- 🧠 **Steps API**: Re-hydration loop, `step.run()`, `step.sleep()`, and non-deterministic rules.
- 🔀 **Advanced Orchestration**: Fan-Out / Fan-In parallel execution and `step.waitForEvent()` human approval signals.
- 🛡️ **Governance & Resilience**: Declarative concurrency, tenant rate limiting, exponential backoff retries, and the `onFailure` callback hook.

You now possess the foundational patterns for building production-grade, durable multi-agent AI systems with Node.js and Inngest!
