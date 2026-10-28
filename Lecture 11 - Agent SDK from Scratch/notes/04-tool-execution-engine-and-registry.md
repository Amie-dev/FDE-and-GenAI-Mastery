# 🛠️ 04 — Tool Execution Engine & Registry

> **Goal:** Understand how a tool goes from a normal TypeScript function → registered inside the Agent → described to the LLM → requested by the LLM → executed by the runtime → returned to the LLM.

The most important idea is:

> **The LLM does NOT directly execute your TypeScript function. The Agent Runtime executes it on the LLM's behalf.**

---

# 1. 🧠 What is a Tool?

A **Tool** is an external capability that the Agent can use to interact with the outside world.

For example:

```text
🤖 LLM
  │
  ├── 🧮 Calculator
  ├── 🌤️ Weather API
  ├── 💻 CLI
  ├── 🗄️ Database
  ├── 🌐 Web Search
  └── 📁 File System
```

The LLM itself only decides:

> "I need the weather tool."

The **Agent Runtime** actually executes:

```ts
weatherTool.executor("Kolkata")
```

So:

```text
LLM = 🧠 Decision Maker
Agent Runtime = ⚙️ Executor
Tool = 🛠️ Capability
```

---

# 2. 🏗️ The `ITool` Interface

Every tool follows the same contract:

```ts
export interface ITool {
  name: string;
  description: string;
  doc?: string;
  executor: (input: string) => Promise<string> | string;
}
```

Think of it as a standard shape:

```mermaid
flowchart TD

    TOOL["🛠️ ITool"]

    NAME["🏷️ name<br/>fetchWeatherInfo"]

    DESC["📝 description<br/>Fetch realtime weather"]

    DOC["📚 doc<br/>fetchWeatherInfo(cityName: string): WeatherReport"]

    EXEC["⚙️ executor(input)<br/>Actual implementation"]

    TOOL --> NAME
    TOOL --> DESC
    TOOL --> DOC
    TOOL --> EXEC

    classDef tool fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef meta fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef exec fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class TOOL tool
    class NAME,DESC,DOC meta
    class EXEC exec
```

### Each property has a different job

| Property      | Purpose                                 |
| ------------- | --------------------------------------- |
| `name`        | Unique tool identifier                  |
| `description` | Helps the LLM understand when to use it |
| `doc`         | Explains expected input/output          |
| `executor`    | Actual code that performs the operation |

---

# 3. 🔑 The Most Important Concept: Metadata vs Execution

This distinction is extremely important.

Suppose we have:

```ts
const weatherTool: ITool = {
  name: "fetchWeatherInfo",

  description: "Fetches realtime weather data",

  doc: "fetchWeatherInfo(cityName: string): WeatherReport",

  executor: async (cityName) => {
    // actual API call
  }
};
```

The first three properties are **metadata**.

The `executor` is the **actual capability**.

```text
              WEATHER TOOL
                   │
         ┌─────────┴─────────┐
         │                   │
    📋 Metadata          ⚙️ Executor
         │                   │
         ▼                   ▼
     LLM sees           Runtime executes
     these fields       this function
```

The LLM never receives the JavaScript function itself.

---

# 4. 🔗 How a Tool Gets Connected to an Agent

This starts in `index.ts`.

You create:

```ts
const agent = Agent.builder()
  .setInstructions("You are a weather agent")
  .tool(weatherTool)
  .build();
```

The connection is:

```mermaid
flowchart LR

    DEV["👨‍💻 Developer"]

    BUILDER["🏗️ AgentBuilder"]

    TOOL["🛠️ weatherTool"]

    AGENT["🤖 Agent"]

    MAP["🗺️ toolMap"]

    DEV --> BUILDER
    TOOL --> BUILDER
    BUILDER --> AGENT
    AGENT --> MAP

    classDef dev fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef builder fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef tool fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef map fill:#E0F7FA,stroke:#00838F,stroke-width:3px,color:#000

    class DEV dev
    class BUILDER builder
    class TOOL tool
    class AGENT agent
    class MAP map
```

---

# 5. 🗺️ Why `toolMap`?

Inside `Agent`:

```ts
private toolMap: Map<string, ITool>;
```

During construction:

```ts
for (const tool of builder.toolList) {
  this.toolMap.set(tool.name, tool);
}
```

Suppose you registered:

```text
weatherTool
cliAccessTool
```

The Agent creates:

