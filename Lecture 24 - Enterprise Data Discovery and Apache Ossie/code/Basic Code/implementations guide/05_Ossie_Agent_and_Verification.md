# Chapter 05: Apache Ossie Agent, Demo & Release Gate Tests

> **Chapter goal:** wire the catalogue, resolver, and ACLs together in `src/ossie-agent.ts`, run the demo (`src/index.ts`), and verify all 5 release gates (`src/release-gate.test.ts`).
> **Notes chapter covered:** 07 (Apache Ossie & Metadata-Aware AI).

---

## 5.1 Full code: `src/ossie-agent.ts`

File path: `code/Basic Code/src/ossie-agent.ts`

```ts
import type { MetadataCatalogue } from "./catalogue.js";
import { resolveCanonicalEntities, resolveFieldWithPrecedence } from "./resolver.js";
import type {
  OssieQueryResponse,
  PiiLevel,
  PrecedenceRule,
  ResolvedField,
  SystemRecord,
} from "./types.js";

/**
 * Metadata-aware AI query engine (Apache Ossie pattern):
 * 1. Looks up glossary metrics & ACL-filtered columns from the catalogue.
 * 2. Resolves canonical entities across CRM & Billing.
 * 3. Applies deterministic field-level SoR precedence rules and attaches provenance.
 */
export function queryMetadataAwareAgent(params: {
  domain: string;
  fields: string[];
  metricTerm?: string;
  callerClearance: PiiLevel;
  catalogue: MetadataCatalogue;
  records: SystemRecord[];
  precedenceRules: PrecedenceRule[];
}): OssieQueryResponse {
  const entities = resolveCanonicalEntities(params.records);
  const match = entities.find((e) => e.entity.normalizedDomain === params.domain.toLowerCase());
  if (!match) {
    throw new Error(`Canonical entity not found for domain '${params.domain}'`);
  }

  const resolvedFields: Record<string, ResolvedField> = {};
  for (const f of params.fields) {
    const res = resolveFieldWithPrecedence(f, match.records, params.precedenceRules);
    if (res) resolvedFields[f] = res;
  }

  const metricUsed = params.metricTerm ? params.catalogue.findMetric(params.metricTerm) : undefined;
  const targetAsset = metricUsed?.authoritativeAsset ?? "mart.customer_360";
  const acl = params.catalogue.filterColumnsByClearance(targetAsset, params.callerClearance);

  return {
    canonicalId: match.entity.canonicalId,
    displayName: match.entity.displayName,
    resolvedFields,
    metricUsed,
    accessibleColumns: acl.accessible,
    maskedColumns: acl.masked,
  };
}
```

---

## 5.2 Full code: `src/index.ts` & `src/release-gate.test.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { MetadataCatalogue } from "./catalogue.js";
import { queryMetadataAwareAgent } from "./ossie-agent.js";
import { generateSyntheticEnterpriseRecords } from "./synthetic.js";
import type { PrecedenceRule } from "./types.js";

export function buildDemoCatalogue(): MetadataCatalogue {
  const catalogue = new MetadataCatalogue();

  catalogue.registerAsset({
    assetId: "crm.accounts",
    system: "crm",
    tier: "SAAS_API",
    certifiedGold: false,
    ownerTeam: "@sales-ops",
    freshnessSla: "15m",
    upstreamAssets: [],
    columns: [
      { name: "localId", type: "string", pii: "INTERNAL", description: "Salesforce Account ID" },
      { name: "accountOwner", type: "string", pii: "INTERNAL", description: "Assigned AE" },
    ],
  });

  catalogue.registerAsset({
    assetId: "billing.subscriptions",
    system: "billing",
    tier: "OLTP",
    certifiedGold: true,
    ownerTeam: "@finance-revops",
    freshnessSla: "real-time",
    upstreamAssets: [],
    columns: [
      { name: "subscriptionStatus", type: "enum", pii: "INTERNAL", description: "Authoritative Stripe status" },
      { name: "mrrUsd", type: "number", pii: "CONFIDENTIAL", description: "Monthly recurring revenue" },
      { name: "taxId", type: "string", pii: "RESTRICTED", description: "Tax identifier" },
    ],
  });

  catalogue.registerAsset({
    assetId: "mart.customer_360",
    system: "warehouse",
    tier: "WAREHOUSE",
    certifiedGold: true,
    ownerTeam: "@data-platform",
    freshnessSla: "1h",
    upstreamAssets: ["crm.accounts", "billing.subscriptions"],
    columns: [
      { name: "canonicalId", type: "string", pii: "INTERNAL", description: "Unified customer ID" },
      { name: "subscriptionStatus", type: "enum", pii: "INTERNAL", description: "Resolved status" },
    ],
  });

  catalogue.registerMetric({
    id: "net_arr",
    synonyms: ["ARR", "Annual Recurring Revenue"],
    formulaSql: "SUM(mrrUsd * 12)",
    requiredFilters: ["subscriptionStatus = 'active'"],
    authoritativeAsset: "billing.subscriptions",
    ownerTeam: "@finance-revops",
  });

  return catalogue;
}

