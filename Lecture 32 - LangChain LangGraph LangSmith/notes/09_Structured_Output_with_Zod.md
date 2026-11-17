# Chapter 09 — Structured Output with Zod Schemas

> **Reference:** `langchain_langgraph-main/notes/chapter-12.md` · [LangChain Structured Output](https://docs.langchain.com/oss/javascript/langchain/structured-output)

---

## 1. What is Structured Output?

In production architectures, LLMs rarely produce text meant solely for human reading. Most LLM outputs feed directly into:
- Relational and NoSQL databases.
- Microservice API contracts and webhooks.
- Downstream deterministic workflow engines.

Relying on prompt instructions (e.g. `"Respond with valid JSON only"`) and manual `JSON.parse()` is notoriously fragile — models often introduce markdown backticks (` ```json `), trailing commas, or omitted fields.

**Structured Output** guarantees that the agent returns **typed, validated JavaScript objects** conforming to a schema you define:

$$\text{User Request} \longrightarrow \text{Agent Tools / Reasoning} \longrightarrow \text{Guaranteed Typed Schema Object}$$

---

## 2. Defining Schemas with Zod

LangChain leverages **Zod**, the gold-standard schema validation library for TypeScript:

```typescript
import * as z from "zod";

export const LeadExtractionSchema = z.object({
  fullName: z.string().describe("The prospective customer's full name"),
  company: z.string().describe("Company or organization name"),
  email: z.string().email().describe("Valid business email address"),
  budget: z.number().nullable().describe("Estimated budget in USD, or null if unspecified"),
  intentScore: z.enum(["low", "medium", "high"]).describe("Lead purchase urgency level"),
  keyRequirements: z.array(z.string()).min(1).describe("Core requirements extracted from text"),
});

// Infer static TypeScript types directly from the schema:
export type LeadExtraction = z.infer<typeof LeadExtractionSchema>;
```

---

## 3. Attaching Schemas to `createAgent`

Pass your schema into the `responseFormat` parameter of `createAgent`:

```typescript
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { LeadExtractionSchema, type LeadExtraction } from "./schemas.js";

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
  systemPrompt: "Extract inbound sales lead details from the customer message accurately.",
  responseFormat: LeadExtractionSchema,
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: 
        "Hi, this is Sarah Connor from Cyberdyne Systems (sarah@cyberdyne.ai). " +
        "We need to deploy your agent platform across 50 Kubernetes clusters next month. " +
        "We have an initial allocation of $85,000 for phase one.",
    },
  ],
});

// Access the typed, runtime-validated object directly:
const lead: LeadExtraction = result.structuredResponse;

console.log("Customer:", lead.fullName);        // "Sarah Connor"
console.log("Company:", lead.company);          // "Cyberdyne Systems"
console.log("Email:", lead.email);              // "sarah@cyberdyne.ai"
console.log("Budget: $", lead.budget);          // 85000
console.log("Intent:", lead.intentScore);       // "high"
console.log("Requirements:", lead.keyRequirements); // ["deploy agent platform", "50 Kubernetes clusters"]
```

Notice:
- No `JSON.parse()` required.
- No markdown regex stripping needed.
- Fully typed in TypeScript with autocomplete and compile-time verification.

---

## 4. Under the Hood: Provider vs. Tool Strategy

LangChain selects the optimal structured output enforcement mechanism based on provider capabilities:

| Strategy | How It Works | When It Is Used |
| :--- | :--- | :--- |
| **Provider Strategy (`response_format: { type: "json_schema" }`)** | Constrains token generation at the logits level inside the model's inference engine. Guarantees 100% schema compliance. | Models with native JSON Schema support (OpenAI GPT-4o, Google Gemini, Anthropic Claude 3.7). |
| **Tool Strategy (`tool_choice`)** | Forces the model to invoke a synthetic hidden tool whose argument schema matches your Zod definition. | Open-source or legacy models lacking native JSON Schema enforcement. |

You can explicitly force a strategy if needed:

```typescript
import { providerStrategy, toolStrategy } from "langchain";

// Force native provider schema:
responseFormat: providerStrategy(LeadExtractionSchema)

// Force tool-calling fallback:
responseFormat: toolStrategy(LeadExtractionSchema)
```

---

## 5. Combining Structured Output with Tools

Tools and structured outputs work together seamlessly:
1. The agent executes external tools (e.g. web search, database lookup) to gather facts.
2. The agent formats its final response according to the requested Zod schema.

```typescript
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { webSearch } from "./tools/index.js";
import * as z from "zod";

const CompanyAnalysisSchema = z.object({
  company: z.string().describe("Name of the company"),
  headquarters: z.string().describe("City and country of headquarters"),
  keyProducts: z.array(z.string()).describe("Top 3 core product offerings"),
  recentNewsHeadline: z.string().describe("Most recent major announcement"),
});

const researchAgent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
  tools: [webSearch], // Tool used for real-time fact retrieval
  systemPrompt: "Research the requested company using web search and output structured intelligence.",
  responseFormat: CompanyAnalysisSchema,
});

const output = await researchAgent.invoke({
  messages: [{ role: "user", content: "Analyze Stripe" }],
});

console.log(output.structuredResponse);
/* Output:
{
  company: "Stripe",
  headquarters: "San Francisco, USA & Dublin, Ireland",
  keyProducts: ["Payments API", "Stripe Connect", "Stripe Billing"],
  recentNewsHeadline: "Stripe acquires Bridge to expand stablecoin infrastructure..."
}
*/
```

---

## 6. Schema Design Best Practices

1. **Always Use `.describe()`**: The model reads field descriptions to understand intent. A field named `score` is vague; `z.number().min(0).max(100).describe("Quality score from 0 (terrible) to 100 (perfect)")` produces vastly superior accuracy.
2. **Use Enums for Fixed Choices**: `z.enum(["low", "medium", "high"])` eliminates casing discrepancies (`"High"`, `"HIGH"`, `"urgent"`).
3. **Handle Missing Data Explicitly**: Use `z.string().nullable()` or `.optional()` for fields that may not always be present in source text.
4. **Keep Schemas Focused**: Split massive 50-field schemas into multiple hierarchical sub-schemas.

---

## Key Takeaways

- Structured output transforms probabilistic text generation into validated, typed data structures.
- Set `responseFormat: MyZodSchema` on `createAgent()` and access `result.structuredResponse`.
- Modern models enforce schemas at the logits level using constrained decoding.
- Structured outputs combine cleanly with tools, allowing agents to search the web or query databases before returning typed JSON.

