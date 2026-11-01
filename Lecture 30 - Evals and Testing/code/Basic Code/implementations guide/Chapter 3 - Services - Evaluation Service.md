# Chapter 3 — Services (`src/services/evaluationService.ts`)

> Purpose: Hold the deterministic evaluators and the eval runner — the core of Lecture 30 Chapter 02 (anatomy of an eval) and Chapter 04 (deterministic evaluation).

## 1. File Details

- **Path:** `src/services/evaluationService.ts`
- **Role:** Pure functions: `factInclusion`, `jsonSchemaCheck`, `toolCallCheck`, `runCase`, `runEval`. No Express, no HTTP — easy to unit test.
- **Notes mapping:** Chapter 02 (run an eval / eval runner), Chapter 04 (string/regex, JSON schema, tool call verification).
- **Command:** none — imported by `src/controllers/evalController.ts`.

## 2. Full Code File

```typescript
// services/evaluationService.ts — Deterministic evaluators + eval runner
// Maps to Lecture 30 notes: Chapter 02 (anatomy of an eval), Chapter 04 (deterministic evaluation)

import { EvalCase, EvalReport, EvalResult, TestInput } from "../types/index.js";

/** Chapter 04 — string / regex: does the answer contain a required fact? */
export function factInclusion(answer: string, fact: string): boolean {
  return answer.toLowerCase().includes(fact.toLowerCase());
}

/** Chapter 04 — JSON schema: is the output valid JSON with all required keys? */
export function jsonSchemaCheck(output: string, requiredKeys: string[]): boolean {
  try {
    const parsed = JSON.parse(output);
    return requiredKeys.every((key) => key in parsed);
  } catch {
    return false;
  }
}

/** Chapter 04 — tool call verification: was the expected tool called? */
export function toolCallCheck(
  calls: { name: string }[],
  expectedName: string,
): boolean {
  return calls.some((call) => call.name === expectedName);
}

/** Chapter 02 — run one test case through the system + deterministic evaluators. */
export function runCase(
  caseItem: EvalCase,
  output: { answer: string; toolCalls?: { name: string }[] },
): EvalResult {
  const scores = [];
  const { answer, toolCalls = [] } = output;

  // String inclusion checks (Chapter 04 — string / regex)
  for (const fact of caseItem.expected.mustInclude || []) {
    const passed = factInclusion(answer, fact);
    scores.push({ name: `include:${fact}`, score: passed ? 1 : 0, passed });
  }

  // Tool call verification (Chapter 04 — tool calls)
  if (caseItem.expected.requiredTool) {
    const passed = toolCallCheck(toolCalls, caseItem.expected.requiredTool);
    scores.push({
      name: `tool:${caseItem.expected.requiredTool}`,
      score: passed ? 1 : 0,
      passed,
    });
  }

  const passed = scores.every((s) => s.passed);
  return { caseId: caseItem.id, scores, passed };
}

/** Chapter 02 — run the whole eval suite (the eval runner). */
export function runEval(
  suiteName: string,
  cases: EvalCase[],
  system: (input: TestInput) => { answer: string; toolCalls?: { name: string }[] },
): EvalReport {
  const results = cases.map((tc) => {
    const output = system(tc.input);
    return runCase(tc, output);
  });

  return {
    suiteName,
    totalCases: cases.length,
    passedCases: results.filter((r) => r.passed).length,
    results,
  };
}
```

## 3. Block-by-Block Explanation

### `import { ... } from "../types/index.js";`
- Imports the shared interfaces so the service stays typed without duplicating shapes.

### `export function factInclusion(answer, fact) { ... }` — Chapter 04 string / regex
- Lowercases both strings and checks `includes`. Returns `true` if the required fact appears anywhere in the answer.
- This is the simplest deterministic check: fast, free, reproducible (Chapter 04 rule: start with code).

### `export function jsonSchemaCheck(output, requiredKeys) { ... }` — Chapter 04 JSON schema
- Tries `JSON.parse(output)`. If it throws, returns `false`. Otherwise checks every required key exists.
- Gives an objective pass/fail for structured outputs (Chapter 04).

### `export function toolCallCheck(calls, expectedName) { ... }` — Chapter 04 tool calls
- Returns `true` if any recorded tool call matches `expectedName`.
- Verifies the system invoked the right tool (Chapter 04 tool call verification).

### `export function runCase(caseItem, output) { ... }` — Chapter 02 run one case
- Wires the four components together for one test case:
  1. Runs the system (already done by the caller).
  2. Scores with each deterministic evaluator (fact inclusion, tool call).
  3. A case passes only when every score passes.
- Returns `{ caseId, scores, passed }`.

### `export function runEval(suiteName, cases, system) { ... }` — Chapter 02 eval runner
- The eval runner pseudo-code from the notes, made runnable.
- For each case: calls `system(input)` to get output, then `runCase` to score it.
- Returns the suite report: `suiteName`, `totalCases`, `passedCases`, `results`.

## 4. How It Works With the Rest of the App

`src/controllers/evalController.ts` imports `runEval` and calls it inside the `POST /api/eval/run` handler, passing a stub `system` function. Replace that stub with your real RAG / model call to evaluate a real system.