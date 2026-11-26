# Lecture 22 — Complete Notes: MCP Resources, Prompts & Production Gateway Architecture

> **Phase:** 6 · Integration · **Level:** 🟠 Advanced · **Prerequisites:** Lecture 21 (MCP from First Principles)
>
> **Goal:** Master all three MCP primitives and put each under the right owner.
>
> **Source mapping:** `FDE L15 · GAC D15` — see `roadmap.md` for exact file paths.

---

# Preamble: From One Primitive to Three

Lecture 14 showed how an MCP Server exposes **Tools** — callable capabilities that the model decides to invoke. That lecture spent eight chapters dissecting a single primitive.

Lecture 22 opens the whole surface. An MCP Server can expose **three** primitives:

| Primitive | It is about… | Controlled by | Verb | Produces |
|---|---|---|---|---|
| **Tools** | Capabilities | **Model** | Do | A result |
| **Resources** | Context | **Application** | Know | Content |
| **Prompts** | Reusable workflows | **User** | Reuse | Messages |

The load-bearing distinction is **control**, not purpose. A Tool returns data, but so can a Resource — what matters is *who decides* when it runs. If the model decides → Tool. If the application supplies it as context → Resource. If the user chooses a workflow → Prompt.

> **The one-sentence compression:** *A server publishes what can be done (Tools), what can be known (Resources), and what can be asked (Prompts) — and the protocol keeps the model, the application and the user in their own lanes.*

---

# Part I — The Three Primitives and the Control Model

## 1. One Server, Three Faces

Lecture 14's `taskServer` exposed exactly one thing: a Tool (`createTask`, `getWeather`, `sendEmail`). The model drove everything:

```mermaid
flowchart TD
    U["User"] --> L["LLM"]
    L -->|"decides which tool"| C["MCP Client"]
    C -->|"tools/call"| S["MCP Server"]
    S --> T["Tool"]

    style L fill:#cba6f7,color:#1e1e2e
    style S fill:#f9e2af,color:#1e1e2e
    style T fill:#a6e3a1,color:#1e1e2e
```

Lecture 22 says: that is only one third of what a server can expose. The same `taskServer` can expose all three primitives on one connection:

```text
taskServer
│
├── Tools
│   ├── create_task
│   ├── list_tasks
│   └── complete_task
│
├── Resources
│   └── task://guidelines
│
└── Prompts
    └── plan_day
```

```mermaid
flowchart TD
    S["MCP SERVER"]
    S --> T["TOOLS"]
    S --> R["RESOURCES"]
    S --> P["PROMPTS"]

    T --> M["MODEL<br/>chooses what to call"]
    R --> A["APPLICATION<br/>controls context provided"]
    P --> U["USER<br/>chooses workflow to invoke"]

    style S fill:#f9e2af,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style R fill:#94e2d5,color:#1e1e2e
    style P fill:#cba6f7,color:#1e1e2e
    style M fill:#f38ba8,color:#1e1e2e
    style A fill:#a6e3a1,color:#1e1e2e
    style U fill:#fab387,color:#1e1e2e
```

A server that only registers tools is legal and common — it simply leaves two thirds of the protocol unused. Some capabilities genuinely fit the other primitives better.

## 2. The Classification Questions

Run them in order. The first `yes` wins:

```mermaid
flowchart TD
    Q{"What am I<br/>exposing?"} --> Q1["Should the MODEL<br/>decide to call it?"]
    Q1 -->|yes| T["TOOL<br/>name + inputSchema"]
    Q1 -->|no| Q2["Should the APPLICATION<br/>provide it as context?"]
    Q2 -->|yes| R["RESOURCE<br/>uri + mimeType"]
    Q2 -->|no| Q3["Should the USER<br/>choose a workflow?"]
    Q3 -->|yes| P["PROMPT<br/>name + arguments"]

    style Q fill:#6c7086,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style R fill:#94e2d5,color:#1e1e2e
    style P fill:#cba6f7,color:#1e1e2e
```

| | Tool | Resource | Prompt |
|---|---|---|---|
| What it is | Capability | Context | Reusable workflow |
| Who decides | Model | Application | User |
| Verb | Do | Know | Reuse |
| Side effects | Usually yes | No — read-only | No |
| Identified by | `name` | `uri` | `name` |
| Discovery | `tools/list` | `resources/list` | `prompts/list` |
| Retrieval | `tools/call` | `resources/read` | `prompts/get` |

> **Why control matters:** control decides blast radius and who must consent. A model-invoked capability can change state on a whim; an application-read resource is a deliberate decision made by code you wrote; a user-invoked prompt is an explicit human act.

## 3. Capability Negotiation (Beyond the Lecture)

The lecture teaches the primitives conceptually. The protocol gives each its own method namespace:

| Namespace | Methods | Capability flag |
|---|---|---|
| Tools | `tools/list`, `tools/call` | `capabilities.tools` |
| Resources | `resources/list`, `resources/read`, `resources/templates/list`, `resources/subscribe`, `resources/unsubscribe` | `capabilities.resources` |
| Prompts | `prompts/list`, `prompts/get` | `capabilities.prompts` |

Plus change notifications:

```text
notifications/tools/list_changed
notifications/resources/list_changed
notifications/resources/updated
notifications/prompts/list_changed
```

A server declares what it supports during `initialize`:

```json
{
  "capabilities": {
    "tools":     { "listChanged": true },
    "resources": { "subscribe": true, "listChanged": true },
    "prompts":   { "listChanged": true }
  }
}
```

