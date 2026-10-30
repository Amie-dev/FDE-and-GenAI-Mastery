# Chapter 06: Resources and Prompts — Context and Reusable Instructions

## Key Concepts

- **Resources** = "know" (addressable context by URI)
- **Prompts** = "reuse" (reusable instructions for the model)
- Model does not choose resources; application decides to read them
- Prompts are user-controlled: UI lists them, user picks them

## Code Implementation

### `src/resources/resources.ts` — Resources

```typescript
const policies: Record<string, string> = {
  "return-policy": "Returns are accepted within 30 days...",
  "refund-policy": "Refunds are issued within 5 business days...",
};

export function registerResources(server: McpServer): void {
  for (const [name, text] of Object.entries(policies)) {
    const uri = `company://policies/${name}`;

    server.registerResource(
      name,
      uri,
      {
        title: name.replace(/-/g, " "),
        description: `Company policy exposed as addressable context at ${uri}`,
        mimeType: "text/plain",
      },
      async (readUri) => ({
        contents: [{ uri: readUri.href, mimeType: "text/plain", text }],
      }),
    );
  }
}
```

### `src/prompts/prompts.ts` — Prompts

```typescript
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "review_pull_request",
    {
      title: "Review Pull Request",
      description: "Asks the model to review a pull request...",
      argsSchema: z.object({
        prNumber: z.string().describe("Pull request number, e.g. 42"),
      }),
    },
    ({ prNumber }) => ({
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: `You are reviewing PR #${prNumber}...` },
      }],
    }),
  );
}
```

## Key Differences from Tools

| Primitive | Role | Driven By | Addressable? | Executes? |
|-----------|------|-----------|--------------|-----------|
| Tools | Do (actions) | Model | No | Yes |
| Resources | Know (context) | Application | Yes (URI) | No |
| Prompts | Reuse (instructions) | User | No | No |