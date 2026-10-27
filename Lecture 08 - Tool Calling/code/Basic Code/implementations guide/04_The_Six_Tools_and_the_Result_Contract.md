# Chapter 04: The Six Tools & the Result Contract

> **Chapter goal:** read every tool in the suite as *capability + permission + contract + result shape*, and
> see chapter 04's three families in code.
> **Notes chapters covered:** 04 §04.1–§04.9 (families, compute/information/action tools, results, policy) ·
> 06 §06.1–§06.3 (domain errors) · 08 §08.2 (tiers).

---

## 4.0 Why six tools and not four

The roadmap's build task says *"3–4 typed tools (weather, calculator, DB lookup, task manager)"*. This lab
ships those four **plus two**:

| Tool | Roadmap | Why it is here |
| :--- | :--- | :--- |
| `calculate` | ✅ | the compute family — proves chapter 01 §01.3's arithmetic defect |
| `getCurrentWeather` | ✅ | the information family — proves live data must be fetched |
| `getInvoiceStatus` | ✅ (DB lookup) | proves tenant scoping from the session (chapter 04 §04.6) |
| `createTask` | ✅ (task manager) | the Tier 2 action: idempotency, audit, echo-the-resource |
| `convertCurrency` | — | needed for the **sequential chain** that satisfies the gate (chapter 05 §05.2) |
| `refundPayment` | — | the **Tier 3 demo**: without it, chapter 08's approval gate is unobservable |

The two additions cost ~25 lines and unlock two chapters. Six tools is still comfortably inside chapter 02
§02.7's "5–15 tools per agent" guidance.

---

## 4.1 Tool 1 — `calculate` (compute, Tier 1)

```ts
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
```

### Block by block

**`z.enum([...])` with `.describe()`** — chapter 02 §02.2.1's rule that enums move failures from runtime to
design time. The enum is what stops `"times it"` from reaching the `switch`; the `.describe()` is what tells
the model which six words are legal. Both halves come from one line, which is chapter 02 §02.5 in miniature.

**The `description`** — chapter 02 §02.3.1's five-part recipe, applied:

| Part | Text in the description |
| :--- | :--- |
| what it does | "Executes exact deterministic arithmetic. Supports add, subtract, multiply, divide, power and mod." |
| when to use | "Use this for ANY arithmetic, including large numbers" |
| when **not** to use | "Not for dates or units" |
| (units) | n/a — arithmetic is unitless |
| (side effects) | n/a — it is read-only |

The phrase *"instead of computing mentally"* is doing real work: it is the sentence that discourages the model
from answering `8745 × 493` from its own weights (chapter 01 §01.3).

**`family: 'compute'`, `tier: 'read'`, `timeoutMs: 1_000`** — chapter 04 §04.1's classification, and the
policy that follows. A compute tool touches no world, so its timeout only documents intent. `tier: 'read'`
means it is auto-executed with no approval (chapter 08 §08.2).

**`CalculateArgs.parse(raw)`** — note the *second* parse. `executeSafely` already validated the arguments
before calling `execute`; this parse is what makes the tool safe to invoke directly through
`POST /api/tools/calculate/call`. It is cheap, and it means a tool can never be called with unvalidated data
from any entry point.

**The three typed throws** — chapter 06 §06.3's taxonomy in practice:

- `DIVISION_BY_ZERO` and `MODULO_BY_ZERO` are **domain errors**: `retryable = false`, because repeating the
  same call with the same arguments cannot succeed. `details: { operation, b }` lets the model see *why*.
- `EXPONENT_TOO_LARGE` implements chapter 04 §04.3.1's "bounded work". `power(2, 10**9)` would hang the
  request; the guard turns a hang into a one-line message.

Notice that none of these throw types is `Error`. A tool that threw a bare `Error` would arrive at the model
as `INTERNAL_ERROR` — sanitised, unactionable, and indistinguishable from a genuine bug. **Typed errors are
what make self-healing possible** (chapter 06 §06.6).

