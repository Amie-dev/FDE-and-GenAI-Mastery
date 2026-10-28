# 🏗️ 02 — Builder Pattern & Agent Configuration

> **Goal:** Understand how the **Builder Pattern** makes Agent creation clean, configurable, validated, and extensible.

---

# 1. 🤔 Why Use the Builder Pattern for Agents?

An Agent can have many configuration options:

* 📜 System instructions
* 🛠️ Tools
* 👀 Interceptors / middleware
* 🧠 Model name
* 🌡️ Temperature
* 📦 Max tokens
* 🔄 Maximum loop iterations
* 💾 Memory configuration
* ✂️ Context pruning
* 🛡️ Safety settings

Without a Builder, you may end up with a difficult constructor:

```ts
const agent = new Agent(
    "You are a helper",
    [tool1, tool2],
    "gpt-4o",
    30,
    [logger],
    true
);
```

The problem is that it's hard to understand what each argument means.

A Builder changes this into:

```ts
const agent = Agent.builder()
    .setInstructions("You are a helper")
    .tool(tool1)
    .tool(tool2)
    .model("gpt-4o")
    .setMaxLoop(30)
    .attachInterceptor(logger)
    .build();
```

Now the configuration is **self-documenting**.

---

# 2. 🏗️ What is the Builder Pattern?

The **Builder Pattern** separates:

```text
Object Configuration
        ↓
Object Creation
```

Instead of directly constructing an Agent, we first configure an `AgentBuilder`.

```mermaid id="x5b4z7"
flowchart LR

    DEV["👨‍💻 Developer"]

    BUILDER["🏗️ AgentBuilder"]

    CONFIG["⚙️ Configuration"]

    AGENT["🤖 Agent"]

    DEV --> BUILDER

    BUILDER --> CONFIG

    CONFIG -->|"build()"| AGENT

    classDef developer fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef config fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class DEV developer
    class BUILDER builder
    class CONFIG config
    class AGENT agent
```

### Simple mental model

> **Builder = Agent Configuration**

> **Agent = Configured Runtime**

---

# 3. 🧩 AgentBuilder vs Agent

This distinction is extremely important.

| `AgentBuilder`             | `Agent`               |
| -------------------------- | --------------------- |
| Used during configuration  | Used during execution |
| Stores configuration       | Stores runtime state  |
| Collects tools             | Uses tools            |
| Stores instructions        | Uses instructions     |
| Stores model configuration | Calls the LLM         |
| Stores interceptors        | Executes interceptors |
| Calls `build()`            | Calls `run()`         |

Think:

```text
🏗️ Builder
   ↓
"How should my Agent be configured?"

          ↓ build()

🤖 Agent
   ↓
"How should my Agent execute?"
```

---

# 4. 🏛️ Agent Architecture

```mermaid id="5a5f40"
flowchart TD

    START(["🏗️ Agent Creation"])

    BUILDER["🏗️ AgentBuilder"]

    INSTRUCTIONS["📜 Instructions"]
    TOOLS["🛠️ Tools"]
    MODEL["🧠 Model"]
    LOOP["🔄 Max Loop"]
    INTERCEPTORS["👀 Interceptors"]

    BUILD["🔨 build()"]

    AGENT["🤖 Agent"]

    STATE["🧠 Message History"]
    TOOLMAP["🗺️ Tool Map"]
    LLM["🔌 LLM Client"]
    RUNTIME["⚙️ Agent Runtime"]

    START --> BUILDER

    BUILDER --> INSTRUCTIONS
    BUILDER --> TOOLS
    BUILDER --> MODEL
    BUILDER --> LOOP
    BUILDER --> INTERCEPTORS

    INSTRUCTIONS --> BUILD
    TOOLS --> BUILD
    MODEL --> BUILD
    LOOP --> BUILD
    INTERCEPTORS --> BUILD

    BUILD --> AGENT

    AGENT --> STATE
    AGENT --> TOOLMAP
    AGENT --> LLM
    AGENT --> RUNTIME

    classDef start fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef config fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef runtime fill:#E0F7FA,stroke:#00838F,stroke-width:2px,color:#000

    class START start
    class BUILDER,BUILD builder
    class INSTRUCTIONS,TOOLS,MODEL,LOOP,INTERCEPTORS config
    class AGENT agent
    class STATE,TOOLMAP,LLM,RUNTIME runtime
```

