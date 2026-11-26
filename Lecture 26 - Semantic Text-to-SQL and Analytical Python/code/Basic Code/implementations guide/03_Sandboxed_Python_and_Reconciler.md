# Chapter 03: Sandboxed Python & Numerical Reconciliation

> **Chapter goal:** implement `runSandboxedPython()` (`src/python-sandbox.ts`) and `reconcileNumbers()` (`src/reconciler.ts`).
> **Notes chapters covered:** 06 (Sandboxed Python) & 08 (Numerical Reconciliation).

---

## 3.1 Full code: `src/python-sandbox.ts`

File path: `code/Basic Code/src/python-sandbox.ts`

```ts
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
```

---

## 3.2 Full code: `src/reconciler.ts`

File path: `code/Basic Code/src/reconciler.ts`

```ts
export interface ReconciliationResult {
  reconciled: boolean;
  verifiedNumbers: number[];
  unmatchedNumbers: number[];
}

/**
 * Extracts all numeric literals from an LLM narrative and verifies that every number
 * matches an exact value in the SQL/Python ground-truth ledger within tolerance.
 */
export function reconcileNumbers(
  narrative: string,
  groundTruthLedger: Record<string, number>,
  tolerancePct = 0.005
): ReconciliationResult {
  const truthValues = Object.values(groundTruthLedger);
  const rawMatches = narrative.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
  const extracted = rawMatches.map((s) => Number(s.replace(/,/g, ""))).filter((n) => !Number.isNaN(n));

  const verifiedNumbers: number[] = [];
  const unmatchedNumbers: number[] = [];

  for (const num of extracted) {
    const isMatched = truthValues.some((truth) => {
      if (truth === 0) return num === 0;
      return Math.abs(num - truth) / Math.abs(truth) <= tolerancePct;
    });
    if (isMatched) verifiedNumbers.push(num);
    else unmatchedNumbers.push(num);
  }

  return {
    reconciled: unmatchedNumbers.length === 0,
    verifiedNumbers,
    unmatchedNumbers,
  };
}
```

### Explanation
- **`runSandboxedPython()`:** Blocks dangerous OS/network imports statically, then runs `python3 -I` with `env: {}` and a `2000ms` timeout.
- **`reconcileNumbers()`:** Parses every numeric literal out of the narrative and fails if any number deviates from the ground-truth ledger by more than `0.5%`.

