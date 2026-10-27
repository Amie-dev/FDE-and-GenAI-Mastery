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

// ---------------------------------------------------------------------------
// 1. COMPUTE — calculate  (chapter 04 §04.3)
// ---------------------------------------------------------------------------

const CalculateArgs = z.object({
  operation: z
    .enum(['add', 'subtract', 'multiply', 'divide', 'power', 'mod'])
    .describe('The arithmetic operation to perform'),
  a: z.number().describe('The first operand'),
  b: z.number().describe('The second operand'),
});

export const calculateTool: Tool = {
  name: 'calculate',
  description:
    'Executes exact deterministic arithmetic. Supports add, subtract, multiply, divide, power and mod. ' +
    'Use this for ANY arithmetic, including large numbers, instead of computing mentally. Not for dates or units.',
  parameters: toJsonSchema(CalculateArgs),
  schema: CalculateArgs,
  family: 'compute',
  tier: 'read',
  timeoutMs: 1_000,
  execute: async (raw) => {
    const { operation, a, b } = CalculateArgs.parse(raw); // chapter 02 §02.5

    switch (operation) {
      case 'add':
        return { result: a + b };
      case 'subtract':
        return { result: a - b };
      case 'multiply':
        return { result: a * b };
      case 'divide':
        // Chapter 06 §06.1 — a domain error, not a crash: 50 / 0 must not 500.
        if (b === 0) {
          throw new ToolError('DIVISION_BY_ZERO', 'Division by zero is undefined. Provide a non-zero denominator.', false, { operation, b });
        }
        return { result: a / b };
      case 'power':
        // Chapter 04 §04.3.1 — bounded work, or the request hangs.
        if (Math.abs(b) > 1_000) throw new ToolError('EXPONENT_TOO_LARGE', 'Exponent must be between -1000 and 1000.');
        return { result: a ** b };
      case 'mod':
        if (b === 0) throw new ToolError('MODULO_BY_ZERO', 'Modulo by zero is undefined.', false, { operation, b });
        return { result: a % b };
    }
  },
};

// ---------------------------------------------------------------------------
// 2. INFORMATION — getCurrentWeather  (chapter 04 §04.4)
// ---------------------------------------------------------------------------

const WeatherArgs = z.object({
  city: z.string().min(1).max(64).describe('City name, e.g. Delhi, London, Tokyo'),
});

export const weatherTool: Tool = {
  name: 'getCurrentWeather',
  description:
    'Returns live atmospheric conditions (temperature in Celsius, condition, humidity %, wind speed in km/h) ' +
    'for ONE city, with the observation time. Use when the user asks about current weather or travel conditions. ' +
    'Do NOT use for forecasts, historical weather, or anything other than today.',
  parameters: toJsonSchema(WeatherArgs),
  schema: WeatherArgs,
  family: 'information',
  tier: 'read',
  timeoutMs: 8_000,
  cacheTtlMs: TOOL_POLICY.cacheTtlMs,
  execute: async (raw) => {
    const { city } = WeatherArgs.parse(raw);
    const key = `weather:${city.toLowerCase()}`;

    // Chapter 04 §04.9 — TTL cache: weather does not change every second.
    const hit = cacheGet(key, TOOL_POLICY.cacheTtlMs);
    if (hit.hit) return hit.value;

    // A stand-in for a live upstream — the SHAPE is what the notes teach.
    const seed = [...city.toLowerCase()].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const value = {
      city,
      temperatureCelsius: 18 + (seed % 20),
      condition: ['Clear', 'Hazy Sun', 'Cloudy', 'Light Rain'][seed % 4],
      humidityPercentage: 40 + (seed % 50),
      windSpeedKmh: 5 + (seed % 25),
      asOf: new Date().toISOString(), // chapter 04 §04.4.1 — always a timestamp
    };

    cacheSet(key, value);
    return value;
  },
};



// ---------------------------------------------------------------------------
// 3. INFORMATION — convertCurrency  (chapter 04 §04.5)
// ---------------------------------------------------------------------------

/** A fixed table stands in for a live FX feed; the contract is the lesson. */
const RATES_TO_USD: Record<string, number> = { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 157.2 };

