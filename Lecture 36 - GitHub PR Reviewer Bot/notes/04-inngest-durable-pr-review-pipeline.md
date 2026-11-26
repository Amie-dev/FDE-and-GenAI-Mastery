# 04 — Inngest Durable PR Review Pipeline & Webhooks

## 📌 Overview

This module covers the step-by-step implementation of the durable workflow function, express webhook endpoints, manual trigger routes, and production resilience features.

---

## 🛠️ 1. Complete Inngest Function Implementation

```javascript
// src/inngest/functions/github-review.js
import { inngest } from "../client.js";
import { getPullRequestDetails, getPullRequestFiles, postPRComment, postPRReview } from "../../../lib/github.js";
import { run } from "@openai/agents";
import { githubPullRequestReviewAgent } from "../../../agents/github-pr-review-agents.js";

export const githubPullRequestReview = inngest.createFunction(
  {
    id: "github-pr-review",
    name: "GitHub Pull Request Review Automation",
    triggers: [{ event: "github/pullrequest.review" }],
  },
  async ({ event, step }) => {
    const { owner, repo, pull_number } = event.data;

    // Step 1: Fetch PR Metadata
    const pullRequestInfo = await step.run("fetch-pull-request-information", async () => {
      return await getPullRequestDetails(owner, repo, pull_number);
    });

    if (!pullRequestInfo || pullRequestInfo.state !== "open" || pullRequestInfo.isDraft) {
      return { message: "PR skipped (not open, draft, or not found)", skipped: true };
    }

    // Step 2: Fetch Changes
    const changes = await step.run("fetch-changes", async () => {
      return await getPullRequestFiles(owner, repo, pull_number);
    });

    if (!changes || changes.length === 0) {
      return { message: "No reviewable changes", skipped: true };
    }

    // Step 3: AI Code Review Analysis
    const aiResponse = await step.run("ai-analyse", async () => {
      const promptContext = `PR Title: ${pullRequestInfo.title}\nDiffs:\n${JSON.stringify(changes.slice(0, 15), null, 2)}`;
      const llmResponse = await run(githubPullRequestReviewAgent, promptContext);
      return { result: llmResponse.finalOutput };
    });

    // Step 4: Post Review to GitHub
    const commentResult = await step.run("post-comment", async () => {
      const { criticalFixes, suggestions, content, events } = aiResponse.result;
      const reviewBody = `${content}\n\nCritical Fixes:\n${criticalFixes?.join("\n") || "None"}\n\nSuggestions:\n${suggestions?.join("\n") || "None"}`;
      
      try {
        await postPRReview(owner, repo, pull_number, reviewBody, events || "COMMENT");
      } catch {
        await postPRComment(owner, repo, pull_number, reviewBody);
      }
      return { posted: true };
    });

    return { success: true, commentResult };
  }
);
```

---

## 🌐 2. Webhook & REST API Server Integration

```javascript
// src/index.js
import express from "express";
import { serve } from "inngest/express";
import "dotenv/config";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions/index.js";

const app = express();
app.use(express.json());

// Inngest serve route
app.use("/api/inngest", serve({ client: inngest, functions }));

// Manual Trigger Route
app.post("/api/review", async (req, res) => {
  const { owner, repo, pull_number } = req.body;
  const eventResult = await inngest.send({
    name: "github/pullrequest.review",
    data: { owner, repo, pull_number: Number(pull_number) },
  });
  res.json({ message: "Review triggered", eventId: eventResult.ids[0] });
});

// GitHub Webhook Route
app.post("/webhook/github", async (req, res) => {
  const githubEvent = req.headers["x-github-event"];
  if (githubEvent === "pull_request" && ["opened", "synchronize", "reopened"].includes(req.body.action)) {
    await inngest.send({
      name: "github/pullrequest.review",
      data: {
        owner: req.body.repository.owner.login,
        repo: req.body.repository.name,
        pull_number: req.body.pull_request.number,
      },
    });
  }
  res.status(200).json({ message: "Event received" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

---

## 🧪 3. Local Testing Walkthrough

1. Start Inngest Dev Server: `npx inngest-cli@latest dev`
2. Start Node App: `npm run dev`
3. Trigger Manual Review via `curl`:
```bash
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"owner": "octocat", "repo": "Hello-World", "pull_number": 1}'
```
4. Open Inngest Dev Dashboard at `http://127.0.0.1:8288` to inspect step execution, state memoization, and logs in real time.
