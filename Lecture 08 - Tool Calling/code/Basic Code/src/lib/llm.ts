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

