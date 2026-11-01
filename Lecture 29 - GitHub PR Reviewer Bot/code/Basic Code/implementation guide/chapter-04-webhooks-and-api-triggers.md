# Chapter 4: Webhooks & Express API Triggers

> 📌 **Relevant Source File:**
> - ⚡ [`src/index.js`](../src/index.js) — Express HTTP server, Inngest serve handler middleware (`/api/inngest`), manual review endpoint (`POST /api/review`), and GitHub webhook listener (`POST /webhook/github`)

---

## Introduction

To integrate durable workflows with the outside world, the bot exposes an Express HTTP application. It provides endpoints for:
1. Serving Inngest function execution handlers (`/api/inngest`).
2. Receiving GitHub webhook notifications (`POST /webhook/github`).
3. Invoking manual reviews on any public repository (`POST /api/review`).
4. System health monitoring (`GET /`).

This chapter details the server architecture implemented in [`src/index.js`](../src/index.js).

---

## 🚀 Express Middleware & Server Setup

```javascript
// src/index.js (Lines 1-15)
import express from "express";
import { serve } from "inngest/express";
import "dotenv/config";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// JSON Middleware
app.use(express.json());

// Inngest serve handler endpoint
app.use("/api/inngest", serve({ client: inngest, functions }));
```

### Inngest Serve Handler (`serve({ client: inngest, functions })`)
The `serve` middleware acts as a secure bidirectional communication endpoint between the Inngest Dev Server / Inngest Cloud Engine and your Node.js process. When Inngest triggers a step, it issues an HTTP POST to `/api/inngest` containing the signed step payload.

---

## 🏥 Health Check Endpoint

```javascript
// src/index.js (Lines 17-27)
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "GitHub AI PR Reviewer Bot",
    endpoints: {
      inngest: "/api/inngest",
      manualReview: "POST /api/review",
      githubWebhook: "POST /webhook/github",
    },
  });
});
```

---

## 🎯 Manual Review Endpoint (`POST /api/review`)

Allows developers or CI/CD pipelines to trigger an automated PR review manually without relying on GitHub Webhooks.

```javascript
// src/index.js (Lines 29-60)
app.post("/api/review", async (req, res) => {
  const { owner, repo, pull_number } = req.body;

  if (!owner || !repo || !pull_number) {
    return res.status(400).json({
      error: "Missing required fields: owner, repo, pull_number",
    });
  }

  try {
    const eventResult = await inngest.send({
      name: "github/pullrequest.review",
      data: { owner, repo, pull_number: Number(pull_number) },
    });

    return res.json({
      message: "PR review workflow triggered successfully",
      eventId: eventResult.ids[0],
      owner,
      repo,
      pull_number,
    });
  } catch (error) {
    console.error("Error triggering review workflow:", error);
    return res.status(500).json({ error: "Failed to dispatch review event" });
  }
});
```

---

## 🔔 GitHub Webhook Event Endpoint (`POST /webhook/github`)

Receives native webhook payloads from GitHub repository webhooks. It checks for the `x-github-event` header and filters for `pull_request` actions (`opened`, `synchronize`, `reopened`).

```javascript
// src/index.js (Lines 62-90)
app.post("/webhook/github", async (req, res) => {
  const githubEvent = req.headers["x-github-event"];
  const payload = req.body;

  if (githubEvent === "pull_request") {
    const action = payload.action; // 'opened', 'synchronize', 'reopened'

    if (["opened", "synchronize", "reopened"].includes(action)) {
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const pull_number = payload.pull_request.number;

      await inngest.send({
        name: "github/pullrequest.review",
        data: { owner, repo, pull_number },
      });

      return res.status(200).json({
        message: `Triggered AI review for PR #${pull_number} (${action})`,
      });
    }
  }

  return res.status(200).json({ message: "Event received (no action required)" });
});
```

---

Next, proceed to [Chapter 5: Testing, Execution & Production](chapter-05-testing-execution-and-production.md).
