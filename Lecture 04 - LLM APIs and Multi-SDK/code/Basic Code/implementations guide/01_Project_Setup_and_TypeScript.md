# Chapter 01: Project Setup, Dependencies & TypeScript

> **Chapter goal:** create the project skeleton, understand *why* each dependency exists, and configure
> TypeScript for ESM + Node so that `import ... from './file.js'` behaves exactly as it will in production.

**Notes chapters covered:** 08 (building the service).

---

## 1.1 Commands to run

```bash
mkdir -p "Lecture 04 - LLM APIs and Multi-SDK/code/Basic Code/src"
cd "Lecture 04 - LLM APIs and Multi-SDK/code/Basic Code"
npm init -y
npm install express@^4.21.2 zod@^3.24.2 dotenv@^16.4.7 openai@^4.85.4 @google/genai@^1.28.0
npm install -D typescript@^5.7.3 tsx@^4.19.3 @types/node@^22.13.8 @types/express@^5.0.0
```

That produces `package.json` and `package-lock.json`. The lockfile is committed on purpose: every learner
gets byte-identical dependency versions.

---

## 1.2 Why these five dependencies?

| Package | Type | Why it is here | Notes chapter |
| :--- | :--- | :--- | :--- |
| `express` | runtime | The HTTP layer. We only use `json()`, `Router()`, `use()` and `listen()` | 08 |
| `zod` | runtime | One schema does two jobs: validate the request body *and* validate the environment | 03 · 08 |
| `dotenv` | runtime | Reads `.env` into `process.env` so secrets never live in source | 02 · 08 |
| `openai` | runtime | OpenAI **and** Groq, Mistral and Ollama — they all speak the same dialect, so one SDK covers four providers | 07 |
| `@google/genai` | runtime | Gemini, which speaks a *different* dialect. This is the proof that an adapter layer is required | 07 |
| `typescript` | dev | Type-checking; the only tool that runs in CI | 01 |
| `tsx` | dev | Runs `.ts` directly with watch mode — no build step while developing | 08 |
| `@types/node`, `@types/express` | dev | Types for Node globals and Express | 08 |

**Deliberately absent:** `axios` (the SDKs are HTTP clients), `cors` (no browser client here),
`winston` (a `console.log` of structured JSON is enough for a basic build), and any ORM (no database).

---

## 1.3 Full code: `package.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-04-basic-llm-api-service",
  "version": "1.0.0",
  "description": "Basic Express + TypeScript service showing the LLM API protocol, message roles, token economics, retry/backoff and multi-provider adapters (Lecture 04 — LLM APIs and Multi-SDK)",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "fde",
    "llm",
    "genai",
    "express",
    "typescript",
    "openai",
    "gemini",
    "groq",
    "mistral",
    "ollama"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@google/genai": "^1.28.0",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "openai": "^4.85.4",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.13.8",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

### Block-by-block explanation

#### Block 1 — `"type": "module"`
```json
"type": "module",
```
Makes every `.js`/`.ts` file in this package an **ES module** instead of CommonJS. This is what allows
`import express from 'express'` and top-level `await`. Consequence to remember: relative imports must carry
the `.js` extension even in TypeScript (`./config/config.js`) — see §1.4.

#### Block 2 — the four scripts
```json
"dev": "tsx watch src/server.ts",
"build": "tsc",
"start": "node dist/server.js",
"typecheck": "tsc --noEmit"
```
- **`dev`** — `tsx watch` transpiles on the fly and restarts when a file changes. No `dist/`, no stale build.
- **`build`** — the real compiler writes JavaScript to `dist/` using `tsconfig.json`.
- **`start`** — runs the compiled output, exactly what a container would run.
- **`typecheck`** — compiles nothing, only checks types. This is the command to put in CI: it fails fast
  and leaves no artefacts behind.

#### Block 3 — `"main": "dist/server.js"`
Tells Node (and any tooling) where the built entry point lives. It matches `npm start`.

## 1.4 Full code: `tsconfig.json`

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Block-by-block explanation

#### Block 1 — target and module system
```json
"target": "ES2022",
"module": "NodeNext",
"moduleResolution": "NodeNext",
```
- `target: ES2022` — modern syntax (`??`, `Object.assign`, top-level `await`) is emitted as-is; Node 20+ runs it natively.
- `module: NodeNext` + `moduleResolution: NodeNext` — "use Node's real ESM rules". This pair is what makes
  the compiler **require** the `.js` extension on relative imports, so the compiled output is valid ESM.
  If you drop the extension, `npm start` fails with `ERR_MODULE_NOT_FOUND` even though `npm run dev` worked.

#### Block 2 — where the code lives
```json
"outDir": "./dist",
"rootDir": "./src",
```
`src/` in, `dist/` out. `rootDir` also prevents the compiler from accidentally emitting a nested
`dist/src/...` tree when a stray file lands outside `src/`.

