# Chapter 2: Agent Definition & Structured Zod Schemas

> 📌 **Relevant Source File:**
> - 🤖 [`agents/github-pr-review-agents.js`](../agents/github-pr-review-agents.js) — OpenAI Agent definition, instructions & Zod schema (`githubReviewAgentResultSchema`)

---

## Introduction

Unstructured LLM responses can be difficult to process programmatically. A code review bot needs structured decisions (whether to approve or request changes) as well as categorized output arrays (critical fixes vs readability suggestions).

This chapter examines [`agents/github-pr-review-agents.js`](../agents/github-pr-review-agents.js), which leverages **Zod** and `@openai/agents` to guarantee strongly-typed structured output from the language model.

---

## 📐 Zod Output Schema Definition

The Zod schema `githubReviewAgentResultSchema` defines the precise JSON structure expected from the AI review agent.

```javascript
// agents/github-pr-review-agents.js (Lines 1-19)
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
```

### Field Specifications:
1. **`criticalFixes`**: Optional array of strings detailing security vulnerabilities, logic bugs, syntax errors, or breaking changes.
2. **`suggestions`**: Optional array of strings detailing refactoring ideas, performance optimizations, or style improvements.
3. **`content`**: Full Markdown formatted string representing the review body.
4. **`events`**: Strict Zod enum enforcing valid GitHub review action states (`APPROVE`, `COMMENT`, `REQUEST_CHANGES`).

---

## 🤖 OpenAI Agent Definition

The `githubPullRequestReviewAgent` is instantiated using the `Agent` class from `@openai/agents`.

```javascript
// agents/github-pr-review-agents.js (Lines 24-41)
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

### Key Architectural Concepts:
- **`outputType: githubReviewAgentResultSchema`**: Binds the Zod schema directly to the agent runtime. The SDK automatically appends JSON schema enforcement rules to the underlying API payload.
- **System Instructions**: Defines persona (Staff Software Engineer), review guidelines, tone/style formatting rules, and criteria for choosing between review decisions.

---

Next, proceed to [Chapter 3: Inngest Durable Workflow Engine](chapter-03-inngest-durable-workflow-engine.md).
