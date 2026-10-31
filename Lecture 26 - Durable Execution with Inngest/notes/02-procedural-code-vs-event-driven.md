# 🤖 02 — Procedural Code vs Event-Driven Multi-Agent Orchestration

## Goal: Understand how multi-agent AI pipelines are orchestrated, why a large procedural workflow can become difficult to recover and operate, and how event-driven durable execution provides reliable state, retries, and failure recovery.

### 1. ⚙️ Multi-Agent Pipeline Architecture

Modern AI applications often use multiple specialized agents or workflow stages rather than a single LLM call.

```text
┌──────────────────┐
│     AGENT 1      │
│                  │
│ Input Processing │
│ & Validation     │
└────────┬─────────┘
          │
          ▼
┌──────────────────┐
│     AGENT 2      │
│                  │
│ Deep Research    │
│ Web Retrieval    │
└────────┬─────────┘
          │
          ▼
┌──────────────────┐
│     AGENT 3      │
│                  │
│ Database /       │
│ Vector / Graph   │
│ Operations       │
└────────┬─────────┘
          │
          ▼
┌──────────────────┐
│     AGENT 4      │
│                  │
│ Notification /   │
│ Delivery         │
└──────────────────┘
```

A real system could have:

```text
Agent 1 → Agent 2 → Agent 3 → Agent 4
              │
              ├── Tool Call
              ├── Web Search
              └── Retrieval
```

Some stages may also execute in parallel:

```text
                     ► Web Search
                     │
User → Planner ─────┼──► Vector Search
                     │
                     └──► Graph Search
```

### Important Terminology

Not every stage necessarily needs to be a separate autonomous "agent."

A more precise architecture might contain:

- Agents
- Tools
- Retrieval steps
- Validation steps
- Database operations
- Notification steps
- Human approval steps

So a **multi-agent workflow** is better thought of as:

> **A workflow containing multiple AI and non-AI units of work that may execute sequentially, conditionally, or in parallel.**

### 2. ❌ Procedural Multi-Agent Execution

A simple implementation might put the entire workflow inside one HTTP handler:

```javascript
app.post("/api/research", async (req, res) => {
  try {
    // Step 1
    const processedInput =
      await runAgent1InputProcessing(req.body);

    // Step 2
    const researchResults =
      await runAgent2DeepResearch(processedInput);

    // Step 3
    const dbRecord =
      await runAgent3DatabaseIndexing(researchResults);

    // Step 4
    await runAgent4SendNotification(dbRecord);

    return res.json({
      success: true,
      data: dbRecord,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});
```

This code is perfectly valid JavaScript.

The problem isn't `async/await` itself.

The problem is that:

> **The entire workflow is coupled to the lifetime and failure behavior of the request/process.**

### 3. 🧨 What Happens During a Failure?

Imagine:

```text
Agent 1 → Agent 2 → Agent 3 → Agent 4
   ✅         🔄        ⏳        ⏳
```

Agent 2 performs:

```text
Web Search
   ↓
Retrieve Documents
   ↓
LLM Analysis
   ↓
Summarization
```

Suppose the process crashes during Agent 2.

```text
t = 0s
Agent 1 completes

t = 1s
Agent 2 starts

t = 30s
Process crashes 💥
```

Possible causes include:

- Application crash
- Container restart
- Out-of-memory condition
- Infrastructure interruption
- Request timeout
- Network failure
- Deployment/restart

The important issue is that **in-memory JavaScript state disappears with the process**.

For example:

```javascript
const researchResults = await runResearch();
```

If `researchResults` only exists in process memory and the process dies, that variable is gone.

### 4. 🔥 The Real Problem: No Durable Workflow State

Without a workflow system, you might have:

```text
HTTP Request
      │
      ▼
Agent 1
      │
      ▼
Agent 2
      │
      💥
    Crash
```

After restarting:

```text
New Process
      │
      ▼
What was completed?
      │
      ▼
Application needs to know
```

If you did not persist the state yourself, the application may not know:

```text
Was Agent 1 completed?
Was Agent 2 partially completed?
Were search APIs called?
Was the database updated?
Was the notification sent?
```

This creates a **workflow state-management problem**.

### 5. 💰 Cost of Naive Retries

Suppose:

