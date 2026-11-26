# Chapter 06 — Entry Point (`src/index.ts`)

## File details
- **Path:** `code/Basic Code/src/index.ts`
- **Purpose:** Bootstrap the Express application: create it, parse JSON bodies, mount routes, and start listening on the configured port.
- **Command:** none (run via `npm start` after `npm run build`, or `npm run dev`)

## Full code file

```ts
/**
 * Lecture 14 — Basic entry point.
 * Creates the Express app, mounts routes, and starts the server.
 */

import express from 'express';
import { config } from './config/config';
import routes from './routes';

const app = express();

app.use(express.json());
app.use('/', routes);

app.listen(config.port, () => {
  console.log(`Vector search server running at http://localhost:${config.port}`);
});
```

## Block-by-block explanation

**Block 1 — imports**
- `express` — the framework.
- `config` — provides `config.port` (from Chapter 02).
- `routes` — the Express router from Chapter 05.

**Block 2 — `const app = express()`**
Creates the Express application instance.

**Block 3 — `app.use(express.json())`**
Registers the built-in JSON body-parser middleware so `req.body` is populated for `POST /vectors`.

**Block 4 — `app.use('/', routes)`**
Mounts the route router at the root path, so `POST /vectors` and `GET /search` become active.

**Block 5 — `app.listen(config.port, ...)`**
Opens a TCP socket on `config.port` (default `3000`) and logs a message when ready. After this line the server accepts requests.

This is the only file that references `express` directly at runtime; everything else is plain TypeScript logic.

---
