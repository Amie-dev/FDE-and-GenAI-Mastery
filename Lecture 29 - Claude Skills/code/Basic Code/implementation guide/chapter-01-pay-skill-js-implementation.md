# 📘 Chapter 1: `pay-skill` JavaScript Implementation Guide

---

## 🎯 Architecture Overview

The `pay-skill` directory demonstrates a production-grade Category 1 & Category 3 Skill implemented using Node.js helper scripts.

```
pay-skill/
├── SKILL.md                          # Main Skill instruction entrypoint
├── scripts/
│   ├── validate_payment.js           # Deterministic JS payload & compliance validator
│   └── process_subscription.js       # Customer & subscription workflow manager
├── references/
│   ├── api-schema.md                 # API rate limits & parameter specs
│   └── compliance-rules.md           # AML & PCI-DSS compliance checks
└── assets/
    └── invoice-template.md           # Standard output template for invoices
```

---

## 🛠️ Step-by-Step Execution Walkthrough

### 1. Payload & Parameter Validation
Before executing API mutations, Claude calls `validate_payment.js`:

```bash
node scripts/validate_payment.js --email user@example.com --amount 4999 --currency USD
```

```json
{
  "status": "VALIDATED",
  "compliance": "PASSED",
  "risk_score": "LOW",
  "details": {
    "email": "user@example.com",
    "amount_formatted": "$49.99 USD",
    "currency": "USD"
  }
}
```

### 2. Subscription Management
Once parameters pass, `process_subscription.js` creates customer and subscription entities:

```bash
node scripts/process_subscription.js --action create_customer --email test@company.com --name "Acme Corp"
```

```json
{
  "status": "SUCCESS",
  "action": "create_customer",
  "customer": {
    "id": "cust_6cf0f317c26c",
    "email": "test@company.com",
    "name": "Acme Corp",
    "created_at": "2026-09-26T06:19:15.812Z"
  }
}
```

---

## 💡 Key Design Takeaways
- **Deterministic Validation**: Pure JavaScript validation rules ensure zero execution errors before touching external APIs.
- **On-Demand Reference Disclosure**: Detailed schema rate limits reside in `references/api-schema.md` to avoid bloating Level 1 context.
