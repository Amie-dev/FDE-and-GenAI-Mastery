# 02 — Octokit Integration & GitHub Diff Parsing

## 📌 Introduction

To build a reliable GitHub PR Review Bot, the system must interact with the GitHub REST API using the official SDK: `@octokit/rest`.

This module covers:
1. Octokit client authentication and initialization.
2. Fetching PR metadata and handling edge cases (draft PRs, closed PRs, non-existent PRs).
3. Paginated diff extraction using `octokit.paginate`.
4. Token context window optimization (ignoring lockfiles, minified bundles, asset files).

---

## 🔑 Octokit Setup & Authentication

Octokit requires a **Personal Access Token (PAT)** or GitHub App Installation Token with `repo` permissions to access public/private repository details and post comments.

```javascript
// lib/github.js
import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({
  auth: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,
  userAgent: "pullrequest-review-bot",
});
```

---

## 📑 1. Fetching Pull Request Metadata

When a webhook fires, we receive minimal data (`owner`, `repo`, `pull_number`). We query `octokit.pulls.get()` to retrieve the complete state of the PR:

```javascript
export async function getPullRequestDetails(owner, repo, pullNumber) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: Number(pullNumber),
  });

  return {
    id: data.id,
    title: data.title,
    state: data.state, // 'open', 'closed'
    number: data.number,
    commentsCount: data.comments,
    url: data.html_url,
    diffUrl: data.diff_url,
    changedFilesCount: data.changed_files,
    commitsCount: data.commits,
    isDraft: data.draft, // true / false
    user: {
      login: data.user.login,
      avatarUrl: data.user.avatar_url,
    },
    head: { ref: data.head.ref, sha: data.head.sha },
    base: { ref: data.base.ref, sha: data.base.sha },
  };
}
```

### Critical Checks Before AI Analysis:
- **PR Existence Check (404 Handling):** If `pulls.get()` throws an HTTP 404, gracefully abort.
- **Draft PR Check:** Skip AI analysis for draft PRs to avoid wasting tokens on work-in-progress code.
- **Merged / Closed PR Check:** Skip PRs that are already merged or closed.

---

## 🔍 2. Paginated Diff Fetching & Filtering

Large PRs can modify dozens of files. Standard API responses cap results at 30 items per page. We use `octokit.paginate` to collect all modified files reliably.

```javascript
export async function getPullRequestFiles(owner, repo, pullNumber) {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: Number(pullNumber),
    per_page: 100,
  });

  // Filter out lockfiles and build artifacts to conserve context window tokens
  const ignoredExtensions = [
    ".lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".min.js",
    ".min.css",
    ".map",
  ];

  return files
    .filter((file) => !ignoredExtensions.some((ext) => file.filename.endsWith(ext)))
    .map((file) => ({
      fileName: file.filename,
      status: file.status, // 'added', 'modified', 'removed', 'renamed'
      changes: file.changes,
      patch: file.patch || "", // The actual Unified Diff snippet
      additions: file.additions,
      deletions: file.deletions,
      previous_filename: file.previous_filename,
    }));
}
```

---

## 💬 3. Submitting PR Reviews & Comments

GitHub provides two distinct APIs for posting feedback:
1. **Issue Comments (`octokit.issues.createComment`):** Posts a general top-level comment on the PR conversation thread.
2. **Pull Request Reviews (`octokit.pulls.createReview`):** Submits an official review status (`APPROVE`, `REQUEST_CHANGES`, or `COMMENT`).

```javascript
export async function postPRReview(owner, repo, pullNumber, body, event = "COMMENT") {
  return await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: Number(pullNumber),
    body,
    event, // 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
  });
}
```
