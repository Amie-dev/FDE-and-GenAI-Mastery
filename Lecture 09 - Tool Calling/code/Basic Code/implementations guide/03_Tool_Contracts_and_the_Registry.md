# Chapter 03: Tool Contracts & the Registry

> **Chapter goal:** turn a plain function into a tool — one schema that produces both the wire contract and
> the runtime validator — and register it under the exact name the model will emit.
> **Notes chapters covered:** 02 §02.1–§02.6 (the contract, Zod as one source of truth, the registry) ·
> 08 §08.1–§08.2 (authority and tiers) · 08 §08.5 (the approval gate).

---

## 3.1 The contract half of a tool (`src/services/tools.service.ts`, lines 1–48)

```ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TOOL_POLICY } from '../config/config.js';
import type { Tool } from '../types/agent.types.js';

/**
 * Chapter 04 — the tools themselves.
 *
 * Five tools, one per family plus the Tier 3 demo:
 *   compute      calculate          read      (chapter 04 §04.3)
 *   information  getCurrentWeather  read      (chapter 04 §04.4)
 *   information  convertCurrency    read      (chapter 04 §04.5)
 *   information  getInvoiceStatus   read      (chapter 04 §04.6 — scoped DB lookup)
 *   action       createTask         write     (chapter 04 §04.7)
 *   action       refundPayment      critical  (chapter 08 §08.2 — approval required)
 *
 * Every tool here obeys the same three rules:
 *   1. a description that carries WHAT · WHEN · WHEN NOT · UNITS · SIDE EFFECTS (chapter 02 §02.3);
 *   2. one Zod schema that produces BOTH the wire contract and the runtime validator (chapter 02 §02.5);
 *   3. a small, typed, self-describing result — never an upstream payload (chapter 04 §04.8).
 */

/**
 * Chapter 06 §06.3 — a typed domain error. Tools are allowed to throw freely;
 * the runtime converts every throw into a `tool` result (chapter 06 §06.1).
 */
export class ToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/** Chapter 02 §02.5 — Zod is the single source of truth: this is the wire half. */
const toJsonSchema = (schema: z.ZodTypeAny): Record<string, unknown> =>
  zodToJsonSchema(schema, { target: 'openAi', $refStrategy: 'none' }) as Record<string, unknown>;

/**
 * Chapter 04 §04.9 — a TTL cache for INFORMATION tools only. Never for actions:
 * caching a mutation is always wrong, and a stale information tool lies
 * (chapter 04 §04.9.1).
 */
const cache = new Map<string, { at: number; value: unknown }>();

export const cacheGet = (key: string, ttlMs: number): { hit: boolean; value?: unknown } => {
  const entry = cache.get(key);
  if (!entry) return { hit: false };
  if (Date.now() - entry.at > ttlMs) {
    cache.delete(key);
    return { hit: false };
  }
  return { hit: true, value: entry.value };
};

export const cacheSet = (key: string, value: unknown): void => {
  cache.set(key, { at: Date.now(), value });
};
```

### Block by block

**`ToolError`** — chapter 06 §06.3's typed domain error. Three things make it useful:

- `code` is a stable SCREAMING_SNAKE identifier (`DIVISION_BY_ZERO`, `NOT_FOUND`) that becomes the `code`
  field of the tool result. The model branches on it; your alerts group by it.
- `retryable` is a *tool's own* opinion about whether another attempt could succeed. `DIVISION_BY_ZERO` is
  `false`; `TIMEOUT` is `true`. Chapter 06 §06.7.1's table is implemented as a default argument.
- `details` carries the offending values, which is what makes a contract error repairable.

Note the constructor default `retryable = false`: **deny by default**, the same posture as the approval gate.
A tool must *opt in* to being retried.

**`toJsonSchema`** — chapter 02 §02.5's single-source rule in one line. `target: 'openAi'` emits the dialect
the provider expects; `$refStrategy: 'none'` inlines nested schemas so no `$ref` pointer is ever sent to a
model that cannot resolve it. Every `.describe()` you put on a Zod field ends up in this output, which is why
parameter descriptions can never drift from the validation rules they document.

**The TTL cache** — chapter 04 §04.9. Three deliberate properties:

1. **It is opt-in per tool.** A tool caches only if it sets `cacheTtlMs`. Compute tools do not need it,
   action tools must never have it.
2. **It is keyed by name + raw arguments**, so the cache key is exactly the tool call signature — the same
   signature the repeated-call brake uses (chapter 05 §05.7.1).
3. **It is bounded by TTL, not by correctness.** Chapter 04 §04.9.1 warns that "a cached information tool is
   a lying tool" if the TTL is too long, which is why the TTL lives in `.env` and every information result
   also carries an `asOf` timestamp.

---

## 3.2 `src/services/registry.service.ts` (full file — part 1 of 2)

```ts
import { APPROVAL_REQUIRED_TIER } from '../config/config.js';
import type { PermissionTier, Tool, ToolContext, ToolDefinition } from '../types/agent.types.js';
import { allTools } from './tools.service.js';

/**
 * Chapter 02 §02.6 — the tool registry.
 *
 * One map, keyed by the SAME string the model will emit, built from the SAME
 * collection that produces the wire definitions. That single-source rule is what
 * makes "described but not executable" (and vice versa) impossible.
 */

const registry = new Map<string, Tool>();

for (const tool of allTools) {
  if (registry.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
  registry.set(tool.name, tool);
}

export const getTool = (name: string): Tool | undefined => registry.get(name);

export const toolNames = (): string[] => [...registry.keys()];

/** Chapter 02 §02.2 — exactly what goes into the request's `tools` array. */
export const toWireDefinitions = (tools: Tool[] = allTools): ToolDefinition[] =>
  tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));

/**
 * Chapter 08 §08.2.1 — the tier questions, answered per tool and declared once.
 * A `critical` tool is NOT reachable from the loop: it can only produce an
 * approval request (chapter 08 §08.5).
 */
export const tierOf = (tool: Tool): PermissionTier => tool.tier;

export const needsApproval = (tool: Tool): boolean => tool.tier === APPROVAL_REQUIRED_TIER;

/**
 * Chapter 08 §08.1 — identity and permission verification.
 *
 * The session decides who the caller is; the registry decides what that caller may
 * reach. A prompt cannot change either (chapter 08 §08.1.2).
 */
export const isAllowed = (tool: Tool, ctx: ToolContext): boolean => {
  if (!ctx.userId || !ctx.tenantId) return false;
  // Tier 1 and 2 are reachable inside a run; Tier 3 is gated, not forbidden.
  return tool.tier === 'read' || tool.tier === 'write' || tool.tier === 'critical';
};

/** Chapter 08 §08.5.2 rule 3 — an approval binds to the exact arguments. */
export const hashArgs = (raw: string): string => {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return `h${(hash >>> 0).toString(16)}`;
};
```

### Block by block

**The registry map + the duplicate guard.** Two invariants are enforced at module load, before the server
listens:

1. **The key is the name the model emits.** `registry.set(tool.name, tool)` uses the same string that will
   appear in `tool_calls[].function.name`, so "described but not executable" is impossible — the descriptions
   and the executor come from the *same* collection.
2. **Duplicate names throw at boot.** A duplicate would silently shadow a tool: the model would be told about
   two capabilities, and one of them would never run. Failing at startup is chapter 06's fail-fast rule applied
   to configuration.

**`toWireDefinitions`** — chapter 02 §02.2. It projects a `Tool` down to exactly three fields. This function is
the *only* place where internal fields (`tier`, `timeoutMs`, `execute`) could leak to the provider, and they
do not. Compare the output with the tool interface in chapter 02 §02.1: the model gets the contract, the
runtime keeps the power.

**`needsApproval`** — chapter 08 §08.2's Tier 3 check, one line. It reads `APPROVAL_REQUIRED_TIER` rather than
the literal `'critical'`, so the policy is named once and cannot drift from `config.ts`.

**`isAllowed`** — chapter 08 §08.1's authorisation step, deliberately shaped to be *checkable*:

```ts
if (!ctx.userId || !ctx.tenantId) return false;   // no session, no tools
```

The first line is the important one. It makes an anonymous or malformed session deny by default, which means
the engine can never reach `execute` with an identity it cannot attribute. In a real system this is where RBAC
would live (`canCall(tool, ctx)` consulting a permission table); the shape of the call is what the notes teach,
and the shape is already correct.

**`hashArgs`** — chapter 08 §08.5.2 rule 3. The approval record stores a hash of the *exact* argument string, and
`executeSafely` re-computes it before executing. That is what makes "approve a refund" mean *this* refund and
not *a* refund. A tiny non-cryptographic hash is enough here because the purpose is *binding*, not secrecy —
but note it is computed over the raw string, so `{"amount":1299}` and `{"amount":1299,}` bind differently, which
is exactly the conservative behaviour you want.

---

## 3.3 `src/services/registry.service.ts` (full file — part 2 of 2)

