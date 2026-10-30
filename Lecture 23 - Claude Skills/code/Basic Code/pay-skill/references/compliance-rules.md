# PayFlow Compliance & Fraud Mitigation Rules

## Sanctions & Anti-Money Laundering (AML)
1. **Disposable Domains**: Transaction validation fails automatically for disposable email providers (`mailinator.com`, `trashmail.com`).
2. **Transaction Cap**: Automated processing ceiling is capped at **$10,000.00 USD (1,000,000 cents)**. Transactions exceeding this limit require manual compliance review.
3. **Supported Currencies**: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`.

## PCI-DSS Scope Reduction
- **NO Plaintext Card Numbers**: Raw credit card numbers must never be passed to the LLM context or stored in logs.
- All payment method tokens must be generated client-side or passed via tokenized `pm_...` strings.
