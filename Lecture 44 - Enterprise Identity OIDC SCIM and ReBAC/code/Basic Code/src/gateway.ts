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

