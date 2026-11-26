# Chapter 07: Routing & the Fixture Eval

> **Chapter goal:** turn chapter 07's "tool selection is a behaviour you can test" into fixtures, four metrics
> and a confusion matrix.
> **Notes chapters covered:** 07 §07.4–§07.5 (metrics, fixture design, the harness, the confusion matrix) ·
> 02 §02.4 (assert on structure, not meaning).

---

## 7.1 `src/services/eval.service.ts` — part 1: the fixtures

```ts
import { runAgent } from './agent.service.js';
import type { RoutingEvalReport, RoutingFixture, ToolContext } from '../types/agent.types.js';

/**
 * Chapter 07 §07.4 — tool selection is a BEHAVIOUR, so it is measured, not assumed.
 *
 * You cannot verify a routing decision by reading code: the decision lives in
 * weights (or, in offline mode, in the stub). You verify it with fixtures,
 * assertions and a confusion matrix — the same way you verify any stochastic part.
 */

const EVAL_CONTEXT: ToolContext = { userId: 'eval-user', tenantId: 'tenant-a' };

/**
 * Chapter 07 §07.5.1 — the composition matters as much as the count:
 * positive cases, a chain, a multi-intent batch, NEGATIVE cases (no tool), and
 * an error case that must not crash the loop.
 */
export const routingFixtures: RoutingFixture[] = [
  {
    id: 'w1',
    request: "What's the weather in Delhi right now?",
    expect: { kind: 'firstTool', name: 'getCurrentWeather' },
    argAssertions: [{ path: 'city', matches: 'delhi' }],
    maxHops: 2,
  },
  {
    id: 'c1',
    request: 'What is 8745 multiplied by 493?',
    expect: { kind: 'firstTool', name: 'calculate' },
    argAssertions: [{ path: 'operation', equals: 'multiply' }, { path: 'a', isNumber: true }, { path: 'b', isNumber: true }],
    maxHops: 2,
  },
  {
    id: 'c2',
    request: 'Convert $120 into Indian rupees and then divide that amount equally among 6 people.',
    expect: { kind: 'toolChain', names: ['convertCurrency', 'calculate'] },
    maxHops: 4,
  },
  {
    id: 'p1',
    request: 'What is the weather in London and how much is $500 in Indian rupees?',
    expect: { kind: 'anyOf', names: ['getCurrentWeather', 'convertCurrency'] },
    maxHops: 2,
  },
  {
    id: 'i1',
    request: 'What is the status of INV-1024?',
    expect: { kind: 'firstTool', name: 'getInvoiceStatus' },
    argAssertions: [{ path: 'invoiceId', equals: 'INV-1024' }],
    maxHops: 2,
  },
  {
    id: 't1',
    request: 'Remind me to call the bank tomorrow.',
    expect: { kind: 'firstTool', name: 'createTask' },
    maxHops: 2,
  },
  {
    id: 'r1',
    request: 'Please refund INV-1025, amount 1299.',
    expect: { kind: 'firstTool', name: 'refundPayment' },
    maxHops: 3, // chapter 08 §08.5 — it halts at the approval gate, not at a crash
  },
  {
    id: 'n1',
    request: 'Hello! How are you today?',
    expect: { kind: 'noTool' },
    maxHops: 1,
  },
  {
    id: 'n2',
    request: 'What is the capital of France?',
    expect: { kind: 'noTool' },
    maxHops: 1,
  },
  {
    id: 'e1',
    request: 'What is 50 divided by 0?',
    expect: { kind: 'firstTool', name: 'calculate' },
    maxHops: 3, // chapter 06 §06.1 — the error becomes an observation, not a 500
  },
];
```

### Block by block

**`EVAL_CONTEXT`** — a fixed session. The eval must be reproducible, so the identity is pinned rather than taken
from a request header. Note it is `tenant-a`, which is why `INV-1024` resolves in fixture `i1`.

**The composition is the lesson** (chapter 07 §07.5.1). Ten fixtures, deliberately chosen:

| Fixture | Kind | What it catches |
| :--- | :--- | :--- |
| `w1`, `c1` | positive | the tool is selected at all |
| `c2` | **chain** | ordering — `convertCurrency` *then* `calculate` |
| `p1` | **multi-intent** | parallel dispatch: any first tool of the pair is acceptable |
| `i1`, `t1` | positive | two more families route correctly |
| `r1` | **Tier 3** | the gate fires without crashing the loop |
| `n1`, `n2` | **negative** | the model must **not** call a tool |
| `e1` | **error** | a domain error becomes an observation |

