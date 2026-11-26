# 🛠️ 04 — Inngest Durable Execution SDK & Steps API

## Goal: Master the Inngest Node.js/TypeScript SDK, understand client initialization and HTTP serving, and learn the major `step` primitives: `step.run()`, `step.sleep()`, `step.waitForEvent()`, `step.invoke()`, and `step.sendEvent()`.

### 1. 📦 Inngest SDK Setup & Architecture

Inngest provides a **durable execution and workflow orchestration layer** for application code.

Instead of manually building infrastructure for retries, delayed execution, event handling, workflow state, and multi-step coordination, you define your workflow in code and expose it through an Inngest endpoint.

#### Install

```bash
npm install inngest
```

### A. Initializing the Inngest Client

The Inngest client identifies your application and is used to define and send events.

```javascript
// src/inngest/client.ts

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ai-agent-platform",
});
```

Think of the client as the application's **connection point to Inngest**.

```text
Your Application
      │
      ▼
 Inngest Client
      │
      ├── Define functions
      ├── Send events
      └── Connect workflow logic
```

### TypeScript

For a TypeScript project, you can also define event schemas/types so that event payloads are checked during development.

Important:

> TypeScript types are compile-time guarantees. If events can come from untrusted/external sources, runtime validation may still be appropriate.

### 2. 🌐 Serving Inngest Functions

Your application exposes an HTTP endpoint that Inngest can communicate with.

A common convention is:

```text
/api/inngest
```

This endpoint acts as the bridge between your application and the Inngest service.

### A. Next.js App Router

Example:

```javascript
// src/app/api/inngest/route.ts

import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";

import { researchWorkflow } from "@/inngest/functions/researchWorkflow";
import { indexKnowledgeGraph } from "@/inngest/functions/indexKnowledgeGraph";

export const { GET, POST, PUT } = serve({
  client: inngest,

  functions: [
    researchWorkflow,
    indexKnowledgeGraph,
  ],
});
```

Conceptually:

```text
                    Inngest
                       │
                       │ HTTP
                       ▼
              /api/inngest
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
     researchWorkflow   indexKnowledgeGraph
```

The endpoint allows Inngest to discover and invoke the functions registered with `serve()`.

### A. Express.js Integration

With an Express application:

```javascript
// src/inngest/server.ts

import express from "express";
import { serve } from "inngest/express";

import { inngest } from "./client";
import { researchWorkflow } from "./functions";

const app = express();

app.use(express.json());

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [researchWorkflow],
  })
);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

Architecture:

```text
Client / Application
        │
        │ Event
        ▼
    Inngest
        │
        │ HTTP invocation
        ▼
 Express /api/inngest
        │
        ▼
Inngest Function
```

### Important mental model

Your Node.js application does **not necessarily need a dedicated worker process** for every Inngest function.

Inngest orchestrates the workflow and communicates with your application through the serving endpoint. Your actual function code executes in the runtime where you deploy it.

### 3. ⚡ The Core `step` API

Inside an Inngest function, the `step` object provides durable workflow primitives.

```text
                          Inngest Step API
                                │
      ┌───────────────┬─────────┼──────────┬───────────────┐
      ▼               ▼         ▼          ▼               ▼
   step.run()     step.sleep() waitForEvent()   step.invoke() step.sendEvent()
      │               │         │              │               │
      ▼               ▼         ▼              ▼               ▼
   Durable       Delayed   External       Child          Call another
   computation   resume    signal         workflow       function       Dispatch
              waiting                Event                 event
```

A useful way to remember them:

| API | Mental model |
|-----|--------------|
| `step.run()` | **Do this work durably** |
| `step.sleep()` | **Wake me later** |
| `step.waitForEvent()` | **Wait for an external signal** |
| `step.invoke()` | **Run another workflow/function and wait for it** |
| `step.sendEvent()` | **Tell other workflows that something happened** |

### 4. 🧩 `step.run()` — Durable Work

`step.run()` is the fundamental building block for durable execution.

```javascript
const result = await step.run(
  "fetch-user-preferences",
  async () => {
    const user = await db.users.findUnique({
      where: {
        id: event.data.userId,
      },
    });

    return {
      preferences: user.preferences,
      tier: user.tier,
    };
  }
);
```

The important idea is:

```text
Workflow
   │
   ├── Step 1 → completed → persisted
   │
   ├── Step 2 → failed
   │
   └── retry
         │
         ├── Step 1 → previous result reused
         │
         └── Step 2 → executed again