> **Engineering consequence:** "does this server have resources?" is not a guess — it is a negotiated fact. A well-behaved host hides primitives the server did not advertise instead of calling methods that will fail.

---

# Part II — Resources: Context as a First-Class Primitive

## 4. Why Resources Exist

Tools can retrieve information, so "it returns data" does not alone make something a Tool. The real question is **intent**: is this an operation the model may invoke, or context the application supplies?

A Resource is **data or content exposed by an MCP Server that a client can discover and read**. It is not automatically in the LLM's context — something in the application must choose to read it and place it there. Resources are therefore **application-controlled**: the server exposes, the application chooses.

The definition to memorise: *an addressable piece of context along with metadata describing it*.

## 5. Two Operations, Not One

MCP provides separate operations for discovering and reading Resources. Discovery is cheap; reading is expensive.

```mermaid
flowchart LR
    subgraph D["Discovery — cheap, cacheable"]
        DL["resources/list"]
    end
    subgraph R["Read — expensive, deliberate"]
        DR["resources/read"]
    end
    DL --> DR

    style DL fill:#94e2d5,color:#1e1e2e
    style DR fill:#f9e2af,color:#1e1e2e
```

| Operation | Purpose | Cost | Payload |
|---|---|---|---|
| `resources/list` | Discover what exists | Cheap, cacheable | Metadata only |
| `resources/read` | Read one resource | Expensive, deliberate | `contents[]` array |

```mermaid
sequenceDiagram
    participant C as MCP Client / Host
    participant S as MCP Server

    C->>S: resources/list
    S-->>C: resources [ { uri, name, description, mimeType } ]

    Note over C: client now knows the catalogue,<br/>but has none of the content

    C->>S: resources/read { uri: "company://coding-guidelines" }
    S-->>C: contents [ { uri, mimeType, text } ]

    Note over C: content is now available to place<br/>into the model's context
```

> **At discovery time, the client knows the Resource exists. Nothing more.** It has a name, a URI and metadata — not the content.

## 6. Anatomy of an MCP Resource

```mermaid
flowchart TD
    R["RESOURCE"] --> N["Name<br/>identifies it"]
    R --> U["URI<br/>addresses it uniquely"]
    R --> D["Description<br/>explains what it is"]
    R --> M["MIME Type<br/>says what it is made of"]
    R --> C["Content<br/>the actual information"]

    style R fill:#94e2d5,color:#1e1e2e
```

The first four are *metadata* — they travel in `resources/list` and cost almost nothing. The fifth is *payload* — it arrives only on `resources/read`.

### Name

The name identifies the Resource (`coding-guidelines`, `project-info`, `company-policy`). It should be stable, kebab-case, noun-shaped, unique inside the server, and descriptive rather than cute. The name is for humans and UI labels; the URI is for addressing.

### URI — the Address, Not a URL

This is the critical distinction:

```text
company://coding-guidelines
```

The client does **not** perform `HTTP GET company://coding-guidelines`. Instead:

```text
resources/read
URI = company://coding-guidelines
```

The server resolves the URI and returns the content:

```mermaid
flowchart LR
    C["MCP Client"] -->|"resources/read<br/>company://coding-guidelines"| S["MCP Server"]
    S -->|"server resolves the URI<br/>(file, DB, API, memory)"| X["Content source"]
    X --> S2["MCP Server"]
    S2 -->|"contents: text"| C2["MCP Client"]

    style C fill:#89b4fa,color:#1e1e2e
    style S fill:#f9e2af,color:#1e1e2e
    style X fill:#6c7086,color:#1e1e2e
```

| If the URI were a URL | Because it is a URI |
|---|---|
| Client needs network access to `company://` | Client never fetches anything itself |
| Scheme would have to be resolvable | Scheme is a namespace you define |
| Host might leak an internal URL | Only the server knows where the bytes live |
| Content behind a firewall unreachable | Server can read anything it can reach |

Use `https://` only when the client genuinely could fetch it itself. When data lives behind the server (database, filesystem, private API), a custom scheme is the honest choice.

### Description — retrieval text

The description is not decoration. Chapter 05 shows the application comparing a user query against Resource metadata — which means the description is effectively retrieval text. Write it for a reader that is deciding relevance:

| Bad | Better |
|---|---|
| `"Leave policy"` | `"Company policies regarding leave, holidays, maternity leave and time off."` |
| `"Guidelines"` | `"Coding standards used by our Java development team."` |

### MIME type — a contract

Never lie about the MIME type. A mismatched type silently corrupts your contract:

| Consumer | Uses MIME type to… |
|---|---|
| Host UI | Decide text pane vs JSON viewer vs image |
| Prompt builder | Decide whether content can be inlined as text |
| Model | Interpret structure (`application/json` invites structured reasoning) |

### Wire shapes

`resources/list` request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {}
}
```

`resources/list` response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "company://coding-guidelines",
        "name": "coding-guidelines",
        "description": "Coding standards used by our Java development team.",
        "mimeType": "text/plain"
      }
    ],
    "nextCursor": "eyJvZmZzZXQiOjUwfQ=="
  }
}
```

`resources/read` request:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": { "uri": "company://coding-guidelines" }
}
```

`resources/read` response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "company://coding-guidelines",
        "mimeType": "text/plain",
        "text": "Use Java 21.\n\nPrefer constructor injection."
      }
    ]
  }
}
```

`contents` is an **array**, not a scalar — one URI may resolve to several blocks. Pagination via `nextCursor` is mandatory at scale.

### Resource annotations and subscriptions

