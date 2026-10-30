# Chapter 04: Building Resources — Static, Dynamic and Templated

> **Chapter Goal:** Chapter 03 described the shape of a Resource. This chapter builds one — first the trivial static case, then the client side that actually reads it, and finally the two forms that make Resources scale: **dynamic** resources backed by live data, and **templated** resources addressed by parameter.
>
> At the end of this chapter you should be able to answer: *How do I register a Resource, how does my application read it, and how do I expose ten thousand of them without writing ten thousand definitions?*

---

## 4.1 The Starting Point

> **Suppose our existing MCP Server already contains task-management Tools.**

That is the whole premise: Lecture 14's `taskServer` already works. We are *adding* a primitive to a running server, not building a new one.

```text
taskServer
├── Tools
│   ├── create_task
│    ├── list_tasks
│    └── complete_task
```

---

## 4.2 Registering a Static Resource

> **We can add another component for Resources:**

```ts
// Pseudocode — Node.js MCP server, static resource
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

Read the registration against Chapter 03's anatomy — it is a one-to-one mapping:

| Chapter 03 field | In the registration | Value |
|---|---|---|
| URI | `uri` | `task://guidelines` |
| Name | `name` | `task-guidelines` |
| Description | `description` | `Guidelines for managing and prioritizing tasks` |
| MIME Type | `mimeType` | `text/plain` |
| Content | the handler's return value | the guidelines string |

> **Notice what is absent:** there is no `inputSchema`, no argument list, no side effect. The handler takes nothing and returns a constant. That is what a *static* Resource is.

---

## 4.3 The Server Now Exposes Two Primitives

> **The server now exposes:**

```mermaid
flowchart TD
    S["taskServer"]
    S --> T["Tools"]
    S --> R["Resources"]
    T --> T1["create_task"]
    T --> T2["list_tasks"]
    T --> T3["complete_task"]
    R --> R1["task://guidelines"]

    style S fill:#f9e2af,color:#1e1e2e
    style T fill:#89b4fa,color:#1e1e2e
    style R fill:#94e2d5,color:#1e1e2e
```

> **When the application starts, the framework detects the registration and registers the Resource with the MCP Server.**

The registration is *declarative and automatic*. You did not write `resources/list` plumbing, you did not write a dispatcher, and you did not touch the transport. Framework detection is the whole integration cost.

A client can then discover it through:

```text
resources/list
```

and read it through:

```text
resources/read
task://guidelines
```

```mermaid
sequenceDiagram
    participant C as MCP Client
    participant S as taskServer

    C->>S: resources/list
    S-->>C: [ { uri: "task://guidelines", name: "task-guidelines", description: "...", mimeType: "text/plain" } ]
    C->>S: resources/read { uri: "task://guidelines" }
    S-->>C: contents [ { text: "Task Management Guidelines: ..." } ]
```

---

## 4.4 Reading the Resource from the MCP Client

> **Unlike Tools, we do not expose the Resource to the model through `defaultTools(...)`.**
> **Instead, the application explicitly reads it.**

This is the sentence that separates the primitives in practice. A Tool is *registered with the model*; a Resource is *read by your code*.

A simplified example:

```ts
// Pseudocode — reading a resource from the client
async function readTaskGuidelines(): Promise<string> {
  const result = await mcpClient.readResource({
    uri: "task://guidelines"
  });

  // contents is an array of blocks; this one is text
  const content = result.contents[0];
  if (content.type !== "text") {
    throw new Error("Expected text resource, got blob");
  }

  return content.text;
}
```

Three things are happening, and each one is a design decision:

| Step | Code | Meaning |
|---|---|---|
| 1. Ask | `readResource({ uri: "task://guidelines" })` | The **application** names the URI — the model never sees this |
| 2. Unwrap | `result.contents[0]` cast to text | `contents` is an array of blocks; this one is text |
| 3. Extract | `content.text` | You now hold a plain string you can put anywhere in the prompt |

> **Why the cast matters:** a Resource may return `text` or `blob`. Casting to text is the code asserting *"I know this resource is textual"* — which is exactly the assumption the declared `mimeType: text/plain` promises. If the server ever changes that, the cast becomes the crash site. That is a *good* crash: it is loud and early.

---

## 4.5 Wiring the Resource into the Prompt

> **The flow becomes:**

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

> **For example:**

```ts
// Pseudocode — wiring resource into system prompt
async function chat(message: string): Promise<string> {
  const guidelines = await readTaskGuidelines();

  return askModel({
    system: `You are a task management assistant.

Use the following task management guidelines
whenever relevant:

${guidelines}`,
    user: message,
  });
}
```

> **Now a question such as `When should I schedule meetings?` can be answered using the MCP Resource:**
>
> `Meetings should preferably be scheduled after 2 PM.`

