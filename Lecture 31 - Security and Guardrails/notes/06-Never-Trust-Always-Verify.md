# Chapter 06 — Never Trust, Always Verify: Authorization, Confirmation & TOCTOU

> **Source:** FDE L19 Ch.08 · GAC D02 Ch.02 §16–20
> **Core question:** *What must be true before my tool executes?*

---

## 1. Rule 2 — Never Trust Tool Arguments

```text
Model requests: refundOrder("ORD-101", 50000)
Treat those arguments like: HTTP request parameters
```

You would never trust `POST /refund amount=50000` without validation. **The fact that an LLM generated the number does not make it trustworthy.**

### Pseudo-code Validation Function
```js
// PSEUDO CODE — TypeScript environment
function validateRefundRequest(orderId: string, amount: number): boolean {
  const order = db.getOrder(orderId)
  if (!order) return false

  if (order.status === SHIPPED) {
    throw new IllegalStateException("Shipped order cannot be cancelled")
  }

  if (requestedRefund > order.getAmount()) {
    return false
  }

  // Additional business rules...
  return true
}
```

> **Even better:** *do not allow the model to choose the refund amount at all.* **Let the backend derive it from trusted data.**

### The Validation Order

```text
1. Schema → 2. Normalise → 3. Format/pattern → 4. Range
5. Enum → 6. Length → 7. Referential → 8. **Ownership**
9. Business rules → 10. Monetary policy → 11. Destination
12. Rate limits → 13. Idempotency → 14. **DERIVE**
15. Field allowlist
```

> **Three-way rule:** *shape* may come from the model · *values* must be validated · *authority-bearing values* must be derived server-side.

---

## 2. Rule 3 — Authorization Happens in Code

```text
Authenticated user: USER-17
User asks:          Cancel ORD-101.
Model requests:     cancelOrder("ORD-101")

The backend must verify:  Does USER-17 own ORD-101?
Not:                      Does the LLM believe USER-17 owns ORD-101?
```

### Pseudo-code Authorization Function
```js
// PSEUDO CODE — TypeScript environment
async function authorizeAction(userId: string, orderId: string, action: string): Promise<boolean> {
  const order = await db.getOrder(orderId)

  if (!order) {
    return false
  }

  const isOwner = await ownershipService.check(userId, orderId)

  if (!isOwner) {
    await auditLogger.log(`Unauthorized attempt: user ${userId} tried ${action} on ${orderId}`)
    return false
  }

  return await businessRules.validate(action, order)
}
```

> **Authentication and authorization are deterministic backend concerns.** Identity comes from the **session**, never from a model argument or the message text.

---

## 3. Rule 4 — High-Risk Actions Need Explicit Approval

```text
User: Cancel ORD-101.
        ↓
Application creates pending action.  Nothing is cancelled yet.
        ↓
Assistant: Confirm cancellation of ORD-101?
        ↓
User: Yes.
        ↓
Backend verifies: pending action exists + belongs to authenticated user + has not expired
        ↓
cancelOrder()
```

### Confirmation Record Structure

```js
// PSEUDO CODE — TypeScript environment
interface ConfirmationRecord {
  actorId: string
  sessionId: string
  action: string
  target: string
  argsHash: string
  createdAt: number
  expiresAt: number
  consumedAt?: number
  nonce?: string
}

async function requireConfirmation(userId: string, orderId: string): Promise<ConfirmationRecord> {
  const argsHash = crypto.hash({ action: "cancelOrder", target: orderId })
  const record: ConfirmationRecord = {
    actorId: userId,
    sessionId: currentSession.id,
    action: "cancelOrder",
    target: orderId,
    argsHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  await confirmationStore.save(record)
  return record
}

async function executeAfterConfirmation(record: ConfirmationRecord): Promise<void> {
  if (record.consumedAt) {
    throw new Error("Confirmation already consumed")
  }

  if (Date.now() > record.expiresAt) {
    throw new Error("Confirmation expired")
  }

  const isValid = await ownershipService.check(record.actorId, record.target)

  if (!isValid) {
    throw new AccessDeniedError("No longer authorized")
  }

  await confirmationStore.markConsumed(record)

  await performAction(record.action, record.target)
}
```