| Method / notification | Purpose |
|---|---|
| `resources/templates/list` | Discover parameterised resources |
| `resources/subscribe` / `resources/unsubscribe` | Ask to be told when a resource changes |
| `notifications/resources/updated` | A subscribed resource changed |
| `notifications/resources/list_changed` | The catalogue itself changed |

Annotations on content blocks (`audience`, `priority`, `lastModified`) tell the host how to treat them.

### Failure modes to design for

| Failure | Symptom | Handling |
|---|---|---|
| Unknown URI | Error on `resources/read` | Fail loudly; never return empty string as content |
| Oversized resource | Prompt blow-up, latency, cost | Truncate deliberately and say so |
| Stale content | Model answers from old policy | `lastModified` + cache invalidation |
| Wrong MIME type | Host renders garbage | Validate content against declared type |
| Missing description | Selection becomes guesswork | Treat as a bug |

## 7. Building Resources: Static, Dynamic, Templated

### Static resource registration

```ts
// Pseudocode — Node.js MCP server
server.registerResource(
  "task-guidelines",
  "task://guidelines",
  {
    description: "Guidelines for managing and prioritizing tasks",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: getGuidelines() }],
  }),
);
```

Notice what is absent: no `inputSchema`, no argument list, no side effect. The handler takes nothing and returns a constant. That is what a static Resource is.

### Static vs dynamic

| | Static | Dynamic |
|---|---|---|
| Content source | A constant | Database / API / filesystem / service |
| Changes over time | Never until redeploy | Every read |
| Caching | Aggressive, forever | TTL or etag |
| Failure modes | None | Timeouts, 404s, permissions |

A dynamic Resource turns `resources/read` into a network call with a failure mode. From the rule that reads are side-effect free, we add: reads are also **slow and can fail**, and the host must distinguish *"empty"* from *"broken"*.

```ts
// Pseudocode — a dynamic resource handler that fails honestly
server.registerResource(
  "user-profile",
  "user://{username}",
  { description: "Profile of a user", mimeType: "application/json" },
  async (uri, params) => {
    const profile = await db.users.findByUsername(params.username);
    if (!profile) {
      throw new Error(`No profile for user '${params.username}'`);
    }
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(profile) },
      ],
    };
  },
);
```

### Resource templates

One definition serves a family:

```text
user://{username}
student://{studentId}/progress
company://policies/{policyName}
```

| | Enumerate every resource | Use a template |
|---|---|---|
| Definitions | One per instance | One for the family |
| `resources/list` size | Grows without bound | Constant |
| Discovery | Client sees every instance | Client learns the pattern |
| Client UI | Long, unusable list | A form field |
| Wire method | `resources/list` | `resources/templates/list` |

Rule of thumb: finite and small → list them; parameterised or unbounded → template it. A server that enumerates a million users in `resources/list` has turned discovery into a denial-of-service.

### Reading from the MCP client

```ts
// Pseudocode — reading a resource from the client
async function readTaskGuidelines(): Promise<string> {
  const result = await mcpClient.readResource({
    uri: "task://guidelines",
  });

  const content = result.contents[0];
  if (content.type !== "text") {
    throw new Error("Expected text resource, got blob");
  }

  return content.text;
}
```

Three things happen: the application names the URI (the model never sees this), unwraps `contents[0]` cast to text, extracts `content.text`. The cast is a loud, early crash site if the server changes the MIME type — which is good.

### Wiring into the prompt

```mermaid
sequenceDiagram
    participant A as ChatService (application)
    participant S as MCP Server
    participant L as LLM

    A->>S: resources/read { uri: "task://guidelines" }
    S-->>A: contents [ { text: "Task Management Guidelines: ..." } ]
    Note over A: application builds the system prompt
    A->>L: system(guidelines) + user(message)
    L-->>A: grounded answer
```

| | Guidelines as a Tool | Guidelines as a Resource |
|---|---|---|
| Who fetches it | The model, if it decides to | `chat()` — deterministically |
| Model round trips | 2 | 1 |
| Failure mode | Model answers ungrounded | Read succeeds or throws |
| Cost | Tool schema in every request | Zero until read happens |

> **This is the payoff.** The application knows the guidelines are relevant to this assistant. Making the model rediscover that fact on every request is wasted tokens and a new failure mode.

## 8. Production Concerns for Resources

### Authorisation per URI

A Resource handler is an ordinary function. If the URI contains a user id, the handler must verify that the *caller* is allowed to read *that* user's data:

```ts
// Pseudocode — authorisation inside the handler
async function readUserResource(uri, { username }, session) {
  if (session.user.username !== username && !session.user.isAdmin) {
    throw new Error("Not authorised for this resource");
  }
  return loadProfile(username);
}
```

Without this check, a template becomes an enumeration oracle — every customer record readable by incrementing a number.

### Validate dynamic URIs

| Attack | Defence |
|---|---|
| Path traversal in `file://{path}` | Resolve and verify inside an allow-listed root |
| SQL injection | Parameterise; never interpolate URI into a query |
| Unbounded fan-out | Cap template expansion; exact match, not glob |
| Cross-tenant leakage | Bind tenant from session, not from URI |

### Cache strategy

| Content kind | Strategy |
|---|---|
| Static (guidelines, policies) | Process lifetime |
| Slowly changing (schemas, docs) | TTL + `lastModified` |
| Per-user, fast-moving | Short TTL, keyed by `uri + user`; never shared |
| Huge documents | Cache selected slice, not whole thing |

### Prompt injection defence

Resource content is text that lands in a model's context. If it comes from an untrusted source, it is untrusted text with system-level authority once in the prompt:

