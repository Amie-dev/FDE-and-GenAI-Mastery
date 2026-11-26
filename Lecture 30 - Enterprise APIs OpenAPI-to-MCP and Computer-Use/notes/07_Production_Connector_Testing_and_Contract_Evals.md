# Chapter 07 — Production Connector Testing & Contract Evals

> **Lecture 30 · Chapter 07 of 07** · Level: 🟠 Advanced · Phase 7 — Connectors, Code Mode & Proactive Workflows
> **Source:** `FDE S15` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-30--enterprise-apis-openapi-to-mcp-idempotency--computer-use-fallback)
> **Roadmap topics:** Testing MCP connectors without hitting live SaaS · idempotency replay tests · `409 Conflict` payload-mismatch tests · Playwright fallback mocks · release-gate verification.

---

## 07.0 What this chapter is for

You cannot run CI/CD tests against live Stripe or Salesforce production APIs on every pull request — it is slow, flaky, and risks real money. Instead, production connector suites test **every contract invariant** against deterministic local stubs and mock servers.

By the end of this chapter you should be able to:

1. Build a **4-part Connector Release Gate** testing OpenAPI compilation, idempotency replay, payload-mismatch rejection, and Playwright fallback.
2. Simulate **network-drop-and-retry** scenarios to prove mutations execute **exactly once**.
3. Verify **approval-bound thresholds** and **domain allow-lists** deterministically in CI.

---

## 07.1 The 4-Part Connector Release Gate

| Test Case | What It Proves | Expected Outcome |
| :--- | :--- | :--- |
| **1. OpenAPI Compilation** | `DELETE` routes are omitted; `POST`/`PATCH` tools require `idempotencyKey` | `delete_order` absent; `create_refund` has `idempotencyKey` in `required` |
| **2. Idempotency Replay** | Calling `create_refund` twice with the same key & payload executes upstream **once** | `upstreamExecutions === 1`, second call returns `replayed: true` |
| **3. Key-Mismatch Conflict** | Reusing an old `idempotencyKey` with a different `amountUsd` is blocked | Throws `409 Conflict` (`IdempotencyMismatchError`) |
| **4. Approval & Fallback** | Refunds `> $50` return `PENDING_APPROVAL`; legacy ERP form uses allow-listed Playwright fallback | High-value refund paused; `evil.com` blocked; `erp.internal` succeeds once |

---

## 07.2 Key takeaways

1. **Test connectors deterministically in CI** with mock upstreams — never hit live SaaS production in unit tests.
2. **Always test both idempotency replay AND payload-mismatch (`409`)** so buggy retries are caught safely.

---

**Next:** [Lecture 30 — Complete Notes (Master Consolidation)](./Lecture_30_Complete_Notes.md)

