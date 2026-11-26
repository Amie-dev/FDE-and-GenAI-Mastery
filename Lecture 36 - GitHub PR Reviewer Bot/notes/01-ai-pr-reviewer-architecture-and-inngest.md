# 01 — AI PR Reviewer Architecture & Inngest Workflow Engine

## 📌 Executive Summary

Modern software engineering workflows rely heavily on Code Review to maintain code quality, enforce architectural standards, prevent security vulnerabilities, and facilitate knowledge sharing. However, manual code review suffers from:
- **Developer Bottlenecks:** Pull Requests (PRs) idle for hours or days waiting for senior engineers.
- **Inconsistent Quality:** Human reviewers miss edge cases, static analysis failures, or security oversights when reviewing large diffs under tight deadlines.
- **Context Switching Costs:** Interrupting deep work to conduct initial routine sanity checks on PRs.

The **AI GitHub PR Reviewer Bot** combines **LLM Agent Intelligence**, **Octokit GitHub SDK**, and **Inngest Durable Execution** to automate initial PR evaluations seamlessly.

---

## 🏗️ Architectural Overview: Procedural vs Durable Event-Driven Pipeline

### The Naive Procedural Approach (HTTP Request-Response)

```
[GitHub Webhook / CLI] ---> [Express Server] ---> [Octokit Fetch] ---> [LLM Call (15-45s)] ---> [Octokit Post] ---> [HTTP 200]
                                                            💥 Timeout / Crash / Network Drop 💥
```

#### Why Procedural Execution Fails in Production:
1. **HTTP Gateway Timeouts:** LLM inferences for large diffs take 20–60 seconds. Standard API gateways (AWS API Gateway, Cloudflare, Vercel) terminate connections after 10–30 seconds.
2. **Loss of Execution State:** If the server crashes during the LLM call or post-comment step, the entire workflow fails.
3. **Duplicate LLM Tokens & Financial Waste:** Retrying the whole request re-runs completed steps, burning unnecessary OpenAI API tokens.
4. **Rate Limit Throttling:** GitHub API enforces strict rate limits (5,000 requests/hour authenticated). Uncoordinated parallel requests trigger `429 Too Many Requests`.

---

### The Inngest Durable Execution Architecture

```
                                              ┌────────────────────────────────────────────────┐
                                              │ Inngest Engine (State Manager & Event Cloud)   │
                                              └───────┬────────────────────────────────▲───────┘
                                                      │                                │
                                                      │ Event Trigger                  │ Step Memoization
                                                      ▼                                │ & State Checkpoints
┌────────────────┐     HTTP Event      ┌─────────────────────────────┐                 │
│ GitHub Webhook │ ──────────────────► │  Express / Node.js Server   │ ────────────────┤
│ or Manual CLI  │                     │  (/api/inngest Endpoint)    │                 │
└────────────────┘                     └──────────────┬──────────────┘                 │
                                                      │                                │
                                                      ▼                                │
                                         ┌──────────────────────────┐                  │
                                         │ Step 1: Fetch PR Metadata│ ─────────────────┤
                                         └────────────┬─────────────┘                  │
                                                      │                                │
                                                      ▼                                │
                                         ┌──────────────────────────┐                  │
                                         │ Step 2: Fetch PR Diffs   │ ─────────────────┤
                                         └────────────┬─────────────┘                  │
                                                      │                                │
                                                      ▼                                │
                                         ┌──────────────────────────┐                  │
                                         │ Step 3: AI Code Review   │ ─────────────────┤
                                         └────────────┬─────────────┘                  │
                                                      │                                │
                                                      ▼                                │
                                         ┌──────────────────────────┐                  │
                                         │ Step 4: Post Review      │ ─────────────────┘
                                         └──────────────────────────┘
```

---

## ⚡ Core Components & Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Workflow Engine** | [Inngest Engine](file:///home/aminul/development/gen-ai-cohort/week07/learning/day13/notes/01-inngest-fundamentals-and-async-architecture.md) | State persistence, step memoization, automatic retries, concurrency control. |
| **GitHub SDK** | `@octokit/rest` | Fetching PR metadata, paginated file diffs, and submitting review comments. |
| **AI Agent SDK** | `@openai/agents` + `zod` | Structured output parsing, multi-file diff reasoning, review classification. |
| **Server Framework** | Express.js (`inngest/express`) | Webhook receiver & Inngest SDK serve handler. |

---

## 📋 The Inngest Execution Blueprint

The PR Review pipeline executes as a sequence of isolated, durable steps:

1. **Trigger Event:** `github/pullrequest.review` dispatched via GitHub Webhook or manual REST POST endpoint `/api/review`.
2. **Step 1 (`fetch-pull-request-information`):** Query GitHub API for PR metadata (title, author, state, draft status, commit count).
   - *Guard Clause:* If PR is closed or in `draft` state, safely abort workflow.
3. **Step 2 (`fetch-changes`):** Paginate through all modified files in the PR diff. Filter out non-reviewable noise (e.g., `package-lock.json`, lockfiles).
   - *Guard Clause:* If 0 reviewable files remain, skip review.
4. **Step 3 (`ai-analyse`):** Pass PR context and file patches to the OpenAI Agent. Parse response into a structured Zod schema containing `criticalFixes`, `suggestions`, `content`, and `events` (`APPROVE`, `COMMENT`, `REQUEST_CHANGES`).
5. **Step 4 (`post-comment`):** Post the formatted Markdown code review back to GitHub as an official PR Review or Issue Comment.
