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

