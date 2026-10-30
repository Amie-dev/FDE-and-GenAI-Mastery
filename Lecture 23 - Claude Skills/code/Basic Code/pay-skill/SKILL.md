---
name: pay-skill
description: Manages customer payment gateway integration, subscription creation, plan configuration, and compliance validation via PayFlow. Use when user asks to "integrate payment gateway", "set up PayFlow", "process payment", "create subscription plan", or asks for "PayFlow billing workflow".
license: MIT
compatibility: Requires Node.js 18+ and network access to payflow API
metadata:
  author: GenAI Cohort Team
  version: 1.0.0
  mcp-server: payflow-mcp
---

# PayFlow Payment Gateway Integration Skill (JavaScript / Node.js)

## Overview
This skill guides Claude through executing end-to-end customer onboarding, payment processing, subscription management, and compliance checks using the PayFlow service and MCP server tools via Node.js runtime scripts.

---

## Instructions

### Step 1: Pre-Execution Parameter & Compliance Validation
Before invoking any payment tool or API endpoint, perform a deterministic check on the payload and parameters using the bundled Node.js validation script.

Run the validation helper:
```bash
node scripts/validate_payment.js --email {user_email} --amount {amount_cents} --currency {currency}
```

*Expected Output*: `{"status": "VALIDATED", "risk_score": "LOW", "compliance": "PASSED"}`

> [!CRITICAL]
> If `validate_payment.js` returns `INVALID` or exit code `1`, halt execution immediately and notify the user with the specific validation error. Do not proceed to call payment API tools.

---

### Step 2: Account & Customer Creation
If customer account does not exist in PayFlow:
1. Consult `references/api-schema.md` for parameter constraints.
2. Prepare the payload:
   - `email`: Customer email string.
   - `name`: Full name or company title.
   - `metadata`: `{ "source": "claude-agent-skill" }`.
3. Call MCP tool `payflow_create_customer` (or API script `node scripts/process_subscription.js --action create_customer`).

---

### Step 3: Payment Method Verification & Subscription Setup
Once customer ID (`cust_...`) is received:
1. Run compliance verification rules against `references/compliance-rules.md`:
   - Sanctions check: Clean.
   - Currency match: Supported currency (`USD`, `EUR`, `GBP`, `CAD`).
2. Attach payment method and initialize subscription:
```bash
node scripts/process_subscription.js --action create_subscription --customer-id {customer_id} --plan-id {plan_id}
```
3. Format output invoice using the markdown template located in `assets/invoice-template.md`.

---

## Troubleshooting & Edge Cases

| Error Code / Symptom | Probable Cause | Remediation Strategy |
| :--- | :--- | :--- |
| `ERR_PAYMENT_FAILED` | Insufficient funds or invalid test card details. | Prompt user to update card details in sandbox environment. |
| `ERR_COMPLIANCE_BLOCKED` | High risk score or unsupported jurisdiction. | Flag transaction for manual compliance review. Log issue details. |
| `ERR_MCP_TIMEOUT` | PayFlow MCP server connection dropped. | Direct user to check **Settings > Extensions > PayFlow MCP** connection status. |
