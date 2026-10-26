# Chapter 01: Project Setup, Config & Types

> **Chapter goal:** stand the project up — dependencies, TypeScript configuration, environment validation — and
> define the shared types that every later chapter reuses.
> **Notes chapters covered:** 01 (five slots, prompt as an interface), 09 (pinned model version).

---

## 1.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `package.json` | dependencies and scripts |
| `tsconfig.json` | ESM + NodeNext TypeScript configuration |
| `.env.example` | the environment template you copy to `.env` |
| `src/config/config.ts` | Zod-validated environment, endpoints, canonical slot order |
| `src/types/prompt.types.ts` | every shared type: slots, exemplar, persona, pattern, metrics, registry entry |

---

## 1.2 Commands

```bash
# from: code/Basic Code/
cp .env.example .env
npm install
npm run typecheck
```

---

## 1.3 `package.json` (full file)

```json
{
  "name": "lecture-05-basic-prompt-engineering-lab",
  "version": "1.0.0",
  "description": "Basic Express + TypeScript prompt-pattern lab: zero-shot, few-shot, Chain-of-Thought, persona, chat templates, prompt hygiene, guardrails and a versioned prompt registry (Lecture 05 — Prompt Engineering)",
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
    "prompt-engineering",
    "express",
    "typescript",
    "zero-shot",
    "few-shot",
    "chain-of-thought",
    "persona",
    "chat-template",
    "guardrails",
    "evals"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
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

### Block by block

| Block | What it does |
| :--- | :--- |
| `"type": "module"` | Makes the project **ESM**. This is why every local import ends in `.js` (see §1.5) |
| `"scripts".dev` | `tsx watch` runs TypeScript directly and restarts on save — no build step while learning |
| `"scripts".build` / `"start"` | `tsc` emits to `dist/`, then plain `node` runs it — the production path |
| `"scripts".typecheck` | `tsc --noEmit` — catches type errors without writing files. Run this after every chapter |
| `dependencies` | **`zod`** validates env and request bodies (ch 07/08) · **`express`** the HTTP layer · **`dotenv`** loads `.env` · **`openai`** the one SDK we call (ch 06/09) |
| `devDependencies` | Types plus `tsx` and `typescript`. Nothing else — no test framework, no linter, because the notes do not teach one |

**Why only the `openai` SDK?** Because every provider we support (OpenAI, Groq, Ollama) speaks the *same* wire
dialect, so one SDK plus a different `baseURL` is enough. This is the Lecture 04 adapter idea, kept minimal.

---

## 1.4 `tsconfig.json` (full file)

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

| Option | Why it is set this way |
| :--- | :--- |
| `module` + `moduleResolution: "NodeNext"` | Tells TypeScript the output is **real ESM** for Node. It is also why imports must carry the `.js` extension |
| `target: "ES2022"` | Gives us top-level `await`, `Object.fromEntries`, `Array.prototype.at`, `replaceAll` — all used in this codebase |
| `strict: true` | No implicit `any`. The types in `prompt.types.ts` are the whole point of this chapter |
| `outDir` / `rootDir` | `src/` in, `dist/` out — so `npm run build && npm start` works |
| `skipLibCheck` | Skips type-checking `node_modules` — faster builds |

---

## 1.5 `.env.example` (full file)

```bash
# ─────────────────────────────────────────────────────────────
# Lecture 05 — Basic Code · environment template
# Copy to `.env` and fill in the key of the provider you use.
# ─────────────────────────────────────────────────────────────

# HTTP server
PORT=8080

# ── Chapter 09 — a pinned model version is what makes an evaluation reproducible ──
# AI_PROVIDER selects the endpoint: openai | groq | ollama
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini

# Chapter 02 — temperature 0 while debugging a prompt: reproducibility first.
AI_TEMPERATURE=0
AI_MAX_TOKENS=400

# ── Chapter 08 — input guardrail: the maximum size of untrusted text we accept ──
MAX_INPUT_CHARS=8000

# ── Credentials: only the ACTIVE provider's key is required ──
# Ollama runs locally and needs no key.
OPENAI_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Block by block

| Variable | Chapter | Why it exists |
| :--- | :--- | :--- |
| `AI_MODEL` | 09 | A **pinned** model version. If the provider silently changes the model, your baseline evaporates — so the name is recorded with every call |
| `AI_TEMPERATURE=0` | 02 | The debugging default. It removes sampling as an explanation for a behaviour change, so an evaluation measures the *prompt* |
| `MAX_INPUT_CHARS` | 08 | An input guardrail. Oversized input is a cost and a dilution problem, not a feature |
| Provider keys | 08 | Secrets live here and **never** in a prompt. Only the active provider's key is required |
| `OLLAMA_BASE_URL` | 06 | The local runtime needs no key — which is why five endpoints work with an empty `.env` |

---

## 1.6 `src/config/config.ts` (full file)