```mermaid
flowchart LR
    Q["'When should I schedule meetings?'"] --> SYS["System prompt<br/>+ task://guidelines content"]
    SYS --> L["LLM"]
    L --> A["'Meetings should preferably<br/>be scheduled after 2 PM.'"]

    style SYS fill:#94e2d5,color:#1e1e2e
    style L fill:#cba6f7,color:#1e1e2e
```

### Why this is better than the Tool version

Compare with Chapter 02's `getCodingGuidelines()` tool:

| | Guidelines as a Tool | Guidelines as a Resource |
|---|---|---|
| Who fetches it | The model, if it decides to | `chat()` — deterministically, every time |
| Model round trips | 2 (call, then answer) | 1 |
| Failure mode | Model answers ungrounded and nobody notices | The read either succeeds or throws |
| Cost | Tool schema in every request | Zero until the read happens |

> **This is the payoff of the whole primitive.** The application knows the guidelines are relevant to *this* assistant. Making the model rediscover that fact on every request is wasted tokens and a new failure mode.

---

## 4.6 Static and Dynamic Resources

> **A Resource does not have to contain hardcoded text.**

```text
task://guidelines
```

> **is a simple static Resource.**

> **A Resource could also represent dynamic information:**

```text
user://123/profile
database://customer/938
project://coder-army/status
```

> **The Resource handler could internally fetch data from:**
> - a database,
> - another API,
> - the filesystem,
> - application state,
> - or another service.

```mermaid
flowchart LR
    R["resources/read<br/>user://123/profile"] --> H["Resource handler"]
    H --> DB["Database"]
    H --> API["Another API"]
    H --> FS["Filesystem"]
    H --> ST["Application state"]
    H --> SV["Another service"]
    DB --> C["Content"]
    API --> C
    FS --> C
    ST --> C
    SV --> C

    style H fill:#94e2d5,color:#1e1e2e
    style C fill:#a6e3a1,color:#1e1e2e
```

### Static vs dynamic at a glance

| | Static | Dynamic |
|---|---|---|
| Content source | A constant in the handler | Database / API / filesystem / service |
| Changes over time | Never (until redeploy) | Every read |
| Caching | Cache aggressively, forever | Cache with a TTL or an etag |
| Failure modes | None | Timeouts, 404s, permissions |
| Example | `task://guidelines` | `user://123/profile`, `database://customer/938` |

> **The engineering consequence:** a dynamic Resource turns `resources/read` into a **network call with a failure mode**. From Chapter 03's rule that reads are side-effect free, we must add: reads are also **slow and can fail**, and the host must be given a way to tell the difference between *"empty"* and *"broken"*.

```ts
// Pseudocode — a dynamic resource handler that fails honestly
server.registerResource(
  "user-profile",
  "user://{username}",
  { description: "Profile of a user", mimeType: "application/json" },
  async (uri, { username }) => {
    const profile = await db.users.findByUsername(username);

    if (!profile) {
      // Do NOT return "{}" — an empty object is indistinguishable from a real empty profile
      throw new Error(`No profile for user '${username}'`);
    }

    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(profile) },
      ],
    };
  },
);
```

---

## 4.7 Resource Templates — One Definition, Many Resources

> **Suppose an application exposes user profiles:**

```text
user://1
user://2
user://3
```

> **Creating a separate Resource definition for every user would not be practical.**
>
> **A URI template can instead be used:**

```text
user://{username}
```

> **Example:**

```ts
// Pseudocode — templated resource registration
server.registerResource(
  "user-profile",
  "user://{username}",
  { description: "Profile of a user", mimeType: "application/json" },
  async (uri, params) => {
    const username = params.username;
    const profile = await db.users.findByUsername(username);

    if (!profile) {
      throw new Error(`No profile for user '${username}'`);
    }

    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(profile) },
      ],
    };
  },
);
```

> **The server can now resolve `user://aditya` or `user://ravi` dynamically.**

```mermaid
flowchart LR
    T["Template<br/>user://{username}"] --> A["user://aditya"]
    T --> B["user://ravi"]
    T --> C["user://123"]
    A --> H["One handler:<br/>userProfile(username)"]
    B --> H
    C --> H

    style T fill:#94e2d5,color:#1e1e2e
    style H fill:#f9e2af,color:#1e1e2e
```

### Templates vs enumerating resources

| | List every resource | Use a template |
|---|---|---|
| Definitions | One per instance | One for the family |
| `resources/list` size | Grows without bound | Constant |
| Discovery | The client sees every instance | The client learns the **pattern** |
| Client UI | A long, unusable list | A form field, or a host-driven URI |
| Wire method | `resources/list` | `resources/templates/list` |