```

This prevents already-completed durable work from unnecessarily running again.

### 5. ⚠️ Important `step.run()` Rules

#### Rule 1 — Await the step

Normally:

```javascript
const result = await step.run("my-step", async () => {
  return await doSomething();
});
```

Do not treat the returned promise like an ordinary background task.

```javascript
// ❌ Don't intentionally fire-and-forget a durable step
step.run("my-step", async () => {
  await doSomething();
});
```

The workflow needs to await the step result when subsequent logic depends on it.

### 6. 🎲 Determinism & Code Outside Steps

This is one of the most important concepts in Inngest.

An Inngest function may be **replayed/re-executed** while Inngest reconstructs workflow progress.

Therefore, code outside durable steps should generally be deterministic and safe to execute again.

For example:

```javascript
const randomValue = Math.random();

console.log(randomValue);
```

If the workflow is replayed, this code can execute again and produce a different value.

Instead:

```javascript
const randomValue = await step.run(
  "generate-random-value",
  async () => {
    return Math.random();
  }
);
```

Now the generated value belongs to a durable step.

### General rule

```text
Outside step.run()
        │
        └── Workflow orchestration / deterministic logic

Inside step.run()
        │
        └── Work whose result should become durable
```

This is particularly important for:

- API calls
- Database operations
- LLM calls
- Random values
- Timestamps
- External side effects
- Expensive computations

### 7. 🧠 Important Nuance: `Date.now()` and External Calls

A common oversimplification is:

> "Every `fetch()` must be inside `step.run()`."

The better rule is:

> **External I/O, nondeterministic operations, and side effects that need durable results should generally be placed inside durable steps.**

For example:

```javascript
const response = await step.run(
  "call-llm",
  async () => {
    return await openai.responses.create({
      model: "your-model",
      input: "Analyze this document",
    });
  }
);
```

Similarly:

```javascript
const timestamp = await step.run(
  "generate-timestamp",
  async () => {
    return Date.now();
  }
);
```

This makes the result part of the durable workflow state.

### 8. 📦 Step Return Values

Step results need to be representable in the durable execution system.

A safe pattern is to return plain serializable data:

```javascript
const result = await step.run("process-document", async () => {
  return {
    documentId: "doc_123",
    status: "completed",
    chunks: 25,
  };
});
```

Avoid relying on complex runtime objects such as:

```javascript
// ❌ Avoid returning things like:
return databaseConnection;
return socket;
return requestObject;
```

Instead, return the data required by later steps:

```javascript
return {
  userId,
  documentId,
  status,
};
```

### 9. 😴 `step.sleep()` — Durable Delays

`step.sleep()` allows a workflow to pause until a future point in time.

```javascript
await step.sleep("wait-for-cooldown", "30s");
```

Examples:

```javascript
await step.sleep("wait-2-hours", "2h");

await step.sleep("wait-3-days", "3d");
```

This is fundamentally different from:

```javascript
// ❌ Don't keep a server request alive for hours
await new Promise(resolve => {
  setTimeout(resolve, 2 * 60 * 60 * 1000);
});
```

With durable sleep, the workflow can record that it needs to continue later rather than keeping your application execution actively waiting.

### 10. 🔄 How Durable Sleep Works Conceptually

```text
Workflow starts
      │
      ▼
step.run(...)
      │
      ▼
step.sleep("wait", "24h")
      │
      ▼
Workflow records durable waiting state
      │
      ▼
Execution is no longer actively running
      │
      │
      │  24 hours
      │
      ▼
Workflow becomes runnable again
      │
      ▼
