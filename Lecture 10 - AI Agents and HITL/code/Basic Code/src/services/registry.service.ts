import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TIER_POLICY } from '../config/config.js';
import type { Permission, Tool, ToolDefinition, ToolTier } from '../types/agent.types.js';
import { workspaceTools } from './workspace.service.js';

/**
 * Chapter 02 §02.2.3 — the registry.
 *
 * A tool is an implementation PLUS a contract, and in this lecture the contract has
 * three parts the model never sees: the TIER (chapter 07) and the PERMISSION
 * (chapter 08). Only `name`, `description` and `parameters` are ever serialized.
 */

const describe = (schema: z.ZodTypeAny): Record<string, unknown> =>
  zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>;

/** Chapter 01 §01.2 Level 2 — the single-tool example, kept because it is pure. */
export const calculateTool: Tool = {
  name: 'calculate',
  description: 'Evaluates a basic arithmetic operation. Use it instead of doing arithmetic in your head.',
  parameters: describe(
    z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
  ),
  schema: z.object({ operation: z.enum(['add', 'subtract', 'multiply', 'divide']), a: z.number(), b: z.number() }),
  tier: 1,
  permission: 'calc:run',
  execute: async (args) => {
    const { operation, a, b } = args as { operation: string; a: number; b: number };
    if (operation === 'divide' && b === 0) {
      // §03.10.2 rule 2 — actionable, never "something went wrong".
      throw new Error('Division by zero is undefined. Provide a non-zero denominator.');
    }
    const result =
      operation === 'add' ? a + b : operation === 'subtract' ? a - b : operation === 'multiply' ? a * b : a / b;
    return { operation, a, b, result };
  },
};

/**
 * Chapter 07 §07.2 — a Tier 3 tool. Non-idempotent, financial, irreversible.
 *
 * Notice the `idempotencyKey` in the schema: for a Tier 3 tool, idempotency is not
 * optional — it is part of the tool contract (§07.6).
 */
export const refundCustomerTool: Tool = {
  name: 'refundCustomer',
  description: 'Issues a refund against an order. Requires human approval above the configured threshold.',
  parameters: describe(
    z.object({
      orderId: z.string().describe('The order to refund, e.g. "892".'),
      amount: z.number().describe('Refund amount in the account currency.'),
      reason: z.string().optional(),
    }),
  ),
  schema: z.object({ orderId: z.string().min(1), amount: z.number().positive(), reason: z.string().optional() }),
  tier: 3,
  permission: 'billing:refund',
  execute: async (args) => {
    const { orderId, amount, reason } = args as { orderId: string; amount: number; reason?: string };
    // §07.6 layer 2 — the downstream service is the only place that can answer
    // "have I already applied this effect?". The key travels with the request.
    const idempotencyKey = `refund:${orderId}:${amount}`;
    return {
      refunded: true,
      orderId,
      amount,
      reason: reason ?? 'customer request',
      idempotencyKey,
      note: `Tier 3 action executed after human approval (threshold ${TIER_POLICY.financialThreshold}).`,
    };
  },
};

/** §07.2 — the other Tier 3 primitive named in the notes: an external, irreversible action. */
export const deployToProductionTool: Tool = {
  name: 'deployToProduction',
  description: 'Deploys a built site to the production environment. Irreversible and externally visible.',
  parameters: describe(z.object({ siteName: z.string().describe('The project directory to deploy.') })),
  schema: z.object({ siteName: z.string().min(1) }),
  tier: 3,
  permission: 'deploy:run',
  execute: async (args) => {
    const { siteName } = args as { siteName: string };
    return { deployed: true, siteName, url: `https://${siteName}.example.com`, deployedAt: new Date().toISOString() };
  },
};

/**
 * §06.3 — the capability surface, in one list. Four sandbox tools plus three
 * domain tools; the sandbox tools are the agent's *hands*, the others are its
 * *reach*.
 */
export const ALL_TOOLS: Tool[] = [
  ...workspaceTools,
  calculateTool,
  refundCustomerTool,
  deployToProductionTool,
];

export const getTool = (name: string): Tool | undefined => ALL_TOOLS.find((tool) => tool.name === name);

export const permissionFor = (name: string): Permission | undefined => getTool(name)?.permission;

export const tierFor = (name: string): ToolTier | undefined => getTool(name)?.tier;

/**
 * Chapter 02 §02.2.3 — the ONLY thing that leaves this process toward the model:
 * name, description, parameters. No tier, no permission, no implementation.
 */
export const toWireDefinitions = (tools: Tool[] = ALL_TOOLS): ToolDefinition[] =>
  tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));

/** Chapter 02 §02.6 — what `/api/health` and `/api/tools` report about the registry. */
export const describeRegistry = (tools: Tool[] = ALL_TOOLS) =>
  tools.map((tool) => ({ name: tool.name, tier: tool.tier, permission: tool.permission }));
