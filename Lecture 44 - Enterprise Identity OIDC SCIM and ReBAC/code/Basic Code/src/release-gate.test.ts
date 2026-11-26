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

