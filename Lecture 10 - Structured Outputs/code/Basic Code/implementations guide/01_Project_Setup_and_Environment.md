# Chapter 01: Project Setup & Environment

> **Chapter goal:** get a running service with one command, and understand every dependency and every environment
> variable — because the `.env` is where the enforcement rung, the repair bound and the semantic policy are decided.
> **Notes chapters covered:** 05 §05.5–§05.7 (the ladder), 06 §06.6–§06.7 (the policy and the bound), 09 §09.5 (the budget).

---

## 1.1 The commands

```bash
# from inside: Lecture 10 - Structured Outputs/code/Basic Code
npm install          # install dependencies
npm run dev          # run with hot reload  (tsx watch src/server.ts)
npm run build        # compile to dist/     (tsc)
npm start            # run the build        (node dist/server.js)
npm run typecheck    # tsc --noEmit — no output means no type errors
```

The service listens on `http://localhost:8100` and needs **no API key**. With an empty `OPENAI_API_KEY` it boots in
offline mode against a deterministic stub, so every chapter of this guide is runnable immediately.

---

## 1.2 `package.json` (full file)

```json
{
  "name": "lecture-10-basic-structured-outputs-lab",
  "version": "1.0.0",
  "description": "Basic Express + TypeScript structured-output lab: one schema declaration that yields three artefacts (type, validator, wire contract), the enforcement ladder (native schema > JSON mode > instruction), the validation boundary with structural + semantic checks, a bounded repair loop, the fallback ladder ending in a degraded object, and per-call traces with the production metrics (Lecture 10 — Structured Outputs)",
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
    "genai",
    "structured-output",
    "json-schema",
    "zod",
    "constrained-decoding",
    "strict-mode",
    "validation",
    "repair-loop",
    "fallback-ladder",
    "degraded-object",
    "express",
    "typescript"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "openai": "^4.85.4",
    "zod": "^3.24.2",
    "zod-to-json-schema": "^3.24.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.13.8",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

### Block by block

**`"type": "module"`** — the project is ESM. This is why every internal import in `src/` ends in `.js`
(`from '../config/config.js'`) even though the file is `config.ts`. Under NodeNext, TypeScript expects the
*emitted* extension. Get this wrong and you get `ERR_MODULE_NOT_FOUND` at runtime, not at compile time.

**`scripts`** — four scripts, four purposes:

| Script | What it does | When you use it |
| :--- | :--- | :--- |
| `dev` | `tsx watch src/server.ts` — runs TypeScript directly, restarts on save | While learning / editing |
| `build` | `tsc` — compiles `src/` → `dist/` | Before `start`, and in CI |
| `start` | `node dist/server.js` — runs the compiled output | To prove the build works |
| `typecheck` | `tsc --noEmit` — types only, no output | In CI, and as a fast correctness gate |

**`dependencies`** — five packages, and each one is a decision:

| Package | Why it is here | Notes chapter |
| :--- | :--- | :--- |
| `zod` | The **single declaration**. It is simultaneously the type source and the runtime validator. | 02 §02.6 |
| `zod-to-json-schema` | Derives the **wire contract** from that same declaration — so the model and the validator can never disagree. | 02 §02.6 |
| `openai` | The provider SDK. It speaks the OpenAI dialect, which Groq and Ollama also speak — one adapter, three providers. | 05 §05.5, §05.11 |
| `express` | The HTTP layer. Deliberately boring. | — |
| `dotenv` | Loads `.env` into `process.env` before the config schema reads it. | — |

**Why `zod-to-json-schema` and not a hand-written JSON Schema?** Because of chapter 02 §02.6: *declare once, derive
the rest*. A hand-written JSON Schema plus a hand-written Zod schema is two truths, and they drift within a month.

---

## 1.3 `tsconfig.json` (full file)

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

### Block by block

| Option | Why this value |
| :--- | :--- |
| `target: ES2022` | Native `??`, `?.`, `Object.hasOwn`. |
| `module` / `moduleResolution: NodeNext` | Matches `"type": "module"`. It is the reason imports carry `.js`. |
| **`strict: true`** | **Not negotiable in this lecture.** With `strict`, a nullable field must be handled — which is the discipline chapter 04 §04.9 asks for at the schema level, enforced at the type level. |
| `outDir` / `rootDir` | `src/` in, `dist/` out. Keeps the published tree clean. |
| `skipLibCheck` | Skips type-checking `node_modules` — a real time saver, and safe. |

> **A note on `strict`.** The lecture's point is that *runtime* validation is the guarantee, not the compiler. So we
> keep the compiler strict but readable, and put the real guarantees in the schema and the validator — not in
> clever type gymnastics.

---

## 1.4 `.env.example` (full file)

```bash
# ---- HTTP -------------------------------------------------------------------
PORT=8100