---

# 5. 🧱 Configuration Interfaces

Before creating the Builder, we define the basic types.

## 🛠️ `ITool`

```ts
export interface ITool {
    name: string;
    description: string;
    doc?: string;
    executor: (input: string) => Promise<string> | string;
}
```

Every tool must provide:

```text
🛠️ Tool
 ├── Name
 ├── Description
 ├── Documentation
 └── Executor
        ↓
   Actual Function
```

For example:

```ts
const cliTool: ITool = {
    name: "execCli",
    description: "Execute a CLI command",
    doc: "execCli(command: string)",
    executor: async (command) => {
        // ...actual command execution...
    }
};
```

## 💬 `IMessage`

```ts
export interface IMessage {
    role: "user" | "assistant" | "developer";
    content: string;
}
```

This represents Agent state.

Example:

```ts
{
    role: "user",
    content: "Create hello.cpp"
}
```

The Agent stores these messages inside:

```ts
messageHistory: IMessage[]
```

## 👀 `Interceptor`

```ts
export type Interceptor =
    (message: IMessage) => void;
```

An interceptor allows external code to observe Agent events.

For example:

```ts
agent.attachInterceptor((msg) => {
    console.log(msg);
});
```

Useful for:

```text
👀 Logging
📊 Tracing
💰 Cost tracking
🐛 Debugging
📡 Monitoring
```

---

# 6. 🏗️ Implementing `AgentBuilder`

The Builder stores all configuration before the Agent is created.

```ts
export class AgentBuilder {

    public instructions =
        "You are a helpful AI assistant.";

    public toolList: ITool[] = [];

    public interceptors: Interceptor[] = [];

    public modelName = "gpt-4o";

    public maxLoop = 30;

    ...
}
```

Conceptually:

```text
AgentBuilder
│
├── 📜 instructions
├── 🛠️ toolList
├── 👀 interceptors
├── 🧠 modelName
└── 🔄 maxLoop
```

### Defaults & validation

A mature Builder provides sensible defaults and validates at `build()` so misconfiguration fails **lazily but loudly**:

```ts
// pseudocode — validation that build() should run
if (toolList has duplicate names) throw "duplicate tool name"
if (maxLoop <= 0) throw "maxLoop must be > 0"
if (modelName is empty) throw "model must be specified"
```

This moves configuration errors from runtime (a crash inside the loop) to build time (a clear, immediate exception).

---

# 7. 🔗 Fluent Method Chaining

The Builder methods return `this`.

Example:

```ts
public setInstructions(instructions: string): this {
    this.instructions = instructions;
    return this;
}
```

Because it returns `this`, we can chain:

```ts
Agent.builder()
    .setInstructions(...)
    .tool(...)
    .model(...)
    .setMaxLoop(...)
    .build();
```

The flow is:

```mermaid id="4a1lpf"
flowchart LR

    START["Agent.builder()"]

    I["📜 setInstructions()"]
    T["🛠️ tool()"]
    M["🧠 model()"]
    L["🔄 setMaxLoop()"]
    X["👀 attachInterceptor()"]
    B["🔨 build()"]

    START --> I
    I --> T
    T --> M
    M --> L
    L --> X
    X --> B

    classDef start fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef method fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef build fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class START start
    class I,T,M,L,X method
    class B build
```

---

# 8. 🛠️ Registering Tools

The Builder can register tools dynamically.

```ts
public tool(t: ITool): this {

    if (
        this.toolList.some(
            existing => existing.name === t.name
        )
    ) {
        throw new Error(
            `Tool with name '${t.name}' is already registered.`
        );
    }

    this.toolList.push(t);

    return this;
}
```