Continue after sleep
```

### Example

```javascript
export const trialWorkflow = inngest.createFunction(
  {
    id: "trial-expiration",
  },
  {
    event: "user/trial.started",
  },
  async ({ event, step }) => {
    await step.sleep("wait-for-trial-expiry", "30d");

    await step.run("send-expiration-email", async () => {
      await sendEmail({
        userId: event.data.userId,
        message: "Your trial has expired.",
      });
    });
  }
);
```

This pattern is extremely useful for:

- Trial expiration
- Scheduled reminders
- Follow-up emails
- Delayed notifications
- Retry delays
- AI approval windows
- Subscription workflows

### 11. ⏳ `step.waitForEvent()` — Wait for External Signals

`step.waitForEvent()` allows a workflow to pause until another event arrives.

This is useful for:

- Human approval
- Email verification
- Payment confirmation
- Webhook callbacks
- User responses
- AI agent approval
- Long-running external processes

Example:

```javascript
const approvalEvent = await step.waitForEvent(
  "wait-for-human-approval",
  {
    event: "ai/research.approved",
    timeout: "24h",
    match: "async.data.jobId",
  }
);
```

Conceptually:

```text
AI Research
    │
    ▼
Generate Report
    │
    ▼
Wait for Approval
    │
    ├───────────────┐
    │               │
    ▼               ▼
Approval event    Timeout
    │               │
    ▼               ▼
Publish          Handle timeout
```

### 12. 👨‍💼 Human-in-the-Loop AI Example

```javascript
const approval = await step.waitForEvent(
  "wait-for-human-approval",
  {
    event: "ai/research.approved",
    timeout: "24h",
    match: "async.data.jobId",
  }
);

if (!approval) {
  await step.run("handle-approval-timeout", async () => {
    await notifyUser(
      "Research job timed out waiting for approval."
    );
  });

  return;
}

const approvedBy = approval.data.approvedBy;

await step.run("publish-research", async () => {
  await publishResearch({
    approvedBy,
  });
});
```

The important architectural idea is:

> **The workflow doesn't need to continuously poll for approval.**

It can wait for an event.

### 13. 🔗 `step.invoke()` — Calling Another Inngest Function

`step.invoke()` is useful when one durable workflow needs another registered Inngest function to perform work and return a result.

Conceptually:

```text
Parent Workflow
      │
      ├── Step 1
      │
      ▼
 step.invoke()
      │
      ▼
Child Inngest Function
      │
      ├── Child Step 1
      ├── Child Step 2
      └── Child Step 3
      │
      ▼
Child result
      │
      ▼
Parent continues
```

Example:

```javascript
const indexingResult = await step.invoke(
  "trigger-vector-indexing",
  {
    function: indexKnowledgeGraph,

    data: {
      documentId: "doc_102",
      content: researchSummary,
    },
  }
);
```

### When to use `step.invoke()`

Use it when you want:

> **"Run this other Inngest function as part of my workflow and give me its result."**

This is different from simply emitting an event.

### 14. 📣 `step.sendEvent()` — Dispatch Events

`step.sendEvent()` sends one or more events to Inngest.

Those events can trigger other functions.

Example:

```javascript
await step.sendEvent(
  "notify-downstream-systems",
  [
    {
      name: "analytics/job.completed",

      data: {
        jobId: event.data.jobId,
        tokensUsed: 4500,
      },
    },

    {
      name: "user/notification.send",

      data: {
        userId: event.data.userId,
        message: "Research complete!",
      },
    },
  ]
);
```

Conceptually:

```text
                   Research Workflow
                          │
                     step.sendEvent()
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
  analytics/job.completed    user/notification.send
              │                       │
              ▼                       ▼
      Analytics Function      Notification Function
