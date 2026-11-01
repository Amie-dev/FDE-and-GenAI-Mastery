# Chapter 0: Overview & System Setup

> 📌 **Relevant Source Files:**
> - 📄 [`package.json`](../package.json) — Node.js ES Module dependencies & scripts
> - 📄 [`.env.example`](../.env.example) — Template environment variables
> - 📄 [`.env`](../.env) — Active environment configuration
> - ⚡ [`src/index.js`](../src/index.js) — Express application entry point

---

## Introduction

In enterprise software development, automated code review tools play a pivotal role in ensuring code quality, security standards, and architectural adherence before merging Pull Requests. However, naive AI implementations (like synchronous HTTP calls to LLMs) suffer from timeout issues, loss of context, lack of resilience during rate limits, and unhandled webhook failures.

This chapter introduces the project architecture, tech stack, environment configuration, and foundational setup for the **GitHub AI Pull Request Reviewer Bot**.

---

## 🛠 Tech Stack Overview

1. **Inngest (`inngest`)**: Event-driven durable execution engine. Manages state step-memoization, automatic retries, background queues, and long-running execution without server timeouts.
2. **OpenAI Agents SDK (`@openai/agents`)**: Agent orchestration framework for constructing AI reviewers with structured input/output definitions and natural language reasoning.
3. **Octokit (`@octokit/rest`, `octokit`)**: Official GitHub REST API client SDK used to fetch PR metadata, paginate file diffs, and post formatted review comments.
4. **Express.js (`express`)**: HTTP server providing endpoints for Inngest step execution (`/api/inngest`), manual review triggers (`POST /api/review`), and GitHub webhook events (`POST /webhook/github`).
5. **Zod (`zod`)**: TypeScript/JavaScript schema validation engine powering structured output extraction from the AI model.
6. **Dotenv (`dotenv`)**: Secure local environment variable loader.

---

## 📄 Configuration Files Breakdown

### 1. `package.json`

The project uses ES Modules (`"type": "module"`), allowing clean native `import / export` syntax across Node.js runtime environments without Babel or bundler transpilations.

```json
{
  "name": "code",
  "version": "1.0.0",
  "description": "GitHub AI Pull Request Reviewer Automation Bot",
  "main": "./src/index.js",
  "scripts": {
    "dev": "node src/index.js"
  },
  "type": "module",
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^22.20.2"
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

### 2. Environment Setup (`.env` vs `.env.example`)

The application requires environment variables for API authentication and service ports.

`.env.example`:
```env
PORT=3000
GITHUB_PAT=your_github_personal_access_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

#### Key Variables Explained:
- **`PORT`**: HTTP port for the Express server (default `3000`).
- **`GITHUB_PAT`**: GitHub Personal Access Token (PAT) with `repo` scope permissions. Used by Octokit to authenticate API requests and post comments on repositories.
- **`OPENAI_API_KEY`**: OpenAI API Key used by `@openai/agents` to call models (e.g. GPT-4o). If omitted, the application degrades gracefully to **Simulated AI Review Mode**.

---

## 🏗 Directory Architecture & Relevant Paths Map

- 📄 [`.env`](../.env) — Environment configuration
- 📄 [`.env.example`](../.env.example) — Template environment variables
- 📄 [`package.json`](../package.json) — NPM dependencies and script configuration
- 🤖 [`agents/github-pr-review-agents.js`](../agents/github-pr-review-agents.js) — OpenAI Agent definition & Zod output schema
- 🛠 [`lib/github.js`](../lib/github.js) — Octokit REST API wrapper
- ⚡ [`src/index.js`](../src/index.js) — Express server and Inngest serve handler
- 🔌 [`src/inngest/client.js`](../src/inngest/client.js) — Inngest singleton client
- 🔄 [`src/inngest/functions/github-review.js`](../src/inngest/functions/github-review.js) — 5-step durable review function
- 📦 [`src/inngest/functions/index.js`](../src/inngest/functions/index.js) — Functions index exporter

---

## 🚀 Initialization & Setup Verification

1. Install all dependencies:
   ```bash
   cd week07/learning/day14/code
   npm install
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Confirm that Node.js v18+ or v20+ is active on your host machine:
   ```bash
   node -v
   ```

Now proceed to [Chapter 1: GitHub API Integration](chapter-01-github-api-integration.md) to explore the Octokit REST API wrapper layer.
