# ⏰ 08 — Cron/Scheduled Workflows, Versioning, and Advanced Patterns

## Goal: Understand how to run workflows on schedules, handle workflow versioning for deployed code changes, and learn advanced patterns for production-grade durable AI workflows.

### 1. ⏰ Cron / Scheduled Workflows

Inngest supports scheduling workflows to run at specific times using cron expressions.

```javascript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "scheduled-workflows",
});

// Scheduled function
export const dailyReport = inngest.createFunction(
  {
    id: "daily-report",
  },
  {
    cron: "0 9 * * *", // 9 AM UTC daily
  },
  async ({ step }) => {
    const report = await step.run("generate-report", async () => {
      return await generateDailyReport();
    });

    await step.sendEvent("daily-report-complete", {
      name: "report/daily.complete",
      data: { report },
    });
  }
);
```

#### Cron Expression Format

```text
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sun=0)
│ │ │ │ │
* * * * *
```

Examples:

| Expression | Meaning |
|------------|---------|
| `0 9 * * *` | Daily at 9:00 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `*/15 * * * *` | Every 15 minutes |
| `0 9-17 * * 1-5` | Hourly 9AM-5PM, Mon-Fri |

#### Timezone Support

```javascript
export const dailyReport = inngest.createFunction(
  {
    id: "daily-report-est",
  },
  {
    cron: "0 9 * * *",
    cronTZ: "America/New_York", // 9 AM EST
  },
  async ({ step }) => {
    // ...
  }
);
```

### 2. 📅 Scheduled Workflow Patterns

#### Pattern 1: Cleanup Jobs

```javascript
export const cleanupOldSessions = inngest.createFunction(
  {
    id: "cleanup-old-sessions",
  },
  {
    cron: "0 2 * * *", // 2 AM daily
  },
  async ({ step }) => {
    await step.run("delete-expired-sessions", async () => {
      return await db.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    });
  }
);
```

#### Pattern 2: Periodic AI Batch Processing

```javascript
export const batchEmbeddings = inngest.createFunction(
  {
    id: "batch-embeddings",
  },
  {
    cron: "*/30 * * * *", // Every 30 minutes
  },
  async ({ step }) => {
    const pending = await step.run("fetch-pending", async () => {
      return await db.document.findMany({
        where: { embeddingStatus: "pending" },
        take: 100,
      });
    });

    await step.run("generate-embeddings", async () => {
      return await generateEmbeddings(pending);
    });
  }
);
```

#### Pattern 3: Scheduled AI Agent Tasks

```javascript
export const scheduledResearch = inngest.createFunction(
  {
    id: "scheduled-research",
  },
  {
    cron: "0 */4 * * *", // Every 4 hours
  },
  async ({ step }) => {
    const topics = await step.run("fetch-topics", async () => {
      return await getTrendingTopics();
    });

    await step.sendEvent("research/batch", {
      name: "research/batch",
      data: { topics },
    });
  }
);
```

### 3. 🔄 Workflow Versioning

When you deploy new code, existing running workflows may still be executing with the old code.

```text
                    VERSIONING CHALLENGE
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    Running v1         Deploy v2          Running v1 continues
    Workflow                                    with old code
         │                  │
         ▼                  ▼
    Completes with       New workflows
    v1 logic             start with v2
```

#### Versioning Strategies

##### Strategy 1: Function ID Versioning

```javascript
// v1
export const researchV1 = inngest.createFunction(
  {
    id: "research-v1",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {
    // v1 logic
  }
);

// v2
export const researchV2 = inngest.createFunction(
  {
    id: "research-v2",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {
    // v2 logic
  }
);
```

Clients send events, both functions can handle them.

##### Strategy 2: Event-Based Versioning

```javascript
// Version in event data
await inngest.send({
  name: "research/requested",
  data: {
    version: "2.1",
    query: "AI trends",
  },
});

export const researchWorkflow = inngest.createFunction(
  {
    id: "research-universal",
  },
  {
    event: "research/requested",
  },
  async ({ event, step }) => {
    switch (event.data.version) {
      case "2.1":
        return await runV21(event, step);
      case "2.0":
        return await runV20(event, step);
      default:
        return await runV1(event, step);
    }
  }
);
```

##### Strategy 3: Step ID Stability

Step IDs must remain stable across versions for durable replay:

```text
                    STEP ID STABILITY
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    step.run("step-1")  →  step.run("step-1")  →  step.run("step-1")
       v1                   v2                   v3
          │                  │                  │
          ▼                  ▼                  ▼
    Result cached       Result cached      Result cached
    (if same)           (if same)          (if same)
```

**Critical Rule**: Never change step IDs if you want replay to work correctly.

```javascript
// ❌ Breaks replay
await step.run("fetch-data-v2", async () => { ... });

// ✅ Stable ID
await step.run("fetch-data", async () => { ... });
```

### 4. 🧱 Step Code Evolution

How to evolve step logic while preserving durability:

```text
                     STEP EVOLUTION STRATEGIES
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Additive change    Compatible change    Breaking change
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Add new steps      Modify internal      Change step ID
   without removing   logic, same ID       or return type
```

#### Safe Pattern: Additive Steps

```javascript
// v1
await step.run("fetch", async () => { ... });
await step.run("process", async () => { ... });

// v2 - adds new step
await step.run("fetch", async () => { ... });
await step.run("enrich", async () => { ... });  // NEW
await step.run("process", async () => { ... });
```

