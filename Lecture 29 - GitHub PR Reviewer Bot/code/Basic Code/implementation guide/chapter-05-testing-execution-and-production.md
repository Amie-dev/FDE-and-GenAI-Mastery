# Chapter 5: Testing, Execution & Production Deployment

> 📌 **Relevant Source Files:**
> - ⚡ [`src/index.js`](../src/index.js) — Express server & webhook endpoints
> - 🔄 [`src/inngest/functions/github-review.js`](../src/inngest/functions/github-review.js) — Inngest durable function

---

## Introduction

Testing an event-driven background workflow requires validating both the HTTP ingestion API and the durable step orchestration engine.

This chapter walks through local development setups, running the Inngest CLI Dev Server, invoking manual triggers, forwarding GitHub webhooks via tunnel tools (e.g. ngrok), and preparing for production deployment.

---

## 🛠 Local Development Environment Setup

### Step 1: Start the Express Server
In Terminal 1, start the application dev server:

```bash
cd week07/learning/day14/code
npm run dev
```

Output:
```text
🚀 GitHub AI PR Review Bot server running on http://localhost:3000
⚡ Inngest endpoint serving at http://localhost:3000/api/inngest
```

---

### Step 2: Launch the Inngest Dev Server
In Terminal 2, start the Inngest CLI local development server:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

This launches the local Inngest Dashboard at `http://127.0.0.1:8288`.

```text
Inngest Dev Server running at http://127.0.0.1:8288
Connected to app: github-review-applications
Found function: github-pr-review
```

---

## 🧪 Testing Workflows

### 1. Testing via Health Endpoint

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "status": "online",
  "service": "GitHub AI PR Reviewer Bot",
  "endpoints": {
    "inngest": "/api/inngest",
    "manualReview": "POST /api/review",
    "githubWebhook": "POST /webhook/github"
  }
}
```

---

### 2. Testing Manual Review Endpoint (`POST /api/review`)

Send a manual review trigger for any public GitHub Pull Request:

```bash
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"owner": "octocat", "repo": "Hello-World", "pull_number": 1}'
```

Response:
```json
{
  "message": "PR review workflow triggered successfully",
  "eventId": "01J8X90Z...",
  "owner": "octocat",
  "repo": "Hello-World",
  "pull_number": 1
}
```

Observe the step execution live in the Inngest Dashboard at `http://127.0.0.1:8288`.

---

## 🌐 Testing Live GitHub Webhooks with ngrok

To receive live webhooks from a real GitHub repository on your local machine:

1. Start ngrok tunnel on port `3000`:
   ```bash
   ngrok http 3000
   ```
   Copy the generated public HTTPS URL (e.g. `https://a1b2c3d4.ngrok-free.app`).

2. Navigate to your GitHub Repository Settings → **Webhooks** → **Add Webhook**:
   - **Payload URL**: `https://a1b2c3d4.ngrok-free.app/webhook/github`
   - **Content type**: `application/json`
   - **Which events would you like to trigger this webhook?**: Select **Pull requests**.

3. Open or sync a Pull Request on the repository. GitHub will transmit a `pull_request` event, triggering the full 5-step Inngest AI review workflow automatically.

---

## 🚀 Production Deployment Checklist

When deploying the GitHub AI PR Reviewer Bot to production (e.g. Render, Railway, AWS ECS, Vercel):

1. **Environment Variables**:
   - `OPENAI_API_KEY`: Set a production OpenAI API Key with access to `gpt-4o`.
   - `GITHUB_PAT`: Set a GitHub Personal Access Token or GitHub App Installation Token with write permissions for `pull_requests` and `issues`.
   - `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`: Set Inngest Cloud keys to secure communication between Inngest Cloud and your app.
2. **Concurrency Limits**:
   - Configure Inngest concurrency options in `inngest.createFunction` to respect GitHub API rate limits (e.g., max 5 concurrent runs).
3. **Webhook Security**:
   - Validate GitHub Webhook signatures (`x-hub-signature-256`) using a shared secret in `src/index.js` to ensure incoming webhooks originate strictly from GitHub.
