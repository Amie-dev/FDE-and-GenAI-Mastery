# Chapter 2 — Config (`src/config/config.ts`)

> Purpose: Load `.env` and expose typed settings (port, env) so nothing is hardcoded.

## 1. File Details

- **Path:** `src/config/config.ts`
- **Role:** Reads `process.env` (populated by `dotenv`) and exports a config object used by `src/index.ts`.
- **Notes mapping:** not tied to a single notes chapter — supports the whole app.
- **Command:** none — imported by `src/index.ts`.

## 2. Full Code File

```typescript
// config/config.ts — Load environment + build typed config
import dotenv from "dotenv";

// Load .env file into process.env
dotenv.config();

const _config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
};

console.log(`[config] env=${_config.nodeEnv} port=${_config.port}`);

export default _config;
```

## 3. Block-by-Block Explanation

### `import dotenv from "dotenv";`
- Imports the `dotenv` package, which reads `.env` and writes values into `process.env`.

### `dotenv.config();`
- Loads `.env` into `process.env`. After this, `process.env.PORT` returns `"4000"` (a string).

### `const _config = { ... }`
- Builds the config object with `nodeEnv` and `port`.

### `nodeEnv: process.env.NODE_ENV || "development"`
- Reads `NODE_ENV`; falls back to `"development"` if unset.

### `port: Number(process.env.PORT) || 4000`
- Converts the string `"4000"` to a number `4000`. Falls back to `4000` if unset or zero.

### `console.log(...)`
- Prints startup info so you can confirm the right env and port loaded.

### `export default _config;`
- Default export so `src/index.ts` can do `import config from "./config/config.js"` and read `config.port`.

## 4. How It Works With the Rest of the App

`src/index.ts` imports this config and uses `config.port` when calling `app.listen(PORT, ...)`. The `.env` file provides `NODE_ENV=development` and `PORT=4000`.