```text
Agent 1
Cost: $0.01
Time: 1 sec

Agent 2
Cost: $0.50
Time: 45 sec

Agent 3
Cost: $0.05
Time: 5 sec

Agent 4
Cost: $0.00
Time: 1 sec
```

Total:

```text
Cost ≈ $0.56
Time ≈ 52 sec
```

If Agent 3 fails and you restart the entire workflow:

```text
Agent 1 → repeat
Agent 2 → repeat 💰
Agent 3 → retry
```

You may unnecessarily spend again:

```text
Agent 1 → $0.01
Agent 2 → $0.50
```

This becomes especially expensive when Agent 2 performs:

- Multiple LLM calls
- Web searches
- Embedding generation
- Image generation
- External API requests

### 6. ⚠️ Duplicate Side Effects

Another important problem is **side effects**.

Imagine Agent 3 performs:

```text
Create Neo4j node
Insert vector
Update PostgreSQL
Send external API request
```

Suppose:

```text
Database write succeeds
        ↓
Process crashes
        ↓
Workflow retries
```

The retry might execute:

```text
Create Neo4j node again
Insert vector again
Update PostgreSQL again
```

Potential result:

```text
Original:
Document #123

Retry:
Document #123
Document #123   ← duplicate
```

Therefore:

> Durable execution and **idempotency** are closely related.

You should design side effects so that retries are safe. For example:

```javascript
await saveDocument({
  id: documentId,
  content,
});
```

And enforce uniqueness:

```text
documentId = unique
```

Instead of blindly:

```javascript
INSERT INTO documents (...)
```

You might use an operation that safely handles repeated execution.

### 7. 🛡️ Event-Driven Durable Orchestration

Instead of keeping the entire workflow inside an HTTP request:

```text
Client
  │
  ▼
API
  │
  ▼
Entire workflow
```

we separate the request from the workflow:

```text
Client
  │
  ▼
API
  │
  │ emit event
  ▼
Inngest
  │
  ▼
Durable Workflow
```

The API can respond quickly:

```http
202 Accepted
```

while the workflow continues independently.

### 8. 🧩 Inngest Multi-Agent Workflow

Conceptually:

```javascript
export const researchWorkflow = inngest.createFunction(
  {
    id: "multi-agent-research",
  },
  {
    event: "ai/research.requested",
  },
  async ({ event, step }) => {

    const input = await step.run(
      "agent-1-input-processing",
      async () => {
        return await runAgent1InputProcessing(
          event.data
        );
      }
    );

    const research = await step.run(
      "agent-2-deep-research",
      async () => {
        return await runAgent2DeepResearch(input);
      }
    );

    const record = await step.run(
      "agent-3-database-indexing",
      async () => {
        return await runAgent3DatabaseIndexing(
          research
        );
      }
    );

    await step.run(
      "agent-4-notification",
      async () => {
        return await runAgent4SendNotification(
          record
        );
      }
    );

    return {
      status: "completed",
      result: record,
    };
  }
);
```

The key difference is:

```text
Procedural:

Function
 ├── Agent 1
 ├── Agent 2
 ├── Agent 3
 └── Agent 4


Durable workflow:

Workflow
 ├── Durable Step 1
 ├── Durable Step 2
 ├── Durable Step 3
 └── Durable Step 4
```

### 9. 🔄 What Happens When Agent 2 Fails?

Suppose:

```text
Agent 1 → ✅
Agent 2 → ❌
Agent 3 → ⏳
Agent 4 → ⏳
```

The workflow can retry.

Conceptually:

```text
Retry
 │
 ├── Agent 1 → reuse completed step result
 │
 ├── Agent 2 → execute again
 │
 ├── Agent 3 → execute after Agent 2 succeeds
 │
 └── Agent 4 → execute after Agent 3 succeeds
```

The important correction:

> **Agent 2 doesn't literally resume from the exact JavaScript instruction where the process crashed.**

Instead, the workflow execution can be reconstructed around its durable step boundaries. Previously completed durable steps can have their results reused, while the failed/incomplete step is executed again.

### 10. 🧠 Step Memoization

A useful mental model is:

```javascript
step.run("research", async () => {
    return await runResearch();
});
```

Conceptually:

```text
              step.run()
                  │
                  ▼
         ┌─────────────────┐
         │ Execute research│
         └────────┬────────┘
                  │
                  ▼
            Research Result
                  │
                  ▼
         Persist step result
                  │
                  ▼
              Continue
```