```

This is a classic **fan-out** pattern.

### 15. 🔀 `step.invoke()` vs `step.sendEvent()`

This distinction is extremely important.

| | `step.invoke()` | `step.sendEvent()` |
|---|-----------------|--------------------|
| Purpose | Call another function | Emit event(s) |
| Wait for result | ✅ Yes | ❌ No workflow result |
| Child function | Specific registered function | Any function listening to event |
| Coupling | More direct | More event-driven |
| Return value | ✅ Yes | Usually no business result |
| Good for | Sub-workflows | Notifications/fan-out |
| Mental model | **Call this workflow** | **Tell the system this happened** |

### Easy memory trick

```text
step.invoke()
    =
"Do this other workflow and give me the result."

step.sendEvent()
    =
"Something happened. Let interested workflows react."
```

### 16. 🧠 Step Memoization & Re-Hydration

This is one of the most important concepts for understanding Inngest.

Consider:

```javascript
export const demoFunction = inngest.createFunction(
  {
    id: "demo-memoization",
  },
  {
    event: "test/run",
  },
  async ({ event, step }) => {

    console.log("Workflow orchestration code");

    const step1Data = await step.run(
      "step-1",
      async () => {
        console.log("Executing step 1");

        return {
          value: 42,
        };
      }
    );

    const step2Data = await step.run(
      "step-2",
      async () => {
        console.log("Executing step 2");

        throw new Error("Transient API error");
      }
    );

    return step2Data;
  }
);
```

Suppose:

```text
Step 1 → SUCCESS
Step 2 → ERROR
```

The workflow is retried.

Conceptually:

```text
Initial execution:

Workflow
   │
   ├── Step 1 → SUCCESS → durable result
   │
   └── Step 2 → ERROR
                    │
                    ▼
                  Retry


Retry:

Workflow
   │
   ├── Step 1 → previous result reused
   │
   └── Step 2 → execute again
```

Therefore:

```text
Completed durable steps
        ↓
reused/replayed from durable state

Failed step
        ↓
retried according to workflow configuration
```

### 17. ⚠️ Failed Step ≠ Resume Exact Line

A very important correction:

Inngest does **not** magically restore the exact JavaScript process and continue from the CPU instruction where it crashed.

Instead, think in terms of:

```text
Durable workflow state
        +
Completed step results
        +
Replay
```

If a step fails halfway through:

```javascript
await step.run("call-payment-provider", async () => {
  await chargeCustomer();
  await sendReceipt();
});
```

and the process fails after `chargeCustomer()` but before `sendReceipt()`, the step itself may be retried.

That means external side effects must be designed carefully.

### 18. 💳 Idempotency Is Still Important

Durable execution does **not** automatically mean:

> Every external side effect happens exactly once.

For example:

```javascript
await step.run("charge-customer", async () => {
  return await paymentProvider.charge(...);
});
```

Imagine the payment provider successfully charges the customer, but the network connection fails before the workflow receives the response.

The workflow may retry the step.

Without an idempotency strategy, you could potentially charge twice.

Therefore:

```text
Durable execution
   ≠
Exactly-once side effects
```

Use mechanisms such as:

- Idempotency keys
- Database unique constraints
- Upserts
- Provider-level idempotency
- Transactional design

Example:

```javascript
await step.run("create-order", async () => {
  return await db.order.upsert({
    where: {
      idempotencyKey,
    },

    update: {},

    create: {
      idempotencyKey,
      userId,
      status: "created",
    },
  });
});
```

### 19. 🔄 What Does "Re-Hydration" Mean?

Think of an Inngest workflow as a process that can be reconstructed from durable information.

```text
Original execution
       │
       ▼
Step 1 completed
       │
       ▼
Step 2 completed
       │
       ▼
Step 3 failed
       │
       ▼
Retry / replay
       │
       ├── Step 1 result available
       ├── Step 2 result available
       └── Step 3 needs execution
```

This is why workflow code should be written with durable boundaries in mind.

### 20. 🏗️ Complete AI Workflow Example

Imagine an AI research system:

```text
User submits research request
            │
            ▼
       Agent 1
   Validate input
            │
            ▼
       Agent 2
   Web / deep research
            │
            ▼
       Agent 3
   Generate final report
            │
            ▼
   Human approval required
            │
            ▼
       waitForEvent()
            │
        ┌─────┴─────┐
        ▼           ▼
   Approved     Timeout
   │           │
   ▼           ▼
 Publish       Notify user
   │
   ▼
 step.sendEvent()
   │
 ┌────┴─────────────┐
 ▼                  ▼