```text
🗺️ toolMap

"fetchWeatherInfo" ──→ 🌤️ weatherTool
"execCli"           ──→ 💻 cliAccessTool
```

Then when the LLM says:

```json
{
  "functionName": "fetchWeatherInfo"
}
```

the runtime does:

```ts
const tool = this.toolMap.get("fetchWeatherInfo");
```

and immediately gets the correct tool.

---

# 6. ⚡ Why `Map`?

A JavaScript `Map` provides efficient key-based lookup.

Conceptually:

```text
LLM
  │
  │ "fetchWeatherInfo"
  ▼
Map.get(functionName)
  │
  ▼
🌤️ weatherTool
```

For a registry with many tools, this is cleaner and generally provides **average O(1) lookup**.

---

# 7. 📦 Tool Schema Serialization

Now comes another important connection.

The LLM needs to know:

> "Which tools are available?"

The Agent therefore converts tool metadata into prompt text.

For example:

```ts
{
  functionName: "fetchWeatherInfo",
  functionDescription: "Fetches realtime weather data",
  functionDoc: "fetchWeatherInfo(cityName: string): WeatherReport"
}
```

This eventually becomes part of the system instructions.

```mermaid
flowchart TD

    TOOL["🛠️ Tool Object"]

    META["📋 name + description + doc"]

    JSON["📦 Serialized Tool Schema"]

    PROMPT["🎯 System Prompt"]

    LLM["🧠 LLM"]

    TOOL --> META
    META --> JSON
    JSON --> PROMPT
    PROMPT --> LLM

    classDef tool fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef meta fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef json fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000
    classDef prompt fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef llm fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class TOOL tool
    class META meta
    class JSON json
    class PROMPT prompt
    class LLM llm
```

---

# 8. 🧠 What the LLM Actually Sees

Conceptually, the system prompt contains:

```text
Available Tools:

{
  "functionName": "fetchWeatherInfo",
  "functionDescription": "Fetches realtime weather data",
  "functionDoc": "fetchWeatherInfo(cityName: string): WeatherReport"
}

{
  "functionName": "execCli",
  "functionDescription": "Executes shell commands",
  "functionDoc": "execCli(command: string): CLIResponse"
}
```

Now the LLM knows:

```text
Available capabilities:

🌤️ fetchWeatherInfo
💻 execCli
```

But again:

> **The LLM only sees their descriptions. It does not execute the functions.**

---

# 9. 🌤️ Weather Tool — Complete Connection

Your weather tool uses `axios`:

```ts
const weatherTool: ITool = {
  name: "fetchWeatherInfo",

  description: "Fetches realtime weather data for a given city.",

  doc: "fetchWeatherInfo(cityName: string): WeatherReport",

  async executor(cityName) {
    const response = await axios.get(...);

    return JSON.stringify({
      cityName,
      weatherInfo: response.data
    });
  }
};
```

Its architecture is:

```mermaid
flowchart LR

    LLM["🧠 LLM"]

    REQUEST["📦 TOOL_REQUEST<br/>fetchWeatherInfo"]

    RUNTIME["🤖 Agent Runtime"]

    EXEC["⚙️ executor(cityName)"]

    AXIOS["🌐 Axios"]

    API["☁️ Weather API"]

    RESULT["📄 Weather Result"]

    LLM --> REQUEST
    REQUEST --> RUNTIME
    RUNTIME --> EXEC
    EXEC --> AXIOS
    AXIOS --> API
    API --> AXIOS
    AXIOS --> RESULT
    RESULT --> RUNTIME
    RUNTIME --> LLM

    classDef llm fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef request fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef runtime fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef exec fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef api fill:#E0F7FA,stroke:#00838F,stroke-width:3px,color:#000
    classDef result fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000

    class LLM llm
    class REQUEST request
    class RUNTIME runtime
    class EXEC,AXIOS exec
    class API api
    class RESULT result
```

---

# 10. 💻 CLI Tool

The CLI tool follows exactly the same architecture.

```ts
const cliAccessTool: ITool = {
  name: "execCli",

  description: "Executes shell commands",

  doc: "execCli(command: string): CLIResponse",

  executor(cmd) {
    return new Promise((resolve) => {
      exec(cmd, ...);
    });
  }
};
```

The difference is only the **executor implementation**.

```text
ITool
  │
  ├── Weather Tool
  │      └── axios → Weather API
  │
  └── CLI Tool
         └── child_process.exec → OS Shell
```

This is the power of the common `ITool` interface.

---

