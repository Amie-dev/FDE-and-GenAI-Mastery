# Lecture 45 Assignment — Enterprise Identity (`OIDC`, `SCIM`, `authentik`) & `ReBAC`

> **Goal:** Build a fail-closed MCP Policy Gateway that verifies `authentik`-compatible OIDC/OBO JWTs and enforces Zanzibar-style ReBAC tuple checks before executing any tool or document lookup.

---

## Part A: Conceptual Mastery
1. Explain the **Confused Deputy Problem** when an AI agent uses a shared service account key.
2. How do **OIDC, SAML 2.0, and SCIM 2.0** each solve different parts of enterprise identity?
3. Why is **RBAC** insufficient for RAG document permissions, and how does **ReBAC (Zanzibar)** solve it?

---

## Part B: Implementation & Architecture
Review and extend `code/Basic Code/`:
- `src/oidc.ts`: OIDC JWT signing/verification (`iss`, `aud`, `exp`, `HS256`) and RFC 8693 OBO Token Exchange (`sub` + `act.sub` + scope down-scoping).
- `src/rebac.ts`: Zanzibar tuple graph (`owner`, `editor`, `viewer`, `member`, `parent`) and SCIM `removeUser`.
- `src/gateway.ts`: Fail-closed `McpPolicyGateway` with immutable user-to-tool audit logs.

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
- [ ] **Gate 1 (OIDC Validation):** Wrong `aud` and expired JWTs are rejected with `401`.
- [ ] **Gate 2 (RFC 8693 OBO Exchange):** Exchanged token preserves `sub`, sets `act.sub`, and never grants scopes the user didn't hold.
- [ ] **Gate 3 (ReBAC & SCIM Offboarding):** Resolves group + folder inheritance and revokes all access immediately on `removeUser`.
- [ ] **Gate 4 (Cross-User Injection Defense):** Agent acting for User A is deterministically blocked (`403`) from reading or updating User B's document, even under indirect prompt injection.

