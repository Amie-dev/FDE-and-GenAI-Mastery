# 🎯 Week 07 — Day 14 Technical Interview Master Guide

# AI PR Reviewer Bot, Octokit, Inngest & LLM Workflows

---

### Q1: Why should an AI Code Review Bot be built using an asynchronous workflow engine like Inngest rather than a simple synchronous HTTP endpoint?

**Answer:**
A simple synchronous HTTP endpoint processes all work within a single request-response cycle. This presents several major failure points in production:
1. **Gateway & Proxy Timeouts:** LLM inferences for complex or multi-file PR diffs often take 20–60 seconds. Modern serverless platforms and API gateways (Vercel, AWS API Gateway, Nginx) forcibly terminate connections idle after 10–30 seconds.
2. **Lack of State Checkpoints:** If the process crashes during LLM inference or while posting to GitHub, the entire state is lost. Retrying requires re-fetching all metadata and re-running LLM inferences, burning expensive OpenAI API tokens needlessly.
3. **Rate Limit Throttling:** GitHub APIs enforce strict rate limits (5,000 requests/hour). Uncoordinated parallel synchronous requests risk `429 Too Many Requests` errors.

In contrast, an event-driven engine like Inngest divides execution into durable steps (`step.run()`). Each completed step is memoized in persistent storage. If a step fails due to network issues or rate limits, Inngest automatically retries **only that specific step** using exponential backoff without repeating already completed steps.

---

### Q2: How does `octokit.paginate` differ from `octokit.pulls.listFiles` for fetching PR changes, and why is pagination necessary?

**Answer:**
GitHub's REST API limits array payloads to 30 items per page by default (up to a maximum of 100). If a Pull Request modifies 150 files, a single call to `octokit.pulls.listFiles({ pull_number: 1 })` returns only the first page (30 or 100 files), silently ignoring the rest.

`octokit.paginate(octokit.pulls.listFiles, options)` automatically navigates through all pagination headers (`Link: <...page=2>`), concats every page result, and returns a unified array of all modified files in the PR.

---

### Q3: How do you prevent LLM Context Window Overflow when analyzing large Pull Request diffs?

**Answer:**
1. **Filtering Non-Reviewable Lockfiles:** Large generated files (e.g. `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, compiled bundles like `.min.js`, or binary assets) consume thousands of tokens without yielding meaningful review insights. We filter them out before assembling the LLM prompt.
2. **Patch Truncation:** We slice individual patch diffs to reasonable lengths (e.g. max 500 lines per patch).
3. **Batching / Chunking:** If a PR modifies 50+ source files, we divide file changes into batches of 10–15 files, run separate step invocations for each batch, and concatenate or synthesize the final review output.

---

### Q4: Why is Zod schema validation critical when working with `@openai/agents` in automated workflows?

**Answer:**
Unstructured plain-text LLM outputs suffer from non-deterministic formatting. An LLM might return Markdown in one run, JSON in another, or omit crucial structural fields.

By passing a Zod schema (`outputType: githubReviewAgentResultSchema`) to `@openai/agents`, OpenAI's Structured Outputs feature enforces strict JSON Schema matching via constrained sampling at the decoder level. This guarantees that the returned object matches our expected TypeScript/JavaScript structure (`criticalFixes`, `suggestions`, `content`, `events`) 100% of the time without risk of JSON parse errors.

---

### Q5: How do GitHub Issue Comments (`octokit.issues.createComment`) differ from GitHub Pull Request Reviews (`octokit.pulls.createReview`)?

**Answer:**
- **`octokit.issues.createComment`:** Posts a generic top-level comment on the PR conversation thread. It does not update the PR's merge status or review state.
- **`octokit.pulls.createReview`:** Submits an official GitHub Pull Request Review with an explicit state action:
  - `APPROVE`: Marks the PR as approved for merge.
  - `REQUEST_CHANGES`: Blocks PR merge until changes are made.
  - `COMMENT`: Leaves formal review comments without altering merge blocking status.

---

### Q6: How does step memoization work in Inngest when a function is re-executed?

**Answer:**
When an Inngest function runs, the SDK reports step completion back to the Inngest engine over HTTP. When a step finishes:
1. Inngest saves the returned JSON data into its durable state store associated with that function run ID.
2. If a subsequent step fails or throws an exception, Inngest schedules a function retry.
3. Upon re-execution, when code reaches a previously completed `step.run("step-id", ...)` block, the SDK intercepts the call, skips execution of the callback function entirely, and instantly returns the cached result from state.

---

### Q7: What strategy is used to handle draft PRs or closed PRs gracefully in the workflow?

**Answer:**
During Step 1 (`fetch-pull-request-information`), we inspect `pullRequestInfo.state` and `pullRequestInfo.isDraft`. If `state !== "open"` or `isDraft === true`, the workflow returns early with `{ skipped: true }`. Returning early prevents wasting compute resources and LLM API calls on incomplete or closed PRs.

---

### Q8: What security considerations exist when receiving GitHub Webhooks on an Express server?

**Answer:**
1. **Webhook Signature Verification (`x-hub-signature-256`):** Validate that incoming POST requests originate from GitHub by computing an HMAC-SHA256 hash using a shared secret.
2. **Payload Size Limits:** Protect Express routes from DoS attacks by setting explicit payload limits (`express.json({ limit: '10mb' })`).
3. **Secret Storage:** Store GitHub Personal Access Tokens and OpenAI API keys strictly in environment variables (`process.env`), never committing them to source control.

---

### Q9: What happens if `process.env.OPENAI_API_KEY` is missing in our PR Review function?

**Answer:**
In `src/inngest/functions/github-review.js`, we implemented a fallback handler: if `OPENAI_API_KEY` is missing, a warning is logged and a structured mock response is returned. This enables local development and offline integration testing without throwing unexpected runtime errors or requiring active API keys.

---

### Q10: How can you manually trigger the PR review workflow for testing?

**Answer:**
We expose a POST endpoint `/api/review` on the Express server:
```bash
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"owner": "octocat", "repo": "Hello-World", "pull_number": 1}'
```
This endpoint calls `inngest.send({ name: "github/pullrequest.review", data: { owner, repo, pull_number } })`, triggering the durable execution workflow immediately.
