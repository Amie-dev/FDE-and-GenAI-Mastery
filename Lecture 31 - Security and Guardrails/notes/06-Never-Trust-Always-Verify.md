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

### The validation order

1. **Schema** — shape the model must produce
2. **Normalise** — consistent representation
3. **Format/pattern** — consistent with policies
4. **Range** — numeric bounds
5. **Enum** — allowed values
6. **Length** — string size
7. **Referential** — foreign key existence
8. **Ownership** — does the user own the target?
9. **Business rules** — policy logic
10. **Monetary policy** — thresholds, caps, pricing models
11. **Destination allowlist** — approved recipients
12. **Rate limits** — velocity checks
13. **Idempotency** — prevent duplicate execution
14. **Derivation** — derive from trusted data (never model-supplied)
15. **Field allowlist** — never execute fields you didn't expect

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

> **Authentication and authorization are deterministic backend concerns.** Identity comes from the **session**, never from a model argument or the message text.

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

### Unsafe confirmation

```text
SYSTEM: Only cancel after user confirmation.
User says: I confirmed earlier.
→ The model believes them.  UNSAFE.
```

### Better confirmation

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

### The confirmation record (beyond the lecture)

| Field | Threat it defeats |
|---|---|
| `actorId` | Confirmation from a different user |
| `sessionId` | Replayed confirmation across sessions |
| `argsHash` | **Confirmation swapping** — confirming ₹500 but executing ₹50,000 |
| `expiresAt` | Stale confirmations |
| `consumedAt` | Double execution (replay) |
| `nonce` | Forged confirmation requests |

**Also required:** atomic conditional updates (TOCTOU), idempotency keys, and an audit record of **proposed vs validated vs executed**.

---

## 4. TOCTOU (Time-of-Check to Time-of-Use)

> **Never check-then-act without a transaction.**

```text
Check ownership → Wait → Execute
   ↓              ↑          ↓
Ownership changes|          Effect
                |          ↔
              Unauthorized action
```

**Solution:** atomic conditional update or optimistic locking:

```js
// PSEUDO CODE
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

---

## 5. Self-Check

1. Why must identity come from the session rather than a tool argument?
2. Describe the safe confirmation flow and name three fields a confirmation record needs beyond the action name.
3. What is confirmation swapping and which field defeats it?
4. Why must argument validation order matter?
5. Explain the TOCTOU problem and the atomic solution.
6. Rewrite a typical `executeSql(sql)` to use narrow, typed tools.