```ts
// Pseudocode — delimiting untrusted resource content
function buildPrompt(userMessage: string, resources: Resource[]) {
  const delimited = resources
    .map(r => `=== RESOURCE: ${r.uri} ===\n${r.text}\n=== END RESOURCE ===`)
    .join("\n\n");

  return `You are a helpful assistant.
Use the following reference materials (delimited) to answer.

${delimited}

=== USER MESSAGE ===
${userMessage}`;
}
```

---

# Part III — How the Application Chooses a Resource

## 9. MCP Does Not Choose

Calling Resources application-controlled does not mean the application automatically understands natural language. MCP does not prescribe how a host selects a Resource. The application can use several strategies:

```mermaid
flowchart TD
    CAT["Catalogue from<br/>resources/list"] --> SEL{"Selection strategy"}
    SEL --> S1["1. User selection"]
    SEL --> S2["2. Application state"]
    SEL --> S3["3. Retrieval / search"]
    SEL --> S4["4. LLM-based routing"]
    SEL --> S5["5. Rules"]
    S1 --> READ["resources/read { uri }"]
    S2 --> READ
    S3 --> READ
    S4 --> READ
    S5 --> READ
    READ --> CTX["Content into LLM context"]

    style SEL fill:#6c7086,color:#1e1e2e
    style READ fill:#94e2d5,color:#1e1e2e
    style CTX fill:#cba6f7,color:#1e1e2e
```

Strategies are not exclusive — real hosts combine them (rules → retrieval → user override → LLM fallback).

## 10. The Five Selection Strategies

### Strategy 1 — User selection

The user explicitly attaches a Resource (buttons, menus, slash commands). Perfect precision and explainability, zero ranking cost. The description (Chapter 06) is critical — a checkbox labelled `company://leave-policy` is unusable; one labelled *"Company policies regarding leave, holidays, maternity leave and time off."* is self-explanatory.

### Strategy 2 — Application state

The application already knows what context is relevant:

| Application | State it already has | Resource it implies |
|---|---|---|
| IDE | Open file, selection, cursor | `file://project/src/OrderController.java` |
| Support console | Open ticket | `ticket://48213` |
| Admin dashboard | Current tenant | `tenant://acme/config` |

**No additional AI decision is required** — every problem solved with application state is a problem you do not have to solve with a ranking model, and cannot be hallucinated.

### Strategy 3 — Retrieval / search

Embed the user query and Resource descriptions, rank by similarity, read the top match:

1. Take the user query
2. Embed it (same model as Resource descriptions)
3. Compute similarity against all Resource descriptions
4. Rank and pick the best match
5. Call `resources/read` on the top match

### Strategy 4 — LLM-based routing

Send the list to the model and ask it to pick. Most expensive fallback; use only when rules and retrieval don't suffice.

### Strategy 5 — Rules

Narrow the shortlist (e.g. "only leave-policy resources"). ACL-filtered.

## 11. The Resources-vs-Tools Rule

| Question | Answered by |
|---|---|
| Should the **model** decide to call it? | Tool |
| Should the **application** provide it as context? | Resource |

The earlier question has larger blast radius. If the model can invoke something with side effects, that is a Tool. If the application just needs to supply context, that is a Resource.

> **If the application already knows the answer to "which resource?", do not ask a model.**

---

# Part IV — Prompts: Reusable Interaction Templates

## 12. What an MCP Prompt Is

Resources solved reusable context. Prompts solve **reusable ways of interacting**. A Prompt is a reusable message template exposed by an MCP Server — a recipe with parameters that change:

```text
Plan My Day        availableHours = 4
Prioritize My Tasks
Review My Workload
Create Weekly Plan
```

| | Tool | Resource | Prompt |
|---|---|---|---|
| What the server ships | A callable function | A document | A message template |
| Discovered with | `tools/list` | `resources/list` | `prompts/list` |
| Obtained with | `tools/call` | `resources/read` | `prompts/get` |
| Identified by | `name` | `uri` | `name` |
| Takes arguments | Yes (schema) | Via URI template | Yes (argument list) |

Prompts let a server say *"what are useful ways to work with this system?"* — domain knowledge only the server author has.

## 13. Prompts Are User-Controlled

Prompts are surfaced as buttons, menus, slash commands, or forms. The user explicitly chooses; the model does not independently decide to invoke `plan_day`:

```mermaid
flowchart TD
    U["USER"] -->|"clicks / types /plan"| UI["Client UI<br/>buttons · menus · slash commands"]
    UI -->|"prompts/get<br/>name + arguments"| S["MCP Server"]
    S -->|"messages"| C["MCP Client"]
    C --> L["LLM"]

    style U fill:#fab387,color:#1e1e2e
    style S fill:#f9e2af,color:#1e1e2e
    style L fill:#cba6f7,color:#1e1e2e
```

| Property | Why it matters |
|---|---|
| Predictable cost | A prompt is a few messages the user asked for |
| Explicit intent | The user said "plan my day" — no inference |
| Discoverable | A visible menu teaches what the system is for |
| Safe | Prompts are not side-effecting |

## 14. MCP Prompt ≠ LLM Response

```mermaid
flowchart LR
    P["MCP Prompt<br/>(template + args)"] --> M["Messages<br/>role: user"]
    M --> C["MCP Client"]
    C --> L["LLM"]
    L --> R["Final Response"]

    style P fill:#cba6f7,color:#1e1e2e
    style M fill:#f9e2af,color:#1e1e2e
    style R fill:#a6e3a1,color:#1e1e2e
```