#### Block 3 — `strict: true`
Turns on the whole strictness family at once, including `strictNullChecks` and `noImplicitAny`.
The payoff shows up immediately in this codebase: `response.usage?.prompt_tokens ?? 0` is *forced* on us —
the compiler refuses to let a missing usage block become `NaN` in a cost calculation.

#### Block 4 — interoperability and speed
```json
"esModuleInterop": true,
"skipLibCheck": true,
"forceConsistentCasingInFileNames": true
```
- `esModuleInterop` — lets us write `import express from 'express'` instead of `import * as express`.
- `skipLibCheck` — skips type-checking inside `node_modules`; roughly halves check time. Our own code is still checked.
- `forceConsistentCasingInFileNames` — catches `import './Config'` vs `./config`, which breaks on Linux but not on macOS.

#### Block 5 — `include` / `exclude`
```json
"include": ["src/**/*"],
"exclude": ["node_modules", "dist"]
```
Only our source is compiled. Without `exclude: dist`, the compiler would re-compile its own output on the
next run and produce `dist/dist/...`.

---

## 1.5 Full code: `.gitignore`

File path: `code/Basic Code/.gitignore`

```gitignore
# Dependencies & build output
node_modules/
dist/

# Secrets — never commit a real key (chapter 08)
.env
.env.local

# Logs
*.log
```

### Block-by-block explanation

| Line | Why |
| :--- | :--- |
| `node_modules/` | Recreated by `npm install`; committing it is a 100 MB mistake |
| `dist/` | Build output; regenerated by `npm run build` |
| `.env` | **The important one.** A committed key is a compromised key — it lives in git history forever |
| `*.log` | Telemetry/request logs are runtime data, not source |

Note the deliberate asymmetry: `.env` is ignored, `.env.example` is **not**. The template is documentation;
the file itself is a secret. `package.json` *and* `package-lock.json` are both committed.

## 1.6 Full code: `.env.example`

File path: `code/Basic Code/.env.example`

```ini
# ─────────────────────────────────────────────────────────────
# Lecture 04 — Basic Code · environment template
# Copy to `.env` and fill in the key of the provider you use.
# ─────────────────────────────────────────────────────────────

# HTTP server (chapter 08)
PORT=8080

# ── The four invariant components of an LLM call (chapter 02) ──
# AI_PROVIDER selects which adapter is used: openai | groq | mistral | ollama | gemini
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=400

# Chapter 05 — input context budget in tokens (checked locally, before any call)
AI_MAX_INPUT_TOKENS=8000

# ── Credentials: only the ACTIVE provider's key is required (chapter 08) ──
OPENAI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
GEMINI_API_KEY=

# Chapter 07 — Ollama runs locally and needs no API key
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Block-by-block explanation

#### Block 1 — server settings
```ini
PORT=8080
```
The only variable that is about the *service* rather than the *model*. Everything else below describes an LLM call.

#### Block 2 — the four invariant components
```ini
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=400
```
| Variable | Invariant component (chapter 02) | Meaning |
| :--- | :--- | :--- |
| `AI_PROVIDER` | **endpoint** + **auth** | Which adapter (and therefore which URL and which key) is used |
| `AI_MODEL` | **model** | The exact model id sent in the body |
| `AI_TEMPERATURE` | **input (parameters)** | 0.2 = mostly deterministic; 0–2 allowed |
| `AI_MAX_TOKENS` | **input (parameters)** | Hard cap on *output* length — the ceiling on the decode half of the bill |

`AI_PROVIDER` is the only one that changes the *shape* of the request; the other three are values inside it.
That distinction is why switching provider touches one line here and zero lines in the code.

#### Block 3 — the context budget
```ini
AI_MAX_INPUT_TOKENS=8000
```
Chapter 05 in one number: how many input tokens we are willing to pay for on a single request. It is
checked **before** the call, so exceeding it costs nothing. Note it is deliberately much smaller than any
real model's context window (128k+) — a budget is a product decision, not a model limit.

#### Block 4 — credentials
```ini
OPENAI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
GEMINI_API_KEY=
```
All four are declared, but **only the active provider's key must be filled in**. Empty strings are valid
for the others. `GEMINI_API_KEY` is listed here because Gemini is the one provider that needs a different
SDK; the other three share the OpenAI-compatible client. Ollama needs no key at all, which is why
`AI_PROVIDER=ollama` works on a laptop with no account anywhere.

---

## 1.7 Verify the skeleton

```bash
cp .env.example .env          # then edit .env and paste a real key
npm install                   # creates node_modules/ and package-lock.json
npm run typecheck             # must exit 0 — there is no src/ yet, so it checks nothing
```

If `npm run typecheck` exits `0`, the toolchain is correct: TypeScript is installed, `tsconfig.json` is
valid, and the compiler accepts the project shape. From here on, every chapter adds files that must keep
that exit code at `0`.

> **Common mistake:** adding a relative import without the `.js` extension. `npm run dev` (tsx) tolerates it,
> `npm run build && npm start` does not. Keep the extension in every relative import.

Chapter 02 builds the configuration module that reads these variables.