**Why the two negative fixtures are the most valuable.** Chapter 07 §07.3 names **over-calling** as one of the six
failure modes, and it is invisible to a suite made only of positive cases. `n1` (small talk) and `n2` (a fact in
the weights) assert `proposed.length === 0`. They are also what populate the `none` row of the confusion matrix —
the row teams forget to build.

**`argAssertions` assert on structure, never meaning** (chapter 02 §02.4). Three operators only:

| Operator | Example | Asserts |
| :--- | :--- | :--- |
| `equals` | `{ path: 'operation', equals: 'multiply' }` | the enum value, exactly |
| `matches` | `{ path: 'city', matches: 'delhi' }` | case-insensitive shape, not the exact string |
| `isNumber` | `{ path: 'a', isNumber: true }` | the *type*, which is what the schema promised |

Nothing asserts "the answer is correct". That is deliberate: this suite measures **routing and argument shape**,
which is what chapter 07 is about. Answer quality is a different eval (Lecture 30).

**`maxHops` is an assertion too.** `c2` allows 4 (the chain needs 3 model calls); `n1` and `n2` allow 1. A
regression that turns a one-hop answer into a three-hop loop shows up as a failed fixture rather than as a slow
endpoint.

---

## 7.2 `src/services/eval.service.ts` — part 2: the harness

```ts
const expectedLabel = (fixture: RoutingFixture): string => {
  switch (fixture.expect.kind) {
    case 'noTool':
      return 'none';
    case 'firstTool':
      return fixture.expect.name;
    case 'anyOf':
      return fixture.expect.names[0];
    case 'toolChain':
      return fixture.expect.names[0];
  }
};

/** Chapter 02 §02.4 — assert on STRUCTURE (names, types), never on meaning. */
const checkAssertion = (args: Record<string, unknown>, assertion: NonNullable<RoutingFixture['argAssertions']>[number]): boolean => {
  const value = assertion.path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], args);
  if (assertion.equals !== undefined) return value === assertion.equals;
  if (assertion.matches !== undefined) return new RegExp(assertion.matches, 'i').test(String(value));
  if (assertion.isNumber !== undefined) return typeof value === 'number';
  return value !== undefined;
};

/**
 * Chapter 07 §07.5.2 — the harness. It reads the trace the engine already records,
 * so every assertion is free.
 */
export const runRoutingEval = async (fixtures: RoutingFixture[] = routingFixtures): Promise<RoutingEvalReport> => {
  const rows: RoutingEvalReport['rows'] = [];
  const confusionMatrix: RoutingEvalReport['confusionMatrix'] = {};

  for (const fixture of fixtures) {
    const run = await runAgent(fixture.request, EVAL_CONTEXT, { maxSteps: fixture.maxHops ?? 4 });

    const proposed = run.trace.flatMap((step) => step.calls.map((call) => call.name));
    const firstCall = run.trace[0]?.calls[0];
    const observed = firstCall?.name ?? 'none';
    const expected = expectedLabel(fixture);

    const selectionOk = (() => {
      switch (fixture.expect.kind) {
        case 'noTool':
          return proposed.length === 0;
        case 'firstTool':
          return firstCall?.name === fixture.expect.name;
        case 'anyOf':
          return fixture.expect.names.includes(observed);
        case 'toolChain':
          return fixture.expect.names.every((name, index) => proposed[index] === name);
      }
    })();

    const parsedArgs = (() => {
      try {
        return JSON.parse(firstCall?.rawArguments ?? '{}') as Record<string, unknown>;
      } catch {
        return {};
      }
    })();

    const argsOk = (fixture.argAssertions ?? []).every((assertion) => checkAssertion(parsedArgs, assertion));

    confusionMatrix[expected] = confusionMatrix[expected] ?? {};
    confusionMatrix[expected][observed] = (confusionMatrix[expected][observed] ?? 0) + 1;

    rows.push({
      id: fixture.id,
      request: fixture.request,
      expected,
      observed,
      selectionOk,
      argsOk,
      hops: run.steps,
      halted: run.halted,
    });
  }

  const withTool = rows.filter((row) => row.observed !== 'none');
  const mean = (values: number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

  return {
    selectionAccuracy: mean(rows.map((row) => (row.selectionOk ? 1 : 0))),
    argumentValidity: mean(withTool.map((row) => (row.argsOk ? 1 : 0))),
    avgHops: mean(rows.map((row) => row.hops)),
    terminationRate: mean(rows.map((row) => (row.halted === null ? 1 : 0))),
    rows,
    confusionMatrix,
  };
};
```