Analytics       Notification
```

Possible implementation:

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "research-workflow",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {

    const validatedInput = await step.run(
      "validate-input",
      async () => {
        return validateResearchRequest(event.data);
      }
    );

    const research = await step.run(
      "deep-research",
      async () => {
        return await runResearchAgent(validatedInput);
      }
    );

    const report = await step.run(
      "generate-report",
      async () => {
        return await generateReport(research);
      }
    );

    const approval = await step.waitForEvent(
      "wait-for-approval",
      {
        event: "research/approved",
        timeout: "24h",
        match: "async.data.jobId",
      }
    );

    if (!approval) {
      await step.run("approval-timeout", async () => {
        await notifyUser(
          event.data.userId,
          "Your research report timed out waiting for approval."
        );
      });

      return;
    }

    await step.run("publish-report", async () => {
      await publishReport(report);
    });

    await step.sendEvent(
      "notify-downstream",
      [
        {
          name: "research/completed",
          data: {
            jobId: event.data.jobId,
            userId: event.data.userId,
          },
        },
      ]
    );
  }
);
```

### 21. 🧩 How the Pieces Fit Together

A useful mental model is:

```text
                     INNGEST WORKFLOW
                            │
                            ▼
                     ┌────────────┐
                     │ step.run() │
                     └─────┬──────┘
                           │
                           ▼
                     Durable Work
                           │
                           ▼
                     ┌─────────────┐
                     │ step.sleep()│
                     └──────┬──────┘
                            │
                            ▼
                       Wait / Delay
                            │
                            ▼
                 ┌───────────────────┐
                 │ waitForEvent()    │
                 └─────────┬─────────┘
                           │
                           ▼
                     External Signal
                            │
                      ┌──────┴──────┐
                      ▼             ▼
               step.invoke()   step.sendEvent()
                      │             │
                      ▼             ▼
               Child Workflow   Fan-out Event
```

### 22. 🧠 The Most Important Mental Model

Don't think of Inngest as simply:

> "A queue that runs my functions."

Think:

> **Inngest is a durable execution/orchestration system where normal application code is divided into durable workflow steps.**

The major primitives answer different workflow questions:

```text
What should execute?
        ↓
    step.run()

When should it continue?
        ↓
    step.sleep()

What external signal should unblock it?
        ↓
    step.waitForEvent()

What other workflow should I call and await?
        ↓
    step.invoke()

What event should I broadcast to other workflows?
        ↓
    step.sendEvent()
```

### 23. ⚖️ Quick Comparison

| Requirement | Primitive |
|-------------|-----------|
| Call database/API/LLM | `step.run()` |
| Make expensive computation durable | `step.run()` |
| Wait 30 seconds | `step.sleep()` |
| Wait 30 days | `step.sleep()` |
| Wait for human approval | `step.waitForEvent()` |
| Wait for webhook/event | `step.waitForEvent()` |
| Call another Inngest function and get result | `step.invoke()` |
| Notify independent systems | `step.sendEvent()` |
| Fan-out to multiple workflows | `step.sendEvent()` |
| Preserve completed work across retries | Durable steps |

### 24. 🚨 Common Mistakes

#### ❌ Mistake 1 — Treating `step.run()` as just a wrapper

It creates a durable boundary, not merely an organizational function wrapper.

#### ❌ Mistake 2 — Assuming retries resume inside a failed step

They don't necessarily resume halfway through that step.

Think:

```text
Previous completed steps → reused
Failed step → retried
```

#### ❌ Mistake 3 — Assuming durable execution means exactly-once side effects

It doesn't.

Design external operations to tolerate retries.

#### ❌ Mistake 4 — Putting nondeterministic workflow logic everywhere

Avoid relying on:

