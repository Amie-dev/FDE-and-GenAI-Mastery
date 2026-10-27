# Chapter 05: The Model Layer & the Five-Step Protocol

> **Chapter goal:** implement steps 1 and 2 of chapter 03's wire lifecycle — send the definitions, receive a
> *proposal* — and provide an offline stub so the whole protocol is studyable with no API key.
> **Notes chapters covered:** 03 §03.1–§03.3 (the protocol, the proposal turn) · 07 §07.2 (`tool_choice`) ·
> 08 §08.6.3 (token estimation).

---

## 5.1 `src/lib/llm.ts` (full file — part 1 of 3: the provider path)

```ts
import OpenAI from 'openai';
import { config } from '../config/config.js';
import { toWireDefinitions } from '../services/registry.service.js';
import type { AssistantMessage, Message, ToolChoice } from '../types/agent.types.js';

/**
 * Chapter 03 §03.1 — the one place that talks to a model.
 *
 * This file implements exactly one side of the protocol: it sends the message
 * array plus the tool definitions and returns a PROPOSAL. It executes nothing.
 * That is the whole point of chapter 03 — the model proposes, the runtime acts.
 */

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

/**
 * Chapter 03 §03.1 / chapter 07 §07.5 — with no provider key the lab runs in
 * OFFLINE mode. A deterministic stub stands in for the model, so the whole
 * protocol (contracts, the 5-step loop, errors, self-healing, the trace and the
 * ledger) is studyable with zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/** Chapter 08 §08.6.3 — the ±10-15% estimator: characters ÷ average chars-per-token. */
export const estimate = (text: string): number => Math.ceil(text.length / 4);

const estimateMessages = (messages: Message[]): number =>
  messages.reduce((sum, message) => {
    const toolCalls = message.role === 'assistant' ? (message.tool_calls ?? []).map((call) => call.arguments).join('') : '';
    return sum + estimate(message.content ?? '') + estimate(toolCalls);
  }, 0);

/** Chapter 02 §02.7 — tool definitions are re-sent and billed on every turn. */
const definitionTokens = (): number =>
  estimate(JSON.stringify(toWireDefinitions()));

export interface ModelStepResult {
  message: AssistantMessage;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Chapter 03 §03.2 — steps 1 and 2 of the five-step lifecycle, in one call:
 * definitions out, `tool_calls` proposal back.
 */
export const modelStep = async (input: { messages: Message[]; toolChoice?: ToolChoice }): Promise<ModelStepResult> => {
  const toolChoice = input.toolChoice ?? (config.TOOL_CHOICE as ToolChoice);

  if (isOffline()) {
    // Chapter 07 §07.2 — the policy still applies in offline mode, so the routing
    // behaviour you test is the routing behaviour you ship.
    const message = offlineModel(input.messages, toolChoice);
    return {
      message,
      usage: {
        inputTokens: estimateMessages(input.messages) + definitionTokens(),
        outputTokens: estimate(message.content ?? '') + estimate(JSON.stringify(message.tool_calls ?? [])),
      },
    };
  }

  // Chapter 07 §07.2 — `tool_choice` is how the APPLICATION constrains routing.
  const wireToolChoice =
    typeof toolChoice === 'string'
      ? toolChoice
      : { type: 'function' as const, function: { name: toolChoice.name } };

  const completion = await client.chat.completions.create({
    model: config.AI_MODEL,
    messages: input.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    tools: toWireDefinitions() as OpenAI.Chat.ChatCompletionTool[],
    tool_choice: wireToolChoice,
    temperature: config.AI_TEMPERATURE,
    max_tokens: config.AI_MAX_TOKENS,
  });

  const choice = completion.choices[0];

  // Chapter 03 §03.3.2 — the normalized proposal. `content` is usually null, and
  // `arguments` stays a STRING until the runtime validates it (chapter 06 §06.5).
  const message: AssistantMessage = {
    role: 'assistant',
    content: choice?.message?.content ?? null,
    tool_calls: choice?.message?.tool_calls?.map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments,
    })),
  };

  return {
    message,
    usage: {
      inputTokens: completion.usage?.prompt_tokens ?? estimateMessages(input.messages) + definitionTokens(),
      outputTokens: completion.usage?.completion_tokens ?? estimate(message.content ?? ''),
    },
  };
};
```

