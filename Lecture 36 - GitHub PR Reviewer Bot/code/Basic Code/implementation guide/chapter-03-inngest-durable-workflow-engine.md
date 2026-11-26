# Chapter 3: Inngest Durable Workflow Engine

> 📌 **Relevant Source Files:**
> - 🔌 [`src/inngest/client.js`](../src/inngest/client.js) — Inngest client initialization (`id: "github-review-applications"`)
> - 🔄 [`src/inngest/functions/github-review.js`](../src/inngest/functions/github-review.js) — 5-step durable execution function (`githubPullRequestReview`)
> - 📦 [`src/inngest/functions/index.js`](../src/inngest/functions/index.js) — Exported Inngest function array

---

## Introduction

Webhooks from GitHub require quick responses (within 10 seconds). Executing an entire AI review—fetching PR metadata, listing paginated diffs, evaluating an LLM prompt, and posting GitHub comments—can easily exceed HTTP gateway timeouts. Furthermore, network hiccups or rate limits can crash standard stateless handlers.

This chapter details [`src/inngest/client.js`](../src/inngest/client.js) and [`src/inngest/functions/github-review.js`](../src/inngest/functions/github-review.js), showing how **Inngest Durable Execution** solves these challenges.

---

## 🔌 Inngest Client Setup

The client is initialized in [`src/inngest/client.js`](../src/inngest/client.js):

```javascript
// src/inngest/client.js
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "github-review-applications" });
```

The application ID `github-review-applications` groups related functions under a single dashboard namespace.

---

## ⚡ Function Trigger & Event Schema

The function `githubPullRequestReview` is created using `inngest.createFunction`:

```javascript
// src/inngest/functions/github-review.js (Lines 19-25)
export const githubPullRequestReview = inngest.createFunction(
  {
    id: "github-pr-review",
    name: "GitHub Pull Request Review Automation",
    triggers: [{ event: "github/pullrequest.review" }],
  },
  async ({ event, step }) => {
    // Workflow step logic
  }
);
```

### Event Payload Schema:
```json
{
  "name": "github/pullrequest.review",
  "data": {
    "owner": "octocat",
    "repo": "Hello-World",
    "pull_number": 1
  }
}
```

---

## 🔄 The 5-Step Execution Pipeline

Inside the function handler, execution is broken down into discrete steps using `step.run`. Each step is independently checkpointed by Inngest.

```text
    ┌─────────────────────────────────────────────────────────┐
    │  Step 1: fetch-pull-request-information                │
    └────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 2: PR State & Draft Validation (Inline check)     │
    └────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 3: fetch-changes (Paginated & Filtered diffs)     │
    └────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 4: ai-analyse (OpenAI Agent OR Mock Simulation)   │
    └────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Step 5: post-comment (Formal PR Review / Issue Comment)│
    └─────────────────────────────────────────────────────────┘
```

---

### Step 1: Fetch Pull Request Information

```javascript
// src/inngest/functions/github-review.js (Lines 33-47)
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
```

---

### Step 2: Validate PR State & Draft Status

```javascript
// src/inngest/functions/github-review.js (Lines 49-62)
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
```

---

### Step 3: Fetch File Diffs

```javascript
// src/inngest/functions/github-review.js (Lines 64-76)
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
```

---

### Step 4: AI Analysis with Fallback Simulation

Step 4 formats prompt context and invokes the OpenAI Agent SDK. If `OPENAI_API_KEY` is missing, it falls back gracefully to a simulated output structure without failing the workflow run.

```javascript
// src/inngest/functions/github-review.js (Lines 78-116)
const aiResponse = await step.run("ai-analyse", async () => {
  const promptContext = `
Pull Request Details:
- Title: ${pullRequestInfo.title}
- Author: ${pullRequestInfo.user.login}
- Head Branch: ${pullRequestInfo.head.ref} (SHA: ${pullRequestInfo.head.sha})
- Changed Files Count: ${pullRequestInfo.changedFilesCount}
- Commits Count: ${pullRequestInfo.commitsCount}

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
```

---

### Step 5: Post Formal Review Comment

Step 5 assembles the final markdown response (combining summary content, critical fixes, suggestions, and footer) and posts it via `postPRReview`. If formal review posting fails, it falls back to issue comment posting (`postPRComment`).

```javascript
// src/inngest/functions/github-review.js (Lines 118-155)
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
```

---

Next, proceed to [Chapter 4: Webhooks & API Triggers](chapter-04-webhooks-and-api-triggers.md).