| | MCP Server (Prompt) | LLM |
|---|---|---|
| Produces | Messages — text, roles, arguments substituted | The answer |
| Deterministic? | Yes | No |
| Testable? | Yes — compare messages | Only statistically |
| Cost | Zero tokens | Tokens, latency, money |

## 15. Prompt Arguments

One parameterised prompt beats many name variants:

```text
plan_day(availableHours)   ≻   plan_day_2_hours, plan_day_4_hours, plan_day_8_hours
```

```ts
// Pseudocode — server prompt registration
server.registerPrompt(
  "plan_day",
  {
    description: "Plan pending tasks for the available time",
    argsSchema: {
      availableHours: { description: "Number of hours available today", required: true },
    },
  },
  ({ availableHours }) => ({
    description: "Plan pending tasks for the day",
    messages: [
      {
        role: "user",
        content: { type: "text", text: planDay(availableHours) },
      },
    ],
  }),
);

// Pseudocode — the template is a pure function
export function planDay(availableHours) {
  return `Help me plan my pending tasks for today.
First check my current pending tasks using the available task tools.
I have ${availableHours} hours available today.
Give me a concise and ordered plan.`;
}
```

The template is a **pure function of its arguments** — testable without an LLM.

### Wire shapes

`prompts/list` request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {}
}
```

`prompts/list` response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "plan_day",
        "description": "Plan pending tasks for the available time",
        "arguments": [
          { "name": "availableHours", "description": "Number of hours available today", "required": true }
        ]
      }
    ]
  }
}
```

`prompts/get` request:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": { "name": "plan_day", "arguments": { "availableHours": "4" } }
}
```

`prompts/get` response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Plan pending tasks for the day",
    "messages": [
      {
        "role": "user",
        "content": { "type": "text", "text": "Help me plan my pending tasks for today... I have 4 hours available today..." }
      }
    ]
  }
}
```

| Field | Notes |
|---|---|
| `arguments[].required` | Host validates before calling; renders a form field |
| `messages[]` | A list — a prompt may return several messages |
| `role` | `user` or `assistant` — seeds conversation shape |
| `description` | Travels in `prompts/list` and in the result; keep consistent |

### Multi-message prompts

| Pattern | Shape | Use |
|---|---|---|
| Instruction + example | `user` then `assistant` message | Few-shot formatting |
| System-like preamble | `user` message establishing constraints | When host has no separate system channel |

### Argument completion

`completion/complete` lets a host suggest values while the user types:

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt", "name": "plan_day" },
    "argument": { "name": "availableHours", "value": "4" }
  }
}
```

### Prompt hygiene

| Concern | Practice |
|---|---|
| Versioning | Prompt text is a product artefact; changes alter model behaviour |
| Arguments are strings | Parse and validate on the server; never trust |
| No untrusted interpolation | Delimit user-supplied arguments pasted into prompts |
| No secrets | Never template credentials, tokens, personal data |
| Test the template | Pure functions deserve unit tests |
| Name for the user | `plan_day` renders as "Plan My Day" |

## 16. Reading a Prompt from the Client

```ts
// Pseudocode — full prompt fetch and LLM call
async function planDay(hours: string): Promise<string> {
  // 1. USER CONTROLLED
  const promptResult = await mcpClient.getPrompt({
    name: "plan_day",
    arguments: { availableHours: hours },
  });

  // 2. Build full system prompt
  const systemPrompt = `You are a task management assistant.
Here are my task management guidelines:
${await readResourceText("task://guidelines")}
You can call the following tools:
${(await mcpClient.listTools()).map(t => `- ${t.name}: ${t.description}`).join("\n")}`;

  // 3. LLM call — the only non-deterministic step
  return askModel({ system: systemPrompt, user: promptResult.messages[0].content.text });
}
```

Read the method names as an architectural diagram:

| Call | Talks to | Carries |
|---|---|---|
| `mcpClient.getPrompt(...)` | MCP Server | `name` + `arguments` |
| `chatClient.prompt(...)` | LLM | The generated message |

`getPrompt()` only retrieves reusable messages — the LLM call happens afterward.

---

# Part V — Bringing It All Together

## 17. One Request, Three Controls

`GET /plan?hours=4` walks three steps, each controlled by a different actor:

### Step 1 — User Controls the Prompt

```mermaid
sequenceDiagram
    participant U as User
    participant C as MCP Client
    participant S as MCP Server

    U->>C: GET /plan?hours=4  (≡ clicking "Plan My Day", hours = 4)
    C->>S: prompts/get { name: "plan_day", arguments: { availableHours: "4" } }
    S-->>C: messages [ "Help me plan my pending tasks... I have 4 hours..." ]
    Note over C: USER-CONTROLLED step complete
```

### Step 2 — Application Controls the Resource

```mermaid
sequenceDiagram
    participant A as Application
    participant S as MCP Server

    A->>S: resources/read { uri: "task://guidelines" }
    S-->>A: contents [ { text: "Task Management Guidelines: ..." } ]
    Note over A: APPLICATION-CONTROLLED step complete
```

### Step 3 — Model Controls the Tool

```mermaid
sequenceDiagram
    participant A as Application
    participant L as LLM
    participant S as MCP Server

    A->>L: prompt message + guidelines + tool schemas
    L-->>A: call list_tasks
    A->>S: tools/call { name: "list_tasks" }
    S-->>A: pending tasks
    Note over L: MODEL-CONTROLLED step complete
