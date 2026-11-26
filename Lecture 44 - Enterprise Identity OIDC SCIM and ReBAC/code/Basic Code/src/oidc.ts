import { createHmac, timingSafeEqual } from "node:crypto";

export interface OidcClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  tenant_id: string;
  groups: string[];
  scope: string;
  act?: {
    sub: string;
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Buffer.from(normalized, "base64").toString("utf8");
}

function signHs256(signingInput: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(signingInput).digest());
}

/**
 * Mints an authentik-compatible OIDC JWT with standard claims + tenant_id/groups.
 */
export function issueOidcJwt(
  claims: Omit<OidcClaims, "iat" | "exp">,
  secret: string,
  ttlSeconds = 600,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: OidcClaims = {
    ...claims,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const sig = signHs256(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${sig}`;
}

/**
 * Cryptographically verifies a JWT's signature, issuer, audience, and expiration.
 */
export function verifyJwt(
  token: string,
  secret: string,
  expectedIss: string,
  expectedAud: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): OidcClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string };
  if (header.alg !== "HS256") {
    throw new Error(`Unsupported JWT alg: ${header.alg ?? "none"}`);
  }

  const expectedSig = signHs256(`${encodedHeader}.${encodedPayload}`, secret);
  const actualBuf = Buffer.from(encodedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    throw new Error("Invalid JWT signature");
  }

  const claims = JSON.parse(base64UrlDecode(encodedPayload)) as OidcClaims;
  if (claims.iss !== expectedIss) {
    throw new Error(`Invalid issuer: ${claims.iss}`);
  }
  if (claims.aud !== expectedAud) {
    throw new Error(`Invalid audience: ${claims.aud}`);
  }
  if (nowSeconds >= claims.exp) {
    throw new Error("JWT expired");
  }
  return claims;
}

/**
 * Implements RFC 8693 OAuth 2.0 Token Exchange (On-Behalf-Of):
 * Down-scopes the user's token to a target MCP audience + subset of scopes,
 * preserving sub (human) and adding act.sub (agent) for attribution.
 */
export function exchangeOnBehalfOfToken(
  userToken: string,
  secret: string,
  expectedIss: string,
  expectedUserAud: string,
  targetMcpAud: string,
  requestedScopes: string[],
  agentActorId: string,
  ttlSeconds = 180,
): string {
  const userClaims = verifyJwt(userToken, secret, expectedIss, expectedUserAud);
  const heldScopes = new Set(userClaims.scope.split(/\s+/).filter(Boolean));
  const grantedScopes = requestedScopes.filter((s) => heldScopes.has(s));

  return issueOidcJwt(
    {
      iss: expectedIss,
      sub: userClaims.sub,
      act: { sub: agentActorId },
      aud: targetMcpAud,
      tenant_id: userClaims.tenant_id,
      groups: userClaims.groups,
      scope: grantedScopes.join(" "),
    },
    secret,
    ttlSeconds,
  );
}