# 11. 🔄 Complete Tool Execution Lifecycle

Now connect everything together.

Suppose the user says:

```text
"What's the weather in Kolkata?"
```

### Step 1 — User

```text
👤 User
   │
   │ query
   ▼
🤖 Agent.run()
```

### Step 2 — Agent sends context

```text
Agent
  │
  ├── 🎯 Harness
  ├── 📜 Instructions
  ├── 🛠️ Tool Schemas
  └── 💬 Message History
        │
        ▼
      🧠 LLM
```

### Step 3 — LLM requests tool

```json
{
  "step": "TOOL_REQUEST",
  "functionName": "fetchWeatherInfo",
  "input": "Kolkata"
}
```

### Step 4 — Agent dispatches

```ts
const tool = this.toolMap.get(functionName);
```

### Step 5 — Executor runs

```ts
await tool.executor(input);
```

### Step 6 — Result enters history

```text
developer message
       │
       ▼
messageHistory
```

### Step 7 — LLM receives result

```text
Tool Result
    ↓
Message History
    ↓
LLM
```

### Step 8 — LLM produces final output

```json
{
  "step": "OUTPUT",
  "text": "The weather in Kolkata is..."
}
```

---

# 12. 🔥 Full Architecture Diagram

```mermaid
flowchart TD

    USER["👤 User"]

    AGENT["🤖 Agent Runtime"]

    PROMPT["🎯 Harness + Instructions"]

    SCHEMA["📋 Tool Schemas"]

    HISTORY["💬 Message History"]

    LLM["🧠 LLM"]

    REQUEST["📦 TOOL_REQUEST"]

    MAP["🗺️ ToolMap"]

    WEATHER["🌤️ fetchWeatherInfo"]

    CLI["💻 execCli"]

    API["🌐 External API"]

    OS["🖥️ Operating System"]

    RESULT["📄 Tool Result"]

    OUTPUT["✅ Final OUTPUT"]

    USER --> AGENT

    AGENT --> PROMPT
    AGENT --> SCHEMA
    AGENT --> HISTORY

    PROMPT --> LLM
    SCHEMA --> LLM
    HISTORY --> LLM

    LLM --> REQUEST
    REQUEST --> MAP

    MAP --> WEATHER
    MAP --> CLI

    WEATHER --> API
    CLI --> OS

    API --> RESULT
    OS --> RESULT

    RESULT --> AGENT
    AGENT --> HISTORY

    HISTORY --> LLM

    LLM --> OUTPUT
    OUTPUT --> AGENT
    AGENT --> USER

    classDef user fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef request fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef tool fill:#E0F7FA,stroke:#00838F,stroke-width:3px,color:#000
    classDef result fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000
    classDef output fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class USER user
    class AGENT agent
    class PROMPT,SCHEMA,HISTORY agent
    class LLM llm
    class REQUEST request
    class MAP,WEATHER,CLI,API,OS tool
    class RESULT result
    class OUTPUT output
```

---

# 13. 🚨 What Happens If the Tool Doesn't Exist?

Suppose the LLM returns:

```json
{
  "step": "TOOL_REQUEST",
  "functionName": "searchGoogle",
  "input": "latest AI news"
}
```

But `searchGoogle` isn't registered.

The Agent does:

```ts
const tool = this.toolMap.get(functionName);

if (!tool) {
   // error
}
```

Then adds:

```text
developer:
Error: Tool 'searchGoogle' is not registered
```

to the history.

Then:

```text
Error
  ↓
Message History
  ↓
LLM
  ↓
LLM sees what went wrong
  ↓
Can choose another action
```

This is an important Agent behavior:

> **Tool errors become part of the Agent's context instead of necessarily crashing the entire Agent.**

---

# 14. 🛡️ Error Handling

Your improved implementation uses:

```ts
try {
  const toolResult = await tool.executor(input);
} catch (err) {
  ...
}
```

So there are two types of errors.

### Tool not registered

```text
LLM
  ↓
Unknown function
  ↓
toolMap.get()
  ↓
❌ Not found
  ↓
Developer error message
  ↓
LLM
```

### Tool execution failure

```text
LLM
  ↓
Tool Request
  ↓
Executor
  ↓
❌ API / CLI / DB failure
  ↓
Error captured
  ↓
Developer message
  ↓
LLM
```

---

# 15. 🔄 Self-Correction Loop

This is where tool execution connects with the **Harness/ReAct pipeline from Chapter 03**.

