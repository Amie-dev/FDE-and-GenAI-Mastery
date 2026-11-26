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