The important part is duplicate prevention:

```ts
existing.name === t.name
```

So this is invalid:

```ts
.tool(cliTool)
.tool(cliTool)
```

because both have the same name.

### Why this matters

Later the Agent creates:

```ts
Map<string, ITool>
```

where the tool name becomes the key:

```text
"execCli" → cliTool
"weather" → weatherTool
"search"  → searchTool
```

Duplicate names would create ambiguity.

---

# 9. 🔨 `build()` — The Important Connection

The Builder eventually creates the actual Agent:

```ts
public build(): Agent {
    return new Agent(this);
}
```

This single line connects the two classes:

```text
AgentBuilder
     │
     │ build()
     ▼
new Agent(builder)
```

The Agent constructor receives the **entire configured Builder**.

```mermaid id="k0t9q7"
flowchart LR

    B["🏗️ AgentBuilder"]

    I["📜 instructions"]
    T["🛠️ toolList"]
    M["🧠 modelName"]
    L["🔄 maxLoop"]
    X["👀 interceptors"]

    CONSTRUCTOR["new Agent(builder)"]

    A["🤖 Agent"]

    B --> I
    B --> T
    B --> M
    B --> L
    B --> X

    I --> CONSTRUCTOR
    T --> CONSTRUCTOR
    M --> CONSTRUCTOR
    L --> CONSTRUCTOR
    X --> CONSTRUCTOR

    CONSTRUCTOR --> A

    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef config fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class B,CONSTRUCTOR builder
    class I,T,M,L,X config
    class A agent
```

---

# 10. 🤖 How `Agent` Receives the Configuration

The Agent constructor can then transfer Builder configuration into runtime state.

The key transformation is **toolList → toolMap** and **defensive copying** of mutable collections:

```ts
// pseudocode inside the Agent constructor
this.modelName   = builder.modelName
this.maxLoop     = builder.maxLoop
this.interceptors = [...builder.interceptors]   // defensive copy
this.messageHistory = []
this.toolMap = new Map()

for each tool in builder.toolList:
    this.toolMap.set(tool.name, tool)

this.instructions = builder.instructions
```

The important transformation is:

```text
Builder Configuration
        ↓
     Constructor
        ↓
Agent Runtime State
```

> `toolMap` is an alias-free `Map` keyed by tool name for **O(1)** lookup; `interceptors` is shallow-copied so later builder mutations don't leak into a running Agent.

---

# 11. 🗺️ Tool List → Tool Map

This is an especially important design decision.

The Builder stores:

```ts
toolList: ITool[]
```

Example:

```text
[
    cliTool,
    weatherTool,
    searchTool
]
```

The Agent converts this into:

```ts
Map<string, ITool>
```

Result:

```text
toolMap

"execCli"    → cliTool
"weather"    → weatherTool
"search"     → searchTool
```

Why?

Because when the LLM returns:

```json
{
    "functionName": "execCli"
}
```

the Agent can quickly do:

```ts
this.toolMap.get("execCli")
```

and find the executor.

---

# 12. 🧠 Builder → Agent → LLM

The complete relationship is:

```mermaid id="v4e1p8"
flowchart TD

    DEV["👨‍💻 Developer"]

    BUILDER["🏗️ AgentBuilder"]

    CONFIG["⚙️ Agent Configuration"]

    BUILD["🔨 build()"]

    AGENT["🤖 Agent"]

    PROMPT["📜 System Instructions"]

    TOOLS["🛠️ Tool Map"]

    STATE["🧠 Message History"]

    LLM["🧠 LLM"]

    DEV --> BUILDER

    BUILDER --> CONFIG
    CONFIG --> BUILD
    BUILD --> AGENT

    AGENT --> PROMPT
    AGENT --> TOOLS
    AGENT --> STATE

    PROMPT --> LLM
    STATE --> LLM
    LLM --> AGENT

    AGENT --> TOOLS

    classDef dev fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef state fill:#E0F7FA,stroke:#00838F,stroke-width:2px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000

    class DEV dev
    class BUILDER,CONFIG,BUILD builder
    class AGENT,PROMPT,TOOLS agent
    class STATE state
    class LLM llm
```

