# Sentry & GitHub Multi-MCP Coordination Protocol

## Workflow Blueprint

1. **Query Telemetry (Sentry MCP)**:
   - Tool: `sentry_get_issue_details`
   - Input: `issue_id`
   - Extract: `culprit_frame.filename`, `culprit_frame.lineno`, `exception_type`.

2. **Retrieve PR Diff (GitHub MCP)**:
   - Tool: `github_get_pull_request_diff`
   - Input: `repo`, `pull_number`
   - Check if `culprit_frame.filename` matches modified files in PR.

3. **Formulate Fix**:
   - Compare modified lines with `context_line`.
   - Ensure fix does not swallow exceptions silently.

4. **Post Review Comment**:
   - Tool: `github_create_pull_request_review_comment`
   - Attach diagnostic breakdown and suggested code patch.
