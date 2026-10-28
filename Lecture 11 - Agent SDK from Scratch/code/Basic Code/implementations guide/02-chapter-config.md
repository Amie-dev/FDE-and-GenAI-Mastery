# Chapter 2 — Config (`src/config/config.ts`)

**Notes reference:** Chapter 02 (Builder & Configuration)

## File Details

- **Path:** `src/config/config.ts`
- **Command:** Create file

## Full Code

```ts
/**
 * Application configuration.
 * Based on Lecture 11 - Agent SDK from Scratch notes.
 */

export const config = {
  /** HTTP server port */
  port: Number(process.env.PORT) || 3000,
  /** Node environment */
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

## Block by Block Explanation

| Code block | What it does | How it works |
|---|---|---|
| `port: Number(process.env.PORT) \| 3000` | Reads the PORT from `.env` (or environment), defaults to 3000. | `process.env.PORT` is a string; `Number()` converts it. If undefined or NaN, falls back to 3000. |
| `nodeEnv: process.env.NODE_ENV \| 'development'` | Reads the Node environment, defaults to `development`. | Reads `NODE_ENV` env var. If not set, defaults to `'development'`. |