---

# 13. 👨‍💻 Developer Usage

Now the developer can create an Agent like this:

```ts
const agent = Agent.builder()

    .setInstructions(
        "You are a senior DevOps specialist."
    )

    .tool(cliAccessTool)

    .tool(logAnalyzerTool)

    .model("gpt-4o")

    .setMaxLoop(15)

    .attachInterceptor((msg) => {
        console.log(
            `[EVENT] ${msg.role}: ${msg.content}`
        );
    })

    .build();
```

This reads almost like configuration:

```text
Agent
 │
 ├── 📜 Role
 │    └── Senior DevOps specialist
 │
 ├── 🛠️ Tools
 │    ├── CLI
 │    └── Log Analyzer
 │
 ├── 🧠 Model
 │    └── GPT-4o
 │
 ├── 🔄 Max Loop
 │    └── 15
 │
 └── 👀 Interceptor
       └── Logger
```

---

# 14. 🔄 Builder Lifecycle

The complete lifecycle is:

```mermaid id="c2k4s6"
flowchart TD

    START(["🚀 Start"])

    CREATE["Agent.builder()"]

    CONFIG1["📜 Configure Instructions"]
    CONFIG2["🛠️ Register Tools"]
    CONFIG3["🧠 Configure Model"]
    CONFIG4["🔄 Configure Loop"]
    CONFIG5["👀 Add Interceptors"]

    VALIDATE["🛡️ Validate Configuration"]

    BUILD["🔨 build()"]

    AGENT["🤖 Agent Instance"]

    RUN["▶️ agent.run(query)"]

    END(["✅ Agent Executes"])

    START --> CREATE

    CREATE --> CONFIG1
    CONFIG1 --> CONFIG2
    CONFIG2 --> CONFIG3
    CONFIG3 --> CONFIG4
    CONFIG4 --> CONFIG5

    CONFIG5 --> VALIDATE
    VALIDATE --> BUILD
    BUILD --> AGENT
    AGENT --> RUN
    RUN --> END

    classDef start fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef config fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef validation fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef end fill:#FCE4EC,stroke:#C6185B,stroke-width:3px,color:#000

    class START start
    class CREATE,CONFIG1,CONFIG2,CONFIG3,CONFIG4,CONFIG5,BUILD config
    class VALIDATE validation
    class AGENT,RUN agent
    class END end
```

> **Note:** Your current `build()` implementation does not actually perform validation yet. The diagram shows where validation **could/should** be added as the SDK becomes more production-ready.

### Builder patterns & alternatives

| Approach              | Pros                              | Cons                                   |
| --------------------- | --------------------------------- | -------------------------------------- |
| **Builder (fluent)**  | Readable, self-documenting, extensible | Verbose to write                     |
| Options object        | Concise, optional fields via `?`  | No compile-time ordering, weaker IDE   |
| Telescoping ctor      | Simple                              | Unreadable, brittle                    |
| DI / factory function | Testability, inversion of control | Indirection overhead                   |

The Builder pattern is preferred here because it turns configuration into a **guided, stepwise flow** while keeping optional fields explicit.

---

# 15. 🆚 Without Builder vs With Builder

### ❌ Without Builder

```ts
const agent = new Agent(
    instructions,
    tools,
    interceptors,
    model,
    maxLoop,
    memory,
    ...
);
```

Problems:

```text
❌ Hard to read
❌ Parameter order matters
❌ Many optional values
❌ Difficult to extend
❌ Difficult to validate
```

### ✅ With Builder

```ts
const agent = Agent.builder()
    .setInstructions(...)
    .tool(...)
    .model(...)
    .setMaxLoop(...)
    .attachInterceptor(...)
    .build();
```

