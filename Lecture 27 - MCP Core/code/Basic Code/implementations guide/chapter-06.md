# Chapter 06: Resources and Prompts — Context and Reusable Instructions

## Key Concepts

- **Resources** = "know" (addressable context by URI)
- **Prompts** = "reuse" (reusable instructions for the model)
- Model does not choose resources; application decides to read them
- Prompts are user-controlled: UI lists them, user picks them
- Reading a resource executes nothing — it is read-only

## Code Implementation

### `src/resources/resources.ts` — Resources (know)

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
import { policyScheme } from "../config/config.js";

/**
 * Chapter 06 §6.2–6.4 — Resources: addressable context.
 *
 * A Resource is *know*, not *do*: the application (never the model) decides to
 * read it, the content is read-only, and the URI is what makes it addressable.
 * Reading a resource executes nothing.
 */
const policies: Record<string, string> = {
  "return-policy": "Returns are accepted within 30 days of delivery. Electronics must include the original packaging.",
  "refund-policy": "Refunds are issued to the original payment method within 5 business days of approval.",
};

export function registerResources(server: McpServer): void {
  for (const [name, text] of Object.entries(policies)) {
    const uri = `${policyScheme}://policies/${name}`;

    server.registerResource(
      name,
      uri,
      {
        title: name.replace(/-/g, " "),
        description: `Company policy exposed as addressable context at ${uri}`,
        mimeType: "text/plain",
      },
      // `resources/read` — the client retrieves the content by URI. Text
      // resources use `text`; binary ones would use a base64 `blob`.
      async (readUri) => ({
        contents: [{ uri: readUri.href, mimeType: "text/plain", text }],
      }),
    );
  }
}
```

## Code Block Explanation: Resources

### Resource data structure

```typescript
const policies: Record<string, string> = {
  "return-policy": "Returns are accepted within 30 days of delivery. Electronics must include the original packaging.",
  "refund-policy": "Refunds are issued to the original payment method within 5 business days of approval.",
};
```

1. **`Record<string, string>`** — A dictionary mapping resource names to their text content. Each entry becomes a separate resource.

### Registration loop

```typescript
export function registerResources(server: McpServer): void {
  for (const [name, text] of Object.entries(policies)) {
    const uri = `${policyScheme}://policies/${name}`;

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

**Block-by-block breakdown:**

1. **`Object.entries(policies)`** — Iterates over each policy. One resource per entry.

2. **`const uri = ...`** — Builds a custom URI from the `policyScheme` (which is `"company"` from config). The URI is what makes resources addressable. Custom schemes (`company://`) are used because `https://` would imply the client can fetch it independently.

3. **`server.registerResource(name, uri, {...}, handler)`** — Four arguments:
   - `name` — Unique resource identifier (e.g., `"return-policy"`)
   - `uri` — The addressable URI (e.g., `company://policies/return-policy`)
   - Metadata object:
     - `title` — Human-readable name (hyphens replaced with spaces)
     - `description` — What this resource contains
     - `mimeType` — Content type (`"text/plain"`)
   - **Handler function** — Called when a client reads the resource by URI:
     - Receives `readUri` — the URI object the client requested
     - Returns `contents` array with `uri`, `mimeType`, and `text`

4. **Read-only execution** — The handler does NOT execute anything. It simply returns existing text content. The model never reads resources directly — the *application* does.

### `src/prompts/prompts.ts` — Prompts (reuse)

```typescript
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

/**
 * Chapter 06 §6.7 — Prompts: reusable instructions.
 *
 * A Prompt is *reuse*, and it is **user-controlled**: the UI lists it, the user
 * picks it, and `prompts/get` returns messages with the arguments substituted.
 * The model does not choose prompts, and a prompt changes no state.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "review_pull_request",
    {
      title: "Review Pull Request",
      description: "Asks the model to review a pull request for bugs and maintainability issues.",
      argsSchema: z.object({
        prNumber: z.string().describe("Pull request number, e.g. 42"),
      }),
    },
    ({ prNumber }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are reviewing pull request #${prNumber}. Check for bugs, maintainability issues and missing tests, then report findings as a short list.`,
          },
        },
      ],
    }),
  );
}
```

## Code Block Explanation: Prompts

### Registration

```typescript
server.registerPrompt(
  "review_pull_request",
  {
    title: "Review Pull Request",
    description: "Asks the model to review a pull request for bugs and maintainability issues.",
    argsSchema: z.object({
      prNumber: z.string().describe("Pull request number, e.g. 42"),
    }),
  },
  ({ prNumber }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are reviewing pull request #${prNumber}. Check for bugs, maintainability issues and missing tests, then report findings as a short list.`,
        },
      },
    ],
  }),
);
```

**Block-by-block breakdown:**

1. **`"review_pull_request"`** — Unique prompt name. Listed by `prompts/list`, fetched by `prompts/get`.

2. **`title` and `description`** — Human-readable metadata for the UI. The user sees these and picks the prompt.

3. **`argsSchema: z.object({ prNumber: z.string().describe(...) })`** — Schema for user-supplied arguments. When the user selects this prompt, the app prompts for `prNumber`.

4. **Handler function `({ prNumber }) => ({ messages: [...] })`** — Returns a message array:
   - Destructures `prNumber` from validated arguments
   - Returns a `messages` array with one message
   - `role: "user"` — the message is injected as a user message (system-level instruction)
   - `content.type: "text"` — text content block
   - `content.text` — Template with `prNumber` substituted in. This is the instruction that gets prepended to the conversation

5. **No state changes** — Prompts are pure templates. They return messages to be prepended to the model context. Nothing is executed.

## Key Differences from Tools

| Primitive | Role | Driven By | Addressable? | Executes? | Protocol Calls |
|-----------|------|-----------|--------------|-----------|----------------|
| **Tools** | Do (actions) | Model | No | Yes | `tools/list`, `tools/call` |
| **Resources** | Know (context) | Application | Yes (URI) | No | `resources/list`, `resources/read` |
| **Prompts** | Reuse (instructions) | User | No | No | `prompts/list`, `prompts/get` |

## Command

```bash
npm run server   # Start server
npm run client   # Run lifecycle demo — includes resources/list, resources/read, prompts/list, prompts/get
```