---

## 4.2 Tool 2 — `getCurrentWeather` (information, Tier 1)

```ts
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
```

### Block by block

**`min(1).max(64)` on `city`** — a bound on untrusted input. `min(1)` blocks the empty string; `max(64)`
blocks a 40 KB "city name" that would be forwarded to an upstream API. Chapter 02 §02.4's table calls this
"string shape", and it is the cheapest defence in the file.

**`cacheTtlMs: TOOL_POLICY.cacheTtlMs`** — the *only* thing that makes this tool cacheable. The engine checks
`if (tool.cacheTtlMs)` before touching the cache, so an action tool simply omits the field and can never be
cached by accident. That is chapter 04 §04.9's "never cache a mutation", enforced structurally rather than by
convention.

**The cache key is `weather:${city.toLowerCase()}`** — derived from the *semantic* argument, not from the raw
argument string. This matters: `{"city":"Delhi"}` and `{"city":"delhi"}` are the same question, and both should
hit. (Contrast with the approval gate, which hashes the *raw* string on purpose — different goal, different
key.)

**The result shape** — chapter 04 §04.4.1's four properties, all present:

| Property | In the code |
| :--- | :--- |
| units in the description **and** the keys | `temperatureCelsius`, `humidityPercentage`, `windSpeedKmh` |
| a timestamp | `asOf` |
| a cache TTL | `cacheTtlMs: TOOL_POLICY.cacheTtlMs` |
| a timeout | `timeoutMs: 8_000` |

**"A stand-in for a live upstream."** In production this body would be
`const upstream = await fetch(...); return { city: upstream.name, temperatureCelsius: Math.round(upstream.main.temp), ... }`.
The deterministic seed is here so the lab runs offline, but note what is *not* different: the tool still
normalises the upstream shape into six typed fields. Chapter 04 §04.4.2's rule — *never forward the upstream
payload* — is a property of this return statement, and swapping the data source does not change it.

**Why this tool exists at all** — chapter 01 §01.4.2: the model's weights are frozen, so "the current weather"
is not in them. A model asked about Delhi's weather today will produce a plausible number. This tool is the
observation that replaces that number.

---

## 4.3 Tool 3 — `convertCurrency` (information, Tier 1)

```ts
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
```

### Block by block

**`.positive()` on `amount`** — a numeric bound that removes a whole class of nonsense. A negative or zero
conversion is not a meaningful request, and the constraint is expressed once, in the schema, where the model
can also see it.

**`.length(3)` on `from` / `to`** — this is the single most instructive constraint in the suite. Chapter 02
§02.5.1's worked example is exactly this line, and the three things it does at once are:

| Effect | Why it matters |
| :--- | :--- |
| biases generation toward three-letter codes | the model sees `length: 3` and emits `INR`, not `rupees` |
| rejects `"rupees"`, `"₹"`, `"dollars"` at runtime | the tool body never sees a currency *word* |
| documents the field | the next engineer reads the intent without reading the body |

**`from.toUpperCase()`** — chapter 06 §06.5.3's "coerce safely where the intent is unambiguous". `usd` and
`USD` are the same currency; normalising is lossless and documented, so it happens inside the tool rather than
becoming a validation error.

**`UNSUPPORTED_PAIR`** — a *repairable* domain error, and the message proves it: it lists the supported codes.
Compare `"No rate available."` (unactionable) with `"No rate available for INR to XYZ. Supported: USD, INR, EUR,
GBP, JPY."` (the model can immediately try again with a valid code). This is chapter 06 §06.6.1's rule that
*the more precisely you describe the expected value, the fewer repair attempts the model needs*.

**`convertedAmount`** — chapter 04 §04.5.1's tool-design principle: *make each tool return the answer the user
actually wants, whenever that answer is derivable inside the tool.* Returning only `exchangeRate` would force
the model to multiply — and multiplication is precisely what it cannot be trusted to do (chapter 01 §01.3).
Every derived value left to the model is a hallucination opportunity.