On a retry:

```text
              Retry
                │
                ▼
        Is step already done?
           │            │
          YES           NO
           │             │
           ▼             ▼
        Reuse         Execute
        result         step
```

This is the core durability mechanism to understand.

### 11. 🆚 Procedural vs Durable Orchestration

| Dimension | Procedural Code | Durable Workflow |
|-----------|----------------|------------------|
| Trigger | HTTP request / function call | Event / workflow trigger |
| Execution | Request/process lifecycle | Workflow lifecycle |
| State | Developer manages it | Workflow platform persists step state |
| Failure recovery | Usually custom | Built around durable execution/retries |
| Retry | Developer implements logic | Workflow can retry steps |
| Long-running work | More difficult | Designed for it |
| Delays | Requires scheduler/timer infrastructure | Workflow primitive |
| Parallel work | Developer coordinates | Workflow orchestration |
| Observability | Application logs/APM | Workflow execution visibility + logs |
| Idempotency | Developer responsibility | Still developer responsibility |
| Side effects | Must be designed carefully | Still must be designed carefully |

### 12. 🔁 Retry Granularity

This is one of the biggest benefits.

#### Naive retry

```text
Workflow
 │
 ├── Agent 1 🔄
 ├── Agent 2 🔄
 ├── Agent 3 ❌
 └── Agent 4
```

Everything may be repeated.

#### Step-level retry

```text
Workflow
 │
 ├── Agent 1 ✅
 ├── Agent 2 ✅
 ├── Agent 3 ❌ → retry
 └── Agent 4
```

This can reduce unnecessary:

- LLM calls
- Search calls
- Embedding calls
- Database operations
- Compute
- API quota usage

### 13. 🔐 Durable Execution + Idempotency

These concepts should always be learned together.

#### Durable execution answers:

> **"What progress has already been completed?"**

#### Idempotency answers:

> **"What happens if this operation executes more than once?"**

Together:

```text
              Reliable Workflow
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
    Durable Execution     Idempotency
           │                   │
     Track progress       Safe retries
           │                   │
           └─────────┬─────────┘
                     ▼
              Failure Recovery
```

### 14. 🧪 Example: Idempotent Database Operation

Suppose an AI agent stores a research document.

**Bad design:**

```javascript
await db.insert({
  title,
  content,
});
```

A retry may create a duplicate.

**Better design:**

```javascript
await db.upsert({
  id: researchId,
  title,
  content,
});
```

Or enforce uniqueness at the database level:

```text
researchId = UNIQUE
```

Then:

```text
First execution:
research_123 → CREATE

Retry:
research_123 → UPDATE / existing
```

The exact implementation depends on your database.

### 15. 🔀 Sequential vs Parallel Agents

Not every multi-agent workflow must be sequential.

#### Sequential

```text
Agent 1
   ↓
Agent 2
   ↓
Agent 3
   ↓
Agent 4
```

Useful when each stage depends on the previous stage.

Example:

```text
Query
 ↓
Research
 ↓
Analysis
 ↓
Report
```

#### Parallel

```text
              ► Web Search
              │
Planner ─────┼──► Vector Search
              │
              └──► Graph Search
```

Then combine:

```text
Web Results
      │
Vector Results ──► Aggregator ──► LLM
      │
Graph Results
```

Parallelism can reduce latency when tasks are independent.

### 16. 🎯 Multi-Agent Workflow as a State Machine

A powerful way to think about orchestration is as a state machine:

```text
                   START
                     │
                     ▼
               INPUT_READY
                     │
                     ▼
                RESEARCHING
                     │
               ┌─────┴─────┐
               │           │
            success      failure
               │           │
               ▼           ▼
           INDEXING      RETRY
               │           │
               ▼           │
          NOTIFYING ◄───────┘
               │
               ▼
             DONE
```

This is much more powerful than thinking:

> "I have one giant function."

Instead:

> **"I have a durable state transition system."**

### 17. 📡 Event-Driven Architecture

Events decouple the producer from the workflow.

For example:

```text
API
 │
 │ publish
 ▼
ai/research.requested
 │
 ▼
Inngest
 │
 ▼
Research Workflow
```

Other systems could emit other events:

```text
user.created
document.uploaded
payment.completed
research.requested
report.generated
subscription.renewed
```

