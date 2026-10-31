# 🛡️ 07 — Error Resilience, Retries, Dead Letter, and Observability

## Goal: Understand how Inngest handles errors, configure retries with exponential backoff and jitter, implement onFailure handlers, dead-letter flows, observability patterns, and avoid common pitfalls when things go wrong in durable workflows.

### 1. 🧱 How Inngest Handles Errors

Inngest functions execute in a **durable state** across retries. When errors occur, several things can happen depending on configuration.

```text
                          WORKFLOW EXECUTION
                                │
                                ▼
                       Workflow Step
                                │
                                ▼
                          ERROR
                                │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              Automatic Retry          Application-Defined
              Configuration           On Failure Handler
```

### 2. ⚙️ Retry Configuration

Inngest allows defining retry behavior at the step level or workflow level.

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "research-resilient",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {

    const result = await step.run(
      "fetch-research",
      async () => {
        return await fetchResearch(event.data.query);
      },
      {
        retries: {
          maxAttempts: 3,
          // exponential backoff base delays (seconds):
          // attempt 1 → attempt 2: 1s
          // attempt 2 → attempt 3: 2s
          // attempt 3 → attempt 4: 4s (if still failing)
          delay: 1,

          // Add jitter to prevent synchronized retries
          jitter: true,

          // Only retry specific error types
          shouldRetry: (error) => {
            return error.type === "transient";
          },
        },
      }
    );

    return result;
  }
);
```

#### Retry Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxAttempts` | Not set | Maximum number of attempts (including first). |
| `delay` | 0 | Base delay in seconds between attempts. Uses exponential backoff: delay * 2^(attempt-1). |
| `jitter` | false | Adds random offset to delay to prevent synchronized retries across instances. |
| `shouldRetry` | Always retry | Function that returns `true` if the error is retryable. |

#### Exponential Backoff with Jitter

```text
Attempt 1: 0s (start)
Attempt 2: 1s  (base delay)
Attempt 3: 2s  (base delay × 2^(3-2) = 1 × 2)
Attempt 4: 4s  (base delay × 2^(4-2) = 1 × 4)
With jitter: ±25% random offset
```

Example delays with `delay: 1, jitter: true`:

```text
Attempt 1 → Attempt 2: 0.75s to 1.25s
Attempt 2 → Attempt 3: 1.5s to 2.5s
Attempt 3 → Attempt 4: 3s to 5s
```

### 3. 🛑 When NOT to Retry

Not every error should be retried.

```text
                    RETRIABLE           NOT RETRIABLE
                         │                  │
                         ▼                  ▼
     Transient API failure   Permanent error
     (timeout, throttling)    (validation, not found)
                         │
                         ▼
                   ❌ Don't retry
                         │
                         ▼
                   ❌ Different recovery needed
```

### 4. 🔁 `shouldRetry` — Selective Retry Logic

```javascript
const result = await step.run(
  "call-llm",
  async () => {
    return await openai.responses.create({
      model: "gpt-4",
      input: "Analyze this document",
    });
  },
  {
    retries: {
      maxAttempts: 5,
      delay: 2,
      shouldRetry: (error) => {
        // Don't retry validation errors
        if (error.status === 400) {
          return false;
        }

        // Retry throttling errors
        if (error.status === 429) {
          return true;
        }

        // Retry network timeouts
        if (error.type === "timeout") {
          return true;
        }

        // Retry server errors
        if (error.status >= 500) {
          return true;
        }

        // Default: don't retry
        return false;
      },
    },
  }
);
```

### 5. 👤 onFailure Handler

`onFailure` is a handler that runs when a step fails after exhausting retries.

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "research-fallback",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {

    const result = await step.run(
      "fetch-research",
      async () => {
        return await fetchResearch(event.data.query);
      },
      {
        retries: {
          maxAttempts: 3,
          delay: 1,
        },
        onFailure: async (context) => {
          // context contains information about the failure

          await step.run(
            "activate-fallback",
            async () => {
              return await useFallbackProvider();
            }
          );

          await step.sendEvent("research/fallback-used", {
            name: "research/fallback-used",
            data: {
              jobId: event.data.jobId,
              usedFallback: true,
            },
          });
        },
      }
    );

    return result;
  }
);
```

#### onFailure Context

```text
When onFailure fires:
  • retries exhausted
  • workflow execution pauses
  • onFailure code executes
  • subsequent steps (if any) depend on workflow design
```

#### Typical onFailure Use Cases

```text
1. Activate fallback provider
2. Log error to monitoring system
3. Notify on-call engineers
4. Save error state to database
5. Send alert
6. Mark workflow as failed
7. Run cleanup code
```

### 6. 💀 Dead Letter Flows

Dead Letter Queues (DLQ) are a pattern for handling workflows that exhaust retry limits or encounter unrecoverable errors.

#### DLQ Concept

```text
                                    WORKFLOW
                                            │
                                            ▼
                                         Step
                                            │
                                            ▼
                                         ERROR
                                            │
        ┌─────────────────┴─────────────────┐
        ▼                                     ▼