```javascript
Math.random()
Date.now()
new Date()
```

outside appropriate durable boundaries when their values affect workflow behavior.

#### ❌ Mistake 5 — Using long `setTimeout()` for durable delays

Don't build:

```javascript
setTimeout(..., 24 * 60 * 60 * 1000);
```

for durable business workflows.

Use:

```javascript
await step.sleep("wait", "24h");
```

#### ❌ Mistake 6 — Using `step.invoke()` when you only need notification

If you don't need a result and simply want other workflows to react:

```javascript
await step.sendEvent(...);
```

may be the better abstraction.

### 25. 🎯 Interview Questions

#### Q1. What is `step.run()`?

> `step.run()` creates a durable step whose result can be persisted and reused during workflow replay/retry.

#### Q2. Why use `step.sleep()` instead of `setTimeout()`?

> `step.sleep()` represents a durable workflow delay without requiring the application execution to remain actively waiting.

#### Q3. What is `waitForEvent()` useful for?

> It allows a workflow to pause until a matching external event arrives, making it useful for human approvals, webhooks, verification, and asynchronous signals.

#### Q4. Difference between `step.invoke()` and `step.sendEvent()`?

> `step.invoke()` calls another Inngest function and waits for its result.

> `step.sendEvent()` emits events so other event-triggered functions can react independently.

#### Q5. Does Inngest guarantee exactly-once execution?

> You should not assume exactly-once execution for arbitrary external side effects. Durable execution and retries require idempotent side-effect design.

#### Q6. What happens when Step 3 fails after Steps 1 and 2 succeeded?

> On retry/replay, the completed durable steps can have their previous results reused, while the failed step is executed again.

### 26. 🧾 Cheat Sheet

```text
npm install inngest
```

### Client

```javascript
const inngest = new Inngest({
  id: "my-app",
});
```

### Durable work

```javascript
await step.run("my-step", async () => {
  return await doWork();
});
```

### Durable delay

```javascript
await step.sleep("wait", "1h");
```

### Wait for event

```javascript
await step.waitForEvent("approval", {
  event: "approval/received",
  timeout: "24h",
});
```

### Invoke another function

```javascript
await step.invoke("child-workflow", {
  function: childFunction,
  data: {},
});
```

### Send event

```javascript
await step.sendEvent("notify", {
  name: "task/completed",
  data: {},
});
```

### The one-line summary:

> **`step.run()` makes work durable, `step.sleep()` makes waiting durable, `step.waitForEvent()` makes external signals durable, `step.invoke()` composes workflows, and `step.sendEvent()` connects independent workflows.**

### And the most important reliability principle is:

> **Durable workflow execution reduces repeated work across retries, but external side effects still need idempotency and careful design.**

### Common mistakes:

1. Treating `step.run()` as just a wrapper rather than a durable boundary
2. Not awaiting `step.run()` results when subsequent logic depends on them
3. Putting nondeterministic values (`Math.random()`, `Date.now()`) outside durable steps
4. Using `setTimeout()` for durable delays instead of `step.sleep()`
5. Assuming durable execution provides exactly-once side effects
6. Using `step.invoke()` when `step.sendEvent()` would suffice for notifications
7. Not returning plain serializable data from steps

### Key takeaways:

- Inngest SDK provides a code-first approach to defining durable workflows
- The `step` API provides primitives for durable work, delays, waiting, composition, and events
- `step.run()` persists step results across retries
- `step.sleep()` provides durable delays without keeping server processes alive
- `step.waitForEvent()` pauses workflows for external signals like human approvals
- `step.invoke()` calls other Inngest functions and waits for results
- `step.sendEvent()` broadcasts events to fan-out to other workflows
- Durable execution is not exactly-once side effects; idempotency must be designed separately
- Workflow code outside steps must be deterministic and replay-safe
- Stable step IDs are critical for durable replay behavior

---
*Source: gen-ai-cohort/week07/learning/day13/notes/04-inngest-durable-execution-sdk-and-steps-api.md, plus roadmap.md Lecture 26 topics*