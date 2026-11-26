# 06 — Structured Output & Defensive Parsing

> **Goal:** Understand how to **enforce exact JSON output** from the LLM, recover gracefully when parsing fails, and validate response shape against a runtime schema. These tools make the Agent robust against hallucination and unexpected model responses.

---

# 1. 🤔 Why Raw LLM Output Is Risky

A raw LLM is probabilistic. Even with a system prompt telling it to output JSON, it can still include:

```text
Here is the answer:

{"step": "OUTPUT", "text": "Hello"}
```

Or:

```text
I am going to help you.

{
  "step": "TOOL_REQUEST",
  "functionName": "execCli",
  "input": "ls"
}
```

Or:

```text
I think we should use the weather tool.
```

**Without a harness, the Agent cannot reliably parse this.**

---

# 2. 🛡️ Harness → Schema Validation

Chapter 03 already uses the Harness to request structured JSON.

Chapter 04 uses `parseLLMOutput` which attempts to extract a JSON object.

Now we tighten that further with **schema validation**.

Think of it as a two-step filter:

```text
Raw LLM Response
      ↓
JSON.parse()
      ↓
Schema validation
      ↓
Is step valid?
      ↓
Does TOOL_REQUEST have functionName?
      ↓
Does tool exist?
      ↓
Execute
```

---

# 3. 🧠 How `parseLLMOutput` Works

Your code already has:

```ts
private parseLLMOutput(rawText: string): LLMStepResponse {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse LLM output as JSON: "${rawText}"`);
  }
}
```

This does **extraction**: tries to find a `{...}` block inside markdown or extra text.

But extraction is not enough.

---

# 4. 📋 What Is Schema Validation?

Schema validation ensures the resulting object matches a shape you define.

You can use **Zod** (already a common dependency in TypeScript projects):

```ts
import { z } from "zod";

const LLMStepResponseSchema = z.object({
  step: z.enum(["INITIAL", "THINK", "TOOL_REQUEST", "ANALYSE", "OUTPUT"]),
  text: z.string(),
  functionName: z.string().optional(),
  input: z.string().optional(),
  targetAgent: z.string().optional(),
  reason: z.string().optional(),
});
```

Then:

```ts
const parsed = LLMStepResponseSchema.parse(LLMStepResponseSchema.parse(rawText));
```

Zod throws if parsing fails, making errors clear.

> **Production note:** Keep parsing defensive for `step` (extract JSON, then Zod). Throw only after Zod validation fails. This balances robustness and clarity.

---

# 5. 🛡️ Defensive Parsing vs Strict Parsing

| Approach                | When it works                     | When it fails                  |
| ---------------------- | --------------------------------- | ----------------------------- |
| **Defensive only**     | LLM sometimes breaks JSON        | Runtime may crash with garbage |
| **Strict (Zod only)**  | LLM always returns perfect JSON  | Clear, actionable error message |
| **Hybrid (recommended)**| LLM sometimes breaks JSON         | Defensive extraction + Zod     |

**Hybrid strategy:**

1. Extract a `{...}` block from the text.
2. If extraction succeeds, run Zod validation.
3. If Zod fails, throw a clear error.
4. If extraction fails, fallback to defensive parsing.

---

# 6. 🧪 Structured JSON Contract in Harness

Your Harness already tells the LLM the exact JSON shape:

```ts
export const HARNESS_PROMPT = `
You are an expert AI assistant system governed by an Agent Harness framework.

... pipeline description ...

STRICT JSON OUTPUT FORMAT:
Every output MUST be a valid, parseable JSON object adhering to this schema:
{
  "step": "INITIAL" | "THINK" | "TOOL_REQUEST" | "ANALYSE" | "OUTPUT",
  "text": "<reasoning text>",
  "functionName": "<optional tool function name>",
  "input": "<optional tool arguments string or object>"
}

Rules:
1. Output ONLY ONE JSON object per step.
2. Do NOT wrap output in markdown code block backticks (e.g. no \`\`\`json ... \`\`\`). Only output plain JSON.
3. Follow JSON syntax strictly.
`;
```

This reduces LLM output hallucination.

---

# 7. 📦 Why Structured Output Matters

Without it, the Agent runtime would need to:

```text
LLM
  ↓
"I think I should use the weather tool."
  ↓
Agent 😵
"Wait, what function name?"
"What input?"
```

With it:

```text
LLM
  ↓
{"step":"TOOL_REQUEST","functionName":"fetchWeatherInfo","input":"Goa"}
  ↓
