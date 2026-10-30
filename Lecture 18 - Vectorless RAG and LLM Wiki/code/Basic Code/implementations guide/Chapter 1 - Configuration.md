# Chapter 1 — Configuration

> File: `src/config/config.ts`
>
> Purpose: Central configuration module. Reads environment variables from `.env` once and exports a single `config` object used by every other module. This avoids calling `process.env` throughout the application.

## Full Code File

```typescript
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Central configuration. Every module imports this same config object
// instead of reading process.env directly throughout the app.
export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  maxTreeDepth: Number(process.env.MAX_TREE_DEPTH) || 3,
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
};
```

## Command (if needed)

```bash
# Install dotenv (already in package.json)
npm install dotenv
```

## Block-by-Block Explanation

### Block 1 — Load dotenv
```typescript
import dotenv from 'dotenv';
dotenv.config();
```
**What this does:** Imports the `dotenv` package and calls `.config()` to read the `.env` file in the project root, loading its key-value pairs into `process.env`.

**How it works:** `dotenv.config()` parses `.env` (e.g., `PORT=3000`) and sets each as an environment variable accessible via `process.env.PORT`.

### Block 2 — Export config object
```typescript
export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  maxTreeDepth: Number(process.env.MAX_TREE_DEPTH) || 3,
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
};
```
**What this does:** Defines and exports a single `config` object with four values: server port, environment name, max tree depth, and LLM model name.

**How it works:**
- `process.env.PORT` is a string, so `Number(...)` converts it to a number.
- The `||` operator provides fallback defaults if the env var is missing (e.g., port defaults to `3000`).
- Any file that needs a setting imports `{ config }` from here instead of reading `process.env` directly.

## Related Note Feature

This supports **all chapters** by providing centralized configuration — consistent with the notes' emphasis on clean, maintainable code structure (see `completed notes with code 1.md`, section 2 `src/config.js`).
