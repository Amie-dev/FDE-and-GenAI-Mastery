# Lecture 44 - Enterprise Identity OIDC SCIM and ReBAC

> **Stage 3: Ship** · **Phase:** 10 · Quality, FinOps, Identity & Security · **Level:** 🔴 Expert
> **Source:** `FDE S19` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Implement enterprise-grade identity, SSO (`OIDC`, `SAML`), directory sync (`SCIM`), `authentik`, delegated user-to-tool credentials, MCP Authorization, and `ReBAC` gateway policy controls.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 28](../Lecture%2028%20-%20MCP%20Resources%20Prompts%20and%20Gateway/) · [Lecture 43](../Lecture%2043%20-%20Progressive%20Autonomy%20flagd%20and%20Safe%20Releases/) |
| **Unlocks** | [Lecture 45](../Lecture%2045%20-%20Security%20and%20Guardrails/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_44_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Why Shared Service Accounts Break Agent Security** | The confused-deputy problem when an agent holds a god-mode API key. |
| **02** | **OIDC, SAML & SCIM Provisioning** | Enterprise SSO federation and automated user/group lifecycle synchronization. |
| **03** | **Deploying `authentik` as the Identity Control Plane** | Configuring OIDC clients, scopes, claims, and token exchange in authentik. |
| **04** | **Delegated Credentials & User-to-Tool Attribution** | OAuth 2.0 On-Behalf-Of / Token Exchange so every tool call carries user identity. |
| **05** | **MCP Authorization Specification** | OAuth 2.1 metadata discovery, PKCE, and dynamic client registration for MCP servers. |
| **06** | **RBAC vs. ReBAC (Relationship-Based Access Control)** | Zanzibar-style tuple checks (`user:alice#viewer@doc:q3_report`) at retrieval & tool boundaries. |
| **07** | **Enterprise-Managed Authorization & Gateway Policies** | Centralized OPA/Cedar policy enforcement in front of agent tools. |

---

## 🛠️ What You Will Build (`code/`)

An **OIDC + ReBAC MCP Gateway** (`code/`): validates JWT claims (authentik-compatible OIDC), exchanges scoped tokens, and enforces ReBAC relationship checks before executing any MCP tool or document lookup.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 44** complete, verify all of the following:

An agent acting on behalf of User A is deterministically blocked from invoking tools or reading documents owned by User B—even when prompted via indirect injection.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_44_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 44 - Enterprise Identity OIDC SCIM and ReBAC/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_44_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [authentik Identity Provider](https://docs.goauthentik.io/)
- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OpenFGA / Zanzibar ReBAC](https://openfga.dev/docs/concepts)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 44**.