Workflow Continues                    Dead Letter Flow
        │                                     │
        └─────────────┬─────────────────────┘
                      │
                      ▼
              Manual Review / Recovery
```

#### Common DLQ Use Cases

```text
1. Manual inspection of failed jobs
2. Retry after manual fix
3. Data migration to correct problematic records
4. Long-term error tracking
5. Pattern analysis of failures
6. Escalation to support team
7. Compensation actions
```

#### Inngest DLQ Implementation

Inngest doesn't have a native DLQ concept at the framework level, but you can implement one:

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "research-dead-letter",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {

    const result = await step.run(
      "fetch-research",
      async () => {
        return await fetchResearch(event.data.query);
      },
      {
        retries: {
          maxAttempts: 5,
          delay: 1,
        },
        onFailure: async (context) => {
          // Send to dead-letter workflow
          await step.sendEvent("research/dead-letter", {
            name: "research/dead-letter",
            data: {
              jobId: event.data.jobId,
              error: context.error,
              attempts: context.attempts,
            },
          });
        },
      }
    );

    return result;
  }
);
```

The `research/dead-letter` event could then trigger a monitoring workflow, or a human review process.

### 7. 📊 Observability Patterns

Monitoring durable workflows requires tracking several dimensions.

#### What to Monitor

```text
Workflow Metrics:
  └─ Success rate
  └─ Average latency
  └─ Retry count per step
  └─ Failed step count
  └─ Workflow duration distribution

Step Metrics:
  └─ Individual step success rate
  └─ Step-specific retry patterns
  └─ Step duration distribution

Error Metrics:
  └─ Error type distribution
  └─ ShouldRetry success/failure
  └─ onFailure invocations
  └─ Dead letter counts
```

#### Instrumentation Example

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "research-observability",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {

    // Track step latency
    const latencyMs = Date.now();

    const result = await step.run(
      "fetch-research",
      async () => {
        return await fetchResearch(event.data.query);
      },
      {
        // Each attempt can be instrumented
      }
    );

    // Record metrics
    await step.sendEvent("workflow/metrics", {
      name: "workflow/metrics",
      data: {
        jobId: event.data.jobId,
        workflowId: event.data.workflowId,
        step: "fetch-research",
        latencyMs: Date.now() - latencyMs,
        success: true,
      },
    });

    return result;
  }
);
```

#### Common Observability Integrations

```text
1. Application Performance Monitoring
   • New Relic
   • Datadog
   • Sentry

2. Custom metrics
   • Prometheus counters
   • Grafana dashboards
   • OpenTelemetry

3. Log aggregation
   • ELK stack
   • Loki
   • Splunk

4. Alerting
   • PagerDuty
   • Opsgenie
   • Slack webhooks
```

### 8. 🪲 Common Mistakes in Error Handling

#### ❌ Mistake 1 — Retrying Non-Retriable Errors

```javascript
// ❌ Always retry, even validation errors
await step.run("validate", async () => {
  validateInput(event.data);  // May throw 400
}, {
  retries: {
    maxAttempts: 5,
    delay: 1,
  }
});
```

Fix: Use `shouldRetry`:

```javascript
// ✅ Only retry transient errors
await step.run("validate", async () => {
  validateInput(event.data);
}, {
  retries: {
    maxAttempts: 3,
    shouldRetry: (error) => error.status !== 400,
  }
});
```

#### ❌ Mistake 2 — Assuming onFailure Has Access to Original Input

```javascript
// ❌ Assuming onFailure receives original event
await step.run("step", async () => {
  // do work
}, {
  onFailure: async () => {
    // ❌ Don't rely on event.data being available directly
    // Use context if provided
  }
});
```

Fix: Check the context/model provided by Inngest for failure details.

#### ❌ Mistake 3 — Ignoring Jitter in Distributed Systems

```javascript
// ❌ Identical retry schedules across all instances
await step.run("api-call", async () => {
  return await provider.call();
}, {
  retries: {
    maxAttempts: 5,
    delay: 1,  // All instances start at same time
  }
});
```

Fix: Enable jitter:

```javascript
// ✅ Randomized delays prevent thundering herd
await step.run("api-call", async () => {
  return await provider.call();
}, {
  retries: {
    maxAttempts: 5,
    delay: 1,
    jitter: true,
  }
});
```

#### ❌ Mistake 4 — Not Setting maxAttempts

```javascript
// ❌ Infinite retry, can consume resources
await step.run("api-call", async () => {
  return await provider.call();
}, {
  retries: {
    delay: 1,  // Will retry forever
  }
});
```

Fix: Always set maxAttempts:

```javascript
// ✅ Controlled retry limits
await step.run("api-call", async () => {
  return await provider.call();
}, {
  retries: {
    maxAttempts: 5,
    delay: 1,
  }
});
```

#### ❌ Mistake 5 — Blocking Workflow on Transient Errors

```javascript
// ❌ Crashing workflow on transient failures
try {
  await step.run("api-call", async () => {
    return await provider.call();
  });
} catch (error) {
  throw error;  // Immediately fail workflow
}
```

Fix: Let Inngest manage retries:

```javascript
// ✅ Let Inngest handle retry/replay
await step.run("api-call", async () => {
  return await provider.call();
});
```

#### ❌ Mistake 6 — Assuming Failure Means Entire Step Re-executes

```javascript
// ❌ Assuming failed step starts from line 1
await step.run("complex-step", async () => {
  await stepA();  // succeeds
  await stepB();  // fails halfway through
  await stepC();  // never runs
  return "done";
}, {
  retries: { maxAttempts: 3 }
});
```

Fix: Think of retry as re-executing the entire step:

```text
Retry:
   Step → executes again from top