```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Chapter 01 / 07 — the canonical instruction ordering.
 * Trusted rules first, untrusted DATA last: that is what the assembler in
 * `services/hygiene.service.ts` follows, and what keeps the prompt cacheable.
 */
export const SLOT_ORDER = ['role', 'task', 'constraints', 'contract', 'data'] as const;

/** Chapter 06 — the endpoint per provider. Both speak the OpenAI wire dialect. */
export const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
} as const;

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8080),
  AI_PROVIDER: z.enum(['openai', 'groq', 'ollama']).default('openai'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  // Chapter 02 — temperature 0 is the debugging default: it removes sampling as
  // an explanation for a behaviour change, so an evaluation measures the prompt.
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(400),
  // Chapter 08 — input guardrail: the largest untrusted payload we accept.
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8_000),
  OPENAI_API_KEY: z.string().default(''),
  GROQ_API_KEY: z.string().default(''),
  OLLAMA_BASE_URL: z.string().default(PROVIDER_ENDPOINTS.ollama),
});

/** Which key belongs to which provider. Ollama runs locally, so it has none. */
const KEY_FOR: Record<string, 'OPENAI_API_KEY' | 'GROQ_API_KEY' | ''> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: '',
};

const parsed = envSchema.safeParse(process.env);

// Chapter 08 — fail fast, fail loud: a bad deploy dies at boot, not on request one.
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/** The endpoint actually in use, so `/api/health` can show the live wiring. */
const activeEndpoint = (): string =>
  env.AI_PROVIDER === 'ollama' ? env.OLLAMA_BASE_URL : PROVIDER_ENDPOINTS[env.AI_PROVIDER];

/** The credential for the active provider — empty for Ollama. */
const activeApiKey = (): string => {
  const name = KEY_FOR[env.AI_PROVIDER];
  return name ? env[name] : '';
};

/** Frozen boot-time configuration — nothing drifts at runtime. */
export const config = Object.freeze({
  ...env,
  AI_ENDPOINT: activeEndpoint(),
  AI_API_KEY: activeApiKey(),
});

export type Config = typeof config;
```

### Block by block

**Block 1 — `dotenv.config()` and `SLOT_ORDER`.**
`dotenv.config()` reads `.env` into `process.env` before anything else runs. `SLOT_ORDER` is chapter 01 made
literal: it is the canonical order in which a prompt is assembled. It is exported as `as const` so the array is
read-only and its members are literal types.

**Block 2 — `PROVIDER_ENDPOINTS`.**
Chapter 06's point in code: the *endpoint* is provider-specific, but the *dialect* is the same, so one SDK can
talk to all three. `as const` again keeps the keys literal.

**Block 3 — `envSchema`.**
Zod describes the environment as a contract. Note two deliberate details:

- **`z.coerce.number()`** — environment variables are always strings, so coercion is required. Without it, `PORT`
  would be `"8080"` and arithmetic on it would silently produce strings.
- **`.default(...)` on every field** — the service must boot with an *empty* `.env`, which is what lets you study
  chapters 01–08 without a key.

**Block 4 — `KEY_FOR`.**
The mapping from provider to credential name. Ollama maps to `''`, meaning "no key needed". This is the one place
that knows which secret belongs to which provider — so no other file ever has to.

**Block 5 — `safeParse` and the fail-fast exit.**
`safeParse` returns a result object instead of throwing. On failure we print every issue with its path and
`process.exit(1)`. Chapter 08's principle: **a bad configuration must die at boot, not on the first user request.**
An empty `.env` still succeeds, because every field has a default.

**Block 6 — the two derived helpers.**
`activeEndpoint()` and `activeApiKey()` compute the *live* values once, at module load. `/api/health` reports them,
so you can always see which endpoint this process is really talking to — no guessing, no "it worked yesterday".

**Block 7 — the frozen export.**
`Object.freeze({ ...env, AI_ENDPOINT, AI_API_KEY })` is the only thing the rest of the codebase imports. Freezing
means a stray `config.PORT = 3000` throws instead of silently changing behaviour at runtime.

---

## 1.7 `src/types/prompt.types.ts` (full file)

