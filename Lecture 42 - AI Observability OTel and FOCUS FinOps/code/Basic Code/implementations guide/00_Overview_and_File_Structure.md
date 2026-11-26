# Implementation Guide — Chapter 00: Overview & Project Configuration

This guide walks chapter-by-chapter through every file in `code/Basic Code/`, explaining how the OpenTelemetry GenAI instrumentation, OpenObserve OTLP formatter, tenant hard-budget guard, CPST calculator, and FOCUS v1.0 reporter work together.

---

## Directory Structure

```text
Basic Code/
├── .gitignore
├── package.json
├── tsconfig.json
├── src/
│   ├── otel.ts               # Chapter 01-02: OTel GenAI spans + OpenObserve OTLP JSON
│   ├── finops.ts             # Chapter 05-07: Rate card, TenantBudgetGuard, CPST & FOCUS v1.0
│   ├── index.ts              # End-to-end multi-tenant simulation
│   └── release-gate.test.ts  # 4 automated release-gate tests
└── implementations guide/
    ├── 00_Overview_and_File_Structure.md
    ├── 01_OTel_GenAI_Spans_and_OpenObserve_OTLP.md
    ├── 02_FinOps_CPST_Budgets_and_FOCUS_Reporting.md
    └── 03_Demo_and_Release_Gate_Verification.md
```

---

## 1. `package.json`

```json
{
  "name": "lecture-42-otel-focus-finops",
  "version": "1.0.0",
  "description": "Lecture 42: OpenTelemetry GenAI semantic conventions, OpenObserve OTLP export, hard budgets, CPST, and FOCUS cost reporting.",
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts"
  },
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-trace-base": "^1.30.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### Explanation
- **`@opentelemetry/api` & `@opentelemetry/sdk-trace-base`**: Vendor-neutral OpenTelemetry tracing API and in-memory span processor/exporter so tests run deterministically offline without requiring a live OpenObserve server.
- **`tsx --test src/release-gate.test.ts`**: Runs Node's built-in `node:test` runner directly on TypeScript files.

---

## 2. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

### Explanation
- Uses `NodeNext` ESM resolution with `strict: true` and `noEmit: true` so `npm run typecheck` validates all types cleanly.

---

## 3. `.gitignore`

```text
node_modules/
dist/
*.log
```

---
**Next:** [Chapter 01: OTel GenAI Spans & OpenObserve OTLP](./01_OTel_GenAI_Spans_and_OpenObserve_OTLP.md)