**Why this tool matters more than it looks.** It is the *first hop of the chain* that satisfies the lecture's
gate. Chapter 05 §05.2's example — *"Convert $120 into Indian rupees and then divide that amount equally among
6 people"* — cannot be answered by any single tool, and it is this tool's `convertedAmount` that hop 2 consumes.
Verified output from this lab:

```text
step 1: convertCurrency({"amount":120,"from":"USD","to":"INR"}) -> ok   (convertedAmount 10020)
step 2: calculate({"operation":"divide","a":10020,"b":6}) -> ok        <- the argument came from hop 1
```

---

## 4.4 Tool 4 — `getInvoiceStatus` (information, Tier 1) — the scoped DB lookup

```ts
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
```

### Block by block

**`.regex(/^INV-\d{4,10}$/)`** — chapter 04 §04.6.1 rule 4: *constrain the identifier shape in the schema*. In
a real system this is the first of two defences; the second is the parameterised query. Here it means a
malformed id is rejected as `INVALID_ARGUMENTS` before any lookup logic runs, and the model is told the
expected shape.

**`execute: async (raw, ctx)`** — note the second parameter. This is the only tool that uses `ctx`, and that is
the point: **identity is injected by the runtime, never requested from the model.** Compare the schema — there
is no `tenantId` field, so the model *cannot* ask for another tenant's data. Chapter 04 §04.6.1 rule 2 and
chapter 08 §08.2.2: *if the model cannot express it, impersonation is impossible.*

**`if (!row || row.tenantId !== ctx.tenantId)`** — two failures collapse into one message on purpose.
`INV-9001` exists, but it belongs to `tenant-b`. Returning `PERMISSION_DENIED` for one case and `NOT_FOUND` for
the other would turn the tool into an **existence oracle**: an attacker could enumerate valid invoice ids by
comparing error codes. Chapter 04 §04.6.1 rule 5. The distinction is still logged server-side, where it belongs.

Verified behaviour:

```text
POST /api/tools/getInvoiceStatus/call  {"invoiceId":"INV-9001"}   (session tenant-a)
  -> error NOT_FOUND | No invoice INV-9001 for this account.

POST /api/tools/getInvoiceStatus/call  {"invoiceId":"INV-1024"}
  -> ok {'invoiceId': 'INV-1024', 'status': 'unpaid', 'amount': 4200, 'currency': 'INR', ...}
```

**The projection** — five named fields, no `SELECT *`. Chapter 04 §04.6.1 rule 3: a `SELECT *` would put
columns the user is not entitled to see (and every column the model does not need) into the context window.
The `amountMinor / 100` conversion is also deliberate: the database stores minor units for exactness, the model
receives a human-scale number.

**`timeoutMs: 3_000`** — a read against a database gets a shorter budget than an HTTP call to a third-party API
(8 s). Chapter 04 §04.9's policy table: the timeout should reflect the *expected* latency of the dependency, not
a single global default.

**Why this is the highest-risk *read* tool.** It is the one tool whose correctness depends on the runtime
rather than on the model. If the tenant filter came from an argument, the model could be talked into reading
another account — and no amount of prompt engineering would fix it (chapter 08 §08.1.2). This is the concrete
reason the registry, not the prompt, is the kernel.

---

## 4.5 Tool 5 — `createTask` (action, **Tier 2**) — idempotency and the echo

```ts
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
```

### Block by block

**`tier: 'write'`** — the Tier 2 declaration. Chapter 08 §08.2's criteria: it changes state, the state belongs
to the caller, and it is low-impact and reversible. So it auto-executes — but with an idempotency key, a
concurrency limit and an audit trail. Note that the tier is a *single word* that changes the runtime's behaviour;
there is no `if (toolName === 'createTask')` anywhere in the engine.