```ts
/**
 * Lecture 05 — shared types.
 *
 * Every type in this file exists to make one notes chapter's idea concrete:
 * a slot, an exemplar, a persona, a pattern, a chat format, a metric, a registry entry.
 */

/**
 * Chapter 01 — the five slots of a well-formed prompt.
 * Slots 1, 2, 4 and 5 are written by the application and are TRUSTED.
 * Slot 3 (`context`) is written by someone else and is UNTRUSTED (chapter 07).
 */
export interface PromptSlots {
  role?: string; // 1 · who is answering
  task: string; // 2 · what exactly must be done
  context?: string; // 3 · the data to work from — always delimited
  constraints?: string[]; // 4 · what is mandatory / forbidden
  contract?: string; // 5 · the exact shape of a valid answer
}

/** Chapter 03 — an exemplar is one input→output demonstration, not a sentence. */
export interface Exemplar {
  input: string;
  output: string;
  label?: string; // used by the class-coverage rule (chapter 03, §03.7)
}

/** Chapter 05 — a persona is a small specification: seven fields plus a fallback. */
export interface Persona {
  id: string;
  version: string;
  identity: string;
  expertise: string[];
  audience: string;
  tone: string[];
  rules: string[];
  outputFormat: string;
  fallback: string;
}

/** Chapters 02–05 — the four techniques this lab builds and compares. */
export type Pattern = 'zero-shot' | 'few-shot' | 'cot' | 'persona';

/** Chapter 06 — the four chat templates this lab can render for inspection. */
export type ChatFormat = 'chatml' | 'alpaca' | 'inst' | 'flan';

/** Chapter 06 — one conversation turn, before it becomes a model-specific token sequence. */
export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Chapter 07 — the exact shape a caller can rely on. */
export interface TicketVerdict {
  category: 'BILLING' | 'TECHNICAL' | 'ACCOUNT' | 'OTHER';
  summary: string;
  severity: 1 | 2 | 3 | 4 | 5;
  needsHuman: boolean;
}

/** Chapter 08 — one hygiene or guardrail finding. */
export interface Finding {
  rule: string;
  severity: 'block' | 'warn';
  detail: string;
}

/** Chapter 09 — the six metrics that decide whether a prompt change is an improvement. */
export interface Metrics {
  formatValidity: number; // parseable + contract-valid
  taskAccuracy: number; // correct label on the golden set
  refusalRate: number; // legitimate requests declined
  injectionSuccessRate: number; // adversarial fixtures that changed behaviour (target: 0)
  avgInputTokens: number;
  avgOutputTokens: number;
  p95LatencyMs: number;
}

/** Chapter 09 — one registry entry: id, version, status, owner, template, metrics, changelog. */
export interface PromptRecord {
  id: string;
  version: string;
  status: 'draft' | 'canary' | 'active' | 'deprecated';
  owner: string;
  pattern: Pattern;
  personaId?: string;
  slots: PromptSlots;
  exemplars?: Exemplar[];
  changelog: { version: string; date: string; change: string; evalDelta: string }[];
  metrics?: Metrics;
}

/** Chapter 09 — one golden-set case. `stratum` is the bucket it belongs to. */
export interface GoldenCase {
  id: string;
  stratum: string;
  input: string;
  expectedCategory: TicketVerdict['category'];
  adversarial?: boolean;
  injectedToken?: string; // if this token appears in the output, the injection worked
}
```

### Block by block

**`PromptSlots`** — chapter 01's five slots. Two design decisions matter:

- **`task` is required, the rest are optional.** A prompt without a task is not a prompt, so the type system
  forbids it. The other four slots are optional because a minimal prompt only needs a task.
- **`context` is marked "UNTRUSTED" in the comment** — and in chapter 07 it is the *only* slot that goes into the
  `user` role. The type carries the trust boundary in its documentation.

**`Exemplar`** — chapter 03. It is a *pair*, not a sentence, and `label` exists purely so the class-coverage rule
in `checkExemplars()` can count classes without parsing the output.

**`Persona`** — chapter 05's seven fields (`identity`, `expertise`, `audience`, `tone`, `rules`, `outputFormat`)
plus `fallback`, which is what separates a demo persona from a production one. `id` and `version` are there because
chapter 05 §05.8 says personas are versioned artifacts.

**`Pattern` and `ChatFormat`** — union types, not enums. They give autocompletion and exhaustiveness checking in
`switch` statements while compiling to nothing at runtime.

**`ChatTurn`** — chapter 06. Note the role union has no `tool` member: this lecture has no tool calling, and adding
a role you never use would be dishonest.

**`TicketVerdict`** — chapter 07's contract as a TypeScript type. `category` and `severity` are literal unions, so
`severity: 7` is a compile error. This type is the *target* of the validation ladder.

**`Finding`** — chapters 07 and 08 share one shape. `severity: 'block' | 'warn'` is what makes `hasBlocking()`
possible: a `block` stops the pipeline, a `warn` is advisory.

**`Metrics`** — chapter 09's six metrics. `injectionSuccessRate` is documented as *target 0* right in the type.

**`PromptRecord`** — chapter 09's registry entry. The `changelog` array is typed to hold an `evalDelta`, because a
change without a measured delta is a description, not a decision.

**`GoldenCase`** — chapter 09's golden-set row. `stratum` makes stratification explicit, and `injectedToken` is
what lets the harness *prove* an injection failed rather than assume it.

---

## 1.8 Verify

```bash
npm run typecheck     # must print nothing
```

At this point nothing runs yet — you have only configuration and types. Chapter 02 adds the first behaviour.

---

### Navigation

- **Previous:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)
- **Next:** [Chapter 02 — Zero-Shot & Few-Shot Patterns](./02_Zero_Shot_and_Few_Shot_Patterns.md)
- **Notes:** [../../notes/01_Prompt_Engineering_as_an_Engineering_Discipline.md](../../../notes/01_Prompt_Engineering_as_an_Engineering_Discipline.md) ·
  [../../notes/07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md](../../../notes/07_Prompt_Hygiene_Delimiters_and_Output_Contracts.md)