# ---- Model (chapter 05 §05.5) ----------------------------------------------
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
# Extraction is not a creative task: chapter 03 §03.3.1 — low temperature reduces
# variance. It is NOT a contract, which is why we still validate.
AI_TEMPERATURE=0

# ---- Enforcement (chapter 03 §03.5, chapter 05 §05.7) ----------------------
# The ladder, strongest first:
#   native_schema  -> response_format { type: "json_schema", strict: true }  (Layer 2)
#   json_mode      -> response_format { type: "json_object" }                (Layer 1)
#   instruction    -> prose only, then validate                              (Layer 0)
# `auto` picks the strongest rung the configured provider supports.
ENFORCEMENT=auto

# Output budget. Chapter 03 §03.2 failure #11: truncation is a real failure mode,
# so it is sized for the schema plus headroom and detected via finish_reason.
MAX_TOKENS=700

# ---- The reliability loop (chapter 06 §06.7) -------------------------------
# A repair is a second call that INCLUDES the issues. Bounded: 1-2 is enough.
MAX_REPAIRS=2

# ---- Semantic policy (chapter 06 §06.6) ------------------------------------
# Domain rules the schema cannot express. `block` -> repair then fall back;
# `review` -> accept but flag for a human.
POLICY_MAX_DURATION_MINUTES=240
POLICY_MAX_DURATION_DAYS=30

# ---- Request shape ----------------------------------------------------------
MAX_INPUT_CHARS=4000

# ---- Credentials ------------------------------------------------------------
# With no key the lab runs in OFFLINE mode: the whole pipeline (enforcement
# selection, validation, the repair loop, the fallback ladder, the trace and the
# metrics) still works against a deterministic stub model (chapter 05 §05.11 —
# the adapter is the only file that knows about providers).
OPENAI_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

`.env` is the same file with the same values; it is git-ignored so a real key never gets committed.

### Block by block — the three variables that change behaviour

| Variable | Values | What changes | Notes |
| :--- | :--- | :--- | :--- |
| **`ENFORCEMENT`** | `auto` \| `native_schema` \| `json_mode` \| `instruction` | Which rung of the ladder is used. `auto` = the strongest the provider supports. | 05 §05.7 |
| **`MAX_REPAIRS`** | `0`–`3` | The loop bound. Set it to `0` and the **degraded object** appears instead of a repair. | 06 §06.7.1, §06.9 |
| **`POLICY_MAX_DURATION_MINUTES`** | any positive int | When a long meeting becomes a `review` flag rather than a hard failure. | 06 §06.6.1 |

**The experiment to run first.** Set `MAX_REPAIRS=0`, restart, and send the duration-less input. You now get a
`degraded` object with `needsHuman: true` instead of a `repaired` one. That is the difference between rung 1 and
rung 3 of the fallback ladder (chapter 06 §06.9) — one line of configuration.

**The second experiment.** Set `ENFORCEMENT=instruction` and send the same input. Nothing in the code changes —
only the rung — and the metrics table now reports `byEnforcement: { instruction: { ... } }`. That is the table the
lecture's gate asks for (chapter 09 §09.2).

---

## 1.5 `.gitignore` (full file)

```gitignore
# Dependencies & build output
node_modules/
dist/

# Secrets — never commit a real key
.env
.env.local

# Logs
*.log
```

**Why `.env` is ignored but `.env.example` is committed.** The example is the *contract*: it documents every knob
and its meaning. The real file holds a secret. Committing the first and ignoring the second is the only safe
arrangement.

---

## 1.6 Verify the setup

```bash
npm run typecheck     # must print nothing
npm run build         # must create dist/server.js
```

Then continue to [Chapter 02 — Config & Types](./02_Config_and_Types.md).

---

**Next:** [Chapter 02 — Config & Types](./02_Config_and_Types.md)

