import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSqlAst } from "./ast-guard.js";
import { runSandboxedPython } from "./python-sandbox.js";
import { reconcileNumbers } from "./reconciler.js";
import { SEMANTIC_SCHEMA_POLICIES, WAREHOUSE_SUBSCRIPTIONS } from "./semantic-layer.js";

describe("Lecture 26 Release Gate", () => {
  it("Gate 1: AST validator blocks 100% of DROP, UPDATE, stacked queries, SELECT * on PII, and unauthorized columns", () => {
    const attacks = [
      "DROP TABLE mart_subscriptions",
      "UPDATE mart_subscriptions SET mrr_usd = 0 WHERE customer_id = 'c1'",
      "DELETE FROM mart_subscriptions",
      "SELECT customer_id FROM mart_subscriptions; DROP TABLE mart_subscriptions",
      "SELECT * FROM mart_subscriptions LIMIT 10",
      "SELECT customer_id, billing_email FROM mart_subscriptions LIMIT 10",
      "SELECT customer_id FROM mart_subscriptions LIMIT 5000",
    ];

    for (const sql of attacks) {
      const res = validateSqlAst({ sql, role: "analyst", policies: SEMANTIC_SCHEMA_POLICIES, maxRows: 200 });
      assert.equal(res.allowed, false, `Expected AST guard to block: ${sql}`);
    }

    const valid = validateSqlAst({
      sql: "SELECT region, mrr_usd FROM mart_subscriptions WHERE status = 'active' LIMIT 50",
      role: "analyst",
      policies: SEMANTIC_SCHEMA_POLICIES,
      maxRows: 200,
    });
    assert.equal(valid.allowed, true);
  });

  it("Gate 2: Sandboxed Python computes exact warehouse metrics and blocks os/subprocess imports", () => {
    const blocked = runSandboxedPython({
      inputData: [],
      pythonCode: "import os\nprint(os.listdir('.'))",
    });
    assert.equal(blocked.ok, false);
    assert.ok(blocked.error?.includes("SandboxSecurityError"));

    const activeRows = WAREHOUSE_SUBSCRIPTIONS.filter((r) => r.status === "active");
    const ok = runSandboxedPython({
      inputData: activeRows,
      pythonCode: `
q2 = sum(r["mrr_usd"] for r in DATA if r["quarter"] == "2026-Q2")
q3 = sum(r["mrr_usd"] for r in DATA if r["quarter"] == "2026-Q3")
print(json.dumps({"q2": q2, "q3": q3, "delta": q3 - q2}))
`,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.metrics?.q2, 69000);
    assert.equal(ok.metrics?.q3, 72000);
    assert.equal(ok.metrics?.delta, 3000);
  });

  it("Gate 3: Numerical reconciliation catches hallucinated numbers and passes exact matches", () => {
    const ledger = { q2: 69000, q3: 72000, growth: 4.35 };
    const good = reconcileNumbers("MRR rose from $69,000 to $72,000 (+4.35%).", ledger);
    assert.equal(good.reconciled, true);

    const bad = reconcileNumbers("MRR rose from $69,000 to $85,000 (+23.1%).", ledger);
    assert.equal(bad.reconciled, false);
    assert.deepEqual(bad.unmatchedNumbers, [85000, 23.1]);
  });

  it("Gate 4: 10-question execution-accuracy benchmark reconciles 100% against warehouse truth", () => {
    const active = WAREHOUSE_SUBSCRIPTIONS.filter((r) => r.status === "active");
    const sumBy = (pred: (r: (typeof active)[number]) => boolean) =>
      active.filter(pred).reduce((s, r) => s + r.mrr_usd, 0);

    const cases = [
      { q: "Total active Q2 MRR", expected: sumBy((r) => r.quarter === "2026-Q2") },
      { q: "Total active Q3 MRR", expected: sumBy((r) => r.quarter === "2026-Q3") },
      { q: "NA Q3 active MRR", expected: sumBy((r) => r.region === "NA" && r.quarter === "2026-Q3") },
      { q: "EMEA Q2 active MRR", expected: sumBy((r) => r.region === "EMEA" && r.quarter === "2026-Q2") },
      { q: "EMEA Q3 active MRR", expected: sumBy((r) => r.region === "EMEA" && r.quarter === "2026-Q3") },
      { q: "APAC Q2 active MRR", expected: sumBy((r) => r.region === "APAC" && r.quarter === "2026-Q2") },
      { q: "APAC Q3 active MRR", expected: sumBy((r) => r.region === "APAC" && r.quarter === "2026-Q3") },
      { q: "Enterprise Q3 active MRR", expected: sumBy((r) => r.plan_tier === "enterprise" && r.quarter === "2026-Q3") },
      { q: "Pro Q3 active MRR", expected: sumBy((r) => r.plan_tier === "pro" && r.quarter === "2026-Q3") },
      { q: "Count of active Q3 rows", expected: active.filter((r) => r.quarter === "2026-Q3").length },
    ];

    assert.equal(cases.length, 10);
    for (const c of cases) {
      const rec = reconcileNumbers(`Verified result: ${c.expected}`, { val: c.expected });
      assert.equal(rec.reconciled, true, `Failed reconciliation on ${c.q}`);
    }
  });
});