Benefits:

```text
✅ Readable
✅ Fluent API
✅ Easy to extend
✅ Configuration is centralized
✅ Better validation point
✅ Cleaner Agent constructor
```

---

# 16. 🧠 Why `Agent.builder()` Is Static

Inside `Agent`:

```ts
public static builder(): AgentBuilder {
    return new AgentBuilder();
}
```

This allows:

```ts
Agent.builder()
```

instead of:

```ts
new AgentBuilder()
```

So `Agent` becomes the public entry point:

```text
Developer
    │
    ▼
Agent.builder()
    │
    ▼
AgentBuilder
    │
    ▼
build()
    │
    ▼
Agent
```

This makes the SDK API feel natural.

---

# 17. 🏗️ Builder Pattern in One Diagram

```mermaid id="v5j4n0"
flowchart LR

    USER["👨‍💻 Developer"]

    B["🏗️ AgentBuilder"]

    C1["📜 Instructions"]
    C2["🛠️ Tools"]
    C3["🧠 Model"]
    C4["🔄 Loop"]
    C5["👀 Interceptors"]

    BUILD["🔨 build()"]

    A["🤖 Configured Agent"]

    RUN["▶️ run()"]

    USER --> B

    B --> C1
    B --> C2
    B --> C3
    B --> C4
    B --> C5

    C1 --> BUILD
    C2 --> BUILD
    C3 --> BUILD
    C4 --> BUILD
    C5 --> BUILD

    BUILD --> A
    A --> RUN

    classDef user fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef config fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class USER user
    class B,BUILD builder
    class C1,C2,C3,C4,C5 config
    class A,RUN agent
```

---

# 18. 🔑 Key Takeaways

### 1. 🏗️ Builder configures the Agent

```text
AgentBuilder = Configuration
```

### 2. 🤖 Agent performs the work

```text
Agent = Runtime
```

### 3. 🔗 `build()` connects them

```ts
return new Agent(this);
```

### 4. 🛠️ Tools are registered during configuration

```ts
.tool(cliAccessTool)
```

and converted into:

```text
toolMap
```

inside the Agent.

### 5. 📜 Instructions become Agent configuration

```ts
.setInstructions(...)
```

then:

```text
builder.instructions
        ↓
agent.instructions
        ↓
system prompt
        ↓
LLM
```

### 6. 👀 Interceptors are configured before execution

```ts
.attachInterceptor(...)
```

then copied into the Agent runtime.

### 7. 🔄 Builder enables fluent configuration

```ts
Agent.builder()
    .setInstructions(...)
    .tool(...)
    .model(...)
    .setMaxLoop(...)
    .build();
```

---

# 🧠 Final Mental Model

Remember these three lines:

```text
🏗️ AgentBuilder
      ↓
   CONFIGURE
      ↓
🤖 Agent
      ↓
   EXECUTE
```

Or:

> **Builder decides WHAT the Agent has. Agent decides HOW the Agent runs.**

And the complete Agent SDK architecture becomes:

```text
👨‍💻 Developer
      │
      ▼
🏗️ AgentBuilder
      │
      ├── 📜 Instructions
      ├── 🛠️ Tools
      ├── 🧠 Model
      ├── 🔄 Loop Limits
      └── 👀 Interceptors
      │
      ▼
🔨 build()
      │
      ▼
🤖 Agent Runtime
      │
      ├── 🧠 State
      ├── 🗺️ Tool Map
      ├── 📜 System Prompt
      └── 🔌 LLM Client
      │
      ▼
▶️ agent.run()
      │
      ▼
🧠 LLM ↔ 🛠️ Tools ↔ 🧠 State
      │
      ▼
✅ Final Output
```

### ⭐ Core Formula

$$
\boxed{
\text{Agent}
=
\text{Builder Configuration}
+
\text{Runtime State}
+
\text{LLM}
+
\text{Tools}
+
\text{Execution Loop}
}
$$