```

### The complete flow

```mermaid
flowchart TD
    U["USER"] -->|"selects Prompt"| P["PROMPT<br/>plan_day(4)<br/>User Controlled"]
    P -->|"messages"| A["APPLICATION<br/>reads task://guidelines<br/>Application Controlled"]
    A -->|"prompt + guidelines + tool schemas"| L["LLM"]
    L -->|"decides it needs tasks"| T["list_tasks<br/>Model Controlled"]
    T --> S["MCP SERVER"]
    S --> PT["Pending Tasks"]
    PT --> L2["LLM"]
    L2 --> F["Final Day Plan"]

    style U fill:#fab387,color:#1e1e2e
    style P fill:#cba6f7,color:#1e1e2e
    style A fill:#a6e3a1,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style S fill:#f9e2af,color:#1e1e2e
    style F fill:#a6e3a1,color:#1e1e2e
```

> **Three actors, three controls, one request.** The user chose *what to ask*; the application chose *what context to add*; the model chose *what to call*.

### The same request in JS/TS pseudo-code

```ts
async function planDay(hours: string): Promise<string> {
  // 1. USER CONTROLLED
  const promptMessages = await mcpClient.getPrompt({
    name: "plan_day",
    arguments: { availableHours: hours },
  });

  // 2. APPLICATION CONTROLLED
  const { contents } = await mcpClient.readResource({ uri: "task://guidelines" });
  const guidelines = contents[0].text;

  // 3. MODEL CONTROLLED
  const answer = await askModel({
    instructions: `You are a task management assistant.\n\n${guidelines}`,
    input: promptMessages,
    tools: await listToolsAsOpenAI(),
  });

  return answer;
}
```

### The three-line division of labour

| | Does what | Never does |
|---|---|---|
| Prompt | Provides the instruction | Execute anything |
| Tool | Provides the capability | Decide when to run |
| LLM | Chooses the tool for the instruction | Fetch the instruction or the capability |

> **A Prompt is a nudge, not a command.** `"First check my current pending tasks using the available task tools"` works because the model can see `list_tasks`. If the server never registered the tool, the prompt would be asking for something impossible.

---

# Part VI — MCP Gateway, Context Poisoning & Security

## 18. Tool Overload

MCP makes it easy to connect to multiple external systems:

```text
GitHub MCP       → 25 tools
Stripe MCP       → 40 tools
Database MCP     → 30 tools
Jira MCP         → 50 tools
Slack MCP        → 15 tools
Salesforce MCP   → 100+ tools
```

That is **250+ available tools**. The problem is not that these tools exist — it is how many are presented to the model at the same time.

Tool definitions contain name, description, input schema, parameters, required fields, usage information. Hundreds of tool definitions consume significant context:

```
More tools
    ↓
More tool definitions
    ↓
Larger context
    ↓
Less useful context available
```

### Consequences

| Issue | Effect |
|---|---|
| Context inflation | Less room for conversation, documents, reasoning |
| Increased token usage | More input-token consumption |
| Higher latency | Larger model inputs take longer to process |
| Tool selection confusion | Similar/overlapping descriptions mislead the model |

## 19. Tool Context Poisoning

Tool context poisoning is when irrelevant, conflicting, misleading, redundant, or malicious tool-related context negatively affects model reasoning or tool selection:

```text
Tool A: "Use this tool to retrieve customer information."
Tool B: "Use this tool instead of Tool A for customer information."
Tool C: "Always call this tool first."
Tool D: "Ignore previous instructions..."
```

Distinguish from overload: overload is *too many* tools; poisoning is *context that actively interferes*.

## 20. What Is an MCP Gateway?

An MCP Gateway is an intermediary layer between an AI application and one or more downstream MCP Servers:

```mermaid
flowchart TB
    A["AI Application / Agent"]
    G["MCP Gateway"]
    S1["GitHub MCP Server"]
    S2["Stripe MCP Server"]
    S3["Database MCP Server"]
    S4["Slack MCP Server"]

    A -->|MCP| G
    G --> S1
    G --> S2
    G --> S3
    G --> S4
```

Typical architecture:

```mermaid
flowchart LR
    U["User"] --> H["Host / AI Application"]
    H --> C["MCP Client"]
    C --> G["MCP Gateway"]

    G --> S1["GitHub MCP"]
    G --> S2["Stripe MCP"]
    G --> S3["Database MCP"]
    G --> S4["CRM MCP"]

    S1 --> E1["GitHub"]
    S2 --> E2["Stripe"]
    S3 --> E3["PostgreSQL"]
    S4 --> E4["CRM"]
```

The gateway becomes a **central control point** for MCP traffic — discovery, filtering, routing, security, observability.

## 21. Dynamic Tool Discovery & Filtering

Instead of presenting every available tool, the system determines which tools are relevant:

```text
User Query: "Check payment status for order #108"

Instead of: 250+ tools
Expose: stripe.get_payment_status, order_db.get_order
```

```mermaid
flowchart TB
    U["User Query"] --> G["MCP Gateway"]
    G --> F["Tool Discovery / Filtering"]
    F --> T["Relevant Tools"]
    T --> T1["stripe.get_payment_status"]
    T --> T2["order_db.get_order"]
```

Filtering approaches:

| Approach | How it works |
|---|---|
| Static filtering | User role → allowed tool set |
| Rule-based filtering | `if intent == "payment"` → expose payment tools |
| Semantic search | Tool descriptions indexed; embedded query retrieves matches |
| Intent classification | Query → intent → tool set |
| Hybrid | Authorization + rules + semantic search + metadata → relevant set |

## 22. Authentication & Authorization

| | Answers | Example |
|---|---|---|
| Authentication (AuthN) | Who are you? | User → Identity Provider → Authenticated request |
| Authorization (AuthZ) | What are you allowed to do? | RBAC; support agent reads customers but cannot issue refunds |

## 23. Credential Management

```
Before (bad):                    After (good):
LLM                              LLM
  ↓                                ↓