```

If stepA has side effects, design to tolerate re-execution.

#### ❌ Mistake 7 — Not Accounting for State Corruption

```javascript
// ❌ Assuming state is always consistent after retry
await step.run("write-state", async () => {
  db.users.update(userId, { status: "processing" });
  // ... more state changes
}, {
  retries: { maxAttempts: 3 }
});
```

Fix: Use idempotent operations:

```javascript
// ✅ Upsert with idempotency
await step.run("write-state", async () => {
  db.users.upsert({
    where: { id: userId },
    update: { status: "processing" },
    create: { id: userId, status: "processing" },
  });
});
```

### 9. 🧠 Interview Questions

#### Q1. What happens when a step exceeds maxAttempts?

> After maxAttempts are exhausted, the step's onFailure handler executes if defined. Without onFailure, the workflow may fail or continue depending on subsequent step design.

#### Q2. What is the purpose of jitter in retry configuration?

> Jitter adds randomness to retry delays to prevent synchronized retry storms across multiple workflow instances hitting the same failure point simultaneously.

#### Q3. What does `shouldRetry` control?

> `shouldRetry` is a predicate function that determines whether a particular error should trigger another retry attempt, allowing selective retrying of transient vs. permanent errors.

#### Q4. What is `onFailure` useful for?

> `onFailure` runs after all configured retries are exhausted, making it useful for fallback activation, error logging, monitoring, and manual escalation patterns.

#### Q5. Does Inngest guarantee exactly-once execution?

> No. Durable execution reduces repeated work across retries, but external side effects must be designed idempotently to tolerate retries.

#### Q6. What is a Dead Letter Flow?

> A Dead Letter Flow is a mechanism to capture and redirect failed workflows for manual review, recovery, or pattern analysis after retry exhaustion.

#### Q7. How should you design external operations to tolerate retries?

> Design operations to be idempotent using unique keys, database upserts, provider-level idempotency tokens, or transactional design patterns.

#### Q8. What metrics should you monitor for workflow error resilience?

> Success/failure rates, retry counts per step, error type distribution, onFailure invocation rates, dead letter counts, workflow latency distribution.

### 10. 🧾 Cheat Sheet

```javascript
// Retry configuration
await step.run("api-call", async () => {
  return await provider.call();
}, {
  retries: {
    maxAttempts: 5,
    delay: 1,
    jitter: true,
    shouldRetry: (error) => error.status >= 500,
  }
});

// onFailure handler
await step.run("step", async () => {
  return await doWork();
}, {
  retries: { maxAttempts: 3 },
  onFailure: async (context) => {
    await activateFallback();
    await notifyTeam();
  }
});

// shouldRetry predicate
await step.run("step", async () => {
  return await callProvider();
}, {
  retries: {
    shouldRetry: (error) => {
      if (error.status === 400) return false;
      if (error.status === 429) return true;
      if (error.type === "timeout") return true;
      return error.status >= 500;
    },
  }
});

// Dead letter event
await step.sendEvent("dead-letter", {
  name: "workflow/dead-letter",
  data: { jobId, error, attempts: context.attempts }
});
```

### Common mistakes:

1. Retrying non-retriable errors (validation, not-found)
2. Assuming onFailure has access to original event data
3. Not enabling jitter, causing synchronized retry storms
4. Not setting maxAttempts, enabling infinite retries
5. Blocking workflow on transient errors instead of letting Inngest retry
6. Not designing external operations to be idempotent
7. Assuming failed step state is consistent across retries

### Key takeaways:

- Inngest provides `retries` configuration with `maxAttempts`, `delay`, `jitter`, and `shouldRetry`
- Exponential backoff: delay × 2^(attempt-1), with optional jitter
- `shouldRetry` predicate controls which errors trigger retries
- `onFailure` handler executes after retries are exhausted
- Design external side effects to be idempotent (tolerate retries)
- Dead letter flows enable manual review and recovery after exhaustion
- Monitor error metrics: success rates, retry counts, error types
- Failure re-executes the entire step from the beginning
- Error handling requires coordination between Inngest primitives and application design

---
*Source: gen-ai-cohort/week07/learning/day13/notes/07-advanced-multi-agent-workflows-concurrency-and-error-resilience.md, plus roadmap.md Lecture 26 topics*