# Chapter 01: Project Setup & Semantic Layer Policies

> **Chapter goal:** configure `package.json` / `tsconfig.json` and define `src/semantic-layer.ts` with role-based column allow-lists and warehouse data.
> **Notes chapters covered:** 02 (Semantic Layers) & 05 (Column-Level Authorization).

---

## 1.1 Full code: `package.json` & `tsconfig.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-26-semantic-text-to-sql-python",
  "version": "1.0.0",
  "description": "Lecture 26 Basic Code — AST-Validated Text-to-SQL, Column ACLs, Sandboxed Python & Numerical Reconciliation",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "text-to-sql",
    "sql-ast",
    "node-sql-parser",
    "python-sandbox",
    "numerical-reconciliation",
    "typescript"
  ],
  "license": "ISC",
  "dependencies": {
    "node-sql-parser": "^5.3.9"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

---

## 1.2 Full code: `src/semantic-layer.ts`

File path: `code/Basic Code/src/semantic-layer.ts`

```ts
export type CallerRole = "analyst" | "admin";

export interface TablePolicy {
  tableName: string;
  allowedColumns: Record<CallerRole, string[]>;
  hasRestrictedPii: boolean;
}

export interface SubscriptionRow {
  customer_id: string;
  region: "NA" | "EMEA" | "APAC";
  plan_tier: "starter" | "pro" | "enterprise";
  status: "active" | "past_due" | "canceled";
  mrr_usd: number;
  quarter: "2026-Q2" | "2026-Q3";
  billing_email: string; // Restricted PII column
}

export const SEMANTIC_SCHEMA_POLICIES: TablePolicy[] = [
  {
    tableName: "mart_subscriptions",
    hasRestrictedPii: true,
    allowedColumns: {
      analyst: ["customer_id", "region", "plan_tier", "status", "mrr_usd", "quarter"],
      admin: ["customer_id", "region", "plan_tier", "status", "mrr_usd", "quarter", "billing_email"],
    },
  },
];

export const WAREHOUSE_SUBSCRIPTIONS: SubscriptionRow[] = [
  { customer_id: "c1", region: "EMEA", plan_tier: "enterprise", status: "active", mrr_usd: 12000, quarter: "2026-Q2", billing_email: "fin1@acme.eu" },
  { customer_id: "c2", region: "EMEA", plan_tier: "enterprise", status: "active", mrr_usd: 18000, quarter: "2026-Q2", billing_email: "fin2@beta.eu" },
  { customer_id: "c1", region: "EMEA", plan_tier: "enterprise", status: "active", mrr_usd: 15000, quarter: "2026-Q3", billing_email: "fin1@acme.eu" },
  { customer_id: "c2", region: "EMEA", plan_tier: "enterprise", status: "canceled", mrr_usd: 0, quarter: "2026-Q3", billing_email: "fin2@beta.eu" },
  { customer_id: "c3", region: "NA", plan_tier: "enterprise", status: "active", mrr_usd: 25000, quarter: "2026-Q2", billing_email: "ap@north.us" },
  { customer_id: "c3", region: "NA", plan_tier: "enterprise", status: "active", mrr_usd: 32000, quarter: "2026-Q3", billing_email: "ap@north.us" },
  { customer_id: "c4", region: "NA", plan_tier: "pro", status: "active", mrr_usd: 4000, quarter: "2026-Q3", billing_email: "ap@mid.us" },
  { customer_id: "c5", region: "APAC", plan_tier: "enterprise", status: "active", mrr_usd: 14000, quarter: "2026-Q2", billing_email: "pay@apac.sg" },
  { customer_id: "c5", region: "APAC", plan_tier: "enterprise", status: "active", mrr_usd: 21000, quarter: "2026-Q3", billing_email: "pay@apac.sg" },
  { customer_id: "c6", region: "APAC", plan_tier: "starter", status: "past_due", mrr_usd: 500, quarter: "2026-Q3", billing_email: "ops@small.jp" },
];
```

### Explanation
- **`SEMANTIC_SCHEMA_POLICIES`:** Separates `analyst` vs. `admin` column allow-lists and flags `hasRestrictedPii: true` so `SELECT *` is automatically blocked for `mart_subscriptions`.