```text
student://{studentId}/progress
company://policies/{policyName}
file:///{path}
```

> **The rule of thumb:** if the set of resources is *finite and small*, list them. If it is *parameterised or unbounded*, template it. A server that enumerates a million users in `resources/list` has turned discovery into a denial-of-service.

### Templates are discovered separately

| Method | Returns |
|---|---|
| `resources/list` | Concrete, readable URIs |
| `resources/templates/list` | `uriTemplate` patterns plus metadata |

A well-behaved host shows concrete resources as attachable items and templates as *"type a value"* inputs — and many hosts pair templates with **argument autocompletion** (`completion/complete`) so the user gets IDE-style suggestions while typing the parameter.

---

## 4.8 Beyond the Lecture: Production Concerns for Resources

The lecture builds the happy path. These are the concerns that appear once a Resource handler touches real systems.

### 1. Authorisation is on *you*, per URI

A Resource handler is an ordinary function with a URI argument. If the URI contains a user id, the handler must verify that the *caller* is allowed to read *that* user's data.

```ts
// Pseudocode — authorisation belongs inside the handler
async function readUserResource(uri, { username }, session) {
  if (session.user.username !== username && !session.user.isAdmin) {
    throw new Error("Not authorised for this resource");
  }
  return loadProfile(username);
}
```

> **The failure mode to avoid:** `database://customer/938` where `938` comes from the model or the user. Without a check, a template becomes an enumeration oracle — every customer record readable by incrementing a number.

### 2. Validate and constrain dynamic URIs

| Attack | Defence |
|---|---|
| Path traversal in `file://{path}` | Resolve and verify the real path stays inside an allow-listed root |
| Injection into a SQL-backed URI | Parameterise; never interpolate the URI into a query |
| Unbounded fan-out | Cap template expansion; require an exact match, not a glob |
| Cross-tenant leakage | Bind the tenant from the **session**, not from the URI |

### 3. Cache like a read-heavy system

| Content kind | Strategy |
|---|---|
| Static (guidelines, policies) | Cache for the process lifetime |
| Slowly changing (schemas, docs) | TTL + `lastModified` |
| Per-user, fast-moving | Short TTL, keyed by `uri + user`; never shared across users |
| Huge documents | Do not cache the whole thing — cache the *selected slice* |

### 4. Do not let Resources become a prompt-injection channel

A Resource is text that lands in a model's context. If its content comes from an untrusted source (a wiki, a user-supplied README, a log line), it is **untrusted text with system-level authority** once it is in the prompt.

> **The mitigation is the same one Lecture 13 taught for structured output:** keep untrusted content in a clearly delimited region, and never let it appear to be instructions from the operator.

```ts
// Pseudocode — delimiting untrusted resource content in the prompt
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

### 5. Give the host enough to render

```ts
// Pseudocode — metadata that survives a real host
{
  uri: "project://architecture",
  name: "project-architecture",
  description: "Component diagram, module boundaries and deployment topology.",
  mimeType: "text/markdown",
  size: 18_442,           // lets the host warn before a large read
}
```

---

## 4.9 Key Takeaways

1. Registering a Resource is **declarative**: `registerResource(name, uri, metadata, handler)` — name, URI, description, MIME type, handler.
2. A **static** Resource returns a constant; a **dynamic** Resource fetches from a database, API, filesystem, service or application state.
3. The client reads a Resource **explicitly** — it is not registered with the model the way a Tool is.
4. `readResource(uri)` returns a `contents` **array**; unwrap and extract `text` (or handle `blob`).
5. Putting the content into the **system prompt** is what turns a Resource into grounded behaviour.
6. **Static vs dynamic is a caching and failure-mode decision**, not just a code-shape decision.
7. **Resource templates** (`user://{username}`) expose a family of resources with one definition; discovery uses `resources/templates/list`.
8. **Authorisation and validation live in the handler.** A template with an unchecked parameter is an enumeration oracle.
9. Resource content is **untrusted text with system-level authority** — treat it as an injection surface.

---

## 4.10 Common Mistakes

- Forgetting that `contents` is an array and assuming `contents[0]` is the whole response.
- Returning empty content (`{}` or `""`) on not-found instead of throwing — the host cannot distinguish "empty" from "not found".
- No authorisation check inside a templated resource handler — creates an enumeration oracle.
- Not validating template parameters (path traversal, SQL injection, tenant leakage).
- Caching dynamic resources without a TTL or cache key that includes the user/session.
- Treating untrusted resource content as trusted prompt text — injects arbitrary instructions.
- Not providing `size` or `lastModified` in metadata — host cannot warn or invalidate.
- Building a template when the set is small and finite — over-engineering.

*Next: Chapter 05 — How the Application Chooses a Resource*