The workflow reacts to the event that matters.

### 18. 🧠 Why Events Are Powerful

Without events:

```text
API
 │
 └── directly calls everything
        │
        ├── Agent
        ├── DB
        ├── Email
        └── Search
```

This creates strong coupling.

With events:

```text
API
 │
 ▼
Event
 │
 ├── Workflow A
 ├── Workflow B
 └── Workflow C
```

Different consumers can react independently.

For example:

```text
document.uploaded
       │
       ├──► Generate Embeddings
       │
       ├──► Extract Metadata
       │
       ├──► Build Graph
       │
       └──► Notify User
```

### 19. 🏗️ Production AI Architecture

A more realistic AI architecture could look like:

```text
                        ┌─────────────┐
                        │   Client    │
                        └──────┬──────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ API Server  │
                        └──────┬──────┘
                               │
                          Emit Event
                               │
                               ▼
                      ┌────────────────┐
                      │    Inngest     │
                      │ Workflow Engine│
                      └───────┬────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
           Input Step      Research       Retrieval
                               │              │
                               ▼              ▼
                              LLM        Vector / Graph DB
                               │
                               ▼
                          Validation
                               │
                               ▼
                          Persistence
                               │
                               ▼
                          Notification
```

### 20. 💡 Inngest Is Not the Agent

This distinction is extremely important.

**Agent:**

```text
Reason
Plan
Use tools
Generate output
```

**Inngest:**

```text
Trigger
Schedule
Execute
Retry
Persist workflow progress
Coordinate steps
Handle delays
Control concurrency
```

Therefore:

```text
              AI Agent
                 │
                 │ runs inside
                 ▼
        Durable Workflow
                 │
                 ▼
              Inngest
```

Inngest is the **orchestration layer**, not the intelligence layer.

### 21. ⚠️ Inngest Does Not Automatically Solve Everything

Using Inngest doesn't automatically guarantee:

#### ❌ Exactly-once external side effects

An external API may still receive the same request more than once.

#### ❌ Correct AI reasoning

A durable workflow can reliably execute a bad prompt.

#### ❌ Database consistency across systems

You still need proper transaction/idempotency design.

#### ❌ Infinite scalability

Concurrency, provider rate limits, database capacity, and application limits still matter.

#### ❌ Perfect recovery from arbitrary code

Durability works around the workflow's supported execution model and durable boundaries.

Therefore:

```text
Inngest
   +
Good workflow design
   +
Idempotent operations
   +
Rate-limit handling
   +
Observability
   =
Production-grade AI workflow
```

### 22. 🎯 When Should You Use Durable Orchestration?

Use it when your workflow contains one or more of:

```text
Long-running operations
      +
Multiple dependent steps
      +
External APIs
      +
Retries
      +
Delays
      +
Parallel processing
      +
Background jobs
      +
AI agents
      +
File processing
```

Examples:

#### RAG ingestion

```text
Upload PDF
   ↓
Extract
   ↓
Chunk
   ↓
Embed
   ↓
Vector DB
   ↓
Graph DB
   ↓
Complete
```

#### AI research agent

```text
Question
   ↓
Planning
   ↓
Search
   ↓
Retrieve
   ↓
Analyze
   ↓
Validate
   ↓
Generate Report
```

#### Personalized storybook generation

```text
Upload Child Photo
        ↓
Validate Image
        ↓
Generate Story
        ↓
Generate Illustrations
        ↓
Validate Pages
        ↓
Compose PDF
        ↓
Upload Storage
        ↓
Notify User
```

This kind of pipeline is an excellent candidate for durable orchestration.

### 23. 🧠 Master Mental Model

Don't think:

```text
"One API request runs four agents."
```

Think:

```text
                  EVENT
                    │
                    ▼
                WORKFLOW
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     STEP 1      STEP 2      STEP 3
        │           │           │
        ▼           ▼           │
    Durable      Durable      Durable
    Result       Result       Result
        │           │           │
        └───────────┼───────────┘
                    ▼
                 STEP 4
                    │
                    ▼
                  DONE
```

If something fails:

```text
STEP 1 ✅
STEP 2 ✅
STEP 3 ❌
STEP 4 ⏳
    │
    ▼
 RETRY
    │
    ├── Step 1 → reuse
    ├── Step 2 → reuse
    ├── Step 3 → retry
    └── Step 4 → continue
```

