import fs from 'node:fs/promises';
import path from 'node:path';
import { DENIED_NAMES, QUOTAS, WORKSPACE_ROOT } from '../config/config.js';

/**
 * Chapter 05 — the sandbox's only trust boundary.
 *
 * Every filesystem tool routes its path through `safePath` FIRST. If you skip it
 * in one tool, you have skipped it everywhere (chapter 05 §05.9).
 */

/** A denial that must be reported, not thrown past the loop. */
export class SecurityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

/**
 * Chapter 05 §05.4 — THE single most important function in this codebase.
 *
 * Two mandatory containment checks that fail on two different attacks:
 *   • lexical  — stops `../` traversal and sibling-prefix bypasses
 *   • canonical — stops symlink escapes (a string check cannot see a link's target)
 */
export const safePath = async (rawPath: string, root: string = WORKSPACE_ROOT): Promise<string> => {
  if (typeof rawPath !== 'string' || rawPath.trim() === '') {
    throw new SecurityError('INVALID_PATH', 'A non-empty path is required.');
  }
  if (rawPath.length > QUOTAS.maxPathLength) {
    throw new SecurityError('PATH_TOO_LONG', `Path exceeds ${QUOTAS.maxPathLength} characters.`);
  }

  // 0. Encoded separators are rejected outright. '..%2f..%2fsrc' is an attempt to
  //    smuggle a traversal past a decoder further down the stack, so the string is
  //    never trusted in ANY encoding (chapter 05 §05.3 vector 1).
  if (/%2e|%2f|%5c|%00/i.test(rawPath)) {
    throw new SecurityError('ENCODED_TRAVERSAL', `Access denied: '${rawPath}' contains encoded path separators.`);
  }

  // 1. Canonicalise. This collapses '..' and '.' segments — BEFORE any inspection.
  const target = path.resolve(root, rawPath);

  // 2. Lexical containment. The trailing separator is the whole point: without it
  //    '/ws-evil' would pass a naive startsWith('/ws') check.
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new SecurityError('OUTSIDE_WORKSPACE', `Access denied: '${rawPath}' resolves outside the workspace.`);
  }

  // 3. Canonical containment — defeats symlink escapes.
  try {
    const real = await fs.realpath(target);
    if (real !== root && !real.startsWith(root + path.sep)) {
      throw new SecurityError('SYMLINK_ESCAPE', `Access denied: '${rawPath}' escapes the workspace via a symlink.`);
    }
  } catch (err) {
    // 4. ENOENT is NOT an error: a *new* file has no realpath yet. Creation must be
    //    allowed, and the lexical check above has already contained it.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  // 5. Chapter 05 §05.3 vector 3 — the sensitive-name deny-list, even inside the jail.
  const segments = path.relative(root, target).split(path.sep).filter(Boolean);
  const denied = segments.find((segment) => DENIED_NAMES.includes(segment));
  if (denied) {
    throw new SecurityError('DENIED_NAME', `Access denied: '${denied}' is on the sensitive-name deny-list.`);
  }

  return target;
};

/** Chapter 05 §05.7 — how deep is this path below the jail root? */
export const depthOf = (target: string, root: string = WORKSPACE_ROOT): number =>
  path.relative(root, target).split(path.sep).filter(Boolean).length;

/**
 * Chapter 05 §05.7 — quotas, enforced inside the tool and never in the prompt.
 * A quota in a system prompt is a suggestion; a quota in code is a control.
 */
export const enforceQuotas = async (target: string, incomingBytes: number, root: string = WORKSPACE_ROOT): Promise<void> => {
  if (depthOf(target, root) > QUOTAS.maxDepth) {
    throw new SecurityError('QUOTA_DEPTH', `Directory depth exceeds the ${QUOTAS.maxDepth}-level quota.`);
  }
  if (incomingBytes > QUOTAS.maxFileBytes) {
    throw new SecurityError('QUOTA_FILE_SIZE', `Payload exceeds the ${QUOTAS.maxFileBytes}-byte per-file quota.`);
  }

  let files = 0;
  let bytes = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(child).catch(() => ({ size: 0 }))).size;
      }
    }
  };
  await walk(root);

  if (files + 1 > QUOTAS.maxFiles) {
    throw new SecurityError('QUOTA_FILE_COUNT', `Workspace file count would exceed the ${QUOTAS.maxFiles}-file quota.`);
  }
  if (bytes + incomingBytes > QUOTAS.maxWorkspaceBytes) {
    throw new SecurityError('QUOTA_WORKSPACE_BYTES', `Workspace would exceed the ${QUOTAS.maxWorkspaceBytes}-byte quota.`);
  }
};
