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
