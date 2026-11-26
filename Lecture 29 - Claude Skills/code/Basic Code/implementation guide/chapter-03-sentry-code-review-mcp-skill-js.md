# 🌐 Chapter 3: `sentry-code-review` Multi-MCP Skill Guide

---

## 🎯 Architecture Overview

`sentry-code-review` showcases Category 3 Multi-MCP Coordination across Sentry MCP and GitHub MCP servers.

```
sentry-code-review/
├── SKILL.md                          # Multi-MCP instruction workflow
├── scripts/
│   └── analyze_stacktrace.js         # Stack trace parsing & context extractor
└── references/
    └── sentry-github-workflow.md     # Sequence diagram & parameter mapping
```

---

## 🔄 Sequential Execution Steps

1. **Sentry Error Telemetry**: Fetches exception stack trace via `sentry_get_issue`.
2. **Stack Trace Parsing**: Executes `analyze_stacktrace.js` to extract line number, culprit frame, and context line:
   ```bash
   node scripts/analyze_stacktrace.js --issue-id SENTRY-101
   ```
3. **GitHub Diff Analysis**: Pulls PR diff via `github_get_pull_request_diff` and correlates changes.
4. **Automated PR Review**: Posts review comment with pinpointed fix via `github_create_pull_request_review_comment`.
