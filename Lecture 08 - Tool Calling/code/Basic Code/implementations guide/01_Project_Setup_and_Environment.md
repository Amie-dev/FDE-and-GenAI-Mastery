# Chapter 01: Project Setup & Environment

> **Chapter goal:** stand the project up from zero — dependencies, TypeScript config, and the `.env` that
> carries every policy knob — and know which notes chapter each setting comes from.
> **Notes chapters covered:** 05 §05.7 (brakes) · 04 §04.9 (tool policy) · 07 §07.2 (`tool_choice`) ·
> 08 §08.6 (cost ceiling).

---

## 1.1 Commands

```bash
cd "Lecture 08 - Tool Calling/code/Basic Code"
npm install
cp .env.example .env
npm run dev
```

| Command | What it does |
| :--- | :--- |
| `npm run dev` | `tsx watch src/server.ts` — reloads on save, no build step |
| `npm run typecheck` | `tsc --noEmit` — proves every contract in the notes is actually typed |
| `npm run build` | `tsc` → `dist/` |
| `npm start` | `node dist/server.js` |

---

## 1.2 `package.json` (full file)

```json
{
  "name": "lecture-08-basic-tool-calling-lab",
  "version": "1.0.0",
  "description": "Basic Express + TypeScript tool-calling lab: the tool contract (JSON Schema), the 5-step wire protocol, the ReAct execution loop with brakes, structured errors and self-healing, routing policies with fixture evals, permission tiers and the token ledger (Lecture 08 — Tool Calling)",
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
    "tool-calling",
    "function-calling",
    "react",
    "agent",
    "json-schema",
    "zod",
    "tool-choice",
    "permission-tiers",
    "token-ledger",
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

**`"type": "module"`** — the project is ESM. That is why every internal import ends in `.js`
(`from '../config/config.js'`) even though the source files are `.ts`: under `NodeNext` resolution the import
specifier must name the *emitted* file, not the source file. This is the single most common source of
"cannot find module" errors in a TS ESM project.

**`"scripts"`** — `dev` uses `tsx` so there is no build step while you read the notes; `typecheck` is the
command that turns the notes' claims into compiler errors (for example, if a tool's `execute` returned the
wrong shape).

**`"dependencies"`** — four packages, each earning its place:

| Package | Why it is here | Notes chapter |
| :--- | :--- | :--- |
| `express` | the HTTP surface the lab is observed through | — |
| `zod` | one schema for the wire contract **and** runtime validation | [02 §02.5](../notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) |
| `zod-to-json-schema` | turns that one Zod schema into the JSON Schema the model reads | [02 §02.5](../notes/02_Tool_Contracts_JSON_Schema_and_OpenAPI.md) |
| `openai` | the provider client (any OpenAI-compatible endpoint works) | [03 §03.7](../notes/03_The_Five_Step_Wire_Protocol_and_Double_Turn_Calling.md) |
| `dotenv` | loads `.env` before the config module parses it | [06 §06.5](../notes/06_Error_Handling_Self_Healing_and_Result_Reinjection.md) |

> **Why `zod-to-json-schema` and not two hand-written definitions?** Because chapter 02 §02.5 is a rule, not
> a suggestion: *one schema, two consumers*. If you maintain the JSON Schema by hand, it will drift from the
> validator — and the model will be told a contract you do not enforce.

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

**`module` + `moduleResolution: NodeNext`** — the ESM pair. Together they enforce the `.js` import-specifier
rule described above, at compile time rather than at 3 a.m.

**`strict: true`** — non-negotiable in this lecture. The whole point of chapters 02 and 06 is that a
*proposal* is untrusted data crossing into typed code. `strict` is what forces the boundary to be explicit
(`args: unknown`, then `safeParse`) instead of an implicit `any` that silently swallows a malformed call.

**`outDir` / `rootDir`** — `src/` compiles to `dist/`, so `npm start` runs exactly the code you typechecked.

---

## 1.4 `.env.example` (full file)

```ini
# ---- HTTP -------------------------------------------------------------------
PORT=8098

# ---- Model (chapter 03 §03.3, chapter 07 §07.2) ------------------------------
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.1
# B_output — bounds the worst-case completion cost (chapter 08 §08.6).
AI_MAX_TOKENS=500
# Chapter 07 §07.2 — the routing policy sent on every request.
# auto | required | none | a tool name (forces that tool).
TOOL_CHOICE=auto

# ---- Loop brakes (chapter 05 §05.7) -----------------------------------------
# The five brakes: steps, wall clock, token ceiling, repeated call, no progress.
MAX_STEPS=6
REQUEST_TIMEOUT_MS=60000
TOKEN_CEILING=60000
# Same name+args proposed this many times -> halt as "no progress" (thrash).
REPEATED_CALL_LIMIT=2

# ---- Tool policy (chapter 04 §04.9, chapter 08 §08.4.2) ---------------------
# Per-tool timeout; must be shorter than REQUEST_TIMEOUT_MS.
TOOL_TIMEOUT_MS=8000
# TTL for information tools (weather, currency) — chapter 04 §04.9.1.
CACHE_TTL_MS=300000
# Tool calls allowed per request; caps fan-out on a parallel batch.
MAX_CALLS_PER_STEP=4

# ---- Request shape (chapter 06 §06.5) ---------------------------------------
MAX_INPUT_CHARS=2000

# ---- Credentials ------------------------------------------------------------
# With no key the lab runs in OFFLINE mode: the whole protocol (contracts, the
# 5-step loop, errors, self-healing, the trace and the ledger) still works
# against a deterministic stub model (chapter 03 §03.1 — the model only proposes).
OPENAI_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Why each group exists

| Group | Notes chapter | The engineering point |
| :--- | :--- | :--- |
| Model | 03 §03.3, 07 §07.2 | `AI_TEMPERATURE=0.1` — routing and arguments should be *stable*, not creative |
| Brakes | 05 §05.7 | five independent stops; each catches a different failure mode |
| Tool policy | 04 §04.9 | timeout, cache TTL and fan-out per tool family |
| Request shape | 06 §06.5 | the first thing to reject is a bad request |
| Credentials | 03 §03.1 | an empty key selects OFFLINE mode, so the lab is studyable with zero spend |

**The nesting rule to memorise** (chapter 05 §05.7.1):

```text
tool timeout (8 s)  <  request deadline (60 s)  <  token ceiling (60 k)
```

If a tool timeout is longer than the request deadline, the request dies while the tool is still running and
you have no result to report. If the token ceiling is missing, a loop that keeps re-sending a growing history
can bill without limit (chapter 08 §08.6.1).

---

## 1.5 `.gitignore` (full file)

```text
# Dependencies & build output
node_modules/
dist/

# Secrets — never commit a real key
.env
.env.local

# Logs
*.log
```

`.env` is ignored, `.env.example` is committed. That is the only safe arrangement: the example documents every
knob, and no key ever reaches the repository (chapter 08 §08.7.2 — never log or store credentials).

---

**Next:** [Chapter 02 — Config & Types](./02_Config_and_Types.md)
