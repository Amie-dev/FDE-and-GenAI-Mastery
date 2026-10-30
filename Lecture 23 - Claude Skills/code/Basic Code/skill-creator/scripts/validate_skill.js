#!/usr/bin/env node
/**
 * validate_skill.js - Automated Claude Skill Validator & Linter in Node.js.
 * Validates file structure, casing rules, frontmatter fields, XML tag restrictions,
 * and description triggers against official Anthropic Skill standards.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = val;
    }
  }
  return params;
}

export function validateSkillDirectory(skillFolderPath) {
  const absPath = path.resolve(skillFolderPath);
  const errors = [];
  const warnings = [];
  const folderName = path.basename(absPath);

  // Rule 1: Folder naming must be kebab-case
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(folderName)) {
    errors.push(`[Rule 1] Folder name '${folderName}' must be strict kebab-case (e.g., 'my-skill-name'). No spaces, capitals, or underscores.`);
  }

  // Check folder exists
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    return { status: 'ERROR', errors: [`Skill path '${absPath}' does not exist or is not a directory.`], warnings };
  }

  const filesInDir = fs.readdirSync(absPath);

  // Rule 2: SKILL.md exact casing
  const hasExactSkillMd = filesInDir.includes('SKILL.md');
  const insensitiveMatch = filesInDir.find(f => f.toLowerCase() === 'skill.md');

  if (!hasExactSkillMd) {
    if (insensitiveMatch) {
      errors.push(`[Rule 2] SKILL.md entrypoint file found as '${insensitiveMatch}'. Must be EXACT case 'SKILL.md'.`);
    } else {
      errors.push(`[Rule 2] SKILL.md entrypoint file missing in '${absPath}'.`);
    }
  }

  // Rule 3: NO README.md inside skill directory
  const hasReadme = filesInDir.some(f => f.toLowerCase() === 'readme.md');
  if (hasReadme) {
    errors.push(`[Rule 3] Banned 'README.md' found inside skill folder. Move documentation into SKILL.md or references/ directory.`);
  }

  // Parse SKILL.md if present
  if (hasExactSkillMd) {
    const skillContent = fs.readFileSync(path.join(absPath, 'SKILL.md'), 'utf-8');
    const frontmatterMatch = skillContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!frontmatterMatch) {
      errors.push(`[Rule 4] SKILL.md is missing valid YAML frontmatter delimited by top and bottom '---'.`);
    } else {
      const rawFrontmatter = frontmatterMatch[1];
      
      // Rule 5: Forbidden XML tags in frontmatter
      if (/[<>]/.test(rawFrontmatter)) {
        errors.push(`[Rule 5] Frontmatter contains forbidden XML angle brackets ('<' or '>'). Security restriction violation.`);
      }

      // Parse YAML key-values simple parser
      const nameMatch = rawFrontmatter.match(/^name:\s*(.+)$/m);
      const descMatch = rawFrontmatter.match(/^description:\s*([\s\S]*?)(?=\n[a-z0-9_-]+:|$)/m);

      if (!nameMatch) {
        errors.push(`[Rule 6] Required frontmatter field 'name:' is missing.`);
      } else {
        const nameVal = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (!kebabRegex.test(nameVal)) {
          errors.push(`[Rule 6] Frontmatter name '${nameVal}' must be kebab-case.`);
        }
        if (nameVal !== folderName) {
          warnings.push(`Frontmatter name '${nameVal}' does not match folder name '${folderName}'. Recommended to keep them identical.`);
        }
        if (/claude|anthropic/i.test(nameVal)) {
          errors.push(`[Rule 6] Skill name '${nameVal}' uses reserved terms ('claude' or 'anthropic').`);
        }
      }

      if (!descMatch) {
        errors.push(`[Rule 7] Required frontmatter field 'description:' is missing.`);
      } else {
        const descVal = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
        if (descVal.length > 1024) {
          errors.push(`[Rule 7] Description length (${descVal.length} chars) exceeds maximum allowed 1024 characters.`);
        }
        const hasTrigger = /use when|asks to|when user|triggers/i.test(descVal);
        if (!hasTrigger) {
          warnings.push(`Description should include explicit trigger phrases (e.g. "Use when user asks to...") to ensure reliable automatic triggering.`);
        }
      }
    }
  }

  const passed = errors.length === 0;
  return {
    status: passed ? 'PASSED' : 'FAILED',
    folder_name: folderName,
    errors,
    warnings,
    checks_passed: passed ? 7 - warnings.length : 0
  };
}

function main() {
  const args = parseArgs();
  const skillPath = args['skill-path'] || args.skillPath || process.cwd();

  console.log(`🔍 Validating Skill directory: ${skillPath}\n`);
  const report = validateSkillDirectory(skillPath);

  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASSED') {
    process.exit(1);
  }
}

if (process.argv[1].endsWith('validate_skill.js')) {
  main();
}