**The description says "This WRITES data and is not idempotent — do not call it twice for one request."**
Chapter 04 §04.7.1 rule 3: *say "this writes" in the description.* Two effects, one of which is easy to miss:

1. It reduces speculative calls — the model is less likely to "try" a write while thinking aloud.
2. It documents the permission tier for the human reading the schema. A reviewer scanning `GET /api/tools` sees
   the risk without reading any code.

**`idempotencyKeyFor(userId, title, dueDate)`** — chapter 04 §04.7.1 rule 1, and chapter 06 §06.7.3. The key is
derived from the **intent**: who, what, and for when. Compare the wrong version, `Date.now()` or a random uuid,
which would make every retry look like a new task and create duplicates.

Note the normalisation: `title.toLowerCase().trim()`. "Call the bank" and "call the bank " are the same intent,
so they must produce the same key. This is the same "coerce safely where the intent is unambiguous" decision as
`from.toUpperCase()` in §4.3.

**`if (existing) return { ..., created: false }`** — the idempotent replay. A second identical call returns the
**original** resource with `created: false`. Two consequences:

- The model learns the truth ("this task already existed") instead of being told it created something new.
- The caller can retry safely after a timeout, which is what makes chapter 06 §06.7.1's "retry the runtime
  layer" policy legal for this tool.

**`userId: ctx.userId`** — chapter 04 §04.7.1 rule 4: *never let the model choose the actor.* The schema has no
`userId` field, so the model cannot create a task in someone else's list. This is the same structural defence as
the invoice tool's tenant filter.

**The returned object** — chapter 04 §04.7.1 rule 2: *return the created resource, not `"OK"`.* The difference is
observable in the final answer:

| Returned | What the model can say |
| :--- | :--- |
| `"OK"` | "I created the task" — and it has to *invent* an id if asked |
| `{ taskId: 'T-1', created: true, title, dueDate }` | "Created task T-1: 'Call the bank' due 2026-11-05." |

Verified behaviour: a second identical run returns `created: false` with the same `taskId`, and the routing eval
asserts `createTask` is the first tool for *"Remind me to call the bank tomorrow."*

**Why this is the right place to learn the pattern.** It is low stakes. Everything chapter 08 asks for on a
payment tool — injected actor, intent-derived key, honest result, full audit — is here, on a task list, where
getting it wrong costs a duplicate to-do item instead of a duplicate refund.

---

## 4.6 Tool 6 — `refundPayment` (action, **Tier 3**) — the approval demo

```ts
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
```

### Block by block

**`tier: 'critical'`** — chapter 08 §08.2.1's classification questions, answered: *can it move money?* yes →
Tier 3. That one word is the entire reason this tool cannot execute from inside an agent run.

**`.max(100_000)` on `amount`** — a schema-level blast-radius cap, and the third defence in depth (chapter 08
§08.4):

| Layer | Control |
| :--- | :--- |
| 1 — contract | `max(100_000)` bounds a single refund |
| 2 — tier | `critical` means no execution without approval |
| 3 — business rule | `REFUND_EXCEEDS_INVOICE` compares against the invoice |

Each layer catches a different failure. A schema bound does not stop a *correctly shaped* refund of the wrong
invoice; the business rule does not stop a refund against the wrong *tenant*; the tenant filter does not stop a
refund that a human would refuse. Defence in depth is not redundancy — it is different questions.

**The description says "This moves MONEY, is irreversible and REQUIRES human approval, so it cannot complete
inside a single run."** That last clause is unusually honest for a tool description, and it is deliberate. The
model must not promise the user a completed refund; it must explain that approval is pending. Compare what the
model actually says, verified from this lab:

```text
"I could not complete that — APPROVAL_REQUIRED: This action needs human approval before it can run.
 Tell the user it is pending as apr_1."
```

**`execute` is only ever reached with an approval in hand.** The comment is not aspirational — it is enforced in
two places:

