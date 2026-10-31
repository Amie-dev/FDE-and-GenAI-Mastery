# 📚 Technical Implementation Guide — Week 07 Day 13: Inngest Durable Workflows

Welcome to the **Implementation Guide for Week 07 Day 13**. This guide provides an in-depth, publication-grade technical breakdown of building durable execution pipelines for multi-agent AI applications using Node.js, Express, and Inngest Engine.

---

## 📑 Chapters Index

0. 📖 [Chapter 00 — Overview, Setup & Architecture Foundations](chapter-00-overview-setup.md)
   - Procedural limitations in AI pipelines, architectural overview, codebase map, environment setup, and running Inngest local dev server.

1. 📖 [Chapter 01 — Inngest Engine Architecture & SDK Setup](chapter-01-inngest-architecture-and-client.md)
   - Event bus webhook architecture, Inngest client initialization ([client.js](../src/inngest/client.js)), Express middleware (`serve()`), and REST trigger endpoints.

2. 📖 [Chapter 02 — Procedural Code vs. Durable Execution](chapter-02-procedural-vs-durable-execution.md)
   - Step memoization breakdown, checkpointing boundaries (`step.run()`), server crash simulation recovery ([proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js)), and LLM token cost optimization.

3. 📖 [Chapter 03 — Steps API & Memoization Mechanics](chapter-03-steps-api-and-memoization.md)
   - Complete technical reference for `step.run`, `step.sleep`, `step.waitForEvent`, `step.invoke`, function re-hydration loop mechanics, and deterministic execution rules.

4. 📖 [Chapter 04 — Parallel Agent Execution & Human-in-the-Loop Signals](chapter-04-human-in-the-loop-and-parallel-agents.md)
   - Parallel multi-agent Fan-Out / Fan-In ([parallelMultiAgentWorkflow.js](../src/inngest/functions/parallelMultiAgentWorkflow.js)), durable pauses with `step.waitForEvent()`, signal correlation ([humanInTheLoopWorkflow.js](../src/inngest/functions/humanInTheLoopWorkflow.js)), and approval REST routes.

5. 📖 [Chapter 05 — Concurrency Control, Rate Limiting & Failure Resilience](chapter-05-concurrency-and-error-resilience.md)
   - Declarative per-tenant concurrency control ([concurrencyRateLimitedWorkflow.js](../src/inngest/functions/concurrencyRateLimitedWorkflow.js)), throttling rules, exponential backoff retries, and `onFailure` fallback hooks ([resilientFailureHandlingWorkflow.js](../src/inngest/functions/resilientFailureHandlingWorkflow.js)).

---

## 🛠️ Codebase & File Mapping Reference

| Implementation Guide Chapter | Source Code Files | Executable Demo Script |
| :--- | :--- | :--- |
| **Chapter 00 & 01** | [server.js](../src/server.js), [client.js](../src/inngest/client.js) | `npm start` |
| **Chapter 02** | [proceduralVsDurableWorkflow.js](../src/inngest/functions/proceduralVsDurableWorkflow.js) | [demo-01-durable-pipeline.js](../src/demos/demo-01-durable-pipeline.js) |
| **Chapter 03** | [agentService.js](../src/services/agentService.js) | N/A |
| **Chapter 04** | [parallelMultiAgentWorkflow.js](../src/inngest/functions/parallelMultiAgentWorkflow.js), [humanInTheLoopWorkflow.js](../src/inngest/functions/humanInTheLoopWorkflow.js) | [demo-02-parallel-agents.js](../src/demos/demo-02-parallel-agents.js), [demo-03-human-in-the-loop.js](../src/demos/demo-03-human-in-the-loop.js) |
| **Chapter 05** | [concurrencyRateLimitedWorkflow.js](../src/inngest/functions/concurrencyRateLimitedWorkflow.js), [resilientFailureHandlingWorkflow.js](../src/inngest/functions/resilientFailureHandlingWorkflow.js) | [demo-04-concurrency-limits.js](../src/demos/demo-04-concurrency-limits.js), [demo-05-failure-recovery.js](../src/demos/demo-05-failure-recovery.js) |

---

## 🚀 Getting Started

To run the codebase locally:

```bash
# 1. Install dependencies
npm install

# 2. In Terminal 1: Start Inngest Local Dev Server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# 3. In Terminal 2: Start Express Server
npm start

# 4. In Terminal 3: Run Demos
npm run demo:durable
```
