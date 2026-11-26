# Implementation Guide — Chapter 03: Demo & Release Gate Verification

This chapter documents the runnable demo (`src/index.ts`) and automated release-gate tests (`src/release-gate.test.ts`).

---

## 1. Complete Source Code: `src/index.ts`

```ts
import { exchangeOnBehalfOfToken, issueOidcJwt } from "./oidc.js";
import { RebacEngine } from "./rebac.js";
import { McpPolicyGateway, type DocumentRecord } from "./gateway.js";

const SECRET = "authentik-demo-signing-secret";
const ISS = "https://auth.acme.internal/o/mcp-gateway/";
const UI_AUD = "agent-ui";
const MCP_AUD = "https://mcp.acme.internal";

function main() {
  const rebac = new RebacEngine();
  rebac.addTuple("user:alice", "owner", "doc:alice_q3_plan");
  rebac.addTuple("user:alice", "member", "group:engineering");
  rebac.addTuple("group:engineering", "viewer", "folder:eng_specs");
  rebac.addTuple("folder:eng_specs", "parent", "doc:rag_architecture");
  rebac.addTuple("user:bob", "owner", "doc:bob_ceo_memo");

  const docs = new Map<string, DocumentRecord>([
    [
      "doc:alice_q3_plan",
      {
        id: "doc:alice_q3_plan",
        tenantId: "tenant_acme",
        title: "Alice Q3 Plan",
        content: "Launch RAG v2.",
      },
    ],
    [
      "doc:rag_architecture",
      {
        id: "doc:rag_architecture",
        tenantId: "tenant_acme",
        title: "RAG Architecture",
        content: "Hybrid vector + BM25.",
      },
    ],
    [
      "doc:bob_ceo_memo",
      {
        id: "doc:bob_ceo_memo",
        tenantId: "tenant_acme",
        title: "Bob Private CEO Memo",
        content: "CONFIDENTIAL M&A terms.",
      },
    ],
  ]);

  const gateway = new McpPolicyGateway(SECRET, ISS, MCP_AUD, rebac, docs);

  // 1. Alice logs in via authentik OIDC -> Agent exchanges for scoped OBO token
  const aliceUiToken = issueOidcJwt(
    {
      iss: ISS,
      sub: "user:alice",
      aud: UI_AUD,
      tenant_id: "tenant_acme",
      groups: ["engineering"],
      scope: "openid profile mcp:docs.read mcp:docs.write billing:admin",
    },
    SECRET,
  );

  const aliceOboToken = exchangeOnBehalfOfToken(
    aliceUiToken,
    SECRET,
    ISS,
    UI_AUD,
    MCP_AUD,
    ["mcp:docs.read"], // down-scoped: no billing:admin or docs.write!
    "agent:triage_copilot",
  );

  // 2. Alice reads her own doc & inherited engineering folder doc -> 200 ALLOW
  console.log(
    "[Alice -> own doc]",
    gateway.invokeTool({
      bearerToken: aliceOboToken,
      toolName: "read_document",
      resourceId: "doc:alice_q3_plan",
    }).status,
  );
  console.log(
    "[Alice -> folder inherited doc]",
    gateway.invokeTool({
      bearerToken: aliceOboToken,
      toolName: "read_document",
      resourceId: "doc:rag_architecture",
    }).status,
  );

  // 3. Indirect prompt injection tries to read Bob's private memo -> 403 DENY
  const injectedAttempt = gateway.invokeTool({
    bearerToken: aliceOboToken,
    toolName: "read_document",
    resourceId: "doc:bob_ceo_memo",
  });
  console.log("[Injected Alice -> Bob doc]", injectedAttempt.status, injectedAttempt.reason);

  // 4. Print User-to-Tool Audit Log
  console.log("\n[Audit Trail]", JSON.stringify(gateway.auditLogs, null, 2));
}

main();
```

---

## 2. Complete Source Code: `src/release-gate.test.ts`

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { exchangeOnBehalfOfToken, issueOidcJwt, verifyJwt } from "./oidc.js";
import { RebacEngine } from "./rebac.js";
import { McpPolicyGateway, type DocumentRecord } from "./gateway.js";

const SECRET = "test-oidc-secret";
const ISS = "https://auth.acme.internal/o/mcp/";
const UI_AUD = "agent-ui";
const MCP_AUD = "https://mcp.acme.internal";

