#!/usr/bin/env node
/**
 * process_subscription.js - Subscription management script for pay-skill in JavaScript (Node.js).
 * Simulates/executes API creation of customers and subscription tiers.
 */

import process from 'node:process';
import crypto from 'node:crypto';

const PLAN_CATALOG = {
  plan_starter: { name: 'Starter Plan', amount_cents: 1900, interval: 'month' },
  plan_pro: { name: 'Pro Plan', amount_cents: 4900, interval: 'month' },
  plan_enterprise: { name: 'Enterprise Plan', amount_cents: 29900, interval: 'month' }
};

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

export function createCustomer(email, name = 'Valued Customer') {
  const customerId = `cust_${crypto.randomBytes(6).toString('hex')}`;
  return {
    status: 'SUCCESS',
    action: 'create_customer',
    customer: {
      id: customerId,
      email,
      name,
      created_at: new Date().toISOString()
    }
  };
}

export function createSubscription(customerId, planId = 'plan_pro') {
  if (!PLAN_CATALOG[planId]) {
    return {
      status: 'FAILED',
      error: `Invalid plan_id '${planId}'. Available plans: ${Object.keys(PLAN_CATALOG).join(', ')}`
    };
  }

  const plan = PLAN_CATALOG[planId];
  const subscriptionId = `sub_${crypto.randomBytes(6).toString('hex')}`;

  return {
    status: 'SUCCESS',
    action: 'create_subscription',
    subscription: {
      id: subscriptionId,
      customer_id: customerId,
      plan_id: planId,
      plan_name: plan.name,
      amount_cents: plan.amount_cents,
      interval: plan.interval,
      status: 'active',
      current_period_start: new Date().toISOString()
    }
  };
}

function main() {
  const args = parseArgs();
  if (!args.action) {
    console.error(JSON.stringify({ status: 'FAILED', error: '--action <create_customer|create_subscription> is required' }));
    process.exit(1);
  }

  let res;
  if (args.action === 'create_customer') {
    if (!args.email) {
      console.error(JSON.stringify({ status: 'FAILED', error: '--email is required for create_customer' }));
      process.exit(1);
    }
    res = createCustomer(args.email, args.name);
  } else if (args.action === 'create_subscription') {
    if (!args['customer-id'] && !args.customerId) {
      console.error(JSON.stringify({ status: 'FAILED', error: '--customer-id is required for create_subscription' }));
      process.exit(1);
    }
    const customerId = args['customer-id'] || args.customerId;
    res = createSubscription(customerId, args['plan-id'] || args.planId || 'plan_pro');
  } else {
    console.error(JSON.stringify({ status: 'FAILED', error: `Unknown action '${args.action}'` }));
    process.exit(1);
  }

  console.log(JSON.stringify(res, null, 2));
  if (res.status !== 'SUCCESS') {
    process.exit(1);
  }
}

if (process.argv[1].endsWith('process_subscription.js')) {
  main();
}