1. `executeSafely` checks `needsApproval(tool)` **before** calling `execute` (chapter 08 §08.5.2 rule 1).
2. Even on the approved path, `executeSafely` re-checks that the approval binds to this tool **and** to this
   exact argument hash (rule 3) before proceeding.

So this body is the *last* step of a five-step gate, not the gate itself. Putting the check inside the tool
would be worse: the tool would then be trusted to police itself, and chapter 08 §08.1's rule is that authority
lives in the runtime.

**`REFUND_EXCEEDS_INVOICE`** — a domain error written for a human reader, because the model will relay it
verbatim. Chapter 06 §06.6.3's "goal adjustment" level depends on this: *"I can't refund ₹1,299 — that exceeds
the invoice amount"* is only possible if the error carries the numbers. `REFUND_FAILED` would make Level 3
unreachable.

**The verified end-to-end gate:**

```text
1. run "Please refund INV-1025, amount 1299."
     refundPayment -> error APPROVAL_REQUIRED      (the run does NOT execute it)
     pendingApproval: true
     answer: "I could not complete that — APPROVAL_REQUIRED: ... pending as apr_1."

2. GET /api/approvals
     apr_1 refundPayment pending | refundPayment({"invoiceId":"INV-1025","amount":1299}) for user-1@tenant-a

3. POST /api/approvals/apr_1  {"decision":"approve"}
     status: approved | execution: ok
     {"invoiceId":"INV-1025","refunded":1299,"currency":"INR","refundedAt":"2026-10-27T08:34:05.654Z"}

4. POST /api/approvals/apr_1  {"decision":"approve"}   (again)
     replayed: true — the SAME result, the same timestamp (no second refund)

5. POST /api/approvals/apr_1  {"decision":"approve"}   (as tenant-b)
     403 "This approval belongs to another tenant."
```

Steps 3–5 are chapter 08 §08.5.2's four rules, all observable: the gate is in the runtime, deny by default, the
decision binds to the exact arguments, and it executes exactly once.

---

## 4.7 The suite

```ts
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
```

**One array is the single source of truth.** `registry.service.ts` builds both the name→tool map and the wire
definitions from `allTools`, so a tool can never be described-but-not-executable (chapter 02 §02.6). Adding a
tool is a one-line change here plus the tool's own definition — and the engine, the controller, the eval and the
ledger all pick it up without modification. That is chapter 05 §05.6.1's *"adding a tool must not change the
engine"*, verified by construction.

**The suite as a table** — print it with `GET /api/health`:

| Tool | Family | Tier | Timeout | Cached | Description boundary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `calculate` | compute | read | 1 s | no | "Not for dates or units" |
| `getCurrentWeather` | information | read | 8 s | yes | "Do NOT use for forecasts, historical weather" |
| `convertCurrency` | information | read | 8 s | yes | "Not for crypto or historical rates" |
| `getInvoiceStatus` | information | read | 3 s | no | "Do not use to list invoices" |
| `createTask` | action | write | 5 s | no | "This WRITES data … not idempotent" |
| `refundPayment` | action | **critical** | 10 s | no | "moves MONEY … REQUIRES human approval" |

Every row has an explicit *when not to use* clause. Chapter 07 §07.3.1 names that as the fix for **over-calling**
and **wrong-tool** routing, and it is the difference between a suite the model can route correctly and one it
merely guesses at.

**The result contract, once more.** None of the six tools returns an upstream payload, a bare string, or `"OK"`.
Each returns a small object whose keys carry their units, and the engine wraps it as
`{ status: 'ok', data: <that object> }`. That uniformity is what lets the model reason about *any* tool result
without special-casing — chapter 04 §04.8 and chapter 06 §06.4 in practice.

---

**Next:** [Chapter 05 — The Model Layer & the Five-Step Protocol](./05_The_Model_Layer_and_the_Five_Step_Protocol.md)
