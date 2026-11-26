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

