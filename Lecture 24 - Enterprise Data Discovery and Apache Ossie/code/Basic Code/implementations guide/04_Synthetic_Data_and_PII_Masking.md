# Chapter 04: Synthetic Data Environments & PII Masking

> **Chapter goal:** implement deterministic email pseudonymization and conflict-injected synthetic fixtures in `src/synthetic.ts`.
> **Notes chapter covered:** 03 (Synthetic Data Environments for Safe Dev).

---

## 4.1 Full code: `src/synthetic.ts`

File path: `code/Basic Code/src/synthetic.ts`

```ts
import { createHmac } from "node:crypto";
import type { SystemRecord } from "./types.js";

/**
 * Deterministic pseudonymization for synthetic dev/eval environments.
 * Masks PII (emails) via keyed HMAC while preserving cross-system joinability.
 */
export function maskEmailDeterministically(email: string, secretSalt = "synthetic-dev-salt"): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHmac("sha256", secretSalt).update(normalized).digest("hex").slice(0, 10);
  const domain = normalized.split("@")[1] ?? "example.test";
  return `user_${digest}@${domain}`;
}

/**
 * Generates a synthetic multi-system dataset with deliberate CRM vs. Billing status conflicts.
 */
export function generateSyntheticEnterpriseRecords(): SystemRecord[] {
  return [
    {
      system: "crm",
      localId: "sf_001",
      email: maskEmailDeterministically("ops@acme.com"),
      domain: "acme.com",
      companyName: "Acme Corp",
      updatedAt: "2026-11-26T09:00:00Z",
      fields: {
        subscriptionStatus: "active", // Stale CRM value!
        accountOwner: "Alice Rivera",
        mrrUsd: 15000, // Closed-won estimate (drifted)
      },
    },
    {
      system: "billing",
      localId: "cus_991",
      email: maskEmailDeterministically("ops@acme.com"),
      domain: "acme.com",
      companyName: "Acme Corporation",
      updatedAt: "2026-11-26T11:30:00Z",
      fields: {
        subscriptionStatus: "past_due", // Authoritative Billing value!
        mrrUsd: 12000, // Actual billed MRR
      },
    },
    {
      system: "crm",
      localId: "sf_002",
      email: maskEmailDeterministically("it@globex.io"),
      domain: "globex.io",
      companyName: "Globex Systems",
      updatedAt: "2026-11-25T16:00:00Z",
      fields: {
        subscriptionStatus: "active",
        accountOwner: "Bob Chen",
      },
    },
    {
      system: "billing",
      localId: "cus_992",
      email: maskEmailDeterministically("it@globex.io"),
      domain: "globex.io",
      companyName: "Globex Systems Inc.",
      updatedAt: "2026-11-26T08:00:00Z",
      fields: {
        subscriptionStatus: "active",
        mrrUsd: 8500,
      },
    },
  ];
}
```

---

## 4.2 Block-by-block explanation

1. **`maskEmailDeterministically()`:** Uses keyed HMAC-SHA256 on lowercased/trimmed emails so `"OPS@ACME.COM"` and `"ops@acme.com"` produce identical pseudonyms across CRM and Billing without exposing raw PII.
2. **`generateSyntheticEnterpriseRecords()`:** Intentionally seeds a status conflict (`"active"` in CRM vs. `"past_due"` in Billing) and an MRR drift (`15000` vs. `12000`) for `acme.com` so the precedence release gate can be verified deterministically.
