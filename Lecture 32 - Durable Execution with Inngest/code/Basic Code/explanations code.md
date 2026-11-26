# 📖 Detailed Code Explanations — Week 07 Day 13

This document provides a line-by-line walkthrough of the entire Day 13 codebase, explaining each module, service, Inngest workflow function, and architecture design decision.

---

## 📑 Table of Contents

1. [Inngest Client Setup (`src/inngest/client.js`)](#1-inngest-client-setup)
2. [Express Web Server (`src/server.js`)](#2-express-web-server)
3. [Multi-Agent Execution Service (`src/services/agentService.js`)](#3-multi-agent-execution-service)
4. [Procedural vs Durable Execution (`proceduralVsDurableWorkflow.js`)](#4-procedural-vs-durable-execution)
5. [Parallel Multi-Agent Execution (`parallelMultiAgentWorkflow.js`)](#5-parallel-multi-agent-execution)
6. [Human-in-the-Loop Approval Workflow (`humanInTheLoopWorkflow.js`)](#6-human-in-the-loop-approval-workflow)
7. [Concurrency & Rate Limiting (`concurrencyRateLimitedWorkflow.js`)](#7-concurrency--rate-limiting)
8. [Resilient Error Recovery & Failure Handler (`resilientFailureHandlingWorkflow.js`)](#8-resilient-error-recovery--failure-handler)

---

## 1. Inngest Client Setup

Located at: [`src/inngest/client.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/client.js)

### Key Concepts:
- **`new Inngest({ id: APP_ID })`**: Instantiates a single client object representing the app identity across Inngest services.

---

## 2. Express Web Server

Located at: [`src/server.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/server.js)

### Key Concepts:
- **`serve({ client, functions })`**: Mounts an Express middleware at `/api/inngest` that responds to HTTP webhook invocations from Inngest engine.
- **`inngest.send({ name, data })`**: REST route handler emitting events to trigger background workflows.

---

## 3. Multi-Agent Execution Service

Located at: [`src/services/agentService.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/services/agentService.js)

Encapsulates specialized AI agents (Preprocessor, Deep Web Search, ArXiv Academic, GitHub Code, LLM Synthesis, Database Indexer, Notification Dispatcher).

---

## 4. Procedural vs Durable Execution

Located at: [`src/inngest/functions/proceduralVsDurableWorkflow.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/functions/proceduralVsDurableWorkflow.js)

- Wraps each agent call in `step.run()`.
- Demonstrates state memoization: if step 2 fails, retrying resumes at step 2 without re-executing step 1.

---

## 5. Parallel Multi-Agent Execution

Located at: [`src/inngest/functions/parallelMultiAgentWorkflow.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/functions/parallelMultiAgentWorkflow.js)

- **Fan-Out**: Uses `Promise.all([step.run('web'), step.run('arxiv'), step.run('code')])` to execute 3 research agents simultaneously.
- **Fan-In**: Aggregates all 3 outputs into a single synthesis LLM agent step.

---

## 6. Human-in-the-Loop Approval Workflow

Located at: [`src/inngest/functions/humanInTheLoopWorkflow.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/functions/humanInTheLoopWorkflow.js)

- Uses `step.waitForEvent('wait-for-human-approval', { event: 'ai/research.approved', timeout: '24h', match: 'async.data.jobId' })` to durably pause execution until approval signal is received.

---

## 7. Concurrency & Rate Limiting

Located at: [`src/inngest/functions/concurrencyRateLimitedWorkflow.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/functions/concurrencyRateLimitedWorkflow.js)

- Configures declarative per-tenant limits (`concurrency: [{ limit: 2, key: 'event.data.userId' }]`) and throttling.

---

## 8. Resilient Error Recovery & Failure Handler

Located at: [`src/inngest/functions/resilientFailureHandlingWorkflow.js`](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/code/src/inngest/functions/resilientFailureHandlingWorkflow.js)

- Configures automatic retries (`retries: 3`).
- Implements `onFailure` hook to mark persistent DB state as FAILED and alert administrators when all retries are exhausted.
