# Chapter 5 — Routes (`src/routes/index.ts`)

> Purpose: Mount all feature routes onto the Express app — the single place that defines the API surface.

## 1. File Details

- **Path:** `src/routes/index.ts`
- **Role:** Creates an Express `Router`, registers `GET /api/health` and `POST /api/eval/run`, exports it for `src/index.ts` to mount on `/api`.
- **Notes mapping:** supports all chapters (exposes the eval runner over HTTP).
- **Command:** none — imported by `src/index.ts`.

## 2. Full Code File

```typescript
// routes/index.ts — Mount all feature routes onto the app
// Maps to Lecture 30 notes: all chapters (exposes eval runner over HTTP)

import { Router, Request, Response } from "express";
import { evalController } from "../controllers/evalController.js";

const router = Router();

/** GET /api/health — simple health check for the service */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "fde-lecture-30-evals-testing",
    status: "ok",
  });
});

/** POST /api/eval/run — run a deterministic eval suite (Chapter 02 + Chapter 04) */
router.post("/eval/run", evalController.runEval);

export default router;
```

## 3. Block-by-Block Explanation

### `import { Router, Request, Response } from "express";`
- Express router and request/response types.

### `import { evalController } from "../controllers/evalController.js";`
- Imports the controller so routes stay thin (logic lives in the controller/service).

### `const router = Router();`
- Creates a new Express router instance.

### `router.get("/health", ...)`
- Health check endpoint. Returns `{ success: true, service, status: "ok" }`. Use this to confirm the server is up.

### `router.post("/eval/run", evalController.runEval);`
- Eval endpoint. Delegates to `evalController.runEval`. Expects a JSON body `{ suiteName, cases }` and returns the eval report.

### `export default router;`
- Exports the router so `src/index.ts` can mount it with `app.use("/api", router)`.

## 4. How It Works With the Rest of the App

`src/index.ts` mounts this router at `/api`, so the live URLs are `GET /api/health` and `POST /api/eval/run`. Adding a new feature later means adding one route here plus a handler in the controller.