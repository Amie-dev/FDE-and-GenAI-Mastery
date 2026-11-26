# 03 — OpenAI Agents SDK & Structured Code Review

## 📌 Overview

To convert unstructured Git diffs into actionable, high-value code reviews, we use `@openai/agents` and **Zod** schema validation.

Unstructured text outputs from LLMs often suffer from formatting inconsistencies, missing sections, or invalid JSON. Using structured outputs guarantees that every review produced by our AI Agent conforms to an exact type-safe schema.

---

## 🎯 Zod Schema Definition

We define a strict output schema using Zod:

```javascript
// agents/github-pr-review-agents.js
import { Agent } from "@openai/agents";
import { z } from "zod";

export const githubReviewAgentResultSchema = z.object({
  criticalFixes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Critical fixes or potential bugs that must be addressed before merging"),
  suggestions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Code quality, optimization, refactoring, or readability suggestions"),
  content: z
    .string()
    .describe("Comprehensive Markdown body content for the GitHub PR review comment"),
  events: z
    .enum(["APPROVE", "COMMENT", "REQUEST_CHANGES"])
    .describe("GitHub PR review decision: APPROVE, COMMENT, or REQUEST_CHANGES")
});
```

---

## 🤖 Defining the Review Agent

We construct the AI Code Review Agent using the `Agent` class from `@openai/agents`:

```javascript
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
```

---

## ⚡ Executing Agent Inferences in Workflow Steps

Within an Inngest step, we execute the agent using `run()`:

```javascript
import { run } from "@openai/agents";
import { githubPullRequestReviewAgent } from "./agents/github-pr-review-agents.js";

const promptContext = `
Pull Request Details:
- Title: Fix user authentication token expiration bug
- Author: dev-user
- Changed Files Count: 3

File Diffs:
${JSON.stringify(fileChanges, null, 2)}
`;

const llmResponse = await run(githubPullRequestReviewAgent, promptContext);
console.log(llmResponse.finalOutput);
/* Output Schema:
{
  criticalFixes: ["Missing null check on process.env.JWT_SECRET"],
  suggestions: ["Consider wrapping async handler in try/catch block"],
  content: "### 🤖 AI Code Review Summary...",
  events: "REQUEST_CHANGES"
}
*/
```
