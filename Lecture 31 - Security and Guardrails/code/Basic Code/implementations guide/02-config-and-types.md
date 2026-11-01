# Chapter 02 — Config & Types

## 2.1 `src/config/config.ts`

**File details:** Reads environment variables from `.env` via `dotenv` and exports a single `config` object. Centralizes config so the app does not read `process.env` everywhere.

**Command:** none (loaded automatically at startup).

**Full code:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
};
```

**Block-by-block explanation:**
- `import dotenv from 'dotenv'; dotenv.config();` — loads `.env` into `process.env` so `PORT` is available.
- `export const config = { port: ... }` — exports the port. Falls back to `3000` if `.env` is missing or `PORT` is not a number. This is the single source of truth for the port.

---

## 2.2 `src/types/index.ts`

**File details:** Defines shared TypeScript types used across controllers and services. Keeps the intent type narrow so the router can only choose known capabilities.

**Command:** none.

**Full code:**
```typescript
export type Intent = 'ORDER_STATUS' | 'CANCEL' | 'GENERAL';

export interface ChatRequest {
  message: string;
  userId: string;
}

export interface ChatResponse {
  intent: Intent;
  result: unknown;
  response: string;
}
```

**Block-by-block explanation:**
- `Intent` — a closed union of the three intents this app supports. Using a type (not a string) means the router cannot accidentally route to an unknown capability.
- `ChatRequest` — shape of the incoming `/chat` body: the user message plus the `userId` (identity).
- `ChatResponse` — shape of the JSON response: the resolved intent, the tool result, and a text response.

**Why:** The notes (Ch. 05) say the router must choose from a narrow, known set of capabilities. A closed `Intent` type enforces that at compile time.
