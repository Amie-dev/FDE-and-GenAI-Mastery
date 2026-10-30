---
name: skill-creator
description: Interactive guide and validation engine for creating, linting, auditing, and packaging Claude Skills. Use when user asks to "create a new skill", "validate skill directory", "lint SKILL.md", "check frontmatter", or asks to "package skill for Claude".
license: MIT
compatibility: Requires Node.js 18+
metadata:
  author: GenAI Cohort Team
  version: 1.0.0
---

# Claude Skill Creator & Validator Meta-Skill

## Overview
`skill-creator` is a meta-skill that provides automated linting, auditing, structural validation, and packaging tools to create high-quality, production-ready Claude Skills.

---

## Instructions

### Step 1: Validate & Audit Skill Directory
To verify an existing skill directory against official Anthropic technical standards, run the bundled JavaScript validator script:

```bash
node scripts/validate_skill.js --skill-path {path_to_skill_folder}
```

*What the validator checks*:
1. **File Casing**: Ensures entry file is strictly named `SKILL.md` (case-sensitive).
2. **Folder Naming**: Verifies folder name uses `kebab-case` (no spaces/capitals/underscores).
3. **No Internal `README.md`**: Asserts no `README.md` exists *inside* the skill folder.
4. **Frontmatter Syntax**: Validates `---` YAML delimiters, required `name` and `description` fields.
5. **Frontmatter Security**: Ensures no XML tags (`<` or `>`) exist in metadata and name does not contain reserved words (`claude` or `anthropic`).
6. **Description Requirements**: Verifies description contains both capabilities and user trigger phrases, under 1024 characters.

---

### Step 2: Package Skill for Upload
Once validation passes with 0 errors, package the skill folder into a clean `.zip` archive ready for upload via **Claude.ai > Settings > Capabilities > Skills**:

```bash
node scripts/package_skill.js --skill-path {path_to_skill_folder} --output-dir ./dist
```

---

## Troubleshooting Checklist

| Issue | Verification Rule | Remediation |
| :--- | :--- | :--- |
| `ERR_SKILL_MD_MISSING` | File must be `SKILL.md` | Rename `skill.md` or `SKILL.MD` to `SKILL.md`. |
| `ERR_XML_TAG_FORBIDDEN` | No `<` or `>` allowed | Remove HTML/XML brackets from YAML frontmatter. |
| `ERR_INVALID_NAME` | Must be kebab-case | Convert folder name and frontmatter `name` to `kebab-case`. |
