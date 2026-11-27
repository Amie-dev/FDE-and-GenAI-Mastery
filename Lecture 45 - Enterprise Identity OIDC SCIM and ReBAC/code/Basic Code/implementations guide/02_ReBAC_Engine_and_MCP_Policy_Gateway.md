# Implementation Guide — Chapter 02: ReBAC Engine & MCP Policy Gateway (`src/rebac.ts` & `src/gateway.ts`)

This chapter implements **Chapters 06–07**: Zanzibar-style ReBAC relationship traversal, SCIM offboarding, and fail-closed MCP Policy Gateway enforcement.

---

## 1. Complete Source Code: `src/rebac.ts`

```ts
export type Relation = "owner" | "editor" | "viewer" | "member" | "parent";

export interface RebacTuple {
  user: string;
  relation: Relation;
  object: string;
}

/**
 * Zanzibar / OpenFGA-inspired Relationship-Based Access Control (ReBAC) engine.
 * Supports:
 *   - Direct ownership (owner implies editor & viewer)
 *   - Group membership (user#member@group -> group#viewer@folder/doc)
 *   - Folder parent inheritance (folder#parent@doc)
 *   - SCIM de-provisioning (removeUser)
 */
export class RebacEngine {
  private readonly tuples: RebacTuple[] = [];

  addTuple(user: string, relation: Relation, object: string): void {
    const exists = this.tuples.some(
      (t) => t.user === user && t.relation === relation && t.object === object,
    );
    if (!exists) {
      this.tuples.push({ user, relation, object });
    }
  }

  /**
   * Simulates SCIM user offboarding: removes all direct & group tuples for user.
   */
  removeUser(user: string): void {
    for (let i = this.tuples.length - 1; i >= 0; i -= 1) {
      if (this.tuples[i].user === user) {
        this.tuples.splice(i, 1);
      }
    }
  }

  check(
    user: string,
    relation: "owner" | "editor" | "viewer",
    object: string,
    visited = new Set<string>(),
  ): boolean {
    const visitKey = `${user}#${relation}@${object}`;
    if (visited.has(visitKey)) {
      return false;
    }
    visited.add(visitKey);

    const impliedRelations: Relation[] =
      relation === "viewer"
        ? ["viewer", "editor", "owner"]
        : relation === "editor"
          ? ["editor", "owner"]
          : ["owner"];

    // 1. Direct tuple check
    if (
      this.tuples.some(
        (t) =>
          t.user === user &&
          t.object === object &&
          impliedRelations.includes(t.relation),
      )
    ) {
      return true;
    }

    // 2. Group membership check (user#member@group -> check(group, relation, object))
    const groups = this.tuples
      .filter((t) => t.user === user && t.relation === "member")
      .map((t) => t.object);

    for (const group of groups) {
      if (this.check(group, relation, object, visited)) {
        return true;
      }
    }

    // 3. Parent folder inheritance (folder#parent@object -> check(user, relation, folder))
    const parents = this.tuples
      .filter((t) => t.relation === "parent" && t.object === object)
      .map((t) => t.user);

    for (const parentFolder of parents) {
      if (this.check(user, relation, parentFolder, visited)) {
        return true;
      }
    }

    return false;
  }
}
```

---

## 2. Complete Source Code: `src/gateway.ts`

```ts
import { verifyJwt, type OidcClaims } from "./oidc.js";
import type { RebacEngine } from "./rebac.js";

export interface DocumentRecord {
  id: string;
  tenantId: string;
  title: string;
  content: string;
}

export interface ToolCallRequest {
  bearerToken: string;
  toolName: "read_document" | "update_document";
  resourceId: string;
  newContent?: string;
}

export interface GatewayResponse {
  status: 200 | 401 | 403;
  allowed: boolean;
  reason: string;
  claims?: OidcClaims;
  data?: DocumentRecord;
}

export interface AuditLogEntry {
  timestamp: string;
  sub: string;
  actSub: string;
  tenantId: string;
  toolName: string;
  resourceId: string;
  decision: "ALLOW" | "DENY";
  reason: string;
}

const TOOL_REQUIRED_SCOPE: Record<ToolCallRequest["toolName"], string> = {
  read_document: "mcp:docs.read",
  update_document: "mcp:docs.write",
};

const TOOL_REQUIRED_RELATION: Record<ToolCallRequest["toolName"], "viewer" | "editor"> = {
  read_document: "viewer",
  update_document: "editor",
};

/**
 * Fail-closed MCP Policy Enforcement Point (PEP):
 *   1. Cryptographically verifies OIDC/OBO JWT (iss, aud, exp)
 *   2. Checks OAuth scope for requested tool
 *   3. Checks tenant boundary + ReBAC relationship tuple
 *   4. Emits user-to-tool audit log
 */
export class McpPolicyGateway {
  readonly auditLogs: AuditLogEntry[] = [];

  constructor(
    private readonly jwtSecret: string,
    private readonly expectedIss: string,
    private readonly expectedAud: string,
    private readonly rebac: RebacEngine,
    private readonly docs: Map<string, DocumentRecord>,
  ) {}

  invokeTool(req: ToolCallRequest): GatewayResponse {
    let claims: OidcClaims;
    try {
      claims = verifyJwt(
        req.bearerToken,
        this.jwtSecret,
        this.expectedIss,
        this.expectedAud,
      );
    } catch (err) {
      return {
        status: 401,
        allowed: false,
        reason: `Authentication failed: ${(err as Error).message}`,
      };
    }

    const requiredScope = TOOL_REQUIRED_SCOPE[req.toolName];
    const scopes = new Set(claims.scope.split(/\s+/).filter(Boolean));
    if (!scopes.has(requiredScope)) {
      return this.deny(claims, req, `Missing required OAuth scope: ${requiredScope}`);
    }

    const doc = this.docs.get(req.resourceId);
    if (!doc || doc.tenantId !== claims.tenant_id) {
      return this.deny(claims, req, "Resource not found or tenant mismatch");
    }

    const requiredRelation = TOOL_REQUIRED_RELATION[req.toolName];
    const rebacAllowed = this.rebac.check(claims.sub, requiredRelation, req.resourceId);
    if (!rebacAllowed) {
      return this.deny(
        claims,
        req,
        `ReBAC denied: ${claims.sub} lacks ${requiredRelation} on ${req.resourceId}`,
      );
    }

    if (req.toolName === "update_document" && req.newContent !== undefined) {
      doc.content = req.newContent;
    }

    this.auditLogs.push({
      timestamp: new Date().toISOString(),
      sub: claims.sub,
      actSub: claims.act?.sub ?? "direct_user",
      tenantId: claims.tenant_id,
      toolName: req.toolName,
      resourceId: req.resourceId,
      decision: "ALLOW",
      reason: "JWT + scope + ReBAC passed",
    });

    return {
      status: 200,
      allowed: true,
      reason: "Authorized",
      claims,
      data: { ...doc },
    };
  }

  private deny(
    claims: OidcClaims,
    req: ToolCallRequest,
    reason: string,
  ): GatewayResponse {
    this.auditLogs.push({
      timestamp: new Date().toISOString(),
      sub: claims.sub,
      actSub: claims.act?.sub ?? "direct_user",
      tenantId: claims.tenant_id,
      toolName: req.toolName,
      resourceId: req.resourceId,
      decision: "DENY",
      reason,
    });
    return { status: 403, allowed: false, reason, claims };
  }
}
```

---
**Next:** [Chapter 03: Demo & Release Gate Verification](./03_Demo_and_Release_Gate_Verification.md)

