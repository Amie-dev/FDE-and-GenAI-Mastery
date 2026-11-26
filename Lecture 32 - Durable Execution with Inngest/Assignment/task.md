# 📋 Assignment — Durable Execution with Inngest

## Task Statement

Build a durable multi-agent AI workflow that survives crashes, timeouts, and retries. The system must:

1. **Fan-out to 3 independent agents** (web search, arXiv academic search, GitHub code search)
2. **Fan-in to a synthesiser** that combines results into a final report
3. **Include a `waitForEvent` human approval gate** before publishing
4. **Include a retry-on-failure step** with exponential backoff and jitter
5. **Implement concurrency limits** to protect provider quotas

All work must be built using Inngest's durable execution SDK on top of Express + TypeScript.

## Prerequisites

Read all 8 chapter notes in `notes/` and review the `code/Basic Code` reference implementation before starting.

## Deliverables

### Required Checklist

- [ ] **Inngest client initialized** with app ID and event key (`src/inngest/client.ts`)
- [ ] **Express server** serving Inngest functions at `/api/inngest` (`src/server.ts`)
- [ ] **Durable pipeline workflow** — sequential multi-agent with state checkpointing (`durablePipeline.ts`)
- [ ] **Parallel fan-out/fan-in workflow** — 3 agents running concurrently with aggregation (`parallelAgents.ts`)
- [ ] **Human-in-the-loop workflow** — `step.waitForEvent()` for manual approval before publish (`humanInTheLoop.ts`)
- [ ] **Concurrency-limited workflow** — worker pool limits per concurrent function execution (`concurrencyLimits.ts`)
- [ ] **Resilient failure-handling workflow** — retries with `maxAttempts`, `delay`, `jitter`, `shouldRetry`, `onFailure` (`resilientFailure.ts`)
- [ ] **REST endpoint** to trigger research workflows with `jobId`, `query`, `userId` (`routes/index.ts`)
- [ ] **REST endpoint** to send human approval event for a specific `jobId` (`routes/index.ts`)
- [ ] **Rate limiting middleware** protecting trigger endpoints per IP (`middleware/rateLimit.ts`)
- [ ] **Environment configuration** via Zod-validated `.env` with secrets never hardcoded (`config/config.ts`)

### Stretch Goals (3)

- [ ] **Dead letter flow** — after retry exhaustion, emit `ai/research.dead-letter` event for manual review
- [ ] **Cron scheduled workflow** — daily at 9 AM with `cron: "0 9 * * *"` that triggers batch research
- [ ] **Step ID stability test** — change a step ID and demonstrate replay breakage (then revert)

## Acceptance Criteria

To pass, you must be able to demonstrate:

1. **Crash resilience**: Kill the process mid-workflow and show it resumes exactly where it stopped, without re-executing completed steps.
2. **Parallel speed**: Fan-out to 3 agents completes in approximately the time of the slowest branch, not the sum.
3. **Human approval gate**: Workflow pauses at `waitForEvent`, remains idle (zero CPU/RAM), and resumes when the `ai/research.approved` event arrives.
4. **Retry behavior**: A step configured with `maxAttempts: 3, delay: 1, jitter: true` retries with exponentially increasing delays on transient failures.
5. **Concurrency enforcement**: With `concurrency: { limit: 3 }`, submitting 5 concurrent jobs processes no more than 3 at a time.
6. **Idempotent side effects**: External API calls within `step.run()` are designed to tolerate repeated execution (idempotency keys or upserts).
7. **No hardcoded secrets**: All API keys and event keys come from validated environment variables.

## Stretch Goals Details

### 1. Dead Letter Flow

After `maxAttempts` retries are exhausted, emit an `ai/research.dead-letter` event containing `jobId`, `error`, `attempts`, and `timestamp`. A separate monitoring workflow can subscribe to this event to alert on-call engineers or write to a dead-letter dashboard.

### 2. Cron Scheduled Workflow

Create a workflow triggered by `cron: "0 9 * * *"` (daily at 9 AM UTC). It should trigger a batch research job on trending AI topics and publish results via `step.sendEvent()` to notification workflows.

### 3. Step ID Stability Test

Intentionally change a step ID (e.g., from `"web-search"` to `"web-search-v2"`), run the workflow, force a failure after the first step, and observe that completed step results are NOT reused because the step ID no longer matches. Then revert the ID change and confirm replay works correctly.

## What "Passes" Means

You can answer **all** of these without notes:

- **Q1**: What is the difference between a queue (RabbitMQ/BullMQ) and a workflow engine (Inngest)?
- **Q2**: What does `step.run()` provide that a regular async function doesn't?
- **Q3**: Why should `step.sleep()` be used instead of `setTimeout()` for durable delays?
- **Q4**: What happens if one branch fails in `Promise.all()` inside `step.run()`?
- **Q5**: What is the difference between concurrency, throttling, and rate limiting?
- **Q6**: Why are step IDs required to be stable across deployments?
- **Q7**: What does `shouldRetry` control, and why is `jitter` important?
- **Q8**: Can you kill the process mid-workflow and show it resumes exactly where it stopped?