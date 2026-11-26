#!/usr/bin/env node
/**
 * package_skill.js - Skill Archiver & Zipper tool for Node.js.
 * Validates a skill directory first, then packages it into a clean .zip archive.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { validateSkillDirectory } from './validate_skill.js';

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

function main() {
  const args = parseArgs();
  const skillPath = args['skill-path'] || args.skillPath;
  const outputDir = args['output-dir'] || args.outputDir || './dist';

  if (!skillPath) {
    console.error(JSON.stringify({ status: 'FAILED', error: '--skill-path is required' }));
    process.exit(1);
  }

  const absSkillPath = path.resolve(skillPath);
  const absOutputDir = path.resolve(outputDir);

  console.log(`📦 Validating skill before packaging: ${absSkillPath}`);
  const report = validateSkillDirectory(absSkillPath);

  if (report.status !== 'PASSED') {
    console.error(`❌ Cannot package invalid skill. Errors:\n`, report.errors);
    process.exit(1);
  }

  if (!fs.existsSync(absOutputDir)) {
    fs.mkdirSync(absOutputDir, { recursive: true });
  }

  const folderName = report.folder_name;
  const zipFileName = `${folderName}.zip`;
  const zipFilePath = path.join(absOutputDir, zipFileName);

  if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
  }

  console.log(`🔨 Zipping skill folder to: ${zipFilePath}`);
  try {
    const parentDir = path.dirname(absSkillPath);
    execSync(`zip -r "${zipFilePath}" "${folderName}"`, { cwd: parentDir, stdio: 'inherit' });
    console.log(`\n✅ Skill successfully packaged: ${zipFilePath}`);
  } catch (err) {
    console.error(`❌ Failed to package zip archive: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1].endsWith('package_skill.js')) {
  main();
}