Stripe Secret Key              MCP Client
                                  ↓
                              Gateway
                                  ↓
                          Credential / Secret Management
                                  ↓
                              Stripe API
```

The model should receive **tool results**, not raw API secrets.

## 24. Request Routing

```text
tools/call
name = stripe.get_payment_status
    ↓
stripe.*   →   Stripe MCP Server
github.*   →   GitHub MCP Server
db.*       →   Database MCP Server
```

## 25. Observability, Rate Limiting & Abuse Protection

The gateway records tool name, request metadata, user/session identity, execution time, success/failure, errors, server used, rate-limit events. Sensitive parameters should not be logged in raw form.

Rate limit policies: `100 requests/minute/user`, `20 payment operations/minute`, `5 expensive database queries/minute`. Rate limiting alone does not prevent agent loops — robust agents need explicit execution limits.

## 26. Complete Gateway Flow

```mermaid
flowchart TB
    U["User"] --> A["AI Application / Agent"]
    A --> C["MCP Client"]
    C --> G["MCP Gateway"]

    G --> F["Tool Discovery<br/>Filtering"]
    G --> AUTH["Authentication<br/>Authorization"]
    G --> ROUTE["Routing"]
    G --> OBS["Logging / Metrics<br/>Tracing"]

    ROUTE --> S1["GitHub MCP Server"]
    ROUTE --> S2["Stripe MCP Server"]
    ROUTE --> S3["Database MCP Server"]

    S1 --> E1["GitHub"]
    S2 --> E2["Stripe"]
    S3 --> E3["PostgreSQL"]
```

## 27. Direct MCP vs Gateway

| Aspect | Direct MCP | Gateway |
|---|---|---|
| Topology | Client connects to multiple servers | Client connects through central gateway |
| Tool management | Distributed | Centralized |
| Tool filtering | Application-dependent | Centralized |
| Routing | Client manages connections | Gateway routes |
| Authentication | Distributed | Centralized |
| Authorization | Application/server dependent | Central policy |
| Credentials | Distributed | Centrally managed |
| Observability | Distributed | Centralized |
| Rate limiting | Per-service/application | Centralized |
| Complexity | Simpler initially | More infrastructure |
| Scalability | Harder to manage | Useful for larger environments |

## 28. Enterprise MCP Architecture

```mermaid
flowchart TB
    U1["User"]
    U2["Developer"]
    U3["Support Agent"]
    A["AI Applications"]
    G["MCP Gateway"]
    SEC["Security Layer"]
    FILTER["Tool Discovery & Filtering"]
    ROUTE["Routing"]
    OBS["Observability"]
    GH["GitHub MCP"]
    ST["Stripe MCP"]
    DB["Database MCP"]
    CRM["CRM MCP"]
    SL["Slack MCP"]

    U1 --> A
    U2 --> A
    U3 --> A
    A --> G
    G --> SEC
    G --> FILTER
    G --> ROUTE
    G --> OBS
    ROUTE --> GH
    ROUTE --> ST
    ROUTE --> DB
    ROUTE --> CRM
    ROUTE --> SL
```

## 29. Important Design Principle

Do not assume:

```
More tools → More context → More selection complexity → Potentially worse tool selection
```

A better approach:

```
Many available capabilities → Discovery / Filtering → Relevant capabilities → LLM
```

The goal is not to reduce the total number of tools. The goal is to **reduce unnecessary tool context presented to the model for a particular task**.

---

# Part VII — Production Checklist

## Capability and contract

- [ ] Server advertises exactly the primitives it implements in `initialize`
- [ ] Every Tool has a description readable by someone who cannot see the code
- [ ] Every Resource has a description that doubles as retrieval text and an accurate MIME type
- [ ] Every Prompt has a description; every required argument is marked `required: true`
- [ ] Resource templates used for parameterised families; `resources/list` paginated

## Security

- [ ] Authorisation enforced inside every handler, per URI and per argument
- [ ] Candidate catalogue ACL-filtered before ranking
- [ ] Dynamic URIs validated (path traversal, injection, tenant leakage)
- [ ] Resource/prompt content treated as untrusted text; delimited in prompts
- [ ] No secrets templated into Prompts
- [ ] Tool calls with side effects require consent and audit trail

## Context and cost

- [ ] Per-resource character cap and total context cap enforced
- [ ] Number of resources attached per request bounded
- [ ] Truncation explicit — model told content was cut
- [ ] Static resources cached; dynamic ones TTL; per-user caches never shared

## Reliability

- [ ] Read handlers side-effect free; unknown URIs fail loudly
- [ ] Timeouts differ for `prompts/get` (local), `resources/read` (network), LLM call (seconds)
- [ ] Server starts and serves without an LLM or API key

## Observability and evaluation

- [ ] One log line per selection: strategy, candidates, chosen URIs, scores, bytes
- [ ] One log line per tool call: name, argument hash, latency, outcome
- [ ] One log line per prompt use: prompt name, argument shape (not values), latency
- [ ] Golden set for resource selection (`query → expected URI`) runnable offline
- [ ] Golden set for prompts (`args → expected message content`) runnable offline

## The order to build in

```mermaid
flowchart LR
    A["1 · Tools<br/>(Lecture 14)"] --> B["2 · Resources<br/>(this lecture)"]
    B --> C["3 · Prompts<br/>(this lecture)"]
    C --> D["4 · Selection logic"]
    D --> E["5 · Security + budgets"]
    E --> F["6 · Observability + eval"]

    style A fill:#89b4fa,color:#1e1e2e
    style B fill:#94e2d5,color:#1e1e2e
    style C fill:#cba6f7,color:#1e1e2e
    style F fill:#a6e3a1,color:#1e1e2e
