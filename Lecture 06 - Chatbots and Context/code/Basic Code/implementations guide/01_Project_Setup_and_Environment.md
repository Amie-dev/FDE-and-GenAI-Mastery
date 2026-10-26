# Chapter 01: Project Setup & Environment

> **Chapter goal:** stand the project up — dependencies, TypeScript configuration, environment template —
> and understand *why* each dependency is here and nothing more.
> **Notes chapters covered:** 01 §01.11 (the reference architecture we are building), 02 §02.9 (the budget
> knobs we configure here and derive in chapter 02), 05 §05.7 (the OFFLINE mode that keeps the lab free).

---

## 1.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `package.json` | dependencies and scripts |
| `tsconfig.json` | ESM + NodeNext TypeScript configuration |
| `.env.example` | the environment template you copy to `.env` |
| `.gitignore` | keeps `node_modules`, `dist` and `.env` out of git |

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
  "name": "lecture-06-basic-chatbot-context-lab",
  "version": "1.0.0",
  "description": "Basic Express + TypeScript stateless-chatbot lab: session store, role architecture, token budget, context management, application memory, SSE streaming, grounded refusal and citation verification (Lecture 06 — Chatbots and Context)",
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
    "chatbot",
    "stateless",
    "context-window",
    "context-management",
    "session",
    "sse",
    "streaming",
    "hallucination",
    "grounding",
    "guardrails",
    "express",
    "typescript"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "gpt-tokenizer": "^4.1.0",
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
| `"scripts".typecheck` | `tsc --noEmit` — catches type errors without writing files. Run it after every chapter |
| `zod` | Validates the environment **and** every request body (chapters 02, 07) |
| `express` | The HTTP layer — nothing else (chapter 08) |
| `dotenv` | Loads `.env` into `process.env` once, at boot |
| `openai` | The one SDK we call. Every supported provider speaks the same wire dialect, so one SDK plus a different `baseURL` is enough (Lecture 04's adapter idea, kept minimal) |
| `gpt-tokenizer` | The **Tier-2 exact** tokenizer from notes ch02 §02.4. Without it we could only estimate, and the notes are explicit that you must not use an estimate for billing |
| `tsx` + `typescript` + `@types/*` | Dev-only. No test framework and no linter, because the notes do not teach one |

**Why a tokenizer dependency at all?** Because chapter 02 §02.4 makes a hard claim: *"use the estimate to
decide, use the tokenizer to report and to enforce."* A codebase that only had the estimate would be
quietly contradicting the notes.

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

| Option | Why |
| :--- | :--- |
| `target: ES2022` | Native `Object.freeze`, optional chaining, `Array.prototype.at` — no down-levelling noise |
| `module` / `moduleResolution: NodeNext` | The correct pairing for Node ESM. It also *enforces* the `.js` extension on relative imports, which is the most common ESM mistake |
| `rootDir: ./src`, `outDir: ./dist` | `src/` is the only source of truth; `dist/` is disposable output |
| `strict: true` | This lab leans on the type system for real work: `Role` unions, `severity: 'block' | 'warn'`, `Tier` keys. Without `strict`, none of those catch anything |
| `skipLibCheck: true` | Keeps `tsc` fast by not type-checking dependencies |

---

## 1.5 `.env.example` (full file)

```bash
# ---- HTTP -------------------------------------------------------------------
PORT=8090

# ---- Model (chapter 01 §01.11, chapter 05) ----------------------------------
# temperature 0.3 is the support-bot default: low variance, but NOT a fix
# for hallucination — that is an architectural problem (chapters 06-07).
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=600

# ---- Context window budget (chapter 02 §02.9) -------------------------------
# C_max for the model. Never budget against this value directly.
CONTEXT_WINDOW_TOKENS=128000
# M_safety — margin for tokenizer drift / provider overhead (10%).
SAFETY_MARGIN=0.10
# Tier 4 (conversation history) share of the input budget — the elastic tier.
HISTORY_TIER_SHARE=0.35

# ---- Context management policy (chapter 03 §03.8) --------------------------
ANCHOR_TURNS=2
RECENT_TURNS=6
SUMMARISE_THRESHOLD=8
SEMANTIC_RECALL=3

# ---- Tier caps (chapter 02 §02.9) ------------------------------------------
MEMORY_TOP_K=12
RAG_TOP_K=5

# ---- Guardrails (chapter 07 §07.3, §07.8) ----------------------------------
MAX_INPUT_CHARS=8000
CITATION_MATCH_THRESHOLD=0.6
# false = log-only mode; true = flip an unverified answer into a refusal.
STRICT_VERIFICATION=true

# ---- Credentials -----------------------------------------------------------
# With no key the lab runs in OFFLINE mode: the whole context pipeline,
# the SSE stream and the guardrails still work, using a deterministic stub
# instead of a real model (chapter 05 §05.7).
OPENAI_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Block by block

The file is grouped by **notes section**, so you can read it top-to-bottom as a tour of the lecture.

| Group | Notes | Why these values |
| :--- | :--- | :--- |
| `PORT` | — | 8090, so it does not collide with the Lecture 05 lab on 8080 |
| Model block | ch 01 §01.11, ch 05 | `AI_TEMPERATURE=0.3` is the support-bot default the notes quote. The comment states the important part: low temperature is **not** a hallucination fix |
| Context window block | ch 02 §02.9 | `CONTEXT_WINDOW_TOKENS` is $C_{\max}$; `SAFETY_MARGIN` is $M_{\text{safety}}$; `HISTORY_TIER_SHARE` is tier 4's share of the input budget. **We never budget against $C_{\max}$ itself** |
| Context policy block | ch 03 §03.8 | These four values *are* the `ContextPolicy` object: the anchor $K$, the recent window $M$, the compaction threshold, and the recall $k$ |
| Tier caps | ch 02 §02.9 | Top-K for memory facts and for RAG chunks — the two tiers that are capped rather than elastic |
| Guardrails | ch 07 §07.3, §07.8 | The input length cap, the verifier's overlap threshold, and the strict-mode switch. `STRICT_VERIFICATION=false` is §07.8's "log only" rollout mode |
| Credentials | ch 05 §05.7 | All three keys may be empty. The comment names the consequence: OFFLINE mode, where the whole pipeline still runs |

> [!IMPORTANT]
> **Every one of these values is a policy decision, not a magic number.** When you tune the lab, change the
> `.env` and re-read chapter 02 §02.9 — the derived budget moves with it.

---

## 1.6 `.gitignore` (full file)

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

`node_modules/` and `dist/` are build artefacts; `.env` is a secret. The `.env.example` file is committed
on purpose — that is how a teammate knows which knobs exist without ever seeing your key.

---

## 1.7 Verify

```bash
npm run typecheck     # must print nothing
```

At this point nothing runs yet — you have only configuration. Chapter 02 adds the configuration *code*.

---

### Navigation

- **Previous:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)
- **Next:** [Chapter 02 — Config, Prompts & Types](./02_Config_Prompts_and_Types.md)
- **Notes:** [../../notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md](../../../notes/01_Stateless_LLMs_Conversation_History_and_Role_Architecture.md) ·
  [../../notes/02_Context_Windows_and_Token_Accumulation.md](../../../notes/02_Context_Windows_and_Token_Accumulation.md)
