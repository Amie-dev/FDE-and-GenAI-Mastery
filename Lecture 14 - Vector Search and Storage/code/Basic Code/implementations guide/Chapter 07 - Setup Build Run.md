# Chapter 07 — Setup, Build, and Run

## File details
- **Files:** `.env`, `package.json`, `tsconfig.json` (plus generated `package-lock.json` and `dist/`)
- **Purpose:** Install dependencies, compile TypeScript, and run the server.
- **Commands:** all below

## `.env` (full file)

```
PORT=3000
```

**Block-by-block:** one line. `PORT=3000` tells the server which port to listen on. `src/config/config.ts` reads it with a fallback to `3000`.

## `package.json` (full file)

```json
{
  "name": "lecture-14-vector-search-basic",
  "version": "1.0.0",
  "description": "Basic brute-force KNN vector search with Express and TypeScript (Lecture 14 notes)",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "keywords": ["vector-search", "knn", "express", "typescript"],
  "license": "MIT",
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  }
}
```

**Block-by-block:**
- `"scripts"` — three commands: `build` runs the TypeScript compiler; `start` runs the compiled output; `dev` runs TypeScript directly with `ts-node` (no build step).
- `"dependencies"` — `express` is the only runtime dependency (the framework named in the notes).
- `"devDependencies"` — TypeScript compiler, type definitions for Express/Node, and `ts-node` for running TS directly.

## `tsconfig.json` (full file)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Block-by-block:**
- `target: ES2020` / `module: commonjs` — compile modern TypeScript to Node-compatible CommonJS.
- `outDir: ./dist` / `rootDir: ./src` — compiled JavaScript goes into `dist/`, mirroring `src/`.
- `strict: true` — enables strict type checking.
- `include` — only compile files under `src/`.

## Order of commands (follow this)

```bash
# 1. Install dependencies (creates package-lock.json and node_modules/)
npm install

# 2. Compile TypeScript to JavaScript (creates dist/)
npm run build

# 3. Start the server
npm start
#   (or, without building: npm run dev)
```

The server logs `Vector search server running at http://localhost:3000`.

## Verify it works (curl examples)

Store three movie vectors:

```bash
curl -s -X POST http://localhost:3000/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"m1","embedding":[0.21,0.72,0.13],"metadata":{"title":"Interstellar","genre":"Sci-Fi"}}'
echo
curl -s -X POST http://localhost:3000/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"m2","embedding":[0.81,0.11,0.45],"metadata":{"title":"Inception","genre":"Sci-Fi"}}'
echo
curl -s -X POST http://localhost:3000/vectors \
  -H "Content-Type: application/json" \
  -d '{"id":"m3","embedding":[0.18,0.69,0.15],"metadata":{"title":"Gravity","genre":"Sci-Fi"}}'
echo
```

Search for the 2 most similar vectors to `[0.2, 0.7, 0.1]`:

```bash
curl -s "http://localhost:3000/search?vector=0.2,0.7,0.1&k=2"
echo
```

Expected (top-K by cosine similarity): `m1` and `m3` with scores near `1.0`, each carrying its `metadata`.

## What this implements (and what it deliberately does not)
- ✅ Store vectors as ID + vector + metadata (notes Chapter 03)
- ✅ Brute-force KNN with cosine similarity, sort, top-K — 100% recall, O(N×D) (notes Chapter 04)
- ❌ No ANN index (HNSW/IVF/PQ) — that's a later lecture; brute force is the baseline here
- ❌ No persistence, auth, logging, filtering, or middleware — out of scope for "minimum relevant code"

This completes the basic implementation. Build on this only when the notes (or a later lecture) require it.

---
