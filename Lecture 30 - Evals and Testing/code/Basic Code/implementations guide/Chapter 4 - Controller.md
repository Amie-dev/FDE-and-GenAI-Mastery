# Chapter 4 — Controller (`src/controllers/evalController.ts`)

> Purpose: Thin Express route handler — receives the HTTP request, calls the service, returns JSON. No business logic lives here.

## 1. File Details

- **Path:** `src/controllers/evalController.ts`
- **Role:** Handles `POST /api/eval/run`. Validates the body, runs the eval suite via the service, returns the report.
- **Notes mapping:** Chapter 02 (run an eval), Chapter 04 (deterministic checks).
- **Command:** none — mounted by `src/routes/index.ts`.

## 2. Full Code File

```typescript
// controllers/evalController.ts — thin route handlers (no business logic)
// Maps to Lecture 30 notes: Chapter 02 (run an eval), Chapter 04 (deterministic checks)

import { Request, Response } from "express";
import { runEval } from "../services/evaluationService.js";
import { EvalCase, TestInput } from "../types/index.js";

export const evalController = {
  /** POST /api/eval/run — run a deterministic eval suite over the given cases */
  runEval: (req: Request, res: Response) => {
    const { suiteName, cases } = req.body as {
      suiteName?: string;
      cases?: EvalCase[];
    };

    if (!suiteName || !cases) {
      res.status(400).json({
        success: false,
        error: "suiteName and cases are required",
      });
      return;
    }

    // Stub system under test: echoes the question back as the answer.
    // Replace this with your real RAG / agent / model call.
    const system = (_input: TestInput) => ({
      answer: `Stub answer for: ${_input.question}`,
      toolCalls: [],
    });

    const report = runEval(suiteName, cases, system);

    res.json({
      success: true,
      report,
    });
  },
};
```

## 3. Block-by-Block Explanation

### `import { Request, Response } from "express";`
- Express types for the handler signature.

### `import { runEval } from "../services/evaluationService.js";`
- Imports the eval runner from the service layer (controllers stay thin — no logic here).

### `import { EvalCase, TestInput } from "../types/index.js";`
- Imports shared interfaces to type the request body and the stub system input.

### `const { suiteName, cases } = req.body as { ... };`
- Reads `suiteName` and `cases` from the JSON request body and casts to the expected shape.

### `if (!suiteName || !cases) { ... return; }`
- Guard clause: returns `400` with an error if required fields are missing.

### `const system = (_input) => ({ ... });`
- The **system under test** stub. Currently echoes the question as the answer with no tool calls. This is a placeholder so the code runs without any LLM API key. Replace with your real RAG / model call.

### `const report = runEval(suiteName, cases, system);`
- Delegates to the service layer: runs every case through the stub system and scores it deterministically.

### `res.json({ success: true, report });`
- Returns the eval report as JSON: `{ suiteName, totalCases, passedCases, results }`.

## 4. How It Works With the Rest of the App

Mounted by `src/routes/index.ts` at `POST /api/eval/run`. It is the only HTTP entry point besides `/api/health`. To evaluate a real system, swap the `system` stub for a function that calls your model/RAG pipeline.