```mermaid
flowchart TD

    THINK["🧠 THINK"]

    REQUEST["🛠️ TOOL_REQUEST"]

    DISPATCH["🗺️ ToolMap Lookup"]

    EXEC["⚙️ Execute Tool"]

    SUCCESS{"Success?"}

    RESULT["📄 Tool Result"]

    ERROR["❌ Error Result"]

    ANALYSE["🔍 ANALYSE"]

    RETRY["🔄 Try Another Action"]

    OUTPUT["✅ OUTPUT"]

    THINK --> REQUEST
    REQUEST --> DISPATCH
    DISPATCH --> EXEC
    EXEC --> SUCCESS

    SUCCESS -->|Yes| RESULT
    SUCCESS -->|No| ERROR

    RESULT --> ANALYSE
    ERROR --> ANALYSE

    ANALYSE --> RETRY
    ANALYSE --> OUTPUT

    RETRY --> THINK

    classDef think fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef tool fill:#E0F7FA,stroke:#00838F,stroke-width:3px,color:#000
    classDef exec fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef decision fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000
    classDef result fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef error fill:#FFEBEE,stroke:#C62828,stroke-width:3px,color:#000
    classDef output fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class THINK think
    class REQUEST tool
    class DISPATCH,EXEC exec
    class SUCCESS decision
    class RESULT,ANALYSE result
    class ERROR error
    class RETRY think
    class OUTPUT output
```

---

# 16. 🔗 Connection: Chapter 03 → Chapter 04

Now you can connect the two architectures.

### Chapter 03

The Harness tells the LLM:

```text
"Use TOOL_REQUEST when you need an external capability."
```

### Chapter 04

The Tool Engine implements:

```text
"Okay, you requested a tool.
I'll find it and execute it."
```

So:

```text
🎯 HARNESS
    │
    │ tells LLM the protocol
    ▼
🧠 LLM
    │
    │ TOOL_REQUEST
    ▼
🤖 AGENT RUNTIME
    │
    │ lookup
    ▼
🗺️ TOOL MAP
    │
    │ find function
    ▼
🛠️ EXECUTOR
    │
    ▼
🌐 External World
```

---

# 17. 📚 Chapter 01 → 02 → 03 → 04

The complete learning progression is now:

```mermaid
flowchart LR

    C1["01<br/>🤖 Agent SDK<br/>Core Architecture"]

    C2["02<br/>🏗️ Builder Pattern<br/>Configuration"]

    C3["03<br/>🎯 Harness<br/>ReAct Pipeline"]

    C4["04<br/>🛠️ Tool Engine<br/>Tool Registry"]

    C1 --> C2
    C2 --> C3
    C3 --> C4

    classDef c1 fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef c2 fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef c3 fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef c4 fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000

    class C1 c1
    class C2 c2
    class C3 c3
    class C4 c4
```

### Their responsibilities

| Chapter            | Main responsibility                    |
| ------------------ | -------------------------------------- |
| **01 — Agent SDK** | What an Agent Runtime is               |
| **02 — Builder**   | How an Agent is configured             |
| **03 — Harness**   | How LLM execution is controlled        |
| **04 — Tools**     | How external capabilities are executed |

---

# 18. 🧠 Final Mental Model

Remember this one diagram:

```text
                    👤 USER
                       │
                       ▼
                  🤖 AGENT
                       │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
       🎯 Harness    💬 History    🛠️ Tools
           │            │            │
           └────────────┼────────────┘
                        ▼
                     🧠 LLM
                        │
                        │ "I need fetchWeatherInfo"
                        ▼
                  📦 TOOL_REQUEST
                        │
                        ▼
                   🗺️ toolMap
                        │
                        ▼
              ⚙️ tool.executor()
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
           🌐 API                💻 OS
              │                   │
              └─────────┬─────────┘
                        ▼
                   📄 RESULT
                        │
                        ▼
                   💬 History
                        │
                        ▼
                     🧠 LLM
                        │
                        ▼
                   ✅ OUTPUT
```

## ⭐ The One Sentence to Remember

> **The LLM decides which tool to use, the Agent Runtime finds that tool in the registry, the executor performs the real-world action, and the result is injected back into message history so the LLM can continue reasoning.**

**One important production note:** a tool such as `execCli` gives the model the ability to execute arbitrary shell commands on the host. In a real production Agent SDK, this should be treated as a high-risk capability and protected with sandboxing, command allowlists, permissions, timeouts, resource limits, and preferably an isolated execution environment.