# Chapter 01 — Project Configuration

> Teaches the **run & build setup**: `package.json` scripts, `tsconfig.json`,
> the `.env`, `.gitignore`, and the project `README.md`.
>
> There is no single "Notes" chapter for this — it is the engineering
> foundation that makes every later chapter compile and run.

## Files in this chapter

| File | Purpose |
|------|---------|
| `package.json` | dependencies (Express) + dev tools (TypeScript, tsx) + npm scripts |
| `tsconfig.json`   | TypeScript compiler options (`ES2022`, `NodeNext`, `strict`, output to `dist/`) |
| `.env` | `PORT` (provider keys are commented out for the demo) |
| `.gitignore` | keep `node_modules/`, `dist/`, `.env` out of git |
| `README.md` | project description + how to run |

## Command

```bash
npm install        # installs deps + generates package-lock.json
npm run dev        # tsx runs src/index.ts
npm run build      # tsc  →  ./dist
npm start          # node dist/index.js
```

---

## Full code

### `package.json`

```json
{
  "name": "lecture-13-semantic-search",
  "version": "1.0.0",
  "description": "Basic Code: Semantic Search + Movie Recommendation (Lecture 13 - Embeddings) | TypeScript + Express",
  "main": "src/index.ts",
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^24.9.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

### `.env`

```env
# Environment variables for the Basic Code of Lecture 13 (Semantic Search)

# Port the Express server listens on
PORT=3000

# Base URL of the embedding provider used in PRODUCTION.
# In this basic demo we use seeded vectors so no API key is required.
# See: src/services/embedding.service.ts
# EMBEDDING_BASE_URL=https://api.openai.com/v1
# EMBEDDING_MODEL=text-embedding-3-small
```

### `.gitignore`

```text
# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
```

---

## Block-by-block explanation

**`package.json`**
- `"type": "module"` — enables native ES module `import`/`export` syntax.
  This is why every import uses the `.js` extension (e.g.
  `import { X } from "./x.js"`) even though the source is `.ts`: Node's
  ESM resolver requires the literal extension that appears in the import.
- `"scripts.dev": "tsx src/index.ts"` — `tsx` runs TypeScript straight from
  source (no compile step), giving fast hot-reloading while you code. This
  is the workflow used in every chapter below.
- `"scripts.build": "tsc"` — the TypeScript compiler emits JS to
  `"outDir": "./dist"` (`"rootDir": "./src"`). The build is **separate**
  from the dev loop so you can iterate fast and still have a runnable
  production artifact via `npm start`.
- `"strict": true` in tsconfig turns on `strictNullChecks`, `noImplicitAny`,
  etc. — this is why `vector` is typed `number[]` (never `undefined`) in
  the types chapter, while the data model keeps `vector?: number[]`.

**`tsconfig.json`**
- `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` tells TypeScript
  to enforce Node's modern ESM resolution rules — this catches missing
  `.js` extensions at compile time rather than at runtime.
- `"include": ["src/**/*.ts"]` scopes compilation to the source tree only.

**`.env`**
- The demo **does not require an API key**. The provider URL/model are
  commented out (Chapter 03 shows where the real `fetch` call would go).
  Only `PORT` is needed to run locally.

**`.gitignore`**
- `node_modules/` and `dist/` are regenerable; `.env` holds secrets.
  The repo ships without a lockfile — `npm install` creates it.
