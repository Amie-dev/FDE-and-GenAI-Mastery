import type { ChatFormat, Exemplar, Metrics, Pattern, PromptSlots } from '../types/prompt.types.js';
import { config } from '../config/config.js';
import { callModel } from '../lib/llm.js';
import { hasBlocking, isRefusal, scanInput, scanOutput } from './guardrail.service.js';
import { buildUserBlock, runHygieneChecklist, validateOutput } from './hygiene.service.js';
import { buildPatternMessages, buildPatternText, checkExemplars, type PatternInput } from './pattern.service.js';
import {
  GOLDEN_SET,
  GOLDEN_SET_META,
  computeMetrics,
  getPersona,
  getPrompt,
  metricsByStratum,
  regressionGate,
  type EvalRow,
} from './registry.service.js';
import { renderAll } from './template.service.js';

/**
 * Chapter 01 §01.7 — the prompt-engineering loop, as one file:
 * specify → draft → test → measure → (version) → deploy.
 */

export const PATTERNS: Pattern[] = ['zero-shot', 'few-shot', 'cot', 'persona'];

export interface LabInput {
  slots: PromptSlots;
  exemplars: Exemplar[];
  personaId: string;
}

/** Chapters 02–07 — turn the request into the shape the builders need. */
const toPatternInput = (input: LabInput): PatternInput => ({
  slots: input.slots,
  exemplars: input.exemplars,
  persona: getPersona(input.personaId),
});

/**
 * Chapters 01–07 — `POST /api/lab/preview`.
 * Everything a prompt is made of, with NO model call: the four patterns, the four
 * chat templates, the messages that would actually be sent, and the lint results.
 */
export const preview = (input: LabInput) => {
  const patternInput = toPatternInput(input);
  const messages = buildPatternMessages('zero-shot', patternInput);
  const data = buildUserBlock(input.slots);

  // Chapter 08 — the untrusted slot is screened before it could ever be sent.
  const inputFindings = scanInput(input.slots.context ?? '');

  const patterns = Object.fromEntries(
    PATTERNS.map((pattern) => [pattern, buildPatternText(pattern, patternInput)]),
  ) as Record<Pattern, string>;

  // Chapter 07 §07.9 — the hygiene checklist, run over the prompt that would ship.
  const hygiene = runHygieneChecklist(patterns['few-shot']);

  return {
    messages,
    templates: renderAll(messages) as Record<ChatFormat, string>,
    patterns,
    hygiene,
    exemplarRules: checkExemplars(input.exemplars),
    guardrails: { input: inputFindings, blocked: hasBlocking(inputFindings) },
    untrustedDataIsDelimited: data.includes('</data>'),
    config: {
      provider: config.AI_PROVIDER,
      model: config.AI_MODEL,
      temperature: config.AI_TEMPERATURE,
      maxInputChars: config.MAX_INPUT_CHARS,
    },
  };
};

/** Chapter 09 §09.6 — one model call, turned into one evaluation row. */
const runCase = async (
  pattern: Pattern,
  patternInput: PatternInput,
  testCase: (typeof GOLDEN_SET)[number],
): Promise<{ row: EvalRow; raw: string }> => {
  const messages = buildPatternMessages(pattern, {
    ...patternInput,
    // The golden-set case is the untrusted data for this run (chapter 07 §07.4).
    slots: { ...patternInput.slots, context: testCase.input },
  });

  const result = await callModel(messages);
  const validation = validateOutput(result.text);
  const safety = scanOutput(result.text);
  const refused = isRefusal(result.text);

  return {
    raw: result.text,
    row: {
      caseId: testCase.id,
      stratum: testCase.stratum,
      formatValid: validation.ok,
      correct: validation.ok && validation.value?.category === testCase.expectedCategory,
      refused,
      // Chapter 08 §08.11 — the injection only "worked" if the token reached the output.
      injected: testCase.injectedToken ? result.text.includes(testCase.injectedToken) : false,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  };
};

export interface CompareRow {
  pattern: Pattern;
  metrics: Metrics;
  gate: { ok: boolean; fails: string[] };
  samples: { caseId: string; output: string; valid: boolean }[];
}

/**
 * Chapters 02–05 + 09 — `POST /api/lab/compare`.
 * The roadmap's Build task: the same task solved four ways, with a side-by-side
 * comparison table and the regression gate applied to each variant.
 */
export const compare = async (input: LabInput): Promise<{ goldenSet: typeof GOLDEN_SET_META; rows: CompareRow[] }> => {
  const patternInput = toPatternInput(input);
  const rows: CompareRow[] = [];

  for (const pattern of PATTERNS) {
    const results = [];

    for (const testCase of GOLDEN_SET) {
      results.push(await runCase(pattern, patternInput, testCase));
    }

    const metrics = computeMetrics(results.map((result) => result.row));

    rows.push({
      pattern,
      metrics,
      gate: regressionGate(metrics),
      samples: results.map((result) => ({
        caseId: result.row.caseId,
        output: result.raw.slice(0, 240),
        valid: result.row.formatValid,
      })),
    });
  }

  return { goldenSet: GOLDEN_SET_META, rows };
};

/** Chapters 07 + 08 — `POST /api/audit`: lint a prompt and screen its data and output. */
export const audit = (input: { prompt: string; untrustedData?: string; output?: string }) => {
  const hygiene = runHygieneChecklist(input.prompt);
  const inputFindings = input.untrustedData ? scanInput(input.untrustedData) : [];
  const outputFindings = input.output ? scanOutput(input.output) : [];

  return {
    hygiene,
    guardrails: { input: inputFindings, output: outputFindings },
    blocked: hasBlocking([...hygiene, ...inputFindings, ...outputFindings]),
  };
};

/**
 * Chapter 09 §09.5–§09.8 — `POST /api/eval/run`.
 * Run one registry version over the frozen golden set, then apply the gate.
 */
export const evaluate = async (promptId: string, version?: string) => {
  const record = getPrompt(promptId, version);

  if (!record) {
    throw Object.assign(
      new Error(`No registry entry for prompt "${promptId}"${version ? `@${version}` : ''}.`),
      { status: 404 },
    );
  }

  const patternInput: PatternInput = {
    slots: record.slots,
    exemplars: record.exemplars ?? [],
    persona: getPersona(record.personaId ?? 'support-triage'),
  };

  const rows: EvalRow[] = [];

  for (const testCase of GOLDEN_SET) {
    const { row } = await runCase(record.pattern, patternInput, testCase);
    rows.push(row);
  }

  const metrics = computeMetrics(rows);

  return {
    prompt: { id: record.id, version: record.version, status: record.status, pattern: record.pattern },
    goldenSet: GOLDEN_SET_META,
    metrics,
    byStratum: metricsByStratum(rows),
    gate: regressionGate(metrics),
    rows,
  };
};