const CurrencyArgs = z.object({
  amount: z.number().positive().describe('Amount to convert; must be greater than zero'),
  from: z.string().length(3).describe('ISO 4217 source code, e.g. USD, EUR, INR'),
  to: z.string().length(3).describe('ISO 4217 target code, e.g. USD, EUR, INR'),
});

export const currencyTool: Tool = {
  name: 'convertCurrency',
  description:
    'Converts an amount between fiat currencies using live exchange rates. Requires ISO 4217 three-letter codes ' +
    '(USD, EUR, INR, GBP, JPY). Returns the rate AND the converted amount, so no further arithmetic is needed. ' +
    'Not for crypto or historical rates.',
  parameters: toJsonSchema(CurrencyArgs),
  schema: CurrencyArgs,
  family: 'information',
  tier: 'read',
  timeoutMs: 8_000,
  cacheTtlMs: TOOL_POLICY.cacheTtlMs,
  execute: async (raw) => {
    const { amount, from, to } = CurrencyArgs.parse(raw);
    const source = from.toUpperCase();
    const target = to.toUpperCase();

    const fromRate = RATES_TO_USD[source];
    const toRate = RATES_TO_USD[target];
    if (!fromRate || !toRate) {
      // Chapter 06 §06.3 — a domain error the MODEL can repair by changing the code.
      throw new ToolError(
        'UNSUPPORTED_PAIR',
        `No rate available for ${source} to ${target}. Supported: ${Object.keys(RATES_TO_USD).join(', ')}.`,
      );
    }

    const exchangeRate = toRate / fromRate;
    return {
      sourceAmount: amount,
      sourceCurrency: source,
      targetCurrency: target,
      exchangeRate,
      // Chapter 04 §04.5.1 — return the answer the user wants, not a step towards it.
      convertedAmount: Math.round(amount * exchangeRate * 100) / 100,
      asOf: new Date().toISOString(),
    };
  },
};

// ---------------------------------------------------------------------------
// 4. INFORMATION — getInvoiceStatus  (chapter 04 §04.6)
// ---------------------------------------------------------------------------

const InvoiceArgs = z.object({
  invoiceId: z.string().regex(/^INV-\d{4,10}$/).describe('Invoice id, e.g. INV-1024'),
});

/** A tiny in-memory table stands in for the database. */
const INVOICES: Record<string, { tenantId: string; status: string; amountMinor: number; currency: string; createdAt: string }> = {
  'INV-1024': { tenantId: 'tenant-a', status: 'unpaid', amountMinor: 420000, currency: 'INR', createdAt: '2026-10-01T09:00:00Z' },
  'INV-1025': { tenantId: 'tenant-a', status: 'paid', amountMinor: 129900, currency: 'INR', createdAt: '2026-10-04T11:30:00Z' },
  'INV-9001': { tenantId: 'tenant-b', status: 'paid', amountMinor: 5000, currency: 'USD', createdAt: '2026-09-19T08:15:00Z' },
};

export const invoiceTool: Tool = {
  name: 'getInvoiceStatus',
  description:
    'Returns the status, amount and currency of ONE invoice owned by the current user. Use when the user asks ' +
    'about a specific invoice by id. Read-only. Do not use to list invoices.',
  parameters: toJsonSchema(InvoiceArgs),
  schema: InvoiceArgs,
  family: 'information',
  tier: 'read',
  timeoutMs: 3_000,
  execute: async (raw, ctx) => {
    const { invoiceId } = InvoiceArgs.parse(raw);

    // Chapter 04 §04.6.1 — the tenant filter comes from the SESSION, not the arguments.
    const row = INVOICES[invoiceId];
    if (!row || row.tenantId !== ctx.tenantId) {
      // Rule 5 — no existence oracle: one neutral message for both cases.
      throw new ToolError('NOT_FOUND', `No invoice ${invoiceId} for this account.`);
    }

    // Chapter 04 §04.6.1 — a column whitelist and a small projection, never SELECT *.
    return {
      invoiceId,
      status: row.status,
      amount: row.amountMinor / 100,
      currency: row.currency,
      createdAt: row.createdAt,
    };
  },
};

// ---------------------------------------------------------------------------
// 5. ACTION — createTask  (chapter 04 §04.7)
// ---------------------------------------------------------------------------

