import OpenAI from 'openai';
import { config } from '../config/config.js';
import { toWireDefinitions } from '../services/registry.service.js';
import type { AssistantMessage, Message, ToolCall } from '../types/agent.types.js';

/**
 * Chapter 02 §02.2.1 — the one place that talks to a model.
 *
 * This file implements exactly one side of the architecture: it sends the message
 * array plus the tool definitions and returns a PROPOSAL. It executes nothing.
 * That is the whole point — the model proposes; the runtime executes.
 */

const client = new OpenAI({
  apiKey: config.AI_API_KEY || 'not-needed', // Ollama runs locally and needs none
  baseURL: config.AI_ENDPOINT,
  maxRetries: 0,
  timeout: 60_000,
});

/**
 * Chapter 02 §02.2.1 / chapter 03 §03.1 — with no provider key the lab runs in
 * OFFLINE mode. A deterministic stub stands in for the model, so the whole system
 * (the state machine, the four brakes, the trace, the ledger, the tier gate, the
 * durable HITL resume and RBAC) is studyable with zero spend.
 */
export const isOffline = (): boolean => config.AI_PROVIDER !== 'ollama' && !config.AI_API_KEY;

/** Chapter 04 §04.4 — the ±10-15% estimator: characters ÷ average chars-per-token. */
export const estimate = (text: string): number => Math.ceil(text.length / 4);

export const estimateMessages = (messages: Message[]): number =>
  messages.reduce((sum, message) => {
    const calls =
      message.role === 'assistant' ? (message.tool_calls ?? []).map((call) => call.arguments).join('') : '';
    return sum + estimate(message.content ?? '') + estimate(calls);
  }, 0);

/** Chapter 02 §02.2.1 — tool definitions are re-sent and billed on EVERY turn. */
export const definitionTokens = (): number => estimate(JSON.stringify(toWireDefinitions()));

export interface ModelStepResult {
  message: AssistantMessage;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Chapter 03 §03.2 — one model call: the message array in, a proposal out.
 *
 * `tools` is the ROLE-FILTERED registry (chapter 08 §08.2.2). A learner's agent
 * literally never receives the `refundCustomer` definition.
 */
export const modelStep = async (input: {
  messages: Message[];
  tools: ReturnType<typeof toWireDefinitions>;
}): Promise<ModelStepResult> => {
  if (isOffline()) {
    const message = offlineModel(input.messages);
    return {
      message,
      usage: {
        inputTokens: estimateMessages(input.messages) + estimate(JSON.stringify(input.tools)),
        outputTokens: estimate(message.content ?? '') + estimate(JSON.stringify(message.tool_calls ?? [])),
      },
    };
  }

  const completion = await client.chat.completions.create({
    model: config.AI_MODEL,
    messages: input.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    tools: input.tools as OpenAI.Chat.ChatCompletionTool[],
    tool_choice: 'auto',
    temperature: config.AI_TEMPERATURE,
  });

  const choice = completion.choices[0];
  const raw = choice.message;

  // Chapter 03 §03.3 — normalize. `arguments` stays a STRING until the runtime
  // validates it (chapter 03 §03.9 — never trust tool arguments).
  const message: AssistantMessage = {
    role: 'assistant',
    content: raw.content ?? null,
    tool_calls: (raw.tool_calls ?? []).map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments,
    })),
  };

  return {
    message,
    usage: {
      inputTokens: completion.usage?.prompt_tokens ?? estimateMessages(input.messages),
      outputTokens: completion.usage?.completion_tokens ?? estimate(message.content ?? ''),
    },
  };
};

// ---------------------------------------------------------------------------
// The OFFLINE stub — a deterministic stand-in for the model.
// ---------------------------------------------------------------------------

type Observation = { status?: string; code?: string; message?: string; data?: unknown; approvalId?: string };

const firstUser = (messages: Message[]): string => {
  const found = messages.find((message) => message.role === 'user');
  return found ? found.content : '';
};

/** Which tools have already been proposed? This is what makes the stub a LOOP. */
const calledNames = (messages: Message[]): Set<string> =>
  new Set(
    messages.flatMap((message) =>
      message.role === 'assistant' ? (message.tool_calls ?? []).map((call) => call.name) : [],
    ),
  );

const lastObservation = (messages: Message[]): Observation | null => {
  const last = [...messages].reverse().find((message) => message.role === 'tool');
  if (!last) return null;
  try {
    return JSON.parse(last.content) as Observation;
  } catch {
    return null;
  }
};

const propose = (calls: { name: string; args: Record<string, unknown> }[]): AssistantMessage => ({
  role: 'assistant',
  content: null,
  tool_calls: calls.map((call, index) => ({
    id: `call_${Date.now()}_${index}`,
    name: call.name,
    arguments: JSON.stringify(call.args),
  })) as ToolCall[],
});