### Block by block

**The file header comment is the design.** *"It executes nothing."* There is no `execute`, no filesystem, no
business `fetch` in this file — only a network call to a model and a normalisation of the response. If you ever
find yourself tempted to "just call the tool here", you have found the exact line chapter 03 §03.1 warns about.

**`new OpenAI({ ... })`** — one client, built once at module load. `maxRetries: 0` is deliberate: retry policy
belongs to the *engine* (chapter 06 §06.7), not to a transport library, because only the engine knows whether
the call is an idempotent read or a Tier 2 write. A hidden retry inside the SDK could double-apply a side
effect.

**`isOffline()`** — `AI_PROVIDER !== 'ollama' && !AI_API_KEY`. Ollama is a legitimate local provider that needs
no key, so the check excludes it. Every other provider without a key means "run the stub".

**`estimate()`** — chapter 08 §08.6.3's ±10–15 % estimator: characters ÷ 4. It exists because a stub (or a
streaming response) has no `usage` object, and a ledger that goes blank when usage is missing is worse than an
approximate one. Chapter 08's rule: *estimate during, reconcile at the end, never let a missing usage break the
ledger.*

**`definitionTokens()`** — chapter 02 §02.7's warning made measurable: the tool definitions are counted on
**every** turn, because they are serialised into every request. This is one of the four cost levers, and this
function is how the lab makes it visible.

**`modelStep(input)` — the whole of steps 1 and 2.** Read it as the protocol:

| Chapter 03 step | Where it is here |
| :--- | :--- |
| 1 — App → Model: messages **+ tool definitions** | `messages: input.messages`, `tools: toWireDefinitions()` |
| 2 — Model → App: `tool_calls` with `content: null` | the returned `AssistantMessage` |

