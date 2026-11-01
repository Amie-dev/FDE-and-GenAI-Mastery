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

// Health Check Endpoint
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

/**
 * Manual Trigger Endpoint
 * POST /api/review
 * Payload: { "owner": "octocat", "repo": "Hello-World", "pull_number": 1 }
 */
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

/**
 * GitHub Webhook Listener Endpoint
 * POST /webhook/github
 */
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

app.listen(PORT, () => {
  console.log(`🚀 GitHub AI PR Review Bot server running on http://localhost:${PORT}`);
  console.log(`⚡ Inngest endpoint serving at http://localhost:${PORT}/api/inngest`);
});