const answer = (content: string): AssistantMessage => ({ role: 'assistant', content });

const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const projectName = (goal: string): string => {
  const named = goal.match(/(?:called|named|for)\s+([A-Za-z][A-Za-z0-9]*)/);
  if (named) return slugify(named[1]);
  const capitalised = goal.match(/\b([A-Z][a-zA-Z0-9]{2,})\b/);
  return capitalised ? slugify(capitalised[1]) : 'site';
};

/** Longest-first alternation: `json` must be tried before `js`, or `users.json` matches `users.js`. */
const FILE_EXTENSIONS = 'json|html|css|txt|md|js';

const fileNameIn = (text: string): string | undefined =>
  text.match(new RegExp(`(?:[\\w.-]+/)*[\\w.-]+\\.(?:${FILE_EXTENSIONS})`))?.[0];

/** How many times has this tool been proposed? Used to bound a self-heal retry. */
const attemptsOf = (messages: Message[], toolName: string): number =>
  messages
    .flatMap((message) => (message.role === 'assistant' ? (message.tool_calls ?? []) : []))
    .filter((call) => call.name === toolName).length;

const orderIdIn = (text: string): string | undefined => text.match(/(?:order|#)\s*#?(\d{1,10})/)?.[1];

const amountIn = (text: string): number | undefined => {
  const cleaned = text.replace(/(?:order|#)\s*#?\d{1,10}/g, ' ').replace(/\b(?:19|20)\d{2}\b/g, ' ');
  const numbers = cleaned.match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => Number(value.replace(/,/g, ''))) ?? [];
  return numbers.length ? Math.max(...numbers) : undefined;
};

const operationIn = (text: string): 'add' | 'subtract' | 'multiply' | 'divide' | undefined => {
  if (/(multipl|times|product)/.test(text)) return 'multiply';
  if (/(divid|quotient|split)/.test(text)) return 'divide';
  if (/(plus|add|sum|total)/.test(text)) return 'add';
  if (/(minus|subtract|difference)/.test(text)) return 'subtract';
  return undefined;
};

/** §06.2 — the job description the website-builder agent runs on. */
export const WEBSITE_BUILDER_SYSTEM_PROMPT = `You are a website builder agent.
You have exactly four tools: createDirectory, writeFile, readFile and listFiles.
Work in small steps: scaffold, produce, then VERIFY by reading back what you wrote.
Never write outside your workspace. If a tool denies you, explain it and stop.`;

/**
 * Chapter 03 §03.1 — the stub returns the same normalised shape a provider would:
 * either a set of `tool_calls` (a proposal) or a final `content` (an answer).
 */
const offlineModel = (messages: Message[]): AssistantMessage => {
  const goal = firstUser(messages);
  const text = goal.toLowerCase();
  const called = calledNames(messages);
  const observation = lastObservation(messages);

  // ---- 0. A successful observation we can already report on ---------------
  if (observation && observation.status === 'ok') {
    const data = observation.data;
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      // §07.4.1 step 5 — the resumption path. The loop continues so the agent can
      // EXPLAIN the human's decision, which is the whole point of the fifth step.
      if ('refunded' in record) {
        return answer(
          `The refund of ${record.amount} for order ${record.orderId} was approved by a human and executed once. Idempotency key: ${record.idempotencyKey}.`,
        );
      }
      if ('deployed' in record) {
        return answer(`Deployed ${record.siteName} to production at ${record.url}.`);
      }
      if ('result' in record) {
        return answer(`The result is ${record.result}.`);
      }
    }
  }

  // ---- 1. React to the previous observation (chapter 03 §03.10) ------------
  if (observation && observation.status === 'error') {
    const code = observation.code ?? 'ERROR';
    const message = observation.message ?? '';

    // The security lesson: a sandbox denial is NOT retried. It is explained.
    if (
      ['OUTSIDE_WORKSPACE', 'SYMLINK_ESCAPE', 'DENIED_NAME', 'PATH_TOO_LONG', 'INVALID_PATH', 'ENCODED_TRAVERSAL'].includes(
        code,
      )
    ) {
      return answer(
        `That call was refused by the sandbox (${code}): ${message} I can only act inside your own workspace, so I stopped instead of trying another path.`,
      );
    }
    if (code === 'AUTHZ_DENIED') {
      return answer(
        `I could not do that: ${message} Authorization is decided by the application, not by me, so I cannot talk my way past it.`,
      );
    }
    if (code === 'APPROVAL_REQUIRED' || code === 'PENDING_APPROVAL') {
      return answer(
        `That is a Tier 3 action, so it needs a human. ${message} I have raised an approval ticket and paused here.`,
      );
    }
    if (code === 'APPROVAL_DENIED') {
      // §07.4.1 — a rejection is an OBSERVATION, not an error. The loop resumes so
      // the user gets a professional reason instead of silence.
      return answer(`A human declined that action: ${message} I will not retry it.`);
    }
    if (code.startsWith('QUOTA_')) {
      return answer(`The workspace quota stopped me: ${message} I will stop rather than retry.`);
    }

    // §03.10.1 — the self-healing example, exactly as the notes describe it.
    if (code === 'FILE_NOT_FOUND' || code === 'DIR_NOT_FOUND') {
      const wanted = fileNameIn(message);
      const retry = wanted && !wanted.startsWith('data/') ? `data/${wanted}` : null;
      // Bound the retry: one correction, then explain. §03.11 — recovery is not
      // unlimited retry, and the loop's own repetition brake would stop it anyway.
      if (retry && attemptsOf(messages, 'readFile') < 2) {
        return propose([{ name: 'readFile', args: { path: retry } }]);
      }
      return answer(`I could not find that: ${message} Listing the workspace would tell me what does exist.`);
    }

    return answer(`That failed with ${code}: ${message}`);
  }

  // ---- 2. Tier 3 first: these are the calls a human may have to release ----
  if (/refund/.test(text) && !called.has('refundCustomer')) {
    const orderId = orderIdIn(text) ?? 'unknown';
    const amount = amountIn(text) ?? 0;
    return propose([{ name: 'refundCustomer', args: { orderId, amount, reason: 'customer request' } }]);
  }
  if (/(deploy|ship it|go live|push to prod)/.test(text) && !called.has('deployToProduction')) {
    return propose([{ name: 'deployToProduction', args: { siteName: projectName(goal) } }]);
  }

  // ---- 3. Explicit perception requests -------------------------------------
  const wantedFile = fileNameIn(text);
  if (wantedFile && /(read|open|show|inspect|verify|check|cat)/.test(text) && !called.has('readFile')) {
    return propose([{ name: 'readFile', args: { path: wantedFile } }]);
  }
  if (/(list|what files|show files|what is in|structure)/.test(text) && !called.has('listFiles')) {
    return propose([{ name: 'listFiles', args: { path: '.' } }]);
  }

  // ---- 4. The website-builder sequence (chapter 06 §06.5) ------------------
  if (/(create|build|make|generate|landing page|website|web page|site|html)/.test(text)) {
    const project = projectName(goal);
    if (!called.has('createDirectory')) return propose([{ name: 'createDirectory', args: { path: project } }]);
    if (!called.has('writeFile')) {
      const html = [
        '<!doctype html>',
        '<html lang="en">',
        '  <head>',
        '    <meta charset="utf-8" />',
        `    <title>${project}</title>`,
        '    <link rel="stylesheet" href="styles.css" />',
        '  </head>',
        '  <body>',
        `    <h1>${project}</h1>`,
        '    <p>Generated by the Lecture 09 autonomous website-builder agent.</p>',
        '  </body>',
        '</html>',
      ].join('\n');
      return propose([{ name: 'writeFile', args: { path: `${project}/index.html`, content: html } }]);
    }
    if (!called.has('readFile')) {
      // §06.6 — the environmental feedback loop. Without readFile the agent is
      // blind after writing; with it, it can verify and repair.
      return propose([{ name: 'readFile', args: { path: `${project}/index.html` } }]);
    }
    if (!called.has('listFiles')) return propose([{ name: 'listFiles', args: { path: project } }]);
    return answer(
      `Built the ${project} site: ${project}/index.html plus a stylesheet reference, then read the file back to verify it. Everything lives inside your sandbox.`,
    );
  }

  // ---- 6. A read we already completed: report the observation --------------
  if (called.has('readFile') && observation?.status === 'ok' && typeof observation.data === 'string') {
    // §05.3 vector 4 — the content is labelled untrusted data and treated as data.
    return answer(
      `I read it back. The contents came through as untrusted data, so I am treating them as data and not as instructions:\n${observation.data.slice(0, 400)}`,
    );
  }

  // ---- 7. Arithmetic (chapter 01 §01.2 Level 2) ----------------------------
  const operation = operationIn(text);
  const numbers = text.match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => Number(value.replace(/,/g, ''))) ?? [];
  if (operation && numbers.length >= 2 && !called.has('calculate')) {
    return propose([{ name: 'calculate', args: { operation, a: numbers[0], b: numbers[1] } }]);
  }
  if (called.has('calculate')) {
    return answer('I ran the calculation and the runtime executed it. The result is in the observation above.');
  }

  return answer(
    'I do not need a tool for that. Ask me to build a site, read or list files, refund an order, deploy, or do arithmetic — and I will call the right tool.',
  );
};