#### Safe Pattern: Internal Logic Changes

```javascript
// v1
await step.run("fetch", async () => {
  return await api.getV1();
});

// v2 - same step ID, different internal logic
await step.run("fetch", async () => {
  return await api.getV2(); // Changed provider
});
```

### 5. 🔐 Secrets Management

In production, workflows need API keys, database credentials, and other secrets.

#### Environment Variables

```javascript
// In production, set these in your hosting platform
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
```

#### Inngest Encrypted Secrets (if available)

```text
Inngest can store encrypted secrets
and inject them into your workflow
environment at runtime.
```

#### Best Practices

```text
1. Never hardcode secrets in code
2. Use environment variables
3. Rotate secrets regularly
4. Limit secret scope (per-environment)
5. Audit secret access
6. Use secret managers (AWS Secrets Manager, HashiCorp Vault)
```

### 6. 🏗️ Production Deployment Patterns

#### Pattern 1: Multi-Environment Deployments

```text
                          DEPLOYMENT
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
    Development             Staging              Production
    (no Inngest)        (Inngest dev)       (Inngest prod)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
    Local server          Dev Inngest          Prod Inngest
    with ngrok            endpoint             endpoint
```

#### Pattern 2: Blue-Green for Workflow Updates

```text
                         BLUE-GREEN
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼
    Blue (current)           Green (new)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼
    Running v1             New v2 workflows
    workflows                start on Green
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼
    Drain Blue               Switch DNS
    workflows                to Green
```

#### Pattern 3: Canary Deployment

```text
                        CANARY
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼
    95% traffic            5% traffic
    Stable version         New version
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼
    Monitor errors        Compare metrics
    Monitor latency       If healthy → 100%
```

### 7. 🧪 Testing Durable Workflows

#### Unit Testing Steps

```javascript
// Test step logic in isolation
async function testResearchStep() {
  const mockStep = {
    run: async (id, fn) => {
      return await fn();
    },
  };

  const result = await runResearchStep(mockStep, {
    query: "test query",
  });

  expect(result).toBeDefined();
}
```

#### Integration Testing

```javascript
// Test with Inngest dev server
import { Inngest } from "inngest";

const testInngest = new Inngest({
  id: "test",
});

// Start dev server, send events, verify results
```

### 8. 📊 Advanced Patterns Summary

| Pattern | Use Case |
|---------|----------|
| Cron triggers | Scheduled batch jobs, cleanup, periodic AI tasks |
| Scheduled events | Timed workflows, reminders, periodic sync |
| Function versioning | Zero-downtime deployments, A/B testing |
| Event versioning | Client-controlled workflow version |
| Step ID stability | Durable replay across deployments |
| Secrets via env | Secure credential management |
| Blue-green deploy | Zero-downtime workflow updates |
| Canary deploy | Safe rollout of new workflow versions |

### 9. 🧠 Interview Questions

#### Q1. How do you run a workflow on a schedule in Inngest?

> Use the `cron` property in the function trigger configuration with a standard cron expression.

#### Q2. What happens to running workflows when you deploy new code?

> Running workflows continue executing with the code version they started with. New workflows use the deployed code.

#### Q3. Why is step ID stability important?

> Step IDs are used to match durable step results across retries and replays. Changing a step ID breaks the replay chain.

#### Q4. How can you version workflows without breaking running executions?

> Use separate function IDs per version, event-based versioning, or version-specific logic within a single function while keeping step IDs stable.

#### Q5. How should secrets be managed in Inngest workflows?

> Use environment variables or secret managers, never hardcode secrets, and ensure secrets are available in the deployment environment.

### 10. 🧾 Cheat Sheet

```javascript
// Cron scheduled function
export const dailyJob = inngest.createFunction(
  { id: "daily-job" },
  { cron: "0 9 * * *" },
  async ({ step }) => { ... }
);

// Cron with timezone
export const dailyJobEST = inngest.createFunction(
  { id: "daily-job-est" },
  { cron: "0 9 * * *", cronTZ: "America/New_York" },
  async ({ step }) => { ... }
);

// Versioning strategies
// 1. Function ID versioning
export const workflowV1 = inngest.createFunction({ id: "workflow-v1" }, ...);
export const workflowV2 = inngest.createFunction({ id: "workflow-v2" }, ...);

// 2. Event versioning
await inngest.send({ name: "event", data: { version: "2.1" } });

// 3. Step ID stability - NEVER change these
await step.run("stable-step-id", async () => { ... });

// Secrets
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Common mistakes:

1. Changing step IDs between deployments, breaking replay
2. Not testing cron expressions in the correct timezone
3. Assuming running workflows automatically update to new code
4. Hardcoding secrets in workflow code
5. Not planning for schema evolution in event data
6. Deploying breaking changes without versioning strategy
7. Not having rollback plan for workflow updates

### Key takeaways:

- Cron triggers enable scheduled workflows with standard cron expressions
- Timezone support via `cronTZ` for user-facing schedules
- Running workflows continue with their original code version
- Step IDs must remain stable for durable replay to work
- Versioning strategies: function ID, event version, or internal logic
- Secrets should use environment variables or secret managers
- Blue-green and canary deployments help with zero-downtime updates
- Test step logic in isolation for faster feedback

---
*Source: gen-ai-cohort/week07/learning/day13/notes/08-cron-scheduled-workflows-versioning.md, plus roadmap.md Lecture 26 topics*