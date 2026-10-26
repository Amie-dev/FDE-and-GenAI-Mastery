# Chapter 02: Zero-Shot & Few-Shot Patterns

> **Chapter goal:** build the first two techniques from the same five slots — instruction-only (zero-shot) and
> demonstration-based (few-shot) — and turn the four rules of few-shot craft into automated checks.
> **Notes chapters covered:** 02 (zero-shot), 03 (few-shot, in-context learning, the four craft rules), 01 (slots).

---

## 2.1 Files created in this chapter

| File | Purpose |
| :--- | :--- |
| `src/services/hygiene.service.ts` | **starts here.** The two helpers every builder needs: `assembleSystem()` and `buildUserBlock()` |
| `src/services/pattern.service.ts` | the four pattern builders + the four craft-rule checks |

> [!NOTE]
> `hygiene.service.ts` is chapter 07's file. Only its first two exported helpers are needed to build a prompt, so
> they are shown here; the complete file — contradictions, contract and the validation ladder — is in
> [chapter 05](./05_Prompt_Hygiene_and_Output_Contract.md).

---

## 2.2 The two helpers the builders depend on

These live in `src/services/hygiene.service.ts`:

```ts
/**
 * Chapter 01 §01.2 + chapter 07 §07.4 — build the trusted part of the prompt.
 * The five slots, in the canonical order, with the untrusted slot left out.
 */
export const assembleSystem = (slots: PromptSlots): string =>
  [
    slots.role ? `ROLE:\n${slots.role}` : '',
    `TASK:\n${slots.task}`,
    slots.constraints?.length
      ? `CONSTRAINTS:\n${slots.constraints.map((rule) => `- ${rule}`).join('\n')}`
      : '',
    slots.contract ? `OUTPUT CONTRACT:\n${slots.contract}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** Chapter 07 §07.4 — untrusted data goes LAST, and only here. */
export const buildUserBlock = (slots: PromptSlots): string =>
  slots.context ? `DATA:\n${delimit(slots.context)}` : '';
