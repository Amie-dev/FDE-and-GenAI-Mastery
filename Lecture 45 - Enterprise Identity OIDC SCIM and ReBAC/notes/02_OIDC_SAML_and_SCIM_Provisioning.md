# Chapter 02 — OIDC, SAML & SCIM Provisioning

> **Lecture 45 · Chapter 02 of 07** · Level: 🔴 Expert · Phase 10 — Quality, FinOps, Identity & Security
> **Source:** `FDE S19` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-44--enterprise-identity--agent-authorization-oidc-saml-scim-authentik-rebac)
> **Roadmap topics:** Authentication (OIDC & SAML 2.0) vs. Lifecycle Sync (SCIM 2.0) · bridging SAML → OIDC via `authentik` · SCIM 2.0 offboarding `PATCH` payload · OIDC JWT anatomy & mandatory gateway verification checklist.

---

## 02.0 What this chapter is for

Enterprise identity rests on **three distinct protocols**, and confusing them is one of the most common enterprise integration mistakes:
1. **OIDC (OpenID Connect)** & **SAML 2.0** handle **Authentication (*"Who are you right now at login time?"*)**.
2. **SCIM 2.0 (System for Cross-domain Identity Management)** handles **Lifecycle Sync (*"Did Alice get promoted to Finance, or fired 10 minutes ago?"*)**.

Why is SCIM critical for AI agents? Suppose Alice is fired at 10:00 AM in Workday/Okta. Without SCIM, your agent platform only finds out the next time she tries to log in—meaning **background agent jobs, delegated sessions, or ReBAC group memberships could stay active for hours or days**. With SCIM 2.0, Okta pushes a deactivation request to `authentik` in seconds, immediately stripping her ReBAC tuples and revoking active tokens.

By the end of this chapter you should be able to:

1. Distinguish **OIDC**, **SAML 2.0**, and **SCIM 2.0** by format, transport, and role in an AI platform.
2. Explain why **`authentik` bridges SAML 2.0 → OIDC once** so downstream agents and MCP servers only speak JSON JWTs.
3. Trace a **SCIM 2.0 de-provisioning `PATCH`** event from HR/Okta to ReBAC tuple revocation.
4. Validate an **enterprise OIDC JWT** (`alg`, signature, `iss`, `aud`, `exp`) at the MCP Gateway.

---

## 02.1 Side-by-Side Comparison: OIDC vs. SAML vs. SCIM

| Protocol | Format & Transport | Primary Job | Where It Lives in AI Architecture |
| :--- | :--- | :--- | :--- |
| **OIDC (OpenID Connect)** | JSON / JWTs over OAuth 2.0 HTTPS | Modern **Authentication** for web apps, SPAs, CLIs, and APIs | Issues signed `id_token` + `access_token` (`sub`, `tenant_id`, `groups`, `scope`) to your Agent UI & MCP Gateway |
| **SAML 2.0** | Signed XML assertions over HTTP POST | Legacy/Enterprise **SSO Federation** (Okta, Entra ID, Ping) | Connects customer's corporate IdP to your **`authentik` Identity Broker** |
| **SCIM 2.0** | REST JSON (`POST /Users`, `PATCH /Groups`) | **Automated Provisioning & De-provisioning** | Syncs org charts, departments, and revocations from Okta/Entra → `authentik` → ReBAC tuple store |

```mermaid
flowchart LR
    Corp["Customer Corporate IdP<br/>(Okta / Microsoft Entra ID)"] -->|"1. SAML 2.0 / OIDC<br/>(User Login SSO)"| Auth["authentik<br/>(Enterprise Identity Control Plane)"]
    Corp -->|"2. SCIM 2.0 Push<br/>(Create / Group Change / Disable)"| Auth
    Auth -->|"3. Mints Standard OIDC JWT<br/>(sub, tenant_id, groups, scope)"| UI["Agent UI / Client"]
    Auth -->|"4. Syncs Group & User Tuples"| ReBAC["ReBAC Store<br/>(user:alice#member@group:eng)"]
    UI -->|"5. Bearer JWT"| GW["Agent & MCP Gateway"]
```