const CreateTaskArgs = z.object({
  title: z.string().min(3).max(120).describe('Short task title'),
  dueDate: z.string().optional().describe('ISO 8601 due date, e.g. 2026-11-05T09:00:00Z'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

interface StoredTask {
  taskId: string;
  userId: string;
  title: string;
  dueDate?: string;
  priority: string;
  idempotencyKey: string;
}

const TASKS: StoredTask[] = [];
let taskCounter = 0;

/** Chapter 04 §04.7 — the key comes from the INTENT, not from a random request id. */
const idempotencyKeyFor = (userId: string, title: string, dueDate?: string): string =>
  `${userId}|${title.toLowerCase().trim()}|${dueDate ?? ''}`;

export const createTaskTool: Tool = {
  name: 'createTask',
  description:
    'Creates a new task in the current user task list and returns its id. Use when the user asks to be reminded ' +
    'of, or to track, something. This WRITES data and is not idempotent — do not call it twice for one request.',
  parameters: toJsonSchema(CreateTaskArgs),
  schema: CreateTaskArgs,
  family: 'action',
  tier: 'write', // chapter 08 §08.2 — Tier 2: auto-execute with scoped creds + idempotency
  timeoutMs: 5_000,
  execute: async (raw, ctx) => {
    const args = CreateTaskArgs.parse(raw);
    const key = idempotencyKeyFor(ctx.userId, args.title, args.dueDate);

    // Chapter 04 §04.7.1 rule 1 — safe to call twice with the same intent.
    const existing = TASKS.find((task) => task.idempotencyKey === key);
    if (existing) return { taskId: existing.taskId, created: false, title: existing.title };

    const task: StoredTask = {
      taskId: `T-${++taskCounter}`,
      userId: ctx.userId, // the actor is injected, never taken from the arguments
      title: args.title,
      dueDate: args.dueDate,
      priority: args.priority,
      idempotencyKey: key,
    };
    TASKS.push(task);

    // Chapter 04 §04.7.1 rule 2 — echo the created resource, not "OK".
    return { taskId: task.taskId, created: true, title: task.title, dueDate: task.dueDate, priority: task.priority };
  },
};

// ---------------------------------------------------------------------------
// 6. ACTION — refundPayment  (chapter 08 §08.2 — the Tier 3 demo)
// ---------------------------------------------------------------------------

const RefundArgs = z.object({
  invoiceId: z.string().regex(/^INV-\d{4,10}$/).describe('Invoice id to refund, e.g. INV-1024'),
  amount: z.number().positive().max(100_000).describe('Refund amount in the invoice currency'),
});

export const refundTool: Tool = {
  name: 'refundPayment',
  description:
    'Issues a refund against an invoice. This moves MONEY, is irreversible and REQUIRES human approval, so it ' +
    'cannot complete inside a single run. Call it only when the user explicitly asks for a refund.',
  parameters: toJsonSchema(RefundArgs),
  schema: RefundArgs,
  family: 'action',
  tier: 'critical', // chapter 08 §08.2 — Tier 3: never auto-execute
  timeoutMs: 10_000,
  execute: async (raw, ctx) => {
    const { invoiceId, amount } = RefundArgs.parse(raw);
    const row = INVOICES[invoiceId];
    if (!row || row.tenantId !== ctx.tenantId) throw new ToolError('NOT_FOUND', `No invoice ${invoiceId} for this account.`);

    // Chapter 06 §06.3 — a business rule, explained in language the model can relay.
    if (row.status === 'paid' && amount > row.amountMinor / 100) {
      throw new ToolError('REFUND_EXCEEDS_INVOICE', `Refund of ${amount} exceeds the invoice amount of ${row.amountMinor / 100} ${row.currency}.`);
    }

    // The runtime gate is in registry.service.ts (chapter 08 §08.5 rule 1): this
    // execute() is only ever reached with an approval record in hand.
    return { invoiceId, refunded: amount, currency: row.currency, refundedAt: new Date().toISOString() };
  },
};

// ---------------------------------------------------------------------------
// The suite (chapter 02 §02.7 — small, sharp, no overlapping semantics)
// ---------------------------------------------------------------------------

export const allTools: Tool[] = [
  calculateTool,
  weatherTool,
  currencyTool,
  invoiceTool,
  createTaskTool,
  refundTool,
];
