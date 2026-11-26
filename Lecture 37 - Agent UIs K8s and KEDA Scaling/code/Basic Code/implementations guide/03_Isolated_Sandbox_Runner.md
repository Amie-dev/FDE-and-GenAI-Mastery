# Chapter 03: Isolated Code Runner

> **Chapter goal:** implement `runIsolatedCode()` (`src/sandbox-runner.ts`) to block host network and filesystem access.
> **Notes chapter covered:** 06 (Safe Code Execution & Sandbox Isolation).

---

## 3.1 Full code: `src/sandbox-runner.ts`

File path: `code/Basic Code/src/sandbox-runner.ts`

```ts
import { execFileSync } from "node:child_process";

const BLOCKED_MODULES_AND_BUILTINS = [
  /\bimport\s+(?:os|subprocess|socket|http|urllib|ctypes|shutil|pathlib|importlib)\b/,
  /\bfrom\s+(?:os|subprocess|socket|http|urllib|ctypes|shutil|pathlib|importlib)\s+import\b/,
  /\b(?:open|eval|exec|__import__|compile)\s*\(/,
];

export interface SandboxRunResult {
  ok: boolean;
  output?: string;
  error?: string;
}

/**
 * Executes untrusted code in an isolated `python3 -I` subprocess with:
 * - Static import/builtin bans (blocks host filesystem & network modules)
 * - Stripped `env: {}` and strict wall-clock timeout
 */
export function runIsolatedCode(pythonCode: string, timeoutMs = 2000): SandboxRunResult {
  for (const pattern of BLOCKED_MODULES_AND_BUILTINS) {
    if (pattern.test(pythonCode)) {
      return {
        ok: false,
        error: `SandboxSecurityError: blocked host network/filesystem access (${pattern.source})`,
      };
    }
  }

  try {
    const stdout = execFileSync("python3", ["-I", "-c", pythonCode], {
      env: {},
      timeout: timeoutMs,
      maxBuffer: 128 * 1024,
      encoding: "utf-8",
    });
    return { ok: true, output: stdout.trim() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
```

### Explanation
- **Defense in depth:** Inside a `gVisor` Kubernetes pod, `runIsolatedCode()` adds application-level static import/builtin bans (`socket`, `os`, `open()`), `python3 -I` isolation, empty `env: {}`, and a `2000ms` timeout.

