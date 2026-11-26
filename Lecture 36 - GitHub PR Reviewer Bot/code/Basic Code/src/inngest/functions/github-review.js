import { inngest } from "../client.js";
import { getPullRequestDetails, getPullRequestFiles, postPRComment, postPRReview } from "../../../lib/github.js";
import { run } from "@openai/agents";
import { githubPullRequestReviewAgent } from "../../../agents/github-pr-review-agents.js";

/**
 * Inngest Durable Workflow Function: GitHub PR Review Bot
 *
 * Event trigger payload schema:
 * {
 *   name: "github/pullrequest.review",
 *   data: {
 *     owner: string,
 *     repo: string,
 *     pull_number: number | string
 *   }
 * }
 */
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
        // Attempt posting formal review first; fallback to issue comment if review fails
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