### Block by block

**`expectedLabel()`** — the fixture's expectation collapsed to a single string, so it can be a *key* in the
confusion matrix. The four kinds map onto the matrix's rows:

| Kind | Matrix label | Meaning |
| :--- | :--- | :--- |
| `noTool` | `none` | the row teams forget |
| `firstTool` | the tool name | one expected answer |
| `anyOf` | the first acceptable name | a batch, where either order is fine |
| `toolChain` | the first link | the chain's entry point |

**`checkAssertion()`** — three operators, and the dotted `path` walk. The `isNumber` case is the one that earns
its keep: it asserts the *type* the JSON Schema promised, which is precisely the failure mode chapter 01 §01.7.1
describes (`"10"` instead of `10`). Note `matches` builds a case-insensitive regex, so `city: 'delhi'` passes
without pinning the exact casing a model might choose.

**`runAgent(fixture.request, EVAL_CONTEXT, { maxSteps: fixture.maxHops ?? 4 })`** — the harness drives the *real*
engine, not a mock. That is the point: an eval that tests a simulation of your loop tests nothing.

**`proposed` — the whole chain, flattened:**

```ts
const proposed = run.trace.flatMap((step) => step.calls.map((call) => call.name));
```

For `c2` this yields `['convertCurrency', 'calculate']`, which is why `toolChain` can assert order with
`every((name, index) => proposed[index] === name)`.

**`observed = firstCall?.name ?? 'none'`** — the matrix's column. Using `?? 'none'` rather than an empty string is
what makes the negative fixtures land in the right cell.

**The `selectionOk` IIFE** — a `switch` on the discriminated union, exhaustively handled. TypeScript guarantees all
four kinds are covered, so adding a fifth expectation kind becomes a compile error rather than a silently skipped
assertion.

**`parsedArgs` in its own `try/catch`** — the harness must not crash on a malformed argument string, because
fixture `e1` deliberately provokes a domain error and a future fixture might provoke a malformed one. A throwing
eval is worse than a failing eval.

**The confusion matrix, built in two lines:**

```ts
confusionMatrix[expected] = confusionMatrix[expected] ?? {};
confusionMatrix[expected][observed] = (confusionMatrix[expected][observed] ?? 0) + 1;
```

Chapter 07 §07.5.3. Verified output from this lab:

```text
getCurrentWeather -> {'getCurrentWeather': 2}
calculate         -> {'calculate': 2}
convertCurrency   -> {'convertCurrency': 1}
getInvoiceStatus  -> {'getInvoiceStatus': 1}
createTask        -> {'createTask': 1}
refundPayment     -> {'refundPayment': 1}
none              -> {'none': 2}            <- the row that catches over-calling
```

A perfectly diagonal matrix. Any off-diagonal cell is a **colliding description** — chapter 07 §07.3.1's
"wrong tool" mode — and it points at a specific pair of tool descriptions to rewrite.

**The four metrics** (chapter 07 §07.4.1), and one deliberate asymmetry:

| Metric | Formula | Note |
| :--- | :--- | :--- |
| `selectionAccuracy` | mean over **all** rows | the negative fixtures count — answering without a tool is a success |
| `argumentValidity` | mean over rows **that called a tool** | dividing by all rows would punish `n1`/`n2` for having no arguments |
| `avgHops` | mean of `run.steps` | a rising trend means descriptions are drifting |
| `terminationRate` | fraction with `halted === null` | anything below 1 is a loop that needed a brake |

The `withTool` filter for `argumentValidity` is the subtle one: a fixture with no tool call has no arguments to
validate, so including it would inflate the score with free passes.

**Verified, in OFFLINE mode:**

```text
fixtures 10 | selectionAccuracy 1 | argumentValidity 1 | avgHops 1.9 | terminationRate 1
```

**What this chapter does not measure.** Answer *quality* — whether "each share is 1670" is correct — is not
asserted anywhere. That is a different eval with a different failure mode (Lecture 30), and conflating the two is
how routing suites become flaky. Chapter 07 §07.4's four metrics measure **the decision**, and this file keeps
that boundary clean.

---

**Next:** [Chapter 08 — The API Surface: Validation, Controllers & Routes](./08_The_API_Surface.md)