### 24. 📝 Interview Questions

#### Q1. What is the problem with putting a multi-agent workflow inside an HTTP handler?

> The entire workflow becomes coupled to the request and process lifecycle. Long-running operations can create timeout and reliability problems, while failures require the application to explicitly manage workflow state and retries.

#### Q2. Does `async/await` make a workflow durable?

> No. `async/await` provides asynchronous programming semantics, but it does not persist workflow progress across process crashes or automatically provide durable retries.

#### Q3. What does `step.run()` provide?

> It creates a durable unit of work. Its successful result can be persisted and reused during workflow replay/retry.

#### Q4. Does Inngest resume from the exact line where the server crashed?

> No. Durable execution should not be thought of as restoring the JavaScript instruction pointer or arbitrary process memory. The workflow is reconstructed around durable execution boundaries, with completed step results reused and failed work retried.

#### Q5. What is the relationship between durability and idempotency?

> Durability allows the workflow to recover and retry, while idempotency makes repeated side effects safe. Both are necessary for reliable workflows involving external systems.

#### Q6. Is Inngest an AI agent framework?

> Not primarily. Inngest is a workflow orchestration and durable execution platform. AI agents, LLM calls, tools, retrieval systems, and databases can execute as steps within the workflow.

#### Q7. Why use events?

> Events decouple the producer of work from the system that processes it. This makes background processing, independent consumers, retries, and scalable workflows easier to implement.

#### Q8. Can multiple agents execute in parallel?

> Yes, when their work is independent. Parallel execution can reduce overall latency, but concurrency and rate limits must still be controlled.

### 25. 🚀 Final Cheat Sheet

```text
PROCEDURAL
────────────────────────────
HTTP Request
      │
      ▼
Agent 1
      │
      ▼
Agent 2
      │
      ▼
Agent 3
      │
      ▼
Agent 4
      │
      ▼
Response

Problem:
Request lifecycle = Workflow lifecycle

DURABLE EVENT-DRIVEN
────────────────────────────
HTTP Request
      │
      ▼
Emit Event
      │
      ▼
Inngest
      │
      ▼
Durable Workflow
      │
      ├── Step 1 ✅
      │
      ├── Step 2 ✅
      │
      ├── Step 3 🔄 retry
      │
      └── Step 4
```

### Remember:

```text
async/await
    ≠
durable execution

Event
    =
signal that work should happen

Workflow
    =
ordered/conditional execution of work

Step
    =
durable unit of work

Durability
    =
remember completed workflow progress

Retry
    =
attempt failed work again

Idempotency
    =
make repeated side effects safe

Inngest
    =
orchestration + durable execution layer

Agent
    =
AI reasoning/tool-using component
```

### The one sentence to remember:

> **A multi-agent system decides what work should be done; a durable workflow engine makes that work reliably execute, retry, wait, and recover across failures.**

### Common mistakes:

1. Thinking `async/await` alone makes a workflow durable
2. Assuming durable execution restores exact JavaScript process state
3. Not designing external side effects to be idempotent
4. Using `setTimeout()` instead of `step.sleep()` for business delays
5. Treating `step.run()` as just a wrapper rather than a durable boundary
6. Forgetting to configure retry/backoff policies
7. Not using `onFailure` for final error handling
8. Ignoring concurrency and throttling limits

### Key takeaways:

- Procedural code couples the entire workflow to the request/process lifecycle
- Durable workflows persist step state and can reconstruct execution after failures
- `step.run()` creates durable boundaries that survive process crashes
- `step.sleep()` provides durable delays without keeping the server waiting
- `step.waitForEvent()` pauses workflows for external signals (approvals, webhooks)
- `step.invoke()` composes workflows by calling other registered functions
- `step.sendEvent()` enables fan-out to notify other workflows
- Concurrency and throttling controls protect resources and external providers
- Retries with exponential backoff recover transient failures
- `onFailure` provides a final failure path when all retries are exhausted
- Idempotency must be designed for all external side effects
- Events decouple workflows and enable independent consumers
- Fan-out/fan-in patterns enable efficient parallel agent execution
- State machines provide a clear model for workflow progression

---
*Source: gen-ai-cohort/week07/learning/day13/notes/02-procedural-code-vs-event-driven-multi-agent-orchestration.md, plus roadmap.md Lecture 26 topics*