```ts
// ---------------------------------------------------------------------------
// The approval gate (chapter 08 §08.5)
// ---------------------------------------------------------------------------

export interface Approval {
  approvalId: string;
  toolName: string;
  tier: PermissionTier;
  /** The exact arguments, so an approval binds to THIS call and not to "a call". */
  rawArguments: string;
  argsHash: string;
  summary: string;
  requestedBy: string;
  tenantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  executedResult?: unknown;
}

const APPROVAL_TTL_MS = 15 * 60 * 1000;
const approvals = new Map<string, Approval>();
let approvalCounter = 0;

/**
 * Deny by default (chapter 08 §08.5.2 rule 2): no approval record → no execution.
 * This function NEVER executes; it only records the request and returns an id.
 */
export const requestApproval = (tool: Tool, rawArguments: string, ctx: ToolContext): Approval => {
  const approvalId = `apr_${++approvalCounter}`;
  const approval: Approval = {
    approvalId,
    toolName: tool.name,
    tier: tool.tier,
    rawArguments,
    argsHash: hashArgs(rawArguments),
    summary: `${tool.name}(${rawArguments}) for ${ctx.userId}@${ctx.tenantId}`,
    requestedBy: ctx.userId,
    tenantId: ctx.tenantId,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + APPROVAL_TTL_MS,
  };
  approvals.set(approvalId, approval);
  return approval;
};

export const getApproval = (approvalId: string): Approval | undefined => {
  const approval = approvals.get(approvalId);
  if (!approval) return undefined;
  // A stale approval must not execute later (chapter 08 §08.5.1).
  if (approval.status === 'pending' && Date.now() > approval.expiresAt) approval.status = 'expired';
  return approval;
};

/** A human decision. Note it is a separate entry point from the agent loop. */
export const decideApproval = (approvalId: string, decision: 'approve' | 'reject'): Approval | undefined => {
  const approval = getApproval(approvalId);
  if (!approval || approval.status !== 'pending') return approval;
  approval.status = decision === 'approve' ? 'approved' : 'rejected';
  return approval;
};

/** Chapter 02 §02.6 / chapter 08 §08.8 — the registry, as the health endpoint sees it. */
export const describeRegistry = (): { name: string; family: string; tier: PermissionTier; timeoutMs: number; cached: boolean }[] =>
  allTools.map((tool) => ({
    name: tool.name,
    family: tool.family,
    tier: tool.tier,
    timeoutMs: tool.timeoutMs ?? 0,
    cached: Boolean(tool.cacheTtlMs),
  }));

export const pendingApprovals = (): Approval[] => [...approvals.values()].filter((a) => a.status === 'pending');
```

### Block by block

**`Approval`** — chapter 08 §08.5.1's "what a good approval request contains", as a type. Read the fields
against that table:

| Field | §08.5.1 requirement |
| :--- | :--- |
| `toolName` + `tier` | *"what kind of action is this"* |
| `summary` | *"human-readable summary"* — `refundPayment({"invoiceId":"INV-1025","amount":1299}) for user-1@tenant-a` |
| `rawArguments` | *"exact arguments"* — the reviewer sees the real numbers, not a paraphrase |
| `requestedBy` + `tenantId` | *"accountability"* |
| `expiresAt` | *"prevents stale approvals executing later"* |
| `argsHash` | *"approval must bind to the exact arguments"* |
| `executedResult` | *"execute once"* — the replay guard in the controller |

**`requestApproval` never executes.** That is the whole design. Its job is to *record* a request and return an
id; the caller (`executeSafely`) then returns `APPROVAL_REQUIRED` as a tool result. If this function could
execute, the gate would be decorative — chapter 08 §08.5.2 rule 1.

**`getApproval` expires lazily.** A pending approval past its TTL becomes `expired` on read. There is no
background job, which keeps the lab small, and the semantics are still correct: an approval can never be
"approved" after it has expired, because `decideApproval` only transitions from `pending`.

**`decideApproval` is a separate entry point from the agent loop.** A human decision arrives through
`POST /api/approvals/:approvalId`, not through a tool call. That separation is the point: the model cannot
approve its own request, because approving is not a capability the model has.

**`describeRegistry`** — what `GET /api/health` returns, and therefore what an operator sees at a glance:
every tool, its family, its tier, its timeout and whether it caches. Chapter 08 §08.8's hardening checklist
expects exactly this: the blast radius of the agent, written down and queryable.

**`pendingApprovals`** — the queue a human reviews. In this lab it is an in-memory map; in production it is a
table, because chapter 08 §08.5.1's `expiresAt` implies durability — an approval must survive a restart. That
upgrade is Lecture 09's durable pause/resume (and Lecture 26's durable execution).

---

**Next:** [Chapter 04 — The Six Tools & the Result Contract](./04_The_Six_Tools_and_the_Result_Contract.md)
