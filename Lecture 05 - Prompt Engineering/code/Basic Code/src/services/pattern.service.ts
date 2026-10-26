import type { ChatTurn, Exemplar, Finding, Pattern, Persona, PromptSlots } from '../types/prompt.types.js';
import { assembleSystem, buildUserBlock } from './hygiene.service.js';

/**
 * Chapters 02–05 — the four techniques, built from the same five slots.
 * The only difference between them is what they add to the prefix.
 */

export interface PatternInput {
  slots: PromptSlots;
  exemplars: Exemplar[];
  persona: Persona;
}

/** Chapter 05 §05.4 — render the persona: seven fields plus a fallback. */
export const renderPersona = (persona: Persona): string =>
  [
    `You are ${persona.identity}. (persona ${persona.id}@${persona.version})`,
    `EXPERTISE: ${persona.expertise.join(', ')}.`,
    `AUDIENCE: ${persona.audience}.`,
    `STYLE: ${persona.tone.join(', ')}.`,
    `RULES:\n${persona.rules.map((rule) => `- ${rule}`).join('\n')}`,
    `OUTPUT FORMAT: ${persona.outputFormat}`,
    `FALLBACK: ${persona.fallback}`,
  ].join('\n\n');

/** Chapter 02 — zero-shot: instruction + context + constraints, and NO examples. */
export const buildZeroShot = (slots: PromptSlots): string =>
  [assembleSystem(slots), buildUserBlock(slots)].filter(Boolean).join('\n\n');

/** Chapter 03 §03.8 — the same prompt plus input→output exemplars. */
export const buildFewShot = (slots: PromptSlots, exemplars: Exemplar[]): string => {
  const examples = exemplars.map((e) => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n');
  const block = examples ? `EXAMPLES:\n${examples}` : 'EXAMPLES: (none supplied)';

  return [assembleSystem(slots), block, buildUserBlock(slots)].filter(Boolean).join('\n\n');
};

/**
 * Chapter 04 §04.3 — CoT: a reasoning scaffold.
 * The scaffold is the *cheap* half of CoT; it costs output tokens, not prompt tokens.
 */
export const buildCot = (slots: PromptSlots): string =>
  [
    assembleSystem(slots),
    'REASONING:\nWork through the problem step by step, then give the final answer in the contract shape.',
    buildUserBlock(slots),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Chapter 05 §05.5 — persona + the slots; the persona is the frame, the slots are the job. */
export const buildPersonaPrompt = (persona: Persona, slots: PromptSlots): string =>
  [renderPersona(persona), assembleSystem(slots), buildUserBlock(slots)].filter(Boolean).join('\n\n');

/** Chapters 02–05 — one entry point, so the lab can compare all four. */
export const buildPatternText = (pattern: Pattern, input: PatternInput): string => {
  switch (pattern) {
    case 'few-shot':
      return buildFewShot(input.slots, input.exemplars);
    case 'cot':
      return buildCot(input.slots);
    case 'persona':
      return buildPersonaPrompt(input.persona, input.slots);
    case 'zero-shot':
    default:
      return buildZeroShot(input.slots);
  }
};

/**
 * Chapter 07 §07.4 — the same pattern, split into roles for the model call.
 * Rules (and examples, which are stable) go in `system`; untrusted DATA goes in `user`.
 */
export const buildPatternMessages = (pattern: Pattern, input: PatternInput): ChatTurn[] => {
  const rules = [assembleSystem(input.slots)];

  if (pattern === 'persona') rules.unshift(renderPersona(input.persona));
  if (pattern === 'cot') rules.push('REASONING: Work through the problem step by step, then answer in the contract shape.');
  if (pattern === 'few-shot' && input.exemplars.length > 0) {
    rules.push(`EXAMPLES:\n${input.exemplars.map((e) => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n')}`);
  }

  return [
    { role: 'system', content: rules.filter(Boolean).join('\n\n') },
    { role: 'user', content: buildUserBlock(input.slots) },
  ];
};

/**
 * Chapter 03 §03.7 — the four rules of few-shot craft, as automated checks.
 * 1 · define the task · 2 · consistent examples · 3 · cover important classes · 4 · representative examples
 */
export const checkExemplars = (exemplars: Exemplar[]): Finding[] => {
  const findings: Finding[] = [];

  if (exemplars.length === 0) {
    return [{ rule: 'few-shot:no-examples', severity: 'warn', detail: 'No exemplars supplied, so this is a zero-shot prompt.' }];
  }

  // Rule 2 · consistency: every output must have the same shape, or the model has
  // to guess which part of the demonstration is "the pattern" (chapter 03 §03.7).
  const shapes = new Set(
    exemplars.map((e) => {
      try {
        const parsed = JSON.parse(e.output) as Record<string, unknown>;
        return `json:{${Object.keys(parsed).sort().join(',')}}`;
      } catch {
        return `label:${e.output.trim().split(/\s+/).length}-word`;
      }
    }),
  );

  if (shapes.size > 1) {
    findings.push({
      rule: 'few-shot:inconsistent-shape',
      severity: 'block',
      detail: `Outputs use ${shapes.size} different shapes (${[...shapes].join(' | ')}). Make them identical.`,
    });
  }

  // Rule 3 · class coverage: every label must appear at least once (chapter 03 §03.7).
  const labels = exemplars.map((e) => e.label ?? e.output.trim().slice(0, 40));
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  if (Object.keys(counts).length === 1 && exemplars.length > 1) {
    findings.push({
      rule: 'few-shot:single-class',
      severity: 'block',
      detail: `All ${exemplars.length} examples share one class ("${labels[0]}") — the model will over-predict it.`,
    });
  }

  const [topLabel, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  const evenShare = exemplars.length / Math.max(Object.keys(counts).length, 1);

  if (topCount > 2 * evenShare) {
    findings.push({
      rule: 'few-shot:class-imbalance',
      severity: 'warn',
      detail: `Class "${topLabel}" appears ${topCount}× of ${exemplars.length} — majority bias is likely.`,
    });
  }

  // Rule 4 · representativeness: short, duplicated or synthetic inputs teach a
  // world that does not exist (chapter 03 §03.7).
  const tooShort = exemplars.filter((e) => e.input.trim().length < 12);
  if (tooShort.length > 0) {
    findings.push({
      rule: 'few-shot:unrepresentative',
      severity: 'warn',
      detail: `${tooShort.length} example input(s) are shorter than 12 chars — draw them from real traffic instead.`,
    });
  }

  if (new Set(exemplars.map((e) => e.input.trim())).size !== exemplars.length) {
    findings.push({ rule: 'few-shot:duplicate-inputs', severity: 'warn', detail: 'Two exemplars share the same input.' });
  }

  // Ordering: the last example has the strongest influence (recency, chapter 03 §03.7).
  findings.push({
    rule: 'few-shot:recency',
    severity: 'warn',
    detail: `Recency bias is real: the LAST example ("${labels.at(-1)}") carries the most weight. Put your canonical shape there.`,
  });

  return findings;
};

