# Chapter 02 — Config (`src/config/config.ts`)

## File details
- **Path:** `code/Basic Code/src/config/config.ts`
- **Purpose:** Centralize runtime configuration so the port isn't hard-coded in the entry point.
- **Command:** none

## Full code file

```ts
/**
 * Lecture 14 — Basic code configuration.
 * Reads environment variables with sensible defaults.
 */

export const config = {
  port: Number(process.env.PORT) || 3000,
};
```

## Block-by-block explanation

**Block 1 — `export const config = { ... }`**
Exports a single config object that other modules import.

**Block 2 — `port: Number(process.env.PORT) || 3000`**
Reads `PORT` from the environment (`.env` or the shell). `Number(...)` converts the string to a number; if it is missing or not a valid number, it falls back to `3000`. The entry point reads `config.port` when calling `app.listen(...)`.

Keep it tiny: this lecture's notes don't discuss ops configuration, so only `PORT` exists here.

---
