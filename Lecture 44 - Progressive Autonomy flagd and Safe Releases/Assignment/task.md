# Lecture 44 Assignment — Progressive Autonomy (`OpenFeature`, `flagd`) & Safe Releases

> **Goal:** Build and verify a progressive rollout pipeline using `OpenFeature` + `flagd`, side-effect-free shadow mode, `< 30s` automated canary rollback, and HMAC-SHA256 signed release manifests.

---

## Part A: Conceptual Mastery
1. Explain the 4 rungs of the **Progressive Autonomy Ladder** and what metric gates each graduation.
2. Why must write/mutating tools be dry-run mocked during **Shadow Mode**?
3. Why does an AI release manifest need to bind **git commit + pinned model ID + prompt SHA-256 + skill versions + `flagd` snapshot** together?

---

## Part B: Implementation & Architecture
Review and extend `code/Basic Code/`:
- `flags.flagd.json`: Declarative `flagd` v0 schema defining `active_model`, `autonomy_mode`, `shadow_enabled`, `canary_weight_pct`, and `max_auto_refund_usd`.
- `src/flagd-provider.ts`: `FlagdConfigProvider` implementing `@openfeature/server-sdk`'s `Provider` interface with deterministic bucketing and instant mutation methods.
- `src/release-pipeline.ts`: `runShadowComparison`, `CanaryRollbackController`, `createSignedReleaseManifest`, and `verifyReleaseManifestSignature`.

---

## Part C: Verification Commands
Run inside `code/Basic Code/`:

```bash
npm install
npm run typecheck
npm start
npm test
```

---

## Part D: Release Gate Rubric (4/4 Must Pass)
- [ ] **Gate 1 (`OpenFeature` + `flagd` Routing):** Free tier routes to `gpt-4o-mini` and paid sessions bucket deterministically on `targetingKey`.
- [ ] **Gate 2 (Shadow Mode Safety):** `shadowExecutedWriteCount === 0` while comparing action agreement, latency delta, and cost delta.
- [ ] **Gate 3 (Automated Canary Rollback `< 30s`):** Injecting a degraded canary reverts `canaryWeightPct` to `0`, downgrades `autonomyMode` to `human_approved`, and completes in `< 30,000 ms`.
- [ ] **Gate 4 (Signed Release Manifest):** Emitted `ROLLBACK` / `PROMOTED` manifest passes HMAC-SHA256 verification and rejects tampered payloads.

