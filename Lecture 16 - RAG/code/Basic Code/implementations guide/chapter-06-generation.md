# Chapter 06 — Grounded Generation: Prompt Contract

**Notes source:** `Lecture 16 - RAG/notes/06_grounded_generation_prompt_contract.md`

**Goal:** Turn retrieved chunks into a prompt the model can trust. The model answers ONLY from the context, cites with `[n]`, and refuses when the answer is not in the documents.

---

## `src/services/generation.ts`

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/generation.ts` |
| Chapter | 06 |
| What it does | Builds a grounded prompt (system + context + question), calls the chat model, verifies citations against the chunks actually placed in the prompt, and detects refusals. Falls back to a deterministic answer when no API key is configured. |

### Full code

```ts
import OpenAI from "openai";
import { config } from "../config/config";
import type { Match, Message } from "../types";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an internal support assistant. Answer using ONLY the context below.
If the answer is not in the context, say "I don't have that information." and stop.
Cite every fact with [n] where n is the context chunk number.
Never cite a chunk you did not use. Do not invent.`;

export function buildPrompt(question: string, chunks: Match[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${String(c.metadata.source ?? c.id)})\n${String(c.metadata.text ?? "")}`)
    .join("\n\n");

  return [
    SYSTEM_PROMPT,
    "",
    "=== CONTEXT ===",
    context || "(no relevant context found)",
    "",
    "=== QUESTION ===",
    question,
    "",
    "=== ANSWER ===",
  ].join("\n");
}

export async function generate(params: {
  question: string;
  chunks: Match[];
  history?: Message[];
}): Promise<{ answer: string; citedChunkIds: string[]; refused: boolean }> {
  const { question, chunks, history = [] } = params;
  const prompt = buildPrompt(question, chunks);

  let answer: string;
  if (!config.openaiApiKey) {
    answer =
      chunks.length > 0
        ? `Based on the provided context, here is what the documents say:\n\n` +
          chunks
            .map((c, i) => `[${i + 1}] ${String(c.metadata.text ?? "").slice(0, 120)}...`)
            .join("\n")
        : "I don't have that information.";
  } else {
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: prompt },
    ];
    const res = await getClient().chat.completions.create({
      model: config.chatModel,
      messages,
      temperature: 0.2,
      max_tokens: 512,
    });
    answer = res.choices[0]?.message?.content ?? "";
  }

  const refused = /i don't have that information/i.test(answer);

  const citedChunkIds = chunks
    .filter((_c, i) => answer.includes(`[${i + 1}]`))
    .map((c) => c.id);

  return { answer, citedChunkIds, refused };
}
```

### Block-by-block explanation

| Block | What it does | Notes chapter |
|-------|--------------|---------------|
| `const SYSTEM_PROMPT = ...` | The prompt contract: role (support assistant), rule (answer ONLY from context), failure mode (say "I don't have that information"), citation grammar (`[n]`). | Chapter 06 |
| `export function buildPrompt(question, chunks)` | Assembles the full prompt: system prompt + numbered context chunks + question. Each chunk is labeled `[1]`, `[2]`, etc. with its source. | Chapter 06 |
| `` `[${i + 1}] (${source})\n${text}` `` | Each chunk gets a number and source label so the model can cite it and the reader can verify it. | Chapter 06 |
| `"I don't have that information."` when no chunks | If retrieval returned nothing, the context section says "(no relevant context found)" and the model should refuse. | Chapter 06 |
| `temperature: 0.2` | Low temperature for factuality. Chapter 06: use 0–0.2 for factual QA. | Chapter 06 |
| `max_tokens: 512` | Caps output length to control cost. | Chapter 09 |
| `refused = /i don't have that information/i.test(answer)` | Detects if the model refused. Used by the caller to know whether the answer was grounded or a refusal. | Chapter 06 |
| `citedChunkIds = chunks.filter(...)` | Verifies citations: only counts a chunk as cited if its `[n]` marker appears in the answer. The model cannot claim credit for a chunk it didn't cite. | Chapter 06 |
| Fallback mock answer | When no API key, returns a deterministic grounded answer (or refusal) so the flow still runs offline. | Chapter 06 |

### Chapter 06 contract honored

| Rule | How this code implements it |
|------|------------------------------|
| Answer ONLY from context | System prompt says "Answer using ONLY the context below" |
| Refusal when insufficient | System prompt says say "I don't have that information" |
| Citation grammar `[n]` | Context chunks numbered `[1]`, `[2]`; model instructed to cite with `[n]` |
| Never cite unused chunk | `citedChunkIds` verifies `[n]` markers match actual chunks present |
| Low temperature | `temperature: 0.2` for factuality |
| Output token cap | `max_tokens: 512` |

### Command

```bash
# Generation happens inside POST /api/query:
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"refund policy for apparel","tenantId":"acme","sessionId":"s1","roles":[]}'
```
