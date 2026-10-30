#!/usr/bin/env node
/**
 * validate_payment.js - Deterministic validation script for pay-skill in JavaScript (Node.js).
 * Validates email format, currency support, amount ranges, and compliance risk.
 */

import process from 'node:process';

const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);
const BLOCKED_DOMAINS = new Set(['dispostable.com', 'mailinator.com', 'trashmail.com']);

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = val;
    }
  }
  return params;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
  if (!regex.test(email)) return false;
  const domain = email.split('@').pop().toLowerCase();
  if (BLOCKED_DOMAINS.has(domain)) return false;
  return true;
}

export function validatePayment({ email, amount, currency = 'USD' }) {
  const errors = [];
  const amountCents = parseInt(amount, 10);

  if (!validateEmail(email)) {
    errors.push(`Invalid or disposable email address: ${email}`);
  }

  if (!SUPPORTED_CURRENCIES.has(currency.toUpperCase())) {
    errors.push(`Unsupported currency: ${currency}. Supported: ${Array.from(SUPPORTED_CURRENCIES).join(', ')}`);
  }

  if (isNaN(amountCents) || amountCents <= 0) {
    errors.push(`Amount must be positive integer in cents. Received: ${amount}`);
  } else if (amountCents > 1000000) { // $10,000 USD equivalent limit
    errors.push('Transaction amount exceeds automated processing limit ($10,000.00). Requires manual approval.');
  }

  if (errors.length > 0) {
    return {
      status: 'INVALID',
      compliance: 'FAILED',
      risk_score: 'HIGH',
      errors
    };
  }

  return {
    status: 'VALIDATED',
    compliance: 'PASSED',
    risk_score: 'LOW',
    details: {
      email,
      amount_formatted: `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
      currency: currency.toUpperCase()
    }
  };
}

function main() {
  const args = parseArgs();
  if (!args.email || !args.amount) {
    console.error(JSON.stringify({
      status: 'INVALID',
      error: 'Missing required CLI arguments: --email <email> --amount <cents>'
    }, null, 2));
    process.exit(1);
  }

  const result = validatePayment({
    email: args.email,
    amount: args.amount,
    currency: args.currency || 'USD'
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'VALIDATED') {
    process.exit(1);
  }
}

if (process.argv[1].endsWith('validate_payment.js')) {
  main();
}
