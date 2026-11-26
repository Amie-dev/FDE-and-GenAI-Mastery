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

    // Field-level precedence: CRM wins for accountOwner
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