export const DEFAULT_PRECEDENCE_RULES: PrecedenceRule[] = [
  { field: "subscriptionStatus", priorityOrder: ["billing", "crm", "support"], rationale: "Billing reflects real payment state" },
  { field: "mrrUsd", priorityOrder: ["billing", "crm"], rationale: "Billing reflects actual invoiced MRR" },
  { field: "accountOwner", priorityOrder: ["crm", "support"], rationale: "CRM owns sales territory assignment" },
];

function main(): void {
  const catalogue = buildDemoCatalogue();
  const records = generateSyntheticEnterpriseRecords();

  console.log("=== 1. Upstream Lineage for mart.customer_360 ===");
  console.log(catalogue.getUpstreamLineage("mart.customer_360"));

  console.log("\n=== 2. Metadata-Aware Query (Conflicting CRM vs. Billing for acme.com) ===");
  const response = queryMetadataAwareAgent({
    domain: "acme.com",
    fields: ["subscriptionStatus", "mrrUsd", "accountOwner"],
    metricTerm: "ARR",
    callerClearance: "CONFIDENTIAL",
    catalogue,
    records,
    precedenceRules: DEFAULT_PRECEDENCE_RULES,
  });
  console.log(JSON.stringify(response, null, 2));
}

main();
```

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDemoCatalogue, DEFAULT_PRECEDENCE_RULES } from "./index.js";
import { queryMetadataAwareAgent } from "./ossie-agent.js";
import { generateSyntheticEnterpriseRecords, maskEmailDeterministically } from "./synthetic.js";

describe("Lecture 24 Release Gate", () => {
  it("Gate 1: Resolves conflicting CRM vs. Billing customer status using billing > crm precedence 100% of the time", () => {
    const catalogue = buildDemoCatalogue();
    const records = generateSyntheticEnterpriseRecords();

    const res = queryMetadataAwareAgent({
      domain: "acme.com",
      fields: ["subscriptionStatus", "mrrUsd", "accountOwner"],
      metricTerm: "ARR",
      callerClearance: "CONFIDENTIAL",
      catalogue,
      records,
      precedenceRules: DEFAULT_PRECEDENCE_RULES,
    });

    assert.equal(res.resolvedFields.subscriptionStatus.value, "past_due");
    assert.equal(res.resolvedFields.subscriptionStatus.authoritativeSystem, "billing");
    assert.equal(res.resolvedFields.subscriptionStatus.authoritativeRecordId, "cus_991");
    assert.equal(res.resolvedFields.subscriptionStatus.conflictsOverridden.length, 1);
    assert.equal(res.resolvedFields.subscriptionStatus.conflictsOverridden[0].system, "crm");
    assert.equal(res.resolvedFields.subscriptionStatus.conflictsOverridden[0].value, "active");

    assert.equal(res.resolvedFields.accountOwner.authoritativeSystem, "crm");
    assert.equal(res.resolvedFields.accountOwner.value, "Alice Rivera");
  });

  it("Gate 2: Lineage DAG traces upstream sources for certified Gold mart", () => {
    const catalogue = buildDemoCatalogue();
    const lineage = catalogue.getUpstreamLineage("mart.customer_360");
    assert.deepEqual(lineage.sort(), ["billing.subscriptions", "crm.accounts"]);
  });

  it("Gate 3: Business vocabulary resolves natural-language 'ARR' to canonical net_arr contract", () => {
    const catalogue = buildDemoCatalogue();
    const metric = catalogue.findMetric("ARR");
    assert.ok(metric);
    assert.equal(metric.id, "net_arr");
    assert.equal(metric.authoritativeAsset, "billing.subscriptions");
  });

  it("Gate 4: Column-level ACL masks RESTRICTED columns for CONFIDENTIAL callers", () => {
    const catalogue = buildDemoCatalogue();
    const acl = catalogue.filterColumnsByClearance("billing.subscriptions", "CONFIDENTIAL");
    assert.ok(acl.accessible.includes("mrrUsd"));
    assert.ok(acl.masked.includes("taxId"));
  });

  it("Gate 5: Synthetic email masking is deterministic across CRM and Billing", () => {
    const a = maskEmailDeterministically("OPS@ACME.COM");
    const b = maskEmailDeterministically("ops@acme.com");
    assert.equal(a, b);
    assert.ok(!a.includes("ops"));
  });
});
```

### Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

