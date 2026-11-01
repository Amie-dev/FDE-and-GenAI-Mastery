# Chapter 05 — Controller & Routes

## 5.1 `src/controllers/chat.controller.ts`

**File details:** The `/chat` handler. It classifies the user's intent (simulating the LLM/router step), chooses only the matching tools (capability routing), executes through `ToolService`, and returns JSON.

**Command:** none (wired in `src/routes/index.ts`).

**Full code:**
```typescript
import { Request, Response } from 'express';
import { ToolService } from '../services/tool.service';
import { Intent } from '../types';

const tools = new ToolService();

// Narrow, typed tools — least privilege (only what this app needs)
tools.register('getOrderStatus', (_args, userId) => {
  return { orderId: 'ORD-101', status: 'DELIVERED', owner: userId };
});

tools.register('cancelOrder', (_args, userId) => {
  return { orderId: 'ORD-101', cancelled: true, by: userId };
});

export function chatController(req: Request, res: Response) {
  const { message, userId } = req.body as {
    message?: string;
    userId?: string;
  };

  // Capability routing: classify intent, then expose ONLY matching tools
  const lower = (message || '').toLowerCase();
  let intent: Intent = 'GENERAL';
  const allowed: string[] = [];

  if (lower.includes('status') || lower.includes('where')) {
    intent = 'ORDER_STATUS';
    allowed.push('getOrderStatus');
  } else if (lower.includes('cancel')) {
    intent = 'CANCEL';
    allowed.push('cancelOrder');
  }

  // Fail closed: no tools are exposed unless the intent matches
  let result = null;
  if (allowed.length > 0) {
    // userId comes from the session (auth layer), not from the model
    result = tools.execute(allowed[0], { orderId: 'ORD-101' }, userId || 'anonymous');
  }

  res.json({ intent, result, response: `Processed: ${message}` });
}
```

**Block-by-block explanation:**
- `tools.register(...)` — registers two narrow tools: `getOrderStatus` (read) and `cancelOrder` (write). Each returns a fake result and records the `userId`. These are the only capabilities the model can ever reach.
- `chatController` — reads `message` and `userId` from the body.
- **Intent classification** — keyword-based stand-in for an LLM classifier. Sets `intent` and the `allowed` tool list. This mirrors Ch. 05's router: the router classifies intent; the application chooses capabilities.
- **Fail closed** — if no intent matches, `allowed` stays empty and `result` stays `null`. No tool runs.
- `tools.execute(allowed[0], ...)` — runs the single allowed tool with `userId` taken from the session (`userId || 'anonymous'`), never from a model argument. This enforces Ch. 06's rule that identity comes from the session.
- `res.json(...)` — returns intent, result, and a text response. The output guardrail (Ch. 03) runs afterward to redact any PII.

---

## 5.2 `src/routes/index.ts`

**File details:** Defines the Express router and maps `POST /chat` to `chatController`.

**Command:** none.

**Full code:**
```typescript
import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';

const router = Router();

router.post('/', chatController);

export { router };
```

**Block-by-block explanation:**
- `Router()` — creates a child Express router.
- `router.post('/', chatController)` — mounts the controller at `POST /chat` (mounted as `/chat` in `src/index.ts`, so the full path is `POST /chat`).
- `export { router }` — makes the router available to the entry point.
