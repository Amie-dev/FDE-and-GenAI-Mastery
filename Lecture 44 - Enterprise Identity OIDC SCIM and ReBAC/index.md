# Lecture 44 — Enterprise Identity (`OIDC`, `SAML`, `SCIM`, `authentik`) & `ReBAC`: Course Index

> **Goal:** Eliminate shared service accounts by enforcing delegated user identity (`OIDC`, `SAML`, `SCIM`, `authentik`, OAuth Token Exchange) and fine-grained `ReBAC` + gateway policy controls in front of every MCP tool and RAG retrieval.

---

## Chapter Notes (`notes/`)

| # | Chapter | Focus | Link |
| :---: | :--- | :--- | :--- |
| 01 | **Why Shared Service Accounts Break Agent Security** | Confused-deputy problem & `User Permissions ∩ Scoped Agent Token` | [01_Why_Shared_Service_Accounts_Break_Agent_Security.md](./notes/01_Why_Shared_Service_Accounts_Break_Agent_Security.md) |
| 02 | **OIDC, SAML & SCIM Provisioning** | Enterprise SSO federation, JWT validation & automated offboarding | [02_OIDC_SAML_and_SCIM_Provisioning.md](./notes/02_OIDC_SAML_and_SCIM_Provisioning.md) |
| 03 | **Deploying `authentik` as the Identity Control Plane** | Providers, custom claims, MFA flows & declarative Blueprints | [03_Deploying_authentik_as_the_Identity_Control_Plane.md](./notes/03_Deploying_authentik_as_the_Identity_Control_Plane.md) |
| 04 | **Delegated Credentials & User-to-Tool Attribution** | RFC 8693 OAuth Token Exchange (On-Behalf-Of) with `sub` + `act` | [04_Delegated_Credentials_and_User_to_Tool_Attribution.md](./notes/04_Delegated_Credentials_and_User_to_Tool_Attribution.md) |
| 05 | **MCP Authorization Specification** | OAuth 2.1, PKCE, Protected Resource Metadata (`RFC 9728`) & `aud` binding | [05_MCP_Authorization_Specification.md](./notes/05_MCP_Authorization_Specification.md) |
| 06 | **RBAC vs. ReBAC (Relationship-Based Access Control)** | Zanzibar/OpenFGA tuple graph (`owner`, `member`, `viewer`, `parent`) | [06_RBAC_vs_ReBAC_Relationship_Based_Access_Control.md](./notes/06_RBAC_vs_ReBAC_Relationship_Based_Access_Control.md) |
| 07 | **Enterprise-Managed Authorization & Gateway Policies** | Fail-closed PEP gateway defeating indirect prompt injection | [07_Enterprise_Managed_Authorization_and_Gateway_Policies.md](./notes/07_Enterprise_Managed_Authorization_and_Gateway_Policies.md) |
| — | **Complete Notes** | End-to-end summary & release-gate checklist | [Lecture_44_Complete_Notes.md](./notes/Lecture_44_Complete_Notes.md) |

---

## Code & Implementation (`code/Basic Code/`)

| Artifact | Description | Link |
| :--- | :--- | :--- |
| **Basic Code Project** | `authentik`-compatible OIDC JWT signer/verifier, RFC 8693 OBO Token Exchange, Zanzibar ReBAC graph engine, and fail-closed MCP Gateway | [code/Basic Code/](./code/Basic%20Code/package.json) |
| **Implementation Guide** | Chapter-by-chapter walkthrough with full source code and explanations | [implementations guide/](./code/Basic%20Code/implementations%20guide/00_Overview_and_File_Structure.md) |
| **Assignment & Release Gate** | Acceptance criteria, verification commands, and self-check rubric | [Assignment/task.md](./Assignment/task.md) |
