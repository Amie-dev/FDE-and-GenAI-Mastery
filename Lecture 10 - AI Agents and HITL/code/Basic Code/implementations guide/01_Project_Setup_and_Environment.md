# Chapter 01: Project Setup & Environment

> **Chapter goal:** stand the project up from zero — dependencies, TypeScript config, and the `.env` that carries
> every policy knob — and know which notes chapter each setting comes from.
> **Notes chapters covered:** 01 §01.2 (agency level) · 04 §04.2–§04.5 (brakes) · 05 §05.4–§05.7 (jail + quotas) ·
> 07 §07.4.3 (the Tier 3 threshold) · 08 §08.7.3 (risk bands).

---

## 1.1 Commands

```bash
cd "Lecture 09 - AI Agents and HITL/code/Basic Code"
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

**`"type": "module"`** — the project is ESM. That is why every internal import ends in `.js`
(`from '../config/config.js'`) even though the source files are `.ts`: under `NodeNext` resolution the import
specifier must name the *emitted* file, not the source file. This is the single most common source of
"cannot find module" errors in a TS ESM project.

**`"scripts"`** — `dev` uses `tsx` so there is no build step while you read the notes; `typecheck` is the command
that turns the notes' claims into compiler errors (for example, if a tool's `execute` returned the wrong shape).

**`"dependencies"`** — five packages, each earning its place:

| Package | Why it is here | Notes chapter |
| :--- | :--- | :--- |
| `express` | the HTTP surface the lab is observed through | — |
| `zod` | one schema for the wire contract **and** runtime validation | [03 §03.9](../notes/03_The_Agent_Loop_Perceive_Decide_Act_and_State_Machines.md) |
| `zod-to-json-schema` | turns that one Zod schema into the JSON Schema the model reads | [02 §02.2.3](../notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) |
| `openai` | the provider client (any OpenAI-compatible endpoint works) | [02 §02.2.1](../notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) |
| `dotenv` | loads `.env` before the config module parses it | [02 §02.3](../notes/02_Agent_Architecture_Components_and_Request_Lifecycle.md) |

> **Why `zod-to-json-schema` rather than writing the JSON by hand.** Chapter 03 §03.9's whole claim is that
> arguments are untrusted data crossing into typed code. If the schema the model *reads* and the schema you
> *validate with* are two different files, they will drift — and the drift is invisible until an argument that
> validates fails to generate. Deriving both from one Zod object makes that class of bug impossible.

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

**`"strict": true`** — the single most important line in the file. Chapters 03 and 08 are about a *proposal* being
untrusted data crossing into typed code. `strict` is what forces the boundary to be explicit (`args: unknown`,
then `safeParse`) instead of an implicit `any` that silently swallows a malformed call.

**`"module": "NodeNext"` + `"moduleResolution": "NodeNext"`** — ESM with the `.js`-suffix import rule described
above. Both must match, or TypeScript resolves imports differently from Node and `npm start` breaks after a clean
`typecheck`.

**`"outDir"` / `"rootDir"`** — `src/` compiles to `dist/`, so `npm start` runs exactly the code you typechecked.

**`"target": "ES2022"`** — `Promise.race` in `withTimeout` (chapter 04 §04.7) and `structuredClone`-era semantics
without a polyfill.

---

## 1.4 `.env.example` (full file)

```text
# ---- HTTP -------------------------------------------------------------------
PORT=8099

# ---- Agency (chapter 01 §01.2) ----------------------------------------------
# The 4 progressive levels. 4 = the autonomous goal-directed agent this lab builds.
# 1 = raw LLM (no tools)  2 = single tool  3 = multi-tool routing  4 = closed loop
AGENCY_LEVEL=4

# ---- Model (chapter 02 §02.2.1, chapter 03 §03.3) ---------------------------
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.1

# ---- Loop brakes (chapter 04 §04.2–§04.5) -----------------------------------
# The four brakes. Each catches a different failure mode, and each is a separate
# termination condition (chapter 04 §04.6).
MAX_STEPS=8
REQUEST_TIMEOUT_MS=60000
TOKEN_CEILING=60000
# Same tool + same arguments proposed this many times -> "no progress" halt.
REPEATED_CALL_LIMIT=2
# Per-tool timeout; must be SHORTER than REQUEST_TIMEOUT_MS (chapter 04 §04.7).
TOOL_TIMEOUT_MS=8000