---

## 02.2 Concrete SCIM 2.0 De-Provisioning Flow

When HR terminates Alice in Okta, Okta sends a `PATCH` request to `authentik`'s SCIM endpoint within seconds:

```http
PATCH /scim/v2/Users/usr_alice_9182
Authorization: Bearer <scim_sync_token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "active",
      "value": false
    }
  ]
}
```

```mermaid
sequenceDiagram
    participant HR as Workday / Okta
    participant Auth as authentik (SCIM Server)
    participant ReBAC as OpenFGA / ReBAC Store
    participant Agent as Background Agent Job

    HR->>Auth: PATCH /scim/v2/Users/usr_alice_9182 { active: false }
    Auth->>Auth: Disable user & revoke refresh/OBO grants
    Auth->>ReBAC: Delete tuples for user:alice
    Agent->>ReBAC: Check(user:alice, viewer, doc:q3)
    ReBAC-->>Agent: FALSE -> Background job halted immediately!
```

---

## 02.3 Anatomy & Validation of an Enterprise OIDC JWT

```json
{
  "iss": "https://auth.acme-ai.internal/application/o/agent-gateway/",
  "sub": "usr_alice_9182",
  "aud": "mcp-gateway",
  "exp": 1795686564,
  "iat": 1795682964,
  "email": "alice@acme.com",
  "tenant_id": "tenant_acme",
  "groups": ["engineering", "support_tier2"],
  "scope": "openid profile mcp:tools.read mcp:kb.search"
}
```

### Mandatory Gateway Verification Checklist

1. **Signature & `alg`:** Verify RS256/ES256 signature against the IdP's JWKS public key; **explicitly reject `alg: "none"`**.
2. **`iss` (Issuer):** Must match your exact trusted `authentik` provider URL.
3. **`aud` (Audience):** Must match `"mcp-gateway"`—blocks cross-service token replay.
4. **`exp` (Expiration):** Reject if `now >= exp`. Keep access token TTL short (`5–15` min).

> [!WARNING]
> **Never decode a JWT with `jwt.decode()` without verifying its signature.** Decoding without verification lets any attacker forge `sub: "ceo@acme.com"` and `tenant_id: "tenant_acme"` in plain Base64!

---

## 02.4 Common Mistakes

| # | Common Mistake | Why It Hurts | What To Do Instead |
| :---: | :--- | :--- | :--- |
| **1** | **Supporting SSO (SAML/OIDC) without SCIM 2.0** | Terminated employees keep ReBAC group access and background agent jobs | Wire **SCIM 2.0** from Okta/Entra to revoke sessions & ReBAC tuples in seconds |
| **2** | **Parsing XML SAML assertions inside every MCP server** | Bloats every microservice with complex XML signature libraries | Terminate SAML once at **`authentik`** and issue clean **OIDC JWTs** internally |
| **3** | **Skipping `aud` (Audience) validation on JWTs** | A token minted for the UI can be replayed against internal admin APIs | Strictly enforce **`aud === expectedServiceUri`** at every gateway |
| **4** | **Issuing 24-hour OIDC access tokens** | Stolen or revoked tokens stay valid all day | Keep access token TTL **`5–15` minutes** and use short-lived OBO tokens |

---

## 02.5 Key Takeaways

1. **OIDC** issues modern JWTs; **SAML 2.0** federates corporate IdPs into `authentik`; **SCIM 2.0** pushes real-time group changes and offboarding (`"active": false`).
2. Bridge SAML → OIDC once at your **Identity Control Plane** so downstream agents stay simple.
3. Every gateway must cryptographically validate **`alg`, signature, `iss`, `aud`, and `exp`** before trusting `sub` or `tenant_id`.

---

### Navigation

- **Next:** [Chapter 03 — Deploying `authentik` as the Identity Control Plane](./03_Deploying_authentik_as_the_Identity_Control_Plane.md)
- **Previous:** [Chapter 01 — Why Shared Service Accounts Break Agent Security](./01_Why_Shared_Service_Accounts_Break_Agent_Security.md)
- **Back to index:** [../index.md](../index.md)
