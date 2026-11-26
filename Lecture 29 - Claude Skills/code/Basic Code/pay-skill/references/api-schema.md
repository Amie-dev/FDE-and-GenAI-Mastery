# PayFlow API Schema & Rate Limit Reference

## Endpoints Summary

### 1. Customer Management
- `POST /v1/customers`
  - Body: `{ email: string, name: string, metadata?: object }`
  - Response: `{ id: "cust_...", email: string, created_at: string }`

### 2. Subscription Management
- `POST /v1/subscriptions`
  - Body: `{ customer_id: string, plan_id: string, payment_method_id?: string }`
  - Plans Available:
    - `plan_starter`: $19.00 / month
    - `plan_pro`: $49.00 / month
    - `plan_enterprise`: $299.00 / month

---

## Rate Limits
- **Burst Limit**: 100 requests / minute
- **Daily Quota**: 50,000 requests / day
- **Retry Strategy**: Exponential backoff on HTTP `429 Too Many Requests`.

---

## Error Codes

| Status Code | Code | Description | Fix |
| :--- | :--- | :--- | :--- |
| `400` | `INVALID_EMAIL` | Email fails RFC 5322 regex. | Verify email format. |
| `402` | `CARD_DECLINED` | Insufficient funds or invalid CVC. | Prompt user for alternative payment method. |
| `403` | `SANCTION_BLOCKED` | Jurisdiction blocked by compliance engine. | Escalate to legal compliance queue. |
