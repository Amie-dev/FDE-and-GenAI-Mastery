# Chapter 1: GitHub API Integration & Diff Processing

> 📌 **Relevant Source File:**
> - 🛠 [`lib/github.js`](../lib/github.js) — Octokit REST API wrapper (`getPullRequestDetails`, `getPullRequestFiles`, `postPRComment`, `postPRReview`)

---

## Introduction

To review code changes automatically, an AI agent needs comprehensive context about the Pull Request: target branches, author metadata, commit count, changed file lists, and exact line patch diffs.

This chapter breaks down [`lib/github.js`](../lib/github.js), which encapsulates all GitHub REST API interactions using Octokit.

---

## 🔑 Octokit Client Initialization

The Octokit client is configured using environment variables (`GITHUB_PAT` or `GITHUB_TOKEN`). A custom `userAgent` is passed for API audit visibility.

```javascript
// lib/github.js (Lines 1-6)
import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({
  auth: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN,
  userAgent: "pullrequest-review-bot",
});
```

---

## 📊 Fetching Pull Request Details

The `getPullRequestDetails` function retrieves metadata required to make review decisions and construct agent context prompts.

```javascript
// lib/github.js (Lines 8-35)
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
```

### Key Metadata Fields:
- **`isDraft`**: Indicates if the PR is in draft mode. Draft PRs skip review to prevent premature feedback.
- **`state`**: Only `open` PRs are eligible for automated reviews.
- **`head` / `base`**: Specifies source and target branches/commit SHAs.

---

## 🔍 Paginated Diff Fetching & Token Filtering

When a PR touches dozens of files, auto-generated lockfiles (e.g. `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) can consume tens of thousands of tokens without providing value for code review.

`getPullRequestFiles` fetches file diffs with Octokit pagination (`octokit.paginate`) and strips out lockfiles:

```javascript
// lib/github.js (Lines 37-62)
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
```

### Why Pagination & Filtering Matter:
1. **Octokit Pagination**: standard `pulls.listFiles` limits responses to 30 files by default. `octokit.paginate` handles page accumulation automatically up to 100 files per page.
2. **Context Window Optimization**: Excluding `package-lock.json` prevents context overflows and reduces API costs significantly.

---

## 💬 Posting Review Feedback to GitHub

The bot supports two mechanisms for posting feedback back to GitHub:

### 1. Simple Issue Comment (`postPRComment`)
Used as a fallback when formal review permissions are restricted.

```javascript
// lib/github.js (Lines 64-74)
export async function postPRComment(owner, repo, pullNumber, body) {
  return await octokit.issues.createComment({
    owner,
    repo,
    issue_number: Number(pullNumber),
    body,
  });
}
```

### 2. Official Formal Pull Request Review (`postPRReview`)
Posts an official GitHub Review status (`APPROVE`, `REQUEST_CHANGES`, or `COMMENT`).

```javascript
// lib/github.js (Lines 76-87)
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

Next, proceed to [Chapter 2: Agent Definition & Zod Schemas](chapter-02-agent-definition-and-zod-schemas.md).
