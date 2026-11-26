import { execFileSync } from "node:child_process";

const BANNED_PYTHON_PATTERNS = [
  /\bimport\s+(?:os|subprocess|socket|http|urllib|ctypes|shutil|pathlib|importlib)\b/,
  /\bfrom\s+(?:os|subprocess|socket|http|urllib|ctypes|shutil|pathlib|importlib)\s+import\b/,
  /\b(?:open|eval|exec|__import__|compile)\s*\(/,
];

export interface PythonSandboxResult {
  ok: boolean;
  metrics?: Record<string, number>;
  error?: string;
}

/**
 * Executes analytical Python in an isolated subprocess:
 * - Static import/builtin guard blocks os, subprocess, socket, open(), eval()
 * - Runs `python3 -I` (isolated mode) with stripped env: {} and strict timeout
 */
export function runSandboxedPython(params: {
  pythonCode: string;
  inputData: unknown;
  timeoutMs?: number;
}): PythonSandboxResult {
  for (const pattern of BANNED_PYTHON_PATTERNS) {
    if (pattern.test(params.pythonCode)) {
      return {
        ok: false,
        error: `SandboxSecurityError: forbidden import or builtin matched (${pattern.source})`,
      };
    }
  }

  const wrapper = `
import json, sys, math, statistics
DATA = json.loads(${JSON.stringify(JSON.stringify(params.inputData))})
${params.pythonCode}
`;

  try {
    const stdout = execFileSync("python3", ["-I", "-c", wrapper], {
      env: {},
      timeout: params.timeoutMs ?? 2000,
      maxBuffer: 256 * 1024,
      encoding: "utf-8",
    });
    const parsed = JSON.parse(stdout.trim()) as Record<string, number>;
    return { ok: true, metrics: parsed };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