```

### Block by block

**`assembleSystem`** — chapter 01's five slots, minus the untrusted one, in the canonical order
`role → task → constraints → contract`.

| Detail | Why |
| :--- | :--- |
| `slots.role ? ... : ''` | Slot 1 is optional. An empty string is filtered out later, so no blank `ROLE:` header appears |
| `TASK` is unconditional | Slot 2 is required by the `PromptSlots` type, so it is always emitted |
| `slots.constraints?.length` | Only emit the block when there is at least one rule — an empty `CONSTRAINTS:` header invites the model to invent one |
| `.filter(Boolean).join('\n\n')` | Removes the empty strings, then separates blocks with a blank line so the prompt is readable in logs |
| **`context` is absent** | Slot 3 is deliberately *not* here. It is the untrusted slot and it belongs in `buildUserBlock` only |

**`buildUserBlock`** — wraps slot 3 in the `delimit()` helper (chapter 07 §07.3) and labels it `DATA:`. If there is
no context, it returns `''` rather than an empty block.

Why the split matters: `assembleSystem()` output is **trusted and stable** (cacheable prefix), while
`buildUserBlock()` output is **untrusted and variable**. Keeping them as two functions means no caller can
accidentally mix them.

---

## 2.3 `src/services/pattern.service.ts` (full file, part 1 of 2)

```ts
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
```

---

## 2.4 `src/services/pattern.service.ts` (full file, part 2 of 2)

```ts
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
```

---

## 2.5 Block by block — the builders

**`PatternInput`** — the three things a pattern may need: the slots (always), exemplars (few-shot), a persona
(persona). Bundling them means every builder has the same signature shape, so the `switch` in `buildPatternText`
is a one-liner per case.

**`buildZeroShot`** — chapter 02 in one line. It is literally `assembleSystem + buildUserBlock`. There is **no
examples block at all**, which is the definition: zero-shot means *no demonstrations*, while role, constraints,
context and format are all still allowed.

**`buildFewShot`** — chapter 03 §03.8. Three differences from zero-shot:

| Line | What it does |
| :--- | :--- |
| `exemplars.map((e) => \`Input: ${e.input}\nOutput: ${e.output}\`)` | The **template function** from chapter 03 Rule 2. Because the same expression builds every example, the structure *cannot* drift between them |
| `.join('\n\n')` | Blank line between examples so the pattern is visually obvious |
| `block` placed **between** the system rules and the data | Chapter 07 §07.4 ordering: examples are stable (cacheable) content, so they belong before the variable data, not after |

**`buildCot`** — chapter 04 §04.3. One added block: `REASONING:`. Note the comment — the scaffold costs **output**
tokens, not prompt tokens, which is why CoT is cheap to add and expensive to run.

**`buildPersonaPrompt`** — chapter 05 §05.5. The persona goes **first** (it is the frame), then the slots (the
job). Putting the persona after the task makes the model answer first and dress up afterwards.

**`buildPatternText`** — the dispatcher. `case 'zero-shot': default:` means an unknown pattern degrades to the
cheapest safe option rather than throwing. This is what `/api/lab/preview` loops over.

**`buildPatternMessages`** — the same pattern, split for the model call (chapter 07 §07.4):

- `rules` accumulates the trusted content: `assembleSystem` always, plus the persona / CoT scaffold / examples.
- `rules.unshift(...)` for the persona so it lands at the very top.
- The return value is exactly **two messages**: one `system` (all trusted rules) and one `user` (the delimited
  data). This is the structural fact that makes the injection defence work — the data never shares a string with
  the rules.

---

## 2.6 Block by block — the four craft rules as code

`checkExemplars()` is chapter 03 §03.7 turned into a linter. Each block maps to one of the four rules.

**Guard — no exemplars.** Returns early with a `warn`: this is a zero-shot prompt, which is legitimate, not a bug.

**Rule 2 · consistency (`shapes`).**
For each exemplar, try to `JSON.parse` the output:

| Outcome | Shape key |
| :--- | :--- |
| Parses as JSON | `json:{category,needsHuman,severity,summary}` — the **sorted key set** |
| Does not parse | `label:2-word` — the **word count** |

`Object.keys(parsed).sort()` is the important part: sorting makes the key set order-independent, so two examples
that differ only in field order still count as the *same* shape. If the `Set` ends up with more than one member,
the examples are inconsistent → **`block`**, because the model now has to guess which part of the demonstration is
"the pattern" (chapter 03's most expensive mistake).

**Rule 3 · class coverage (`labels`, `counts`).**

- `labels` prefers the explicit `label` field and falls back to the first 40 characters of the output — so the
  check still works on raw label-style examples.
- `counts` is a `reduce` into a frequency map.
- **One class only → `block`.** This is the "your classifier never predicts NEUTRAL" bug from the notes: the model
  learns the majority label as the default.
- **Imbalance → `warn`.** `evenShare` is the count each class would have if perfectly balanced. If the top class
  exceeds twice its fair share, majority bias is likely.

**Rule 4 · representativeness.**

- `tooShort` — inputs under 12 characters. Real tickets are not two words long, so short examples teach a world
  that does not exist → `warn`.
- Duplicate inputs — two identical inputs teach nothing and waste tokens → `warn`.

**Ordering (the unofficial fifth rule).**
Unconditionally emits a `warn` naming the **last** example's label, because recency means the final example
carries the most influence. It is deliberately a `warn` and not a `block`: ordering is advice, and a linter that
blocks on advice gets disabled.

---

## 2.7 Verify

`/api/lab/preview` calls `buildPatternText` for all four patterns and `checkExemplars` for the example set. It
needs the HTTP layer from chapter 08, so for now verify with a type check and a quick node one-liner:

```bash
npm run typecheck
```

Then, once chapter 08 is in place, this request shows the zero-shot and few-shot prompts side by side plus the
craft-rule findings:

```bash
curl -s -X POST http://localhost:8080/api/lab/preview \
  -H 'Content-Type: application/json' \
  -d '{
        "slots": { "task": "Classify the support ticket and summarise it.", "context": "My card was charged twice." },
        "exemplars": [
          { "input": "My card was charged twice for the same order.", "output": "{\"category\":\"BILLING\"}", "label": "BILLING" },
          { "input": "Checkout returns a 500 error after the deploy.", "output": "{\"category\":\"TECHNICAL\"}", "label": "TECHNICAL" },
          { "input": "How do I change the email on my account?", "output": "{\"category\":\"ACCOUNT\"}", "label": "ACCOUNT" }
        ]
      }' | python3 -m json.tool | head -60
```

**What you should see:** `patterns` contains a `zero-shot` entry with **no** `EXAMPLES:` block and a `few-shot`
entry with one; `exemplarRules` contains only the `few-shot:recency` note, because three well-formed examples
covering three classes pass every other rule.

**Try breaking it:** change one example's output to `BILLING` (a bare word instead of JSON) and re-run. You should
get `few-shot:inconsistent-shape` with severity `block` — Rule 2 caught the drift.

---

### Navigation

- **Previous:** [Chapter 01 — Project Setup, Config & Types](./01_Project_Setup_Config_and_Types.md)
- **Next:** [Chapter 03 — Chain-of-Thought & Persona](./03_Chain_of_Thought_and_Persona.md)
- **Notes:** [../../notes/02_Zero_Shot_Prompting.md](../../../notes/02_Zero_Shot_Prompting.md) ·
  [../../notes/03_Few_Shot_Prompting_and_In_Context_Learning.md](../../../notes/03_Few_Shot_Prompting_and_In_Context_Learning.md)



