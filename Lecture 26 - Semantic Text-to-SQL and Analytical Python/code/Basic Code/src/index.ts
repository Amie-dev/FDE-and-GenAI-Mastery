import { validateSqlAst } from "./ast-guard.js";
import { runSandboxedPython } from "./python-sandbox.js";
import { reconcileNumbers } from "./reconciler.js";
import { SEMANTIC_SCHEMA_POLICIES, WAREHOUSE_SUBSCRIPTIONS } from "./semantic-layer.js";

function main(): void {
  console.log("=== 1. SQL AST Validation & Column ACL ===");
  const unsafeSql = "SELECT customer_id, billing_email FROM mart_subscriptions; DROP TABLE mart_subscriptions;";
  console.log("Blocked unsafe SQL:", validateSqlAst({ sql: unsafeSql, role: "analyst", policies: SEMANTIC_SCHEMA_POLICIES }));

  const safeSql = "SELECT region, quarter, mrr_usd FROM mart_subscriptions WHERE status = 'active' LIMIT 50";
  const astCheck = validateSqlAst({ sql: safeSql, role: "analyst", policies: SEMANTIC_SCHEMA_POLICIES });
  console.log("Approved safe SQL:", astCheck);

  console.log("\n=== 2. Read-Only Warehouse Aggregation + Sandboxed Python Analysis ===");
  const activeRows = WAREHOUSE_SUBSCRIPTIONS.filter((r) => r.status === "active");
  const pyResult = runSandboxedPython({
    inputData: activeRows,
    pythonCode: `
q2 = sum(r["mrr_usd"] for r in DATA if r["quarter"] == "2026-Q2")
q3 = sum(r["mrr_usd"] for r in DATA if r["quarter"] == "2026-Q3")
growth_pct = round(((q3 - q2) / q2) * 100, 2)
print(json.dumps({"q2_mrr": q2, "q3_mrr": q3, "growth_pct": growth_pct}))
`,
  });
  console.log("Sandboxed Python Output:", pyResult);

  console.log("\n=== 3. Numerical Reconciliation Gate ===");
  if (pyResult.ok && pyResult.metrics) {
    const goodSummary = `Active MRR grew from $${pyResult.metrics.q2_mrr} to $${pyResult.metrics.q3_mrr} (+${pyResult.metrics.growth_pct}%).`;
    console.log("Good narrative reconciliation:", reconcileNumbers(goodSummary, pyResult.metrics));

    const hallucinatedSummary = `Active MRR grew from $69000 to $99999 (+45.0%).`;
    console.log("Hallucinated narrative reconciliation:", reconcileNumbers(hallucinatedSummary, pyResult.metrics));
  }
}

main();