**The `tool_choice` translation** — chapter 07 §07.2. The internal type is
`'auto' | 'required' | 'none' | { name }`; the wire wants a string or `{ type: 'function', function: { name } }`.
Normalising here, in one place, is why the controller and the engine never see a provider-specific shape
(chapter 03 §03.7's adapter lesson).

**The normalisation of `choice.message`** — the most important ten lines in the file:

```ts
content: choice?.message?.content ?? null,
tool_calls: choice?.message?.tool_calls?.map((call) => ({
  id: call.id,
  name: call.function.name,
  arguments: call.function.arguments,
})),
```

- `?? null` — chapter 03 §03.3.2. A proposal turn returns `content: null`. Normalising it here means the engine
  never has to defend against `undefined` *and* `null`.
- `arguments: call.function.arguments` — **kept as a string.** It is tempting to `JSON.parse` it here. Do not:
  the raw string is the artefact that explains a validation failure (chapter 06 §06.5), and parsing here would
  also crash on the very responses this lab is designed to survive.
- The mapping is deliberately explicit rather than spreading `...call.function`, so a provider adding a field
  cannot leak it into the engine.

**`usage` with a fallback** — `completion.usage?.prompt_tokens ?? estimate(...)`. Chapter 08 §08.6.3: usage is
not always reported, so the ledger degrades to an estimate rather than to `NaN`.

---

## 5.2 `src/lib/llm.ts` (full file — part 2 of 3: the OFFLINE stub's helpers)

```ts
// ---------------------------------------------------------------------------
// OFFLINE mode — a deterministic stand-in, NOT a model (chapter 03 §03.1)
// ---------------------------------------------------------------------------

/**
 * It exists for one reason: to prove that the PROTOCOL works. It reads the same
 * message array a real model reads and returns the same normalized shape — a
 * proposal, or prose. Put a real key in the .env and nothing else in the codebase
 * changes.
 *
 * It deliberately covers the cases the notes and the routing fixtures use:
 * one hop, a sequential 2-hop chain, a parallel batch, an error that needs
 * self-healing, a Tier 3 action that needs approval, and "no tool at all".
 */

type ParsedResult = { status?: string; code?: string; message?: string; data?: Record<string, unknown> };

const safeParse = (raw: string): ParsedResult => {
  try {
    return JSON.parse(raw) as ParsedResult;
  } catch {
    return {};
  }
};

const lastUserMessage = (messages: Message[]): string =>
  [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

const calledTools = (messages: Message[]): Set<string> =>
  new Set(
    messages
      .filter((message): message is Extract<Message, { role: 'assistant' }> => message.role === 'assistant')
      .flatMap((message) => (message.tool_calls ?? []).map((call) => call.name)),
  );

const toolResults = (messages: Message[]): ParsedResult[] =>
  messages
    .filter((message): message is Extract<Message, { role: 'tool' }> => message.role === 'tool')
    .map((message) => safeParse(message.content));

let offlineCallCounter = 0;

/** A proposal, in exactly the shape a provider returns (chapter 03 §03.3.2). */
const propose = (calls: { name: string; args: Record<string, unknown> }[]): AssistantMessage => ({
  role: 'assistant',
  content: null,
  tool_calls: calls.map((call) => ({
    id: `call_offline_${++offlineCallCounter}`,
    name: call.name,
    arguments: JSON.stringify(call.args),
  })),
});

/** Prose, i.e. `finish_reason: "stop"` — the loop's termination condition. */
const answer = (content: string): AssistantMessage => ({ role: 'assistant', content });

const firstNumber = (text: string): number | undefined => {
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
};

const cityFrom = (text: string): string | undefined =>
  text.match(/\b(?:in|at|for)\s+([A-Z][a-zA-Z]{2,})/)?.[1];

const invoiceFrom = (text: string): string | undefined => text.match(/INV-\d{4,10}/)?.[0];

/** Chapter 07 §07.2 — `none` disables tools entirely; a named tool is forced. */
const applyToolChoice = (choice: ToolChoice, calls: { name: string; args: Record<string, unknown> }[]) => {
  if (choice === 'none') return [];
  if (typeof choice === 'object') {
    const forced = calls.find((call) => call.name === choice.name);
    return forced ? [forced] : [];
  }
  return calls;
};
```

### Block by block

**Why a stub at all?** Because every claim in this lecture is a claim about the *protocol*, not about model
intelligence. A stub that reads the message array and returns the same normalised shape lets you exercise
chapter 03's five steps, chapter 05's brakes, chapter 06's self-healing, chapter 07's fixtures and chapter 08's
ledger — with no key, no spend, and perfectly reproducible results. Lecture 07's offline mode is the precedent.

**`ParsedResult` + `safeParse`** — the stub reads tool results back out of the history, and a tool result is a
string. Note it uses its own guarded parse rather than `JSON.parse`: the stub must not crash on a malformed
result, for the same reason the engine must not.

**`lastUserMessage`** — the stub is *stateless*: it re-derives the goal from the array it was handed. That is
chapter 06's "the model has no memory; the app reconstructs it every turn", demonstrated rather than asserted.

**`calledTools`** — the set of tool names already proposed. This is what makes the stub a *loop* rather than a
repeater: a rule like "if the user wants a conversion and `convertCurrency` has not been called, propose it"
must not fire twice, or the repeated-call brake would (correctly) halt the run.

**`toolResults`** — the observations. The stub reads `status`, `code` and `data` from them exactly as a real
model would, which is why the error path works: a `DIVISION_BY_ZERO` observation is what triggers self-healing.

**`propose()` and `answer()`** — the two possible return shapes, and they map one-to-one onto chapter 03 §03.3:

| Helper | `finish_reason` | What the engine does |
| :--- | :--- | :--- |
| `propose([...])` | `tool_calls` | append the message, execute the batch, loop |
| `answer('...')` | `stop` | append the message, terminate, return the answer |

Note `propose` emits `content: null` and stringifies `arguments` — the stub is *faithful to the wire format*,
including its most awkward detail.

**`firstNumber` / `cityFrom` / `invoiceFrom`** — the extraction the real model does implicitly. They exist so
the fixtures in chapter 07 can assert on real arguments (`{city: 'Delhi'}`, `{invoiceId: 'INV-1024'}`) rather
than on placeholders.

**`applyToolChoice`** — chapter 07 §07.2's four policies, honoured in offline mode:

- `none` → return `[]`, so the caller produces prose. This is how the negative fixtures pass.
- `{ name }` → keep only the named call, or nothing if the plan does not contain it.
- `'auto'` / `'required'` → pass the plan through.

The comment on the caller — *"the policy still applies in offline mode, so the routing behaviour you test is the
routing behaviour you ship"* — is the reason this function exists instead of being skipped offline.

---

## 5.3 `src/lib/llm.ts` (full file — part 3a of 3: the stub's decision function)

```ts
/**
 * The stub's decision function: read the state, return a proposal or prose.
 *
 * Notice it is STATELESS — everything it "knows" is in the message array it was
 * handed. That is the real lesson of chapter 06: the model has no memory, the
 * application reconstructs the world every turn.
 */
const offlineModel = (messages: Message[], choice: ToolChoice): AssistantMessage => {
  const goal = lastUserMessage(messages);
  const text = goal.toLowerCase();
  const results = toolResults(messages);
  const called = calledTools(messages);

  // (1) Self-healing — react to the most recent error observation (chapter 06 §06.6).
  const lastError = [...results].reverse().find((result) => result.status === 'error');
  if (lastError) return answer(`I could not complete that — ${lastError.code}: ${lastError.message}`);

  // Pull the observations out of the history, by shape (chapter 04 §04.8 — typed keys).
  const dataOf = (test: (data: Record<string, unknown>) => boolean) =>
    results.find((result) => result.data && test(result.data))?.data;

  const weather = dataOf((data) => typeof data.temperatureCelsius === 'number');
  const currency = dataOf((data) => typeof data.convertedAmount === 'number');
  const invoice = dataOf((data) => typeof data.invoiceId === 'string' && typeof data.status === 'string');
  const task = dataOf((data) => typeof data.taskId === 'string');
  const computed = dataOf((data) => typeof data.result === 'number');

  const wantsSplit = /(divide|split|among|between|equally|each)/.test(text);

  // (2) Compose the final answer once the observations are sufficient.
  //     Order matters: the combined case must come before the single-tool cases.
  if (weather && currency) {
    return answer(
      `${weather.city} is currently ${weather.temperatureCelsius}°C with ${weather.condition} (as of ${weather.asOf}). ` +
        `And ${currency.sourceAmount} ${currency.sourceCurrency} is about ${currency.convertedAmount} ${currency.targetCurrency} ` +
        `at a rate of ${currency.exchangeRate}.`,
    );
  }
  if (currency && wantsSplit && computed) {
    return answer(
      `${currency.sourceAmount} ${currency.sourceCurrency} is about ${currency.convertedAmount} ${currency.targetCurrency} ` +
        `at a rate of ${currency.exchangeRate}. Split equally, each share is ${computed.result}.`,
    );
  }
  if (currency && called.has('convertCurrency') && !wantsSplit) {
    return answer(
      `${currency.sourceAmount} ${currency.sourceCurrency} converts to about ${currency.convertedAmount} ${currency.targetCurrency} ` +
        `at a rate of ${currency.exchangeRate} (as of ${currency.asOf}).`,
    );
  }
  if (weather && called.has('getCurrentWeather')) {
    return answer(
      `${weather.city} is currently ${weather.temperatureCelsius}°C with ${weather.condition}, ` +
        `humidity ${weather.humidityPercentage}% and wind ${weather.windSpeedKmh} km/h (as of ${weather.asOf}).`,
    );
  }
  if (invoice && called.has('getInvoiceStatus')) {
    return answer(`Invoice ${invoice.invoiceId} is ${invoice.status}: ${invoice.amount} ${invoice.currency}.`);
  }
  if (task && called.has('createTask')) {
    return answer(`Created task ${task.taskId}: "${task.title}"${task.dueDate ? ` due ${task.dueDate}` : ''}.`);
  }
  if (computed && called.has('calculate')) {
    return answer(`The result is ${computed.result}.`);
  }

  // (3) Otherwise plan the next call — the "reasoning" a real model would do.
  //     `!called.has(...)` is what makes this a loop rather than a repeat.
  const withoutInvoice = text.replace(/inv-\d{4,10}/g, ' ');
  const amount = firstNumber(withoutInvoice);
  const invoiceId = invoiceFrom(goal);
  const numbers = withoutInvoice.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const operation = /(multipl|times|product)/.test(text)
    ? 'multiply'
    : /(divid|quotient)/.test(text)
      ? 'divide'
      : /(plus|add|sum|total)/.test(text)
        ? 'add'
        : /(minus|subtract|difference)/.test(text)
          ? 'subtract'
          : undefined;

  const plan: { name: string; args: Record<string, unknown> }[] = [];

  if (/refund/.test(text) && invoiceId && amount !== undefined) {
    plan.push({ name: 'refundPayment', args: { invoiceId, amount } });
  } else if (/(remind|task|todo|to-do)/.test(text)) {
    plan.push({
      name: 'createTask',
      args: { title: goal.slice(0, 110), priority: /(urgent|asap|high)/.test(text) ? 'high' : 'medium' },
    });
  } else {
    const wantsWeather = /(weather|temperature|rain|hot|cold|humid)/.test(text);
    const wantsCurrency = /(convert|rupee|inr|dollar|usd|eur|gbp|exchange|rate)/.test(text);
    const city = cityFrom(goal);

    if (wantsWeather && city && !called.has('getCurrentWeather')) {
      plan.push({ name: 'getCurrentWeather', args: { city } });
    }
    if (wantsCurrency && amount !== undefined && !called.has('convertCurrency')) {
      const to = /(rupee|inr)/.test(text) ? 'INR' : /(dollar|usd)/.test(text) ? 'USD' : 'INR';
      plan.push({ name: 'convertCurrency', args: { amount, from: to === 'INR' ? 'USD' : 'INR', to } });
    }
    if (!plan.length && invoiceId && !called.has('getInvoiceStatus')) {
      plan.push({ name: 'getInvoiceStatus', args: { invoiceId } });
    }
    // A conversion + divide is a CHAIN (branch 4), not two independent arithmetic hops:
    // the divisor must come from hop 1's OBSERVATION, not from the user's sentence.
    if (!plan.length && !wantsCurrency && operation && numbers.length >= 2 && !called.has('calculate')) {
      plan.push({ name: 'calculate', args: { operation, a: numbers[0], b: numbers[1] } });
    }
  }

  // (4) A sequential chain: hop 1 produced the total, hop 2 divides it.
  //     This is chapter 05 §05.2 — hop 2's arguments are generated FROM hop 1's
  //     observation, which is the only reason the chain can be grounded.
  if (!plan.length && currency && wantsSplit) {
    const shareCount = Number(text.match(/among\s+(\d+)/)?.[1] ?? text.match(/(\d+)\s+people/)?.[1] ?? 6);
    plan.push({ name: 'calculate', args: { operation: 'divide', a: currency.convertedAmount, b: shareCount } });
  }

  const allowed = applyToolChoice(choice, plan);
  if (!allowed.length) {
    // Chapter 07 §07.3 — answering WITHOUT a tool is a behaviour too, and the one
    // most teams forget to test (the `none` row of the confusion matrix).
    return answer(
      'I do not need a tool for that. Ask me for arithmetic, live weather, a currency conversion, ' +
        'an invoice lookup, or a task to track, and I will call the right tool.',
    );
  }

  return propose(allowed);
};
```

### Block by block

**The header comment is the lesson.** *"Notice it is STATELESS."* Every input comes from the `messages` array —
no closure state, no cache, no memory. That is chapter 06's central claim, made falsifiable: delete a `tool`
message from the array and this stub behaves exactly like a model that never saw the result.

**Step (1) — the error short-circuit.** If any observation carries `status: 'error'`, the stub answers instead of
proposing again. That is chapter 06 §06.6.3's **Level 3 self-healing** (goal adjustment), and it is why
*"What is 50 divided by 0?"* terminates in two hops with an honest explanation instead of looping:

```text
step 1 : calculate -> error DIVISION_BY_ZERO
ANSWER : "I could not complete that — DIVISION_BY_ZERO: Division by zero is undefined. Provide a non-zero denominator."
```

**`dataOf(test)` — reading observations by shape.** Note the predicates test the *keys*, not the tool name:
`typeof data.temperatureCelsius === 'number'`, `typeof data.convertedAmount === 'number'`. This is chapter 04
§04.8's "self-describing keys with units" paying off: the stub recognises a weather result without knowing which
tool produced it, because the result describes itself.

**Step (2) — composition, and why the order matters.** Seven branches, ordered so the *combined* case is checked
before the single-tool cases:

```text
1. weather && currency        -> both, in one sentence   (the parallel batch)
2. currency && split && sum   -> the 2-hop chain's answer
3. currency && !split         -> the single conversion
4. weather                    -> the single forecast
5. invoice                    -> the invoice status
6. task                       -> the created task
7. computed                   -> the arithmetic result
```

If branch 3 came first, the parallel batch in fixture `p1` would answer with the currency only and silently drop
the weather. That is a real class of bug in agent composition — and the fixture set in chapter 07 is what catches
it.

**Step (3) — planning, and the `!called.has(...)` guards.** Each push is guarded so a tool is never proposed
twice. Without those guards the stub would re-propose `convertCurrency` on hop 2, and chapter 05 §05.7.1's
**repeated-call brake** would (correctly) halt the run as `noProgress`. The guards are what make this a loop.

**The `!wantsCurrency` guard — the bug this lab found.** The first version of the arithmetic branch read:

```ts
if (!plan.length && operation && numbers.length >= 2 && !called.has('calculate')) {
  plan.push({ name: 'calculate', args: { operation, a: numbers[0], b: numbers[1] } });
}
```

For *"Convert $120 into Indian rupees and then divide that amount equally among 6 people"*, `numbers` is
`[120, 6]`, so hop 2 became `calculate(divide, 120, 6)` — using the **user's** 120 instead of hop 1's
observation — and the answer was "each share is 20". The fix was one condition:

```ts
if (!plan.length && !wantsCurrency && operation && numbers.length >= 2 && !called.has('calculate')) {
```

With `!wantsCurrency`, a conversion-plus-divide falls through to branch (4), which reads
`currency.convertedAmount`. Verified result:

```text
step 2: calculate({"operation":"divide","a":10020,"b":6}) -> ok      (not 120)
ANSWER: "120 USD is about 10020 INR at a rate of 83.5. Split equally, each share is 1670."
```

That is the lecture's thesis as a bug report: **the arguments of hop 2 must come from hop 1's observation, and
nothing else.** Any shortcut that reads them from the user's sentence reintroduces the hallucination the tool was
supposed to remove.

**Step (4) — the chain.** Only reached when the plan is empty and a conversion is already in hand. The dividend
comes from the *observation* (`currency.convertedAmount`); the divisor comes from the sentence
(`among 6`, `6 people`, default 6). That split is exactly right: the user supplies the *intent*, the tool
supplies the *number*.

**The negative case.** If `plan` is still empty, the stub returns prose. Chapter 07 §07.3 names this the
most-forgotten behaviour — and the `none` row of the confusion matrix exists precisely to measure it.

**`applyToolChoice(choice, plan)` is applied last.** The policy is a *constraint on the output*, not an input to
the reasoning — which is also how the real API treats it. `none` can suppress a correctly built plan; `{ name }`
can force one the plan happens to contain.

---

**Next:** [Chapter 06 — The Agent Loop, the Brakes & the Trace](./06_The_Agent_Loop_Brakes_and_the_Trace.md)

```
