# 📚 Week 07 — Day 14 Master Handbook (With Code)

# Hands-On Engineering: Building an Autonomous AI GitHub PR Review Bot with Inngest, Octokit & OpenAI Agents

> **Executive Overview:** This handbook serves as the master engineering reference for Day 14. It combines architecture design, state step mechanics, Octokit REST API pagination, OpenAI Agents Zod schema enforcement, Express webhook receiver endpoints, complete production Node.js code implementations, and testing guides.

---

## 📑 Table of Contents
1. [Architectural Overview & Problem Statement](#-1-architectural-overview--problem-statement)
2. [Tech Stack & Package Configuration](#-2-tech-stack--package-configuration)
3. [Module 1: Octokit GitHub API Library (`lib/github.js`)](#-3-module-1-octokit-github-api-library-libgithubjs)
4. [Module 2: OpenAI Agent & Zod Schema (`agents/github-pr-review-agents.js`)](#-4-module-2-openai-agent--zod-schema-agentsgithub-pr-review-agentsjs)
5. [Module 3: Inngest Client (`src/inngest/client.js`)](#-5-module-3-inngest-client-srcinngestclientjs)
6. [Module 4: Durable Review Workflow (`src/inngest/functions/github-review.js`)](#-6-module-4-durable-review-workflow-srcinngestfunctionsgithub-reviewjs)
7. [Module 5: Express Server & Webhooks (`src/index.js`)](#-7-module-5-express-server--webhooks-srcindexjs)
8. [Setup, Execution & Verification Guide](#-8-setup-execution--verification-guide)

---

## 🏗️ 1. Architectural Overview & Problem Statement

Building an automated Code Review Bot requires executing long-running steps:
1. Fetching PR details and commit histories from GitHub.
2. Fetching paginated file diff patches.
3. Invoking Large Language Model (LLM) inference (15–60 seconds).
4. Submitting formatted Markdown review comments back to GitHub.

### Why Inngest Background Orchestration is Essential:
In a traditional synchronous Express route, an HTTP timeout (e.g. 30s) or server crash anywhere during LLM processing results in total request failure. Retrying the endpoint requires re-fetching all diffs and re-running LLM inferences, causing API rate-limit errors and wasted token costs.

With **Inngest Durable Execution**:
- Each step (`step.run()`) is individually memoized.
- If step 3 (LLM analysis) fails due to rate limits, Inngest automatically retries **only step 3** with exponential backoff.
- Completed steps (fetching PR metadata, fetching diffs) are rehydrated instantly from state cache without hitting GitHub's API again.

---

## 📦 2. Tech Stack & Package Configuration

### `package.json`

```json
{
  "name": "day14-ai-pr-reviewer",
  "version": "1.0.0",
  "main": "./src/index.js",
  "type": "module",
  "scripts": {
    "dev": "node src/index.js"
  },
  "dependencies": {
    "@octokit/rest": "^22.0.1",
    "@openai/agents": "^0.18.0",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "inngest": "^4.20.0",
    "octokit": "^5.0.5",
    "zod": "^4.6.4"
  }
}
```

---

## 🔧 3. Module 1: Octokit GitHub API Library (`lib/github.js`)

```javascript
import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({
  auth: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,
  userAgent: "pullrequest-review-bot",
});

/**
 * Fetch Pull Request Metadata
 */
export async function getPullRequestDetails(owner, repo, pullNumber) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: Number(pullNumber),
  });
  return {
    id: data.id,
    title: data.title,
    state: data.state,
    number: data.number,
    commentsCount: data.comments,
    url: data.html_url,
    diffUrl: data.diff_url,
    changedFilesCount: data.changed_files,
    commitsCount: data.commits,
    isDraft: data.draft,
    user: {
      login: data.user.login,
      avatarUrl: data.user.avatar_url,
    },
    head: { ref: data.head.ref, sha: data.head.sha },
    base: { ref: data.base.ref, sha: data.base.sha },
  };
}

/**
 * Fetch all file changes in a Pull Request with pagination
 */
export async function getPullRequestFiles(owner, repo, pullNumber) {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: Number(pullNumber),
    per_page: 100,
  });

  // Filter out lockfiles or generated files to conserve LLM context tokens
  const ignoredExtensions = [".lock", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
  
  return files
    .filter((file) => !ignoredExtensions.some((ext) => file.filename.endsWith(ext)))
    .map((file) => ({
      fileName: file.filename,
      status: file.status,
      changes: file.changes,
      patch: file.patch || "",
      additions: file.additions,
      deletions: file.deletions,
      previous_filename: file.previous_filename,
    }));
}

/**
 * Post issue comment on Pull Request
 */
export async function postPRComment(owner, repo, pullNumber, body) {
  return await octokit.issues.createComment({
    owner,
    repo,
    issue_number: Number(pullNumber),
    body,
  });
}

/**
 * Post official Pull Request Review
 */
export async function postPRReview(owner, repo, pullNumber, body, event = "COMMENT") {
  return await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: Number(pullNumber),
    body,
    event, // APPROVE, REQUEST_CHANGES, COMMENT
  });
}
```

---

## 🧠 4. Module 2: OpenAI Agent & Zod Schema (`agents/github-pr-review-agents.js`)

```javascript
import { Agent } from "@openai/agents";
import { z } from "zod";

export const githubReviewAgentResultSchema = z.object({
  criticalFixes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Critical fixes or potential bugs that must be addressed"),
  suggestions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Code quality, optimization, or readability suggestions"),
  content: z.string().describe("Comprehensive Markdown body content for the GitHub PR review comment"),
  events: z
    .enum(["APPROVE", "COMMENT", "REQUEST_CHANGES"])
    .describe("GitHub PR review decision: APPROVE, COMMENT, or REQUEST_CHANGES")
});

export const githubPullRequestReviewAgent = new Agent({
  name: "GitHub Pull Request Review Agent",
  outputType: githubReviewAgentResultSchema,
  instructions: `
You are an expert AI Code Reviewer and Staff Software Engineer conducting a thorough code review.

Your task is to analyze the provided GitHub Pull Request details and file diffs, then generate a constructive, high-quality, professional code review.

Review Guidelines:
1. **Critical Fixes**: Identify potential security vulnerabilities, logic bugs, syntax errors, memory leaks, or breaking changes.
2. **Suggestions**: Provide actionable recommendations for performance improvements, refactoring, best practices, and code readability.
3. **Tone & Style**: Be encouraging, clear, and professional. Use natural markdown formatting and helpful emojis (e.g., 🚀, ⚠️, 💡, ✅, 🔍).
4. **Decision**: Select an event action:
   - "APPROVE": If changes are clean, safe, and ready to merge.
   - "REQUEST_CHANGES": If critical bugs or security risks are found.
   - "COMMENT": If minor suggestions are offered without blocking merge.
`,
});
```

---

## ⚡ 5. Module 3: Inngest Client (`src/inngest/client.js`)

```javascript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "github-review-applications" });
```

---

## 🔄 6. Module 4: Durable Review Workflow (`src/inngest/functions/github-review.js`)

```javascript
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

    if (!owner || !repo || !pull_number) {
      return { message: "Missing required parameters (owner, repo, pull_number)", skipped: true };
    }

    // Step 1: Fetch Pull Request Metadata
    const pullRequestInfo = await step.run(
      "fetch-pull-request-information",
      async () => {
        try {
          return await getPullRequestDetails(owner, repo, pull_number);
        } catch (error) {
          console.error(`Failed to fetch PR #${pull_number} for ${owner}/${repo}:`, error.message);
          return null;
        }
      }
    );

    if (!pullRequestInfo) {
      return { message: `Pull request #${pull_number} not found or inaccessible`, skipped: true };
    }

    // Step 2: Validate PR state (Must be open and not draft)
    if (pullRequestInfo.state !== "open") {
      return {
        message: `Pull Request #${pull_number} state is '${pullRequestInfo.state}', skipping review.`,
        skipped: true,
      };
    }

    if (pullRequestInfo.isDraft) {
      return {
        message: `Pull Request #${pull_number} is currently a draft, skipping review.`,
        skipped: true,
      };
    }

    // Step 3: Fetch file diffs (paginated & filtered)
    const changes = await step.run("fetch-changes", async () => {
      try {
        return await getPullRequestFiles(owner, repo, pull_number);
      } catch (error) {
        console.error("Failed to fetch PR diff files:", error.message);
        return [];
      }
    });

    if (!changes || changes.length === 0) {
      return { message: "There are no reviewable code changes in this PR", skipped: true };
    }

    // Step 4: Run AI Code Review Agent Analysis
    const aiResponse = await step.run("ai-analyse", async () => {
      const promptContext = `
Pull Request Details:
- Title: ${pullRequestInfo.title}
- Author: ${pullRequestInfo.user.login}
- Head Branch: ${pullRequestInfo.head.ref} (SHA: ${pullRequestInfo.head.sha})
- Changed Files Count: ${pullRequestInfo.changedFilesCount}

File Diffs:
${JSON.stringify(changes.slice(0, 15), null, 2)}
`;

      try {
        if (!process.env.OPENAI_API_KEY) {
          console.warn("OPENAI_API_KEY is missing. Using simulated AI review output.");
          return {
            result: {
              criticalFixes: [],
              suggestions: [
                "Consider adding explicit return type annotations.",
                "Ensure environment variables are loaded prior to initializing GitHub client.",
              ],
              content: `### 🤖 AI Code Review Summary\n\nAutomated review completed for PR **#${pull_number}** (${pullRequestInfo.title}).\n\n- **Total files reviewed**: ${changes.length}\n- **Status**: Code changes look structured and follow project guidelines cleanly!\n\n*(Note: Simulated output - set \`OPENAI_API_KEY\` for live agent evaluations)*`,
              events: "APPROVE",
            },
          };
        }

        const llmResponse = await run(githubPullRequestReviewAgent, promptContext);
        return {
          result: llmResponse.finalOutput,
        };
      } catch (error) {
        console.error("Error running AI Agent review:", error.message);
        throw error;
      }
    });

    // Step 5: Post Review Comment on GitHub
    const commentResult = await step.run("post-comment", async () => {
      const { criticalFixes, suggestions, content, events } = aiResponse.result;

      const sections = [content];

      if (criticalFixes && criticalFixes.length > 0) {
        sections.push(
          `### ⚠️ Critical Fixes Needed\n${criticalFixes.map((fix) => `- ${fix}`).join("\n")}`
        );
      }

      if (suggestions && suggestions.length > 0) {
        sections.push(
          `### 💡 Suggested Improvements\n${suggestions.map((suggestion) => `- ${suggestion}`).join("\n")}`
        );
      }

      sections.push(`\n---\n*Powered by Inngest Durable Execution & OpenAI Agents SDK* 🚀`);

      const reviewBody = sections.join("\n\n");

      try {
        const reviewEvent = events || (criticalFixes?.length > 0 ? "REQUEST_CHANGES" : "COMMENT");
        
        try {
          await postPRReview(owner, repo, pull_number, reviewBody, reviewEvent);
        } catch {
          await postPRComment(owner, repo, pull_number, reviewBody);
        }

        return { posted: true, eventUsed: reviewEvent };
      } catch (error) {
        console.error("Failed to post comment to GitHub PR:", error.message);
        return { posted: false, error: error.message };
      }
    });

    return {
      success: true,
      pullNumber: pull_number,
      commentResult,
    };
  }
);
```

---

## 🌐 7. Module 5: Express Server & Webhooks (`src/index.js`)

```javascript
import express from "express";
import { serve } from "inngest/express";
import "dotenv/config";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

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

// Manual Trigger Endpoint
app.post("/api/review", async (req, res) => {
  const { owner, repo, pull_number } = req.body;

  if (!owner || !repo || !pull_number) {
    return res.status(400).json({ error: "Missing owner, repo, or pull_number" });
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
    return res.status(500).json({ error: "Failed to dispatch review event" });
  }
});

// GitHub Webhook Listener Endpoint
app.post("/webhook/github", async (req, res) => {
  const githubEvent = req.headers["x-github-event"];
  const payload = req.body;

  if (githubEvent === "pull_request") {
    const action = payload.action;

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
});
```

---

## 🚀 8. Setup, Execution & Verification Guide

1. Clone & Configure Environment (`.env`):
   ```bash
   INNGEST_DEV=1
   PORT=3000
   GITHUB_PAT=github_pat_11B...
   OPENAI_API_KEY=sk-proj-...
   ```
2. Run Express App: `npm run dev`
3. Launch Inngest CLI Dev Dashboard: `npx inngest-cli@latest dev`
4. Dispatch Manual Review:
   ```bash
   curl -X POST http://localhost:3000/api/review \
     -H "Content-Type: application/json" \
     -d '{"owner": "facebook", "repo": "react", "pull_number": 30000}'
   ```
