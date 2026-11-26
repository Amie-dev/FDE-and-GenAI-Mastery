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

    // Attempt zombie resurrection
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

