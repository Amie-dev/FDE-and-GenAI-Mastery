# Implementation Guide — Chapter 00: Overview & Project Configuration

This guide walks chapter-by-chapter through every file in `code/Basic Code/`, explaining how `authentik`-compatible OIDC JWTs, RFC 8693 OBO Token Exchange, Zanzibar ReBAC, and the fail-closed MCP Policy Gateway work together.

---

## Directory Structure

```text
Basic Code/
├── .gitignore
├── package.json
├── tsconfig.json
├── src/
│   ├── oidc.ts               # Chapter 02-05: OIDC JWT signing/verification + RFC 8693 OBO exchange
│   ├── rebac.ts              # Chapter 06: Zanzibar-style ReBAC graph + SCIM offboarding
│   ├── gateway.ts            # Chapter 07: Fail-closed MCP Policy Gateway + Audit log
│   ├── index.ts              # End-to-end Alice vs. Bob indirect injection demo
│   └── release-gate.test.ts  # 4 automated release-gate tests
└── implementations guide/
    ├── 00_Overview_and_File_Structure.md
    ├── 01_OIDC_and_OBO_Token_Exchange.md
    ├── 02_ReBAC_Engine_and_MCP_Policy_Gateway.md
    └── 03_Demo_and_Release_Gate_Verification.md
```

---

## 1. `package.json`

```json
{
  "name": "lecture-44-enterprise-identity-rebac",
  "version": "1.0.0",
  "description": "Lecture 45: OIDC JWT validation, RFC 8693 OBO Token Exchange, Zanzibar ReBAC, and fail-closed MCP Policy Gateway.",
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts"
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

---
**Next:** [Chapter 01: OIDC & RFC 8693 OBO Token Exchange](./01_OIDC_and_OBO_Token_Exchange.md)

