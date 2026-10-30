# 🛠️ Chapter 2: `skill-creator` & Linter JavaScript Implementation Guide

---

## 🎯 Architecture Overview

`skill-creator` is a meta-skill packaged with an automated Node.js linter script (`validate_skill.js`) and zipper packager (`package_skill.js`).

```
skill-creator/
├── SKILL.md                          # Meta-Skill instructions for creating skills
├── scripts/
│   ├── validate_skill.js             # Automated 7-rule JS Skill Linter
│   └── package_skill.js              # Skill archiver & zipper script
├── references/
│   └── frontmatter-spec.md           # YAML frontmatter specification
└── assets/
    └── skill-boilerplate.md          # Starter SKILL.md template
```

---

## 🔍 Automated Skill Linting Rules

The `validate_skill.js` linter automatically checks:

1. **Folder Naming**: Must be strict `kebab-case`.
2. **Entry Casing**: Entry file MUST be `SKILL.md` (exact case-sensitive match).
3. **No Internal `README.md`**: Asserts no `README.md` file exists inside the skill directory.
4. **Frontmatter Delimiters**: Must begin and end with `---`.
5. **XML Restrictions**: Banned `<` and `>` characters in YAML frontmatter.
6. **Name Constraints**: kebab-case, no reserved terms (`claude`, `anthropic`).
7. **Description Bounds**: Under 1024 characters; must contain capability + trigger phrases.

### Executing Linter

```bash
node skill-creator/scripts/validate_skill.js --skill-path ./pay-skill
```

```json
{
  "status": "PASSED",
  "folder_name": "pay-skill",
  "errors": [],
  "warnings": [],
  "checks_passed": 7
}
```

---

## 📦 Packaging Skills for Distribution

```bash
node skill-creator/scripts/package_skill.js --skill-path ./pay-skill --output-dir ./dist
```

Creates `./dist/pay-skill.zip` ready for upload to **Claude.ai > Settings > Capabilities > Skills**.
