# Chapter 1 — Types (`src/types/index.ts`)

> Purpose: Define the shared TypeScript interfaces that model an evaluation, following Lecture 30 Chapter 02 (anatomy of an eval) and Chapter 03 (test cases / golden data).

## 1. File Details

- **Path:** `src/types/index.ts`
- **Role:** Single source of truth for all eval shapes used by config, services, controllers, and routes.
- **Notes mapping:** Chapter 02 (Test Input, Expected Behaviour, Score), Chapter 03 (test case).
- **Command:** none — imported by other modules.

## 2. Full Code File

```typescript
// types/index.ts — Shared TypeScript interfaces for the Eval & Testing app
// Maps to Lecture 30 notes: Chapter 02 (anatomy of an eval), Chapter 03 (test cases / golden data)

/** Everything the system sees at inference time (Chapter 02 — Test Input). */
export interface TestInput {
  id: string;                                // test case id
  question: string;                          // user question
  context?: string[];                        // retrieved chunks
}

/** Checkable properties the output must satisfy (Chapter 02 — Expected Behaviour). */
export interface ExpectedBehaviour {
  mustInclude?: string[];                    // facts that must appear in the answer
  requiredTool?: string;                     // tool that must have been called
}

/** One test case: input + expected behaviour (Chapter 03 — test case). */
export interface EvalCase {
  id: string;
  input: TestInput;
  expected: ExpectedBehaviour;
}

/** Score produced by one deterministic evaluator. */
export interface MetricScore {
  name: string;                              // e.g. "include:30 days"
  score: number;                             // 1 or 0
  passed: boolean;
}

/** Result for one test case (Chapter 02 — Score). */
export interface EvalResult {
  caseId: string;
  scores: MetricScore[];
  passed: boolean;                           // all thresholds met for this case
}

/** Whole-suite report (Chapter 02 — Aggregate). */
export interface EvalReport {
  suiteName: string;
  totalCases: number;
  passedCases: number;
  results: EvalResult[];
}
```

## 3. Block-by-Block Explanation

### `export interface TestInput { ... }`
- Models the **Test Input** component (Chapter 02): everything the system sees at inference time.
- `id` — unique test case identifier.
- `question` — the user's literal question.
- `context?` — retrieved chunks (the exact context injected into the prompt). The notes stress that the test input is the *entire assembled prompt*, not just the question.

### `export interface ExpectedBehaviour { ... }`
- Models the **Expected Behaviour** component (Chapter 02): checkable properties, never exact strings.
- `mustInclude?` — facts that must appear in the answer (maps to Chapter 04 string inclusion checks).
- `requiredTool?` — a tool that must have been called (maps to Chapter 04 tool call verification).

### `export interface EvalCase { ... }`
- Bundles one input + its expected behaviour into a single test case (Chapter 03 anatomy of a test case: question + context + metadata).

### `export interface MetricScore { ... }`
- One evaluator's result: a `name`, a numeric `score` (1 or 0), and a `passed` flag.

### `export interface EvalResult { ... }`
- The **Score** component (Chapter 02) for one case: which metrics ran and whether the case passed overall.

### `export interface EvalReport { ... }`
- The **Aggregate** component (Chapter 02): dataset-level totals (`totalCases`, `passedCases`) plus per-case `results`.

## 4. How It Works With the Rest of the App

`src/services/evaluationService.ts` imports `EvalCase`, `EvalResult`, `EvalReport`, and `TestInput` from here so every layer shares identical shapes. `src/controllers/evalController.ts` imports `EvalCase` to type the request body.