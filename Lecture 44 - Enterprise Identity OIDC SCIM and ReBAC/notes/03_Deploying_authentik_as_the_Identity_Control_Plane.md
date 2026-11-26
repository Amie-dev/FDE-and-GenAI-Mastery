# Chapter 03 — Deploying `authentik` as the Identity Control Plane

> **Lecture 44 · Chapter 03 of 07** · Level: 🔴 Expert · Phase 10 — Quality, FinOps, Identity & Security
> **Source:** `FDE S19` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-44--enterprise-identity--agent-authorization-oidc-saml-scim-authentik-rebac)
> **External Reference:** [authentik Documentation](https://docs.goauthentik.io/)

---

## 1. Why `authentik`?

When building an enterprise AI platform, you need an **Identity Provider (IdP)** that you can self-host inside a customer's VPC (for data residency/sovereignty), configure via Terraform/Blueprints, and connect to *any* corporate directory (Okta, Entra ID, Google Workspace, Active Directory).

**`authentik`** is a modern, open-source Identity Control Plane that provides:
- **OIDC / OAuth 2.1 Provider:** Mints RS256/ES256 JWTs with custom Python/Property Mapping claims (`tenant_id`, `tier`, `groups`).
- **SAML 2.0 Federation:** Acts as a Service Provider to customer Okta/Entra IdPs and translates them into clean OIDC tokens for your agents.
- **SCIM 2.0 Server & Client:** Syncs users/groups in real time.
- **Flows & Policies:** Visual/declarative MFA, device posture, and step-up authentication before granting sensitive agent scopes.

---

## 2. Core `authentik` Concepts Mapped to AI Gateways

| `authentik` Object | What It Does | AI Platform Mapping |
| :--- | :--- | :--- |
| **Source** (SAML / OIDC / LDAP) | Upstream corporate login source | Customer's Okta / Entra ID |
| **Provider** (OAuth2/OIDC) | Defines signing keys, token TTL, `aud`, and redirect URIs | `"mcp-gateway-oidc-provider"` |
| **Application** | User-facing app bound to a Provider + access policy | `"Acme AI Copilot"` |
| **Scope Mapping (Property Mapping)** | Injects custom claims into the JWT | Adds `tenant_id`, `cost_center`, `allowed_tools` |
| **Flow** | Login, MFA, or consent steps | Requires WebAuthn/MFA before issuing `mcp:refunds.write` scope |

---

## 3. Custom Scope & Claim Mapping in `authentik`

In `authentik`, a **Scope Mapping** lets you inject enterprise attributes directly into the OIDC token so downstream gateways don't have to query LDAP on every request:

```python
# authentik Property Mapping for custom scope: "ai:context"
return {
    "tenant_id": request.user.attributes.get("tenant_id", "default"),
    "cost_center": request.user.attributes.get("cost_center", "unassigned"),
    "tier": request.user.attributes.get("tier", "standard"),
    "groups": [group.name for group in request.user.ak_groups.all()],
}
```

### Resulting JWT Claim Benefits
1. **Zero Extra Latency:** Your MCP Gateway verifies the JWT signature locally using `authentik`'s cached JWKS endpoint (`GET /application/o/ai-gateway/jwks/`, `< 0.5 ms`) and immediately knows `sub`, `tenant_id`, `cost_center`, and `groups`.
2. **Unified with Lecture 42 (FinOps):** Those exact JWT claims populate your OpenTelemetry `tenant.id` and `cost_center` attributes—making it impossible for a client to spoof another tenant's billing ID!

---

## 4. Infrastructure-as-Code with `authentik` Blueprints

Never click through an admin UI in production and hope you remember the settings. Define your OIDC provider, scopes, and policies declaratively in an **`authentik` Blueprint YAML**:

```yaml
version: 1
metadata:
  name: ai-mcp-gateway-blueprint
entries:
  - model: authentik_providers_oauth2.oauth2provider
    id: mcp-oidc-provider
    attrs:
      name: mcp-gateway-oidc
      client_type: confidential
      authorization_flow: !Find [authentik_flows.flow, [slug, default-provider-authorization-implicit-consent]]
      access_token_validity: minutes=10
      sub_mode: user_uuid
      include_claims_in_id_token: true
  - model: authentik_core.application
    attrs:
      name: Enterprise AI Gateway
      slug: ai-gateway
      provider: !KeyOf mcp-oidc-provider
```

---

## 5. Chapter Summary
- **`authentik`** serves as a self-hostable enterprise Identity Control Plane bridging SAML/Okta/Entra to OIDC JWTs and SCIM lifecycle sync.
- Use **Scope Mappings** to embed verified `tenant_id`, `cost_center`, and `groups` in short-lived (10-minute) JWTs.
- Manage providers declaratively via **`authentik` Blueprints** for repeatable VPC deployments.

---
**Next:** [Chapter 04 — Delegated Credentials & User-to-Tool Attribution](./04_Delegated_Credentials_and_User_to_Tool_Attribution.md)

