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

