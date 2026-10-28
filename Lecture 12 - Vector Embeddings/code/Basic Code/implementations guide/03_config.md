# Chapter 3 — Configuration Loader

## 1. File: `src/config/config.ts`

This file loads `.env` and turns it into a typed `AppConfig` object.

## 2. Full Code File

```typescript
// config/config.ts — Load environment + build typed config
import dotenv from "dotenv";
import { AppConfig } from "../types/index.js";

// Load .env file into process.env (only in non-production or if present)
dotenv.config();

const _config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  defaultVectorDim: Number(process.env.DEFAULT_VECTOR_DIM) || 8,
  maxSentences: Number(process.env.MAX_SENTENCES) || 30,
};

console.log(`[config] env=${_config.nodeEnv}  port=${_config.port}  dim=${_config.defaultVectorDim}`);

export default _config;
```

## 3. Block-by-Block Explanation

### `import dotenv from "dotenv";`
- Imports the `dotenv` package which reads `.env` and sets `process.env`.

### `dotenv.config();`
- Loads `.env` into `process.env`. After this, `process.env.PORT` returns `"4000"`.

### `const _config: AppConfig = { ... }`
- Creates a typed object following the `AppConfig` interface.

### `nodeEnv: process.env.NODE_ENV || "development"`
- Uses `NODE_ENV` from `.env`; falls back to `"development"` if not set.

### `port: Number(process.env.PORT) || 4000`
- Converts the string `"4000"` to a number `4000`. The `|| 4000` fallback means
  "if it's 0 or an empty string, use 4000."

### `defaultVectorDim: Number(process.env.DEFAULT_VECTOR_DIM) || 8`
- Same pattern for the default embedding dimension.

### `maxSentences: Number(process.env.MAX_SENTENCES) || 30`
- Same pattern for the max number of sentences.

### `console.log(...)`
- Prints startup info so you know the app loaded the right settings.

### `export default _config;`
- Exports the config object as a **default export** so `src/index.ts` can
  `import config from "./config/config.js"` and access `config.port`.

## 4. How It Works With the Rest of the App

```typescript
// In src/index.ts:
import config from "./config/config.js";
const app = express();
const PORT = config.port;  // Use the configured port, no magic numbers
```

This avoids hardcoding `4000` in multiple files.
