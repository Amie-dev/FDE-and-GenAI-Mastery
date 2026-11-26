# Official Claude Skill YAML Frontmatter Specification

## Schema Overview

```yaml
---
name: kebab-case-name            # REQUIRED: 1-64 chars, kebab-case, no spaces/capitals/underscores
description: Capability summary # REQUIRED: Max 1024 chars, must include WHAT and WHEN
license: MIT                    # OPTIONAL: License identifier
compatibility: Environment reqs # OPTIONAL: 1-500 chars (Node 18+, network access)
allowed-tools: "Bash(node:*)"   # OPTIONAL: Restrict executable tool scope
metadata:                       # OPTIONAL: Key-value metadata object
  author: Team Name
  version: 1.0.0
  mcp-server: mcp-server-id
---
```

## Validation Rules & Restrictions

1. **Delimiters**: Must begin with `---` on Line 1 and end with `---` on a separate line.
2. **Forbidden Characters**: `<` and `>` XML angle brackets are strictly prohibited to prevent system prompt injection.
3. **Reserved Terminology**: `name` cannot contain `claude` or `anthropic`.
4. **Description Rule**: Must state both the domain capability and user trigger phrases.
