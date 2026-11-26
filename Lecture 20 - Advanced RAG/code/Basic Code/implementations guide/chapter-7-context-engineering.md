# Chapter 7 — Context Engineering (Ordering, Budget, Framing)

**Goal:** Decide what goes in the prompt, in what order, with what labels, and which precedence rules — so the model follows the specific policy over the general one.
**Notes reference:** `notes/07_Context_Engineering.md`
**File:** `src/services/context-engineering.service.ts`
**Order:** Run after Chapter 6.

---

## 7.1 File Details

**`src/services/context-engineering.service.ts`**

```ts
/**
 * Chapter 07 — Context Engineering (Ordering, Budget, Framing)
 *
 * Decides what goes in the prompt, in what order, with what labels,
 * and which precedence rules apply.
 */

import { Candidate } from "./retrieval.service";

export interface ContextChunk {
  label: string;
  text: string;
  source: string;
  tokens: number;
}

export interface AssembledContext {
  chunks: ContextChunk[];
  totalTokens: number;
  systemPrompt: string;
}

const PRECEDENCE_RULES = `
PRECEDENCE RULES:
1. A category-specific rule overrides a general rule.
2. The most recent effective date wins when policies conflict.
3. If evidence is insufficient, say you cannot answer — do not guess.
4. Always cite the source label [n] for every claim.
`.trim();

export function assembleContext(
  candidates: Candidate[],
  { maxTokens = 3000, maxChunks = 5 }: { maxTokens?: number; maxChunks?: number } = {}
): AssembledContext {
  const ordered = [...candidates].sort((a, b) => {
    const aSpec = a.metadata.category === "electronics" ? 1 : 0;
    const bSpec = b.metadata.category === "electronics" ? 1 : 0;
    return bSpec - aSpec;
  });

  const chunks: ContextChunk[] = [];
  let totalTokens = 0;

  ordered.forEach((c, i) => {
    if (chunks.length >= maxChunks) return;
    const label = `[${i + 1}]`;
    const text = c.text;
    const tokens = Math.ceil(text.length / 4);

    if (totalTokens + tokens > maxTokens) return;

    chunks.push({ label, text, source: c.id, tokens });
    totalTokens += tokens;
  });

  const systemPrompt = `
You are a helpful assistant. Answer using ONLY the provided context.

${PRECEDENCE_RULES}

CONTEXT:
${chunks.map((c) => `${c.label} ${c.text} (source: ${c.source})`).join("\n")}

Answer the question and cite sources as [n].
`.trim();

  return { chunks, totalTokens, systemPrompt };
}
```

**Block-by-block:**
- `ContextChunk` — one labeled chunk for the prompt: label (`[1]`), text, source id, token count.
- `AssembledContext` — the full result: chunks, total token count, and the system prompt.
- `PRECEDENCE_RULES` — four explicit rules (Chapter 07 §7.5):
  1. Category-specific overrides general.
  2. Most recent effective date wins.
  3. Insufficient evidence → refuse, don't guess.
  4. Always cite `[n]`.
- `assembleContext` — the assembly logic:
  1. **Order** — sorts specific (`electronics`) before general, so decisive evidence is read first (Chapter 07 §7.4 specific-first, general-last).
  2. **Label** — each chunk gets `[1]`, `[2]`, ... so answers are citable (Chapter 07 §7.6).
  3. **Budget** — stops adding chunks when `maxTokens` or `maxChunks` is reached; drops whole chunks rather than truncating (Chapter 07 §7.7).
  4. **System prompt** — combines instructions + precedence rules + labeled context + citation instruction (Chapter 07: rules in system, sources as data, question last).

---

## 7.2 Commands

```bash
npx ts-node -e "
import { assembleContext } from './src/services/context-engineering.service';
import { Candidate } from './src/services/retrieval.service';

const cands: Candidate[] = [
  { id: 'doc-1', text: 'General Return Policy: 30 days', score: 0.9, metadata: { category: 'general' } },
  { id: 'doc-2', text: 'Electronics Return Policy: 7 days', score: 0.85, metadata: { category: 'electronics' } },
];

const ctx = assembleContext(cands, { maxTokens: 3000, maxChunks: 5 });
console.log('tokens:', ctx.totalTokens);
console.log(ctx.systemPrompt);
"
```

---

## 7.3 What This Implements from the Notes

| Notes concept | Implementation |
|---|---|
| Specific-first ordering | sort puts `electronics` before `general` |
| Precedence rules | `PRECEDENCE_RULES` in system prompt |
| Labeled chunks `[n]` | `label = [${i + 1}]` |
| Token budget | `maxTokens` + drop whole chunk |
| Max chunks | `maxChunks` limit |
| Rules (system) · sources (data) · question (last) | systemPrompt structure |