> **The rule:** *a conversational claim is data. A stored confirmation record is a fact.*

### Confirmation Fields and What They Defeat

| Field | Attack it defeats |
|---|---|
| `actorId` | Confirmation from a different user |
| `sessionId` | Replayed confirmation across sessions |
| `argsHash` | **Confirmation swapping** — confirming ₹500 but executing ₹50,000 |
| `expiresAt` | Stale confirmations execute later |
| `consumedAt` | The same confirmation executes twice |
| `nonce` | Forged confirmation requests |

---

## 4. TOCTOU (Time-of-Check to Time-of-Use)

> **Never check-then-act without a transaction.**

### TOCTOU Attack Pattern

```text
Check ownership → Wait → Execute
   ↓              ↑          ↓
Ownership changes|          Effect
                 |          ↔
               Unauthorized action
```

### Pseudo-code: Atomic Update

```js
// PSEUDO CODE — TypeScript environment
async function atomicUpdate(userId: string, orderId: string, action: string) {
  const updated = await db.updateOrder(
    { orderId },
    { status: "CANCELLED" },
    {
      filter: {
        owner: userId,
        status: "PENDING",
      },
    }
  )

  if (!updated) {
    throw new ConflictError("Ownership or state changed")
  }

  await auditLogger.log(`Atomic ${action} on ${orderId} by ${userId}`)
}
```

> **Solution:** atomic conditional update or optimistic locking. Check and effect happen in the same transaction, eliminating the window for race conditions.

---

## 5. Beyond the Lecture — Confirmation Record Best Practices

| Field | Recommended Type | Security Goal |
|---|---|---|
| `actorId` | session user ID | Different user confirmation |
| `sessionId` | current session ID | Cross-session replay |
| `action` | string enum | Action name identification |
| `target` | resource identifier | Target of action |
| `argsHash` | SHA-256 hash | Confirmation swapping |
| `createdAt` | timestamp | When confirmation was created |
| `expiresAt` | timestamp + TTL | Stale confirmation prevention |
| `consumedAt` | timestamp or null | Double execution (replay) |
| `nonce` | random hex string | Forged request prevention |

### Key Additional Requirements

1. **Atomic conditional updates** — TOCTOU protection
2. **Idempotency keys** — prevent duplicate execution from retries
3. **Audit records** — log proposed vs validated vs executed state
4. **Confirmation revocation** — ability to invalidate pending confirmations

---

## 6. Beyond the Lecture — Authorization Design Patterns

### Role-Based Access Control (RBAC) with LLM Context

```js
// PSEUDO CODE — TypeScript environment
async function checkRBAC(
  userId: string,
  requestedAction: string,
  llmContext: Record<string, any>
): Promise<RBACResult> {
  const userRole = await authService.getUserRole(userId)
  const rolePermissions = await permissionService.getRolePermissions(userRole)
  
  // Check if role has the requested action
  if (!rolePermissions.includes(requestedAction)) {
    return { allowed: false, reason: "Role lacks permission" }
  }
  
  // Additional LLM-context checks
  if (requestedAction === "cancelOrder" && llmContext.orderStatus !== "PENDING") {
    return { allowed: false, reason: "Order not in cancellable state" }
  }
  
  return { allowed: true }
}
```

### Attribute-Based Access Control (ABAC) Example

```text
User:           Alice (department: sales, clearance: 5)
Action:         refundOrder(orderId: ORD-101)
Environment:    orderAmount: 50000, orderStatus: PENDING, customerTier: gold

Evaluation:
1. Alice's role (sales) allows refund operations ✅
2. orderStatus === PENDING ✅
3. customerTier === gold and Alice is account owner ✅
4. orderAmount (50000) ≤ refund limit for gold tier (100000) ✅
5. Final decision: ALLOWED
```

---

## 7. Self-Check

1. Why must identity come from the session rather than a tool argument?
2. Describe the safe confirmation flow and name three fields a confirmation record needs beyond the action name.
3. What is confirmation swapping and which field defeats it?
4. Why must argument validation order matter?
5. Explain the TOCTOU problem and the atomic solution.
6. Rewrite a typical `executeSql(sql)` to use narrow, typed tools.