function setupGateway() {
  const rebac = new RebacEngine();
  rebac.addTuple("user:alice", "owner", "doc:alice_plan");
  rebac.addTuple("user:alice", "member", "group:eng");
  rebac.addTuple("group:eng", "viewer", "folder:eng_docs");
  rebac.addTuple("folder:eng_docs", "parent", "doc:eng_spec");
  rebac.addTuple("user:bob", "owner", "doc:bob_secret");

  const docs = new Map<string, DocumentRecord>([
    ["doc:alice_plan", { id: "doc:alice_plan", tenantId: "tenant_acme", title: "Alice", content: "OK" }],
    ["doc:eng_spec", { id: "doc:eng_spec", tenantId: "tenant_acme", title: "Spec", content: "Eng" }],
    ["doc:bob_secret", { id: "doc:bob_secret", tenantId: "tenant_acme", title: "Bob", content: "Secret" }],
  ]);

  return { rebac, gateway: new McpPolicyGateway(SECRET, ISS, MCP_AUD, rebac, docs) };
}

test("Release Gate 1: OIDC JWT verification rejects wrong audience and expired tokens", () => {
  const token = issueOidcJwt(
    {
      iss: ISS,
      sub: "user:alice",
      aud: UI_AUD,
      tenant_id: "tenant_acme",
      groups: [],
      scope: "mcp:docs.read",
    },
    SECRET,
    60,
    1000,
  );

  assert.throws(() => verifyJwt(token, SECRET, ISS, MCP_AUD, 1010), /Invalid audience/);
  assert.throws(() => verifyJwt(token, SECRET, ISS, UI_AUD, 1061), /JWT expired/);
});

test("Release Gate 2: RFC 8693 OBO Token Exchange preserves sub, sets act, and down-scopes", () => {
  const uiToken = issueOidcJwt(
    {
      iss: ISS,
      sub: "user:alice",
      aud: UI_AUD,
      tenant_id: "tenant_acme",
      groups: ["eng"],
      scope: "mcp:docs.read billing:admin",
    },
    SECRET,
  );

  const oboToken = exchangeOnBehalfOfToken(
    uiToken,
    SECRET,
    ISS,
    UI_AUD,
    MCP_AUD,
    ["mcp:docs.read", "mcp:docs.write"],
    "agent:copilot",
  );

  const claims = verifyJwt(oboToken, SECRET, ISS, MCP_AUD);
  assert.equal(claims.sub, "user:alice");
  assert.equal(claims.act?.sub, "agent:copilot");
  assert.equal(claims.scope, "mcp:docs.read");
});

test("Release Gate 3: ReBAC resolves folder inheritance and SCIM removeUser revokes immediately", () => {
  const { rebac } = setupGateway();
  assert.equal(rebac.check("user:alice", "viewer", "doc:eng_spec"), true);
  assert.equal(rebac.check("user:alice", "viewer", "doc:bob_secret"), false);

  rebac.removeUser("user:alice");
  assert.equal(rebac.check("user:alice", "viewer", "doc:eng_spec"), false);
  assert.equal(rebac.check("user:alice", "owner", "doc:alice_plan"), false);
});

test("Release Gate 4: Agent acting for User A is deterministically blocked from User B resources even via indirect injection", () => {
  const { gateway } = setupGateway();
  const uiToken = issueOidcJwt(
    {
      iss: ISS,
      sub: "user:alice",
      aud: UI_AUD,
      tenant_id: "tenant_acme",
      groups: ["eng"],
      scope: "mcp:docs.read mcp:docs.write",
    },
    SECRET,
  );
  const oboToken = exchangeOnBehalfOfToken(
    uiToken,
    SECRET,
    ISS,
    UI_AUD,
    MCP_AUD,
    ["mcp:docs.read", "mcp:docs.write"],
    "agent:copilot",
  );

  const allowedRead = gateway.invokeTool({
    bearerToken: oboToken,
    toolName: "read_document",
    resourceId: "doc:alice_plan",
  });
  assert.equal(allowedRead.status, 200);
  assert.equal(allowedRead.allowed, true);

  // Simulated indirect prompt injection trying to read & overwrite Bob's document
  const injectedRead = gateway.invokeTool({
    bearerToken: oboToken,
    toolName: "read_document",
    resourceId: "doc:bob_secret",
  });
  assert.equal(injectedRead.status, 403);
  assert.equal(injectedRead.allowed, false);

  const injectedWrite = gateway.invokeTool({
    bearerToken: oboToken,
    toolName: "update_document",
    resourceId: "doc:bob_secret",
    newContent: "PWNED",
  });
  assert.equal(injectedWrite.status, 403);
  assert.equal(injectedWrite.allowed, false);
});
```

---

## Verification Commands

```bash
npm install
npm run typecheck
npm start
npm test
```