```

> **Do not build all three primitives because the protocol has three.** Build a Tool when the model must decide; a Resource when you know the context is needed; a Prompt when users keep asking for the same workflow. The primitives are a vocabulary, not a checklist.

---

# Misconceptions

| Misconception | Reality |
|---|---|
| "It returns data, so it's a Tool." | Resources also return data; the distinction is **intent**, not payload. |
| "A Resource becomes part of the LLM context automatically." | No — the application must `resources/read` it and place it in the prompt. |
| "URIs are URLs the client fetches." | No — the URI is an identifier the server resolves. |
| "The model decides to invoke Prompts." | No — Prompts are user-controlled; the model does not decide when. |
| "A Prompt generates the final AI answer." | No — a Prompt generates messages the LLM then answers. |
| "Gateway filtering is required by MCP." | No — tool filtering is an architectural pattern around MCP, not a protocol primitive. |
| "More tools = more powerful agent." | No — more tools means more context, more latency, worse selection. |

---

# Glossary

| Term | Definition |
|---|---|
| **MCP** | Model Context Protocol — standardises how AI applications interact with external capability servers. |
| **Host** | The AI application the user interacts with (desktop app, IDE plugin, CLI, agent runtime). |
| **Client** | Component responsible for communicating with an MCP server over MCP. |
| **Server** | Program exposing capabilities through MCP: Tools, Resources, Prompts. |
| **Tool** | Callable capability the model decides to invoke; `tools/list` / `tools/call`. |
| **Resource** | Addressable context/data the application supplies; `resources/list` / `resources/read`. |
| **Prompt** | Reusable message template the user invokes; `prompts/list` / `prompts/get`. |
| **JSON-RPC 2.0** | The message format MCP uses (`jsonrpc`, `id`, `method`, `params`). |
| **URI** | A Resource address, not necessarily a URL — the server resolves it, not the client. |
| **MIME type** | Declares content kind (`text/plain`, `application/json`, `image/png`). |
| **Tool context poisoning** | Irrelevant/conflicting/misleading/redundant/malicious tool information degrading model reasoning. |
| **MCP Gateway** | Intermediary layer providing filtering, routing, auth, observability, rate limiting. |
| **Tool overload** | Too many tool definitions exposed to the model at once. |
| **Template resource** | Single definition covering a family of URIs (`user://{username}`); `resources/templates/list`. |

---

# Self-Check Questions

1. What are the three primitives an MCP Server can expose, and what is each for?
2. What is the load-bearing distinction between Tools, Resources, and Prompts — purpose or control?
3. Which primitive does the **model** control? The **application**? The **user**?
4. Name the two Resource operations and explain the difference in cost and payload.
5. Is a Resource URI a URL? Why or why not?
6. A Resource returns data. Does that alone make it a Tool? Explain.
7. What does `resources/list` return — metadata or content?
8. Name four Resource selection strategies the application can use.
9. What does an MCP Prompt return — messages or a final answer?
10. Are Prompts model-controlled or user-controlled?
11. Why prefer one `plan_day(availableHours)` over `plan_day_2_hours`, `plan_day_4_hours`, …?
12. Name the two Prompt operations.
13. Which call talks to the MCP Server: `getPrompt()` or `chatClient.prompt()`?
14. Name three tool-filtering approaches a gateway can implement.
15. What is tool context poisoning, and how is it different from tool overload?
16. Name four gateway responsibilities beyond routing.
17. Why should a gateway manage credentials rather than exposing secrets to the model?
18. What is the one-sentence mental model for Tools / Resources / Prompts?

---

# Final Architecture

```mermaid
flowchart TD
    U["USER"] -->|"invokes Prompt"| P["PROMPT<br/>plan_day(4)<br/>User Controlled"]
    P -->|"messages"| A["APPLICATION<br/>reads task://guidelines<br/>Application Controlled"]
    A -->|"prompt + guidelines + tool schemas"| L["LLM"]
    L -->|"decides to call"| T["list_tasks<br/>Model Controlled"]
    T --> G["MCP GATEWAY<br/>filter · route · observe"]
    G --> S["MCP SERVER<br/>taskServer"]
    S -->|"tools / resources / prompts"| T2["External Systems"]

    style U fill:#fab387,color:#1e1e2e
    style P fill:#cba6f7,color:#1e1e2e
    style A fill:#a6e3a1,color:#1e1e2e
    style L fill:#cba6f7,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style G fill:#f38ba8,color:#1e1e2e
    style S fill:#f9e2af,color:#1e1e2e
    style T2 fill:#6c7086,color:#1e1e2e
```

---

# After This Lecture

**Gate:** you can state, for every capability in your server, whether the model, the app or the user owns the decision.

**Build:** one "kitchen-sink" MCP server exposing all three primitives (Tools, Resources, Prompts), plus a gateway in front that filters, routes and audits every call.

**Next lecture:** Lecture 23 — Claude Skills & the Agent Skills Open Standard.

---

*End of Lecture 22 Complete Notes. Source mapping: `FDE L15 · GAC D15`.*
