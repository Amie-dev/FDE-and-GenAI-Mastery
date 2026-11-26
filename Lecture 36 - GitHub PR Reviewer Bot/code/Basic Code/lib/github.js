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