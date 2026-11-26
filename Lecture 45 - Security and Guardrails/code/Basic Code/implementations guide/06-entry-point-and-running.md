# Chapter 06 — Entry Point & Running

## 6.1 `src/index.ts`

**File details:** The application entry point. Creates the Express app, applies middleware in order, mounts routes, and starts the server.

**Command:** `npm run dev` (ts-node) or `npm start` (compiled).

**Full code:**
```typescript
import express from 'express';
import { config } from './config/config';
import { inputGuardrail, outputGuardrail } from './middleware/guardrail.middleware';
import { router } from './routes/index';

const app = express();

app.use(express.json());

// Layer 1 — input guardrail: mask PII before it enters the app
app.use(inputGuardrail);

// Routes
app.use('/chat', router);

// Layer 4 — output guardrail: redact PII before it leaves the app
app.use(outputGuardrail);

app.listen(config.port, () => {
  console.log(`Lecture 31 basic server running on http://localhost:${config.port}`);
});
```

**Block-by-block explanation:**
- `express()` + `express.json()` — creates the app and parses JSON bodies.
- `app.use(inputGuardrail)` — input guardrail runs first, masking PII (e.g. email → `[EMAIL]`) before any route sees the request.
- `app.use('/chat', router)` — mounts the chat routes.
- `app.use(outputGuardrail)` — output guardrail wraps `res.send` so any PII in the response is redacted before reaching the user.
- `app.listen(...)` — starts the HTTP server on the configured port.

**Middleware order matters:** input guardrail runs before the route (protects data going in); output guardrail runs after (protects data going out). This is the defense-in-depth layering from Ch. 07.

---

## 6.2 How to run

```bash
# 1. Install dependencies
npm install

# 2. Type-check
npx tsc --noEmit

# 3. Build
npm run build

# 4. Run
npm run dev
# or
npm start
```

Then test:
```bash
curl -s -X POST http://localhost:3000/chat -H "Content-Type: application/json" \
  -d '{"message":"Where is my order? My email is john@example.com","userId":"USER-17"}'
```

Expected behavior (verified):
- `{"intent":"ORDER_STATUS","result":{"orderId":"ORD-101","status":"DELIVERED","owner":"USER-17"},"response":"Processed: Where is my order? My email is [EMAIL]"}`
- The email is masked (`[EMAIL]`) — input guardrail worked.
- The tool ran and `owner` came from the session `userId`.
- Sending an unrecognized intent (e.g. "delete everything") returns `intent: "GENERAL"`, `result: null` — fail closed.

## Summary of security features implemented (from Lecture 31 notes only)
| Feature | Where | Note |
|---------|-------|------|
| PII masking (input) | `guardrail.middleware.ts` | masks email before app/logs |
| Output redaction | `guardrail.middleware.ts` | redacts PII before response |
| Capability routing | `chat.controller.ts` | intent → narrow tool set |
| Least privilege | `tool.service.ts` + controller | only registered tools can run |
| Fail closed | `tool.service.ts` + controller | unknown tool/intent rejected |
| Argument validation | `tool.service.ts` | model args treated as untrusted |
| Identity from session | `chat.controller.ts` | `userId` not from model argument |

Only features mentioned in the Lecture 31 notes are implemented. Nothing complex was added.
