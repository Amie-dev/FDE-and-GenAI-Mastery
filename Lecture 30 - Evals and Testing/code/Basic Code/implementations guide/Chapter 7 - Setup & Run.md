# Chapter 7 — Setup & Run

> Purpose: Step-by-step instructions to install dependencies, build, run, and test the application.

## 1. Install Dependencies

```bash
cd "/home/aminul/development/learn/GEN AI/FDE-and-GenAI-Mastery/Lecture 30 - Evals and Testing/code/Basic Code"
npm install
```

This installs: `express`, `dotenv`, `@types/express`, `@types/node`, `tsx`, `typescript`.

## 2. Configure Environment

Edit `.env` if needed:

```text
NODE_ENV=development
PORT=4000
```

> Note: if another process is already using port 4000, change `PORT` in `.env` (e.g. `4001`) before starting.

## 3. Build TypeScript

```bash
npm run build
```

This compiles all `.ts` files in `src/` to JavaScript in `dist/` using `tsc` and `tsconfig.json`.

## 4. Start the Server

```bash
npm start
```

This runs `node dist/index.js`. You should see:

```text
[config] env=development port=4000

  🎓 FDE & GenAI Mastery — Lecture 30: Evals and Testing
  📡 Server running at http://localhost:4000
  🛠️  Endpoints:
       GET  /api/health
       POST /api/eval/run
  📖 Start with: GET /api/health
```

Or for development with `tsx` (no build step):

```bash
npm run dev
```

## 5. Test the API Endpoints

### Health Check

```bash
curl http://localhost:4000/api/health
```

Expected: `{"success":true,"service":"fde-lecture-30-evals-testing","status":"ok"}`

### Run a Deterministic Eval

```bash
curl -X POST http://localhost:4000/api/eval/run \
  -H "Content-Type: application/json" \
  -d '{"suiteName":"refund-policy","cases":[{"id":"c1","input":{"id":"c1","question":"How many days?","context":[]},"expected":{"mustInclude":["30 days"]}}]}'
```

The stub system answers `Stub answer for: How many days?`, which does **not** contain `30 days`, so the score is `0` and `passed` is `false`. To see a passing case, change the stub answer in `src/controllers/evalController.ts` or change the expected fact.

## 6. Summary of Features Implemented

| Feature | Notes Chapter | File |
|---------|---------------|------|
| Test Input shape | Ch 02 | `src/types/index.ts` |
| Expected Behaviour shape | Ch 02 | `src/types/index.ts` |
| EvalCase / EvalResult / EvalReport | Ch 02, Ch 03 | `src/types/index.ts` |
| String inclusion check | Ch 04 | `src/services/evaluationService.ts` |
| JSON schema check | Ch 04 | `src/services/evaluationService.ts` |
| Tool call check | Ch 04 | `src/services/evaluationService.ts` |
| Eval runner (`runCase` / `runEval`) | Ch 02 | `src/services/evaluationService.ts` |
| Eval HTTP endpoint | Ch 02, Ch 04 | `src/controllers/evalController.ts`, `src/routes/index.ts` |
| Health check | — | `src/routes/index.ts` |
| Config loader | — | `src/config/config.ts` |
| Error handling | — | `src/middleware/errorHandler.ts` |

Only features mentioned in the notes are implemented — no extra code.