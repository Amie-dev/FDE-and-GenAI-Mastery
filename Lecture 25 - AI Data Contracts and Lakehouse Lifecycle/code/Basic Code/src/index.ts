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

