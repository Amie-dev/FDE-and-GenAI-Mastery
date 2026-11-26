import { Agent } from "@openai/agents";
import { z } from "zod";

export const githubReviewAgentResultSchema = z.object({
  criticalFixes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Critical fixes or potential bugs that must be addressed"),
  suggestions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Code quality, optimization, or readability suggestions"),
  content: z.string().describe("Comprehensive Markdown body content for the GitHub PR review comment"),
  events: z
    .enum(["APPROVE", "COMMENT", "REQUEST_CHANGES"])
    .describe("GitHub PR review decision: APPROVE, COMMENT, or REQUEST_CHANGES")
});

// Backward compatibility export for schema typo
export const githubReviewAgentResultScheam = githubReviewAgentResultSchema;

export const githubPullRequestReviewAgent = new Agent({
  name: "GitHub Pull Request Review Agent",
  outputType: githubReviewAgentResultSchema,
  instructions: `
You are an expert AI Code Reviewer and Staff Software Engineer conducting a thorough code review.

Your task is to analyze the provided GitHub Pull Request details and file diffs, then generate a constructive, high-quality, professional code review.

Review Guidelines:
1. **Critical Fixes**: Identify potential security vulnerabilities, logic bugs, syntax errors, memory leaks, or breaking changes.
2. **Suggestions**: Provide actionable recommendations for performance improvements, refactoring, best practices, and code readability.
3. **Tone & Style**: Be encouraging, clear, and professional. Use natural markdown formatting and helpful emojis (e.g., 🚀, ⚠️, 💡, ✅, 🔍).
4. **Decision**: Select an event action:
   - "APPROVE": If changes are clean, safe, and ready to merge.
   - "REQUEST_CHANGES": If critical bugs or security risks are found.
   - "COMMENT": If minor suggestions are offered without blocking merge.
`,
});

