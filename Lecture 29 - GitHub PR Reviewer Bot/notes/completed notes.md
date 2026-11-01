# 📚 Week 07 — Day 14 Master Notes Overview

# Hands-On AI GitHub PR Reviewer Bot with Inngest & Octokit

> **Overview:** Day 14 covers **Building an Autonomous GitHub PR Review Bot**, **Inngest Durable Workflows**, **Octokit GitHub REST API Integration**, **Paginated Diff Parsing**, **Structured LLM Outputs with OpenAI Agents SDK & Zod**, **GitHub Webhook Listeners**, and **Production Fault Resilience**.

---

## 📑 Notes Structure & Links

### ⚡ Core Learning Modules (`/notes/`)

1. 📄 **[01 — AI PR Reviewer Architecture & Inngest Workflow Engine](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/01-ai-pr-reviewer-architecture-and-inngest.md)**
   - Architectural comparison: Naive Procedural vs. Durable Event-Driven Pipeline.
   - Solving API timeouts, gateway drops, and monetary token waste.
   - Inngest Execution Blueprint & Step API sequence.

2. 📄 **[02 — Octokit Integration & GitHub Diff Parsing](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/02-octokit-integration-and-diff-parsing.md)**
   - Octokit setup and authentication with GitHub Personal Access Tokens (PAT).
   - Querying PR metadata (`pulls.get`) and handling 404, draft, and closed states.
   - Extracting paginated file changes (`octokit.paginate(octokit.pulls.listFiles)`).
   - Token window optimizations: ignoring lockfiles (`package-lock.json`), minified builds, and binary assets.

3. 📄 **[03 — OpenAI Agents SDK & Structured Code Review](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/03-openai-agents-and-structured-pr-review.md)**
   - Structuring LLM responses using Zod schemas (`githubReviewAgentResultSchema`).
   - Defining review categories: `criticalFixes`, `suggestions`, `content`, and review events (`APPROVE`, `COMMENT`, `REQUEST_CHANGES`).
   - System prompts and instructions for Staff Software Engineer level code evaluations.

4. 📄 **[04 — Inngest Durable PR Review Pipeline & Webhooks](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/04-inngest-durable-pr-review-pipeline.md)**
   - Complete step-by-step implementation of `githubPullRequestReview` Inngest function.
   - Setting up Express `/api/inngest` serve endpoint, manual REST trigger `/api/review`, and GitHub Webhook route `/webhook/github`.
   - Local testing workflow using Inngest Dev Server dashboard (`http://127.0.0.1:8288`).

5. 📄 **[completed notes with code.md — Comprehensive Master Reference](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/completed%20notes%20with%20code.md)**
   - Unified master reference handbook combining theory, architecture diagrams, full copy-pasteable Node.js code snippets, and complete step-by-step execution walkthroughs.

6. 📄 **[Interview.md — Comprehensive Interview Questions & Answers](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/notes/Interview.md)**
   - Technical interview guide covering 20+ questions on GitHub Webhooks, Octokit Pagination, Durable State Memoization, and LLM Diff Prompt Engineering.

---

## 💻 Code Repository Location

All production implementation files reside under:
`file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code`

- 📄 [package.json](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code/package.json)
- 📄 [src/index.js](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code/src/index.js)
- 📄 [lib/github.js](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code/lib/github.js)
- 📄 [agents/github-pr-review-agents.js](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code/agents/github-pr-review-agents.js)
- 📄 [src/inngest/functions/github-review.js](file:///home/aminul/development/gen-ai-cohort/week07/learning/day14/code/src/inngest/functions/github-review.js)
