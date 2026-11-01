# Chapter 01 — File Structure & Setup

This chapter explains the overall file structure of the Basic Code and how to install/run it.

## Purpose
A minimal Express + TypeScript app that implements only the security features mentioned in Lecture 31 notes:
- PII masking (input guardrail)
- Output redaction (output guardrail)
- Safe tools / capability routing / argument validation / fail-closed

## File structure
```
code/Basic Code/
├── .env
├── package.json
├── package-lock.json   (created by `npm install`)
├── tsconfig.json
├── dist/               (created by `npm run build`)
│   └── ... compiled JS
└── src/
    ├── index.ts                 # entry point — wires Express + guardrails + routes
    ├── config/config.ts         # environment config (PORT)
    ├── types/index.ts           # shared TypeScript types
    ├── services/tool.service.ts # safe tool execution + capability routing
    ├── middleware/guardrail.middleware.ts  # input + output guardrails
    ├── controllers/chat.controller.ts      # /chat handler
    └── routes/index.ts          # Express routes
```

## Commands
```bash
# 1. Install dependencies
npm install

# 2. Type-check (no emit)
npx tsc --noEmit

# 3. Build to dist/
npm run build

# 4. Run in dev
npm run dev

# 5. Or run compiled
npm start
```

## Key rules followed (from Lecture 31 notes)
- TypeScript + Express only.
- One relevant file per folder (`config`, `routes`, `controllers`, `services`, `middleware`, `types`).
- Minimum code — only features the notes mention. No extra libraries.
- The model proposes; the backend executes and enforces.
- Fail closed on every security decision.