Agent → find tool → execute → result
```

---

# 8. 🛡️ Common Parsing Errors & Recovery

| Error scenario                 | LLM returns                          | Agent behavior                        |
| ------------------------------ | ------------------------------------ | ------------------------------------- |
| No JSON object                 | Plain text                           | Throw: "Failed to parse LLM output"   |
| Invalid JSON syntax            | `{"step":"OUTPUT" text:"Hello"}`    | Defensive extract fails → error       |
| Missing required fields        | `{"step":"OUTPUT"}`                 | Zod validates → error "text is required" |
| Wrong type (number instead of string) | `{"step":123,"text":"Hi"}`   | Zod error: "Expected string, got number" |

**Error recovery strategy:**

1. Inject error message into messageHistory:

```ts
messageHistory.push({
  role: "developer",
  content: JSON.stringify({ error: "Parsing failed: missing field 'text'" })
});
```

2. Notify interceptors:

```ts
this.notifyInterceptors(errorMessage);
```

3. Continue loop so LLM can retry:

```ts
continue; // go back to LLM with updated history
```

> **Note:** Keep `MAX_LOOP` to prevent infinite error loops.

---

# 9. 🧪 Structured Output Playground (demo)

Your existing code already provides a playground:

```ts
// In agent.ts
try {
  const parsed = this.parseLLMOutput(rawLLMResponse);
  // Zod validation could be added here
  if (parsed.step === "OUTPUT") {
    return this.messageHistory;
  }
  // ...
} catch (e) {
  // Defensive error handling
  this.messageHistory.push({
    role: "developer",
    content: JSON.stringify({ error: (e as Error).message })
  });
}
```

---

# 10. 🔗 Integration With Previous Chapters

**Chapter 01:** Agent = LLM + Harness + Tools + State
**Chapter 02:** Builder configures Agent
**Chapter 03:** Harness controls LLM protocol
**Chapter 04:** Tool Engine executes tools
**Chapter 05:** Message History stores events
**Chapter 06:** Structured Output + Defensive Parsing validates inputs

The flow:

```text
Developer
    │
    ▼
Builder
    │
    ▼
Agent
    │
    ├── 🎯 Harness
    ├── 📜 Instructions
    ├── 🛠️ Tools
    ├── 💬 History
    └── 🔍 Parsing
           │
           ▼
         🧠 LLM
           │
           ▼
       📦 JSON
           │
           ▼
         🔄 Decide
           │
           ▼
       🔧 Execute
```

---

# 11. 🧠 Final Mental Model

Remember this:

```text
LLM generates → Structured output → Parsed & validated → Agent executes
```

But parsing is **defensive**, not perfect. Always treat LLM output as untrusted and validate.

> **Best practice:** Keep defensive extraction for production robustness. Use Zod for strict validation of shape. Combine them for the best trade-off between reliability and error clarity.

## 🔑 Key Takeaways

### 1. 🧠 Why structured output matters

> Prevents Agent from needing to guess at LLM intent.

### 2. 🛡️ Defensive parsing

> Extract JSON from markdown, but don’t trust it.

### 3. ✅ Schema validation

> Use Zod to enforce exact shape. Throw clear errors.

### 4. 🔄 Error handling

> Inject errors into messageHistory, continue loop.

### 5. 🎯 Structured contract

> Harness tells LLM what to return; validation ensures compliance.

---

# 🎯 Final Formula

$$
\boxed{
\text{Agent System}
=
\text{LLM} +
\text{HARNESS (Structured Prompt)} +
\text{STATE (Message History)} +
\text{TOOLS (Registry + Executor)} +
\text{LOOP (ReAct)} +
\text{PARSING (Extraction + Validation)} +
\text{OBSERVABILITY (Interceptors)} +
\text{SAFETY (MAX_LOOP + Guardrails)}
}
$$

**Remember:** The Harness controls the contract → the Agent Runtime parses and executes → the result is injected back into history → the LLM continues until `OUTPUT`.

---

# 📚 Interview Q&A for Chapter 06

### Q1. What is the difference between raw LLM output and structured output?

**A:** Raw LLM output is free-form text; structured output is machine-readable JSON with a known shape.

### Q2. Why is defensive parsing needed?

**A:** LLMs can include markdown fences or extra text. Defensive parsing extracts a JSON object from that.

### Q3: What role does Zod play?

**A:** Zod enforces schema validation. It throws if the object doesn’t match the expected shape.

### Q4. What happens when parsing fails?

**A:** The Agent catches the error, injects it into messageHistory as a developer message, notifies interceptors, and continues the loop so the LLM can retry.

### Q5. How does this connect with Chapter 03 Harness?

**A:** The Harness tells the LLM to return structured JSON. The parsing in Chapter 06 validates that contract.

---

# 🌐 Production Notes

| Component            | Implementation details                         |
| --------------------- | ---------------------------------------------- |
| **Harness Prompt**    | Explicit JSON schema instructions            |
| **Extraction**       | Regex to find `{...}` blocks                   |
| **Validation**       | Zod for strict shape validation               |
| **Error handling**   | Defensive error messages in messageHistory    |
| **Interceptors**     | Observe parsing events for logging/metrics   |

> **Safety tip:** Keep `MAX_LOOP` high enough to allow retries but low enough to prevent runaway parsing loops.

---

# 📦 Code Snippets Summary

```ts
// Defensive extraction + Zod validation
private parseLLMOutput(rawText: string): LLMStepResponse {
  // Extract JSON from potential markdown/fences
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Failed to parse LLM output as JSON: "${rawText}"`);
  }
  const parsed = JSON.parse(match[0]);

  // Zod validation
  const schema = LLMStepResponseSchema;
  return schema.parse(parsed);
}
```