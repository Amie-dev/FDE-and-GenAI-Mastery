# Chapter 0 — File Structure & Overview

> Purpose: Understand the overall folder layout before touching any code. Every file below maps to one feature from the Lecture 30 notes (Evals and Testing).

## 1. File Structure

```text
code/Basic Code/
├── .env                      # Environment variables (NODE_ENV, PORT) — loaded by dotenv
├── package.json              # Project metadata, scripts, dependencies (express, dotenv)
├── package-lock.json         # Locked dependency versions (npm install)
├── tsconfig.json             # TypeScript compiler config (NodeNext, ES2022, strict)
├── dist/                     # Compiled JavaScript output (npm run build)
├── node_modules/             # Installed dependencies (npm install)
├── src/                      # TypeScript source code
│   ├── config/               # Configuration loader (env → typed config)
│   │   └── config.ts         # Loads .env, exports config object
│   ├── controllers/          # Route handlers (thin, no business logic)
│   │   └── evalController.ts # POST /api/eval/run handler
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.ts   # Centralised error handling
│   ├── routes/               # Express route definitions
│   │   └── index.ts          # Mounts /api/health and /api/eval/run
│   ├── services/             # Business logic — deterministic evaluators + eval runner
│   │   └── evaluationService.ts  # factInclusion, jsonSchemaCheck, toolCallCheck, runCase, runEval
│   ├── types/                # Shared TypeScript interfaces
│   │   └── index.ts          # TestInput, ExpectedBehaviour, EvalCase, EvalResult, EvalReport
│   └── index.ts              # App entry point (wires config → routes → middleware, starts server)
└── implementations guide/    # This folder — chapter-wise guides (you are here)
```

## 2. Chapter Map

| Chapter | Topic | Files | Notes chapter |
|---------|-------|-------|---------------|
| 0 | File structure & overview | All | — |
| 1 | Types | `src/types/index.ts` | Ch 02 anatomy, Ch 03 test cases |
| 2 | Config | `src/config/config.ts` | — |
| 3 | Services — evaluation | `src/services/evaluationService.ts` | Ch 02 eval runner, Ch 04 deterministic |
| 4 | Controller | `src/controllers/evalController.ts` | Ch 02 run an eval |
| 5 | Routes | `src/routes/index.ts` | — |
| 6 | Middleware & entry point | `src/middleware/errorHandler.ts`, `src/index.ts` | — |
| 7 | Setup & run | `.env`, `package.json`, `tsconfig.json` | — |

## 3. Commands

```bash
cd "/home/aminul/development/learn/GEN AI/FDE-and-GenAI-Mastery/Lecture 30 - Evals and Testing/code/Basic Code"
npm install        # Install express, dotenv + types, tsx, typescript
npm run build      # Compile TypeScript (tsc) → dist/
npm start          # Run compiled server: node dist/index.js
npm run dev        # Run with tsx (no build step)
```

## 4. How the App Works (End-to-End)

1. **Client** sends `POST /api/eval/run` with `{ suiteName, cases }`.
2. **Express router** (`src/routes/index.ts`) matches the route and calls `evalController.runEval`.
3. **Controller** (`src/controllers/evalController.ts`) validates input, builds a stub system under test, calls `runEval`.
4. **Service** (`src/services/evaluationService.ts`) runs each case: the system produces an answer, then deterministic evaluators (string inclusion, JSON schema, tool calls) score it.
5. **Result** is returned as JSON: `{ success: true, report: { suiteName, totalCases, passedCases, results: [...] } }`.

## 5. Design Principles

- **Minimum code.** One file per folder. Only features the Lecture 30 notes actually mention (test input, expected behaviour, deterministic evaluators, scoring, aggregation).
- **TypeScript interfaces** (`src/types/`) so every file shares the same shape.
- **Routes are thin.** Controllers handle HTTP; services hold logic.
- **No API key required.** The system under test is a stub — replace it with your real RAG / model call.

## 6. Related Note Features

This implementation covers the runnable parts of **Lecture 30 notes**:
- **Chapter 02** — Anatomy of an eval: Test Input, Expected Behaviour, Evaluator, Score.
- **Chapter 03** — Test cases / golden data shapes.
- **Chapter 04** — Deterministic evaluation: string/regex, JSON schema, tool call verification.

Only features mentioned in the notes are implemented — no extra code.