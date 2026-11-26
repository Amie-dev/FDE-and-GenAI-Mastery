# Chapter 04: End-to-End Demo & Release Gate Tests

> **Chapter goal:** run the complete lifecycle demo (`src/index.ts`) and verify all 5 release gates (`src/release-gate.test.ts`).
> **Notes chapters covered:** 01–07.

---

## 4.1 Full code: `src/index.ts`

File path: `code/Basic Code/src/index.ts`

```ts
import { ExceptionQueue } from "./contracts.js";
import { cascadeDelete, ingestBatch, runBlueGreenReembedding } from "./lifecycle.js";
import { MultiStoreKnowledgeBase } from "./stores.js";

function main(): void {
  const kb = new MultiStoreKnowledgeBase();
  const dlq = new ExceptionQueue();

  console.log("=== 1. Zod-Enforced Ingestion + Exception Queue ===");
  const report = ingestBatch(
    [
      {
        sourceId: "doc_101",
        tenantId: "tenant_acme",
        sourceUri: "https://kb.acme.com/pricing",
        content: "Acme Enterprise Plan includes unlimited SSO and dedicated SLA.",
        tags: ["Pricing", "Enterprise"],
        updatedAt: "2026-11-26T10:00:00Z",
      },
      {
        sourceId: "doc_202",
        tenantId: "tenant_globex",
        sourceUri: "https://kb.globex.io/refunds",
        content: "Globex Refund Policy allows 30-day full refunds on annual plans.",
        tags: ["Policy"],
        updatedAt: "2026-11-26T10:05:00Z",
      },
      {
        // Invalid record: missing tenantId + short content -> quarantined!
        sourceId: "doc_bad",
        tenantId: "",
        sourceUri: "not-a-url",
        content: "too short",
        updatedAt: "bad-date",
      },
    ],
    kb,
    dlq
  );
  console.log("Ingestion Report:", report);
  console.log("Quarantined Count:", dlq.list().length);

  console.log("\n=== 2. Tenant-Isolated Search (Blue 1536d) ===");
  console.log("Acme search for 'Enterprise':", kb.searchVectors("tenant_acme", "Enterprise"));

  console.log("\n=== 3. Zero-Downtime Blue/Green Re-Embedding (1536d -> 3072d) ===");
  const migration = runBlueGreenReembedding(kb, "green");
  console.log("Migration:", migration);
  console.log("Acme search post-swap:", kb.searchVectors("tenant_acme", "Enterprise"));

  console.log("\n=== 4. GDPR Cascade Deletion (tenant_acme::doc_101) ===");
  const receipt = cascadeDelete(kb, "tenant_acme", "doc_101");
  console.log("Deletion Receipt:", receipt);
}

main();
```

---

## 4.2 Full code: `src/release-gate.test.ts`

File path: `code/Basic Code/src/release-gate.test.ts`

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ExceptionQueue } from "./contracts.js";
import { cascadeDelete, ingestBatch, runBlueGreenReembedding } from "./lifecycle.js";
import { MultiStoreKnowledgeBase } from "./stores.js";

describe("Lecture 25 Release Gate", () => {
  it("Gate 1: Zod AI Data Contract quarantines invalid records without blocking valid ones", () => {
    const kb = new MultiStoreKnowledgeBase();
    const dlq = new ExceptionQueue();
    const report = ingestBatch(
      [
        {
          sourceId: "doc_1",
          tenantId: "t1",
          sourceUri: "https://docs.example.com/a",
          content: "Valid enterprise policy document with enough characters.",
          updatedAt: "2026-11-26T10:00:00Z",
        },
        {
          sourceId: "doc_bad",
          tenantId: "",
          sourceUri: "invalid",
          content: "short",
          updatedAt: "bad",
        },
      ],
      kb,
      dlq
    );

    assert.equal(report.accepted, 1);
    assert.equal(report.quarantined, 1);
    assert.equal(dlq.list().length, 1);
  });

  it("Gate 2: GDPR cascade deletion removes all derived SQL, Vector, Graph, and Cache artifacts & blocks zombie re-ingestion", () => {
    const kb = new MultiStoreKnowledgeBase();
    const dlq = new ExceptionQueue();
    const validDoc = {
      sourceId: "doc_gdpr",
      tenantId: "t1",
      sourceUri: "https://docs.example.com/gdpr",
      content: "Confidential customer record for Acme Corporation.",
      updatedAt: "2026-11-26T10:00:00Z",
    };

    ingestBatch([validDoc], kb, dlq);
    assert.ok(kb.countDerivedArtifacts("t1", "doc_gdpr") > 0);

    const receipt = cascadeDelete(kb, "t1", "doc_gdpr");
    assert.equal(receipt.verifiedClean, true);
    assert.equal(receipt.remainingDerivedArtifacts, 0);

    const reingest = ingestBatch([validDoc], kb, dlq);
    assert.equal(reingest.skipped, 1);
    assert.equal(kb.countDerivedArtifacts("t1", "doc_gdpr"), 0);
  });

  it("Gate 3: Blue/Green re-embedding upgrades 1536d -> 3072d with zero downtime", () => {
    const kb = new MultiStoreKnowledgeBase();
    const dlq = new ExceptionQueue();
    ingestBatch(
      [
        {
          sourceId: "doc_mig",
          tenantId: "t1",
          sourceUri: "https://docs.example.com/mig",
          content: "Zero downtime vector index migration guide for Lakehouse.",
          updatedAt: "2026-11-26T10:00:00Z",
        },
      ],
      kb,
      dlq
    );

    assert.equal(kb.searchVectors("t1", "Lakehouse")[0].dimensions, 1536);
    const mig = runBlueGreenReembedding(kb, "green");
    assert.equal(mig.activeReadSlot, "green");
    assert.equal(kb.searchVectors("t1", "Lakehouse")[0].dimensions, 3072);
  });

  it("Gate 4: Mandatory tenant_id pre-filtering prevents cross-tenant leakage", () => {
    const kb = new MultiStoreKnowledgeBase();
    const dlq = new ExceptionQueue();
    ingestBatch(
      [
        {
          sourceId: "doc_a",
          tenantId: "tenant_a",
          sourceUri: "https://a.example.com/secret",
          content: "Secret roadmap details for Tenant Alpha only.",
          updatedAt: "2026-11-26T10:00:00Z",
        },
      ],
      kb,
      dlq
    );

    assert.equal(kb.searchVectors("tenant_b", "Secret").length, 0);
    assert.ok(kb.searchVectors("tenant_a", "Secret").length > 0);
  });

  it("Gate 5: Freshness SLA flags stale records at query time", () => {
    const kb = new MultiStoreKnowledgeBase();
    const dlq = new ExceptionQueue();
    const t0 = 1_000_000;
    ingestBatch(
      [
        {
          sourceId: "doc_fresh",
          tenantId: "t1",
          sourceUri: "https://docs.example.com/sla",
          content: "Pricing table valid for 60 minutes only.",
          updatedAt: "2026-11-26T10:00:00Z",
          freshnessSlaMs: 60_000,
        },
      ],
      kb,
      dlq,
      t0
    );

    assert.equal(kb.searchVectors("t1", "Pricing", t0 + 10_000)[0].stale, false);
    assert.equal(kb.searchVectors("t1", "Pricing", t0 + 120_000)[0].stale, true);
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