# ---- Workspace sandbox (chapter 05 §05.4–§05.7) -----------------------------
# The jail root. Every filesystem tool routes its path through safePath() first.
WORKSPACE_ROOT=./workspace
MAX_FILE_BYTES=5242880
MAX_WORKSPACE_BYTES=104857600
MAX_FILES=500
MAX_DEPTH=10
MAX_PATH_LENGTH=255

# ---- Tool authorization tiers (chapter 07 §07.2, §07.4.3) -------------------
# Tier 3 tools above this amount need a human. The threshold lives in CODE,
# never in the prompt — a prompt can be argued with, a constant cannot.
FINANCIAL_THRESHOLD=5000
# How long an approval ticket stays valid before it expires (§07.4.2).
APPROVAL_TTL_MS=900000

# ---- Defensive wrapper (chapter 08 §08.7.3) ---------------------------------
# Risk bands: 0-29 allow · 30-59 extra checks · 60-79 restrict · 80-100 block.
RISK_ALLOW_MAX=29
RISK_RESTRICT_MIN=60
RISK_BLOCK_MIN=80

# ---- Request shape ----------------------------------------------------------
MAX_INPUT_CHARS=4000

# ---- Credentials ------------------------------------------------------------
# With no key the lab runs in OFFLINE mode: the whole loop (state machine,
# brakes, trace, ledger, tiers, HITL, RBAC, the wrapper) still works against a
# deterministic stub model (chapter 02 §02.2.1 — the model only proposes).
OPENAI_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Why each group exists

| Group | Notes chapter | The engineering point |
| :--- | :--- | :--- |
| Agency | 01 §01.2 | which of the four spectrum levels this process claims to be — a config decision, not a code change |
| Model | 02 §02.2.1 | `AI_TEMPERATURE=0.1` — tool selection and arguments should be *stable*, not creative |
| Brakes | 04 §04.2–§04.5 | four independent stops; each catches a different failure mode |
| Workspace | 05 §05.4–§05.7 | the jail root and five quotas — a sandbox is an architecture, not a sentence |
| Tiers | 07 §07.4.3 | the Tier 3 threshold lives in **code**, because a prompt can be argued with |
| Wrapper | 08 §08.7.3 | the four risk bands, so thresholds are policy rather than magic numbers |
| Credentials | 02 §02.2.1 | an empty key selects OFFLINE mode, so the lab is studyable with zero spend |

**The nesting rule to memorise** (chapter 04 §04.7):

```text
tool timeout (8 s)  <  request deadline (60 s)  <  token ceiling (60 k)
```

If a tool timeout is longer than the request deadline, the request dies while the tool is still running and you
have no result to report. If the token ceiling is missing, a loop that keeps re-sending a growing history can bill
without limit (chapter 04 §04.4).

**Why `FINANCIAL_THRESHOLD` is the most important number here** (chapter 07 §07.4.3):

```text
refundCustomer(200)    -> auto-approved, below the threshold
refundCustomer(50_000) -> parked as a Tier 3 ticket
```

Move that constant into the system prompt and a persuasive user can negotiate it down. Keep it in `.env` and the
model never learns it exists.

---

## 1.5 `.gitignore` (full file)

```text
# Dependencies & build output
node_modules/
dist/

# The agent's sandbox — generated at runtime, never committed
workspace/

# Secrets — never commit a real key
.env
.env.local

# Logs
*.log
```

`.env` is ignored, `.env.example` is committed. That is the only safe arrangement: the example documents every
knob, and no key ever reaches the repository (chapter 08 §08.7.2 — never log or store credentials).

**Note `workspace/` is ignored too.** That is the sandbox (chapter 05 §05.3 vector 3): the agent's output lives on
a separate path from application source, so a successful write can never touch the code that is running.

---

**Next:** [Chapter 02 — Config & Types](./02_Config_and_Types.md)
