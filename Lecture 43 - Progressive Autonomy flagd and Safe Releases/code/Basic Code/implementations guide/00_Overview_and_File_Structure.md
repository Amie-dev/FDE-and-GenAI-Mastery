# Implementation Guide — Chapter 00: Overview & Project Configuration

This guide walks chapter-by-chapter through every file in `code/Basic Code/`, explaining how `OpenFeature`, `flagd` JSON rules, Shadow Mode, Canary Rollback, and HMAC-SHA256 Signed Release Manifests work together.

---

## Directory Structure

```text
Basic Code/
├── .gitignore
├── package.json
├── tsconfig.json
├── flags.flagd.json          # Chapter 02: Declarative flagd configuration
├── src/
│   ├── flagd-provider.ts     # Chapter 02: OpenFeature Provider backed by flagd JSON
│   ├── release-pipeline.ts   # Chapter 03-06: Shadow comparator, canary rollback, signed manifest
│   ├── index.ts              # End-to-end demo
│   └── release-gate.test.ts  # 4 automated release-gate tests
└── implementations guide/
    ├── 00_Overview_and_File_Structure.md
    ├── 01_OpenFeature_and_flagd_Provider.md
    ├── 02_Shadow_Mode_Canary_Rollback_and_Manifests.md
    └── 03_Demo_and_Release_Gate_Verification.md
```

---

## 1. `package.json`

```json
{
  "name": "lecture-43-progressive-autonomy-flagd",
  "version": "1.0.0",
  "description": "Lecture 43: Progressive autonomy, OpenFeature + flagd runtime routing, shadow mode, eval-gated canary rollback, and signed release manifests.",
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts"
  },
  "dependencies": {
    "@openfeature/server-sdk": "^1.13.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

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

## 3. `.gitignore`

```text
node_modules/
dist/
*.log
```

## 4. `flags.flagd.json`

```json
{
  "$schema": "https://flagd.dev/schema/v0/flags.json",
  "flags": {
    "active_model": {
      "state": "ENABLED",
      "variants": {
        "baseline": "gpt-4o-2024-11-20",
        "canary": "claude-3-5-sonnet-20241022",
        "budget": "gpt-4o-mini"
      },
      "defaultVariant": "baseline"
    },
    "autonomy_mode": {
      "state": "ENABLED",
      "variants": {
        "shadow": "shadow",
        "human": "human_approved",
        "auto": "autonomous"
      },
      "defaultVariant": "human"
    },
    "shadow_enabled": {
      "state": "ENABLED",
      "variants": {
        "on": true,
        "off": false
      },
      "defaultVariant": "on"
    },
    "canary_weight_pct": {
      "state": "ENABLED",
      "variants": {
        "zero": 0,
        "one": 1,
        "ten": 10,
        "fifty": 50,
        "hundred": 100
      },
      "defaultVariant": "ten"
    },
    "max_auto_refund_usd": {
      "state": "ENABLED",
      "variants": {
        "conservative": 25,
        "expanded": 75
      },
      "defaultVariant": "conservative"
    }
  }
}
```

### Explanation
- **`flags.flagd.json`** follows the standard `flagd` v0 schema, separating **model variants**, **autonomy rungs**, **shadow toggle**, **canary split weight**, and **numeric dollar guardrails** from application code.

---
**Next:** [Chapter 01: OpenFeature & `flagd` Provider](./01_OpenFeature_and_flagd_Provider.md)

