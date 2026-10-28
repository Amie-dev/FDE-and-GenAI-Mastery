# 📚 01 — Introduction to Agent SDK & Core Architecture

> **Goal:** Understand what an Agent SDK adds on top of a raw LLM API and how **Instructions → Tools → State → LLM → Execution Loop** work together.

---

# 1. 🧠 What is an Agent SDK?

An **Agent Software Development Kit (SDK)** is an abstraction layer built on top of raw LLM APIs such as OpenAI, Anthropic, Gemini, or local models.

A raw LLM API mainly gives you:

```text
Request → LLM → Response
```

But a real-world agent needs much more:

```text
User
  ↓
Agent Runtime
  ├── 🧠 State / Memory
  ├── 📜 Instructions
  ├── 🛠️ Tools
  ├── 🔄 Execution Loop
  ├── 👀 Interceptors / Observability
  └── 🤖 LLM
```

### Without an Agent SDK

The developer manually handles:

* Message history
* Tool registration
* Tool execution
* Parsing model responses
* Calling the model again
* Loop control
* Errors
* Logging
* Observability

### With an Agent SDK

These responsibilities are packaged into reusable abstractions:

```text
Agent
 ├── Instructions
 ├── Message History
 ├── Tool Registry
 ├── LLM Client
 ├── Execution Loop
 └── Interceptors
```

---

# 2. 🏗️ Core Agent Architecture

The simplest mental model is:

```mermaid
flowchart LR

    U["👤 User"]

    A["🤖 Agent Runtime"]

    L["🧠 LLM<br/>GPT / Claude / Gemini / Local"]

    I["📜 Instructions<br/>System Prompt + Harness"]

    T["🛠️ Tools Registry<br/>APIs • CLI • DB • Web"]

    S["🧠 State<br/>Message History"]

    E["⚙️ Tool Executor"]

    U --> A

    A --> L
    I --> L
    S --> L
    L --> A

    A --> T
    T --> E
    E --> A

    classDef user fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef component fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000

    class U user
    class A agent
    class L llm
    class I,T,S,E component
```

### The key idea

An Agent is **not just an LLM**.

Instead:

> **Agent = LLM + Instructions + State + Tools + Execution Loop**

---

# 3. 🧩 The Core Agent Triad

At the center of an Agent SDK are three major components:

```mermaid
flowchart TD

    SDK["🤖 AGENT SDK"]

    LLM["🧠 LLM ENGINE<br/>GPT • Claude • Gemini • Ollama"]

    PROMPT["📜 INSTRUCTIONS & HARNESS<br/>Rules • Persona • Output Format"]

    TOOLS["🛠️ TOOLS REGISTRY<br/>APIs • CLI • DB • Search • Web"]

    SDK --> LLM
    SDK --> PROMPT
    SDK --> TOOLS

    LLM --> DECISION["🎯 Decision"]

    DECISION -->|"Tool needed"| TOOLS
    DECISION -->|"Final answer"| OUT["✅ Output"]

    classDef sdk fill:#E8EAF6,stroke:#3949AB,stroke-width:3px,color:#000
    classDef llm fill:#F3E5F5,stroke:#8E24AA,stroke-width:2px,color:#000
    classDef prompt fill:#FFF3E0,stroke:#FB8C00,stroke-width:2px,color:#000
    classDef tools fill:#E8F5E9,stroke:#43A047,stroke-width:2px,color:#000
    classDef decision fill:#E0F7FA,stroke:#00838F,stroke-width:2px,color:#000
    classDef output fill:#FCE4EC,stroke:#D81B60,stroke-width:2px,color:#000

    class SDK sdk
    class LLM llm
    class PROMPT prompt
    class TOOLS tools
    class DECISION decision
    class OUT output
```

## 3.1 🧠 LLM Engine

The LLM is responsible for:

* Understanding the user's request
* Reasoning about what needs to happen
* Choosing whether a tool is needed
* Generating the next response/action

Examples:

```text
GPT
Claude
Gemini
Llama
Qwen
Ollama models
```

**Important:** The LLM does **not directly execute your tools**.

It can say:

```json
{
  "step": "TOOL_REQUEST",
  "functionName": "execCli",
  "input": "..."
}
```

Your Agent runtime then executes the actual function.

---

# 4. 📜 Instructions & Harness

The Agent provides the LLM with instructions that define:

### System Instructions

Tell the agent **who it is and what its job is**.

Example:

```text
You are an expert coding agent.
```

### Harness Prompt

Defines **how the agent should behave internally**.

For example, it can instruct the LLM to return structured actions such as:

```json
{
  "step": "TOOL_REQUEST",
  "functionName": "execCli",
  "input": "..."
}
```

or:

```json
{
  "step": "OUTPUT",
  "message": "Task completed."
}
```

So conceptually:

```text
Agent Instructions
        +
Harness Rules
        ↓
   System Prompt
        ↓
       LLM
```

---

# 5. 🛠️ Tools Registry

Tools give the Agent access to the outside world.

Examples:

```text
🖥️ CLI
🌐 Web/API
🗄️ Database
🔍 Search
📧 Email
📅 Calendar
💳 Payment API
```

A tool generally contains:

```ts
interface ITool {
    name: string;
    description: string;
    doc?: string;
    executor: (input: string) => Promise<string> | string;
}
```

Think of a tool as:

```text
🛠️ Tool
 │
 ├── Name
 ├── Description
 ├── Documentation
 └── Executor
        ↓
   Actual Function
```

### Important distinction

```text
LLM
  │
  │ decides
  ▼
"Use execCli"
  │
  ▼
Agent Runtime
  │
  │ executes
  ▼
execCli()
  │
  ▼
Operating System
```

The **LLM decides**.

The **runtime executes**.

---

# 6. 🧠 Agent State & Message History

LLM API calls are generally **stateless**.

If you make:

```text
Request 1 → Response 1
```

and then:

```text
Request 2 → Response 2
```

the model does not automatically know Request 1.

The Agent runtime maintains state by storing previous messages and sending the relevant history again.

```mermaid
flowchart TD

    A["🤖 Agent"]

    H["🧠 Message History"]

    U["👤 User Message"]
    AS["🤖 Assistant Response"]
    D["⚙️ Developer / Tool Result"]

    A --> H

    U --> H
    AS --> H
    D --> H

    H --> L["🧠 LLM"]

    L --> AS
    L --> TR["🛠️ Tool Request"]

    TR --> TOOL["Tool Executor"]
    TOOL --> D

    D --> H

    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef state fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef msg fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000

    class A agent
    class H state
    class U,AS,D,TR,TOOL msg
    class L llm
```

### Message roles in your implementation

Your `IMessage` defines:

```ts
export interface IMessage {
    role: "user" | "assistant" | "developer";
    content: string;
}
```

So history can look like:

```text
1. user
   "Create hello.cpp"

2. assistant
   TOOL_REQUEST → execCli

3. developer
   Tool result → file created

4. assistant
   OUTPUT → Task completed
```

---

# 7. 🔄 The Agent Execution Loop

This is the **heart of your Agent implementation**.

```mermaid
flowchart TD

    START(["🚀 agent.run(query)"])

    ADD["➕ Add User Message<br/>to Message History"]

    LLM["🧠 Call LLM<br/>System Prompt + History"]

    RESPONSE["📦 Receive LLM JSON Response"]

    PARSE["🔍 Parse JSON"]

    DECISION{"🎯 What is the step?"}

    TOOL_REQ["🛠️ TOOL_REQUEST"]

    FIND["🔎 Find Tool<br/>toolMap.get(functionName)"]

    EXEC["⚙️ Execute Tool<br/>tool.executor(input)"]

    RESULT["📦 Tool Result"]

    HISTORY["➕ Add Tool Result<br/>to Message History"]

    AGAIN["🔄 Next Iteration"]

    OUTPUT["✅ OUTPUT"]

    END(["🏁 Return Result"])

    START --> ADD
    ADD --> LLM
    LLM --> RESPONSE
    RESPONSE --> PARSE
    PARSE --> DECISION

    DECISION -->|"TOOL_REQUEST"| TOOL_REQ
    TOOL_REQ --> FIND
    FIND --> EXEC
    EXEC --> RESULT
    RESULT --> HISTORY
    HISTORY --> AGAIN
    AGAIN --> LLM

    DECISION -->|"OUTPUT"| OUTPUT
    OUTPUT --> END

    classDef start fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef process fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef tool fill:#FFF3E0,stroke:#EF6C00,stroke-width:3px,color:#000
    classDef decision fill:#FFF9C4,stroke:#F9A825,stroke-width:3px,color:#000
    classDef output fill:#FCE4EC,stroke:#C2185B,stroke-width:3px,color:#000

    class START,END start
    class LLM llm
    class ADD,RESPONSE,PARSE,HISTORY,AGAIN process
    class TOOL_REQ,FIND,EXEC,RESULT tool
    class DECISION decision
    class OUTPUT output
```

---

# 8. 🔁 How the Tool Loop Works

Suppose the user says:

```text
Create hello.cpp containing a C++ Hello World program.
```

The Agent sends the LLM:

```text
System Prompt
+
Available Tools
+
User Request
```

The LLM may return:

```json
{
  "step": "TOOL_REQUEST",
  "functionName": "execCli",
  "input": "..."
}
```

The Agent then performs:

```text
functionName
      ↓
"execCli"
      ↓
toolMap.get("execCli")
      ↓
cliAccessTool
      ↓
executor(input)
      ↓
Operating System
      ↓
Tool Result
```

The result is added to history.

Then the LLM is called **again**.

Eventually:

```json
{
  "step": "OUTPUT",
  "message": "hello.cpp created successfully."
}
```

The loop stops.

---

# 9. 🏗️ Builder Pattern in Your Agent SDK

Your code uses the **Builder Pattern**.

Instead of:

```ts
new Agent(...)
```

directly, you write:

```ts
const agent = Agent.builder()
    .setIntructions("You are an expert coding agent")
    .tool(cliAccessTool)
    .build();
```

The flow is:

```mermaid
flowchart LR

    START["Agent.builder()"]

    BUILDER["🏗️ AgentBuilder"]

    INSTRUCTION["📜 setInstructions()"]

    TOOL["🛠️ tool()"]

    BUILD["🔨 build()"]

    AGENT["🤖 new Agent(builder)"]

    MAP["🗺️ toolMap"]

    PROMPT["📜 System Prompt"]

    START --> BUILDER
    BUILDER --> INSTRUCTION
    INSTRUCTION --> TOOL
    TOOL --> BUILD
    BUILD --> AGENT

    AGENT --> MAP
    AGENT --> PROMPT

    classDef start fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef builder fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000
    classDef config fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef agent fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000

    class START start
    class BUILDER builder
    class INSTRUCTION,TOOL,BUILD config
    class AGENT,MAP,PROMPT agent
```

### Why Builder?

It makes Agent configuration readable:

```ts
Agent.builder()
    .setIntructions(...)
    .tool(...)
    .build();
```

You can easily add more configuration later:

```ts
.model("gpt-4o")
.setMaxLoop(30)
.interceptor(...)
```

---

# 10. 👀 Interceptors & Observability

Your Agent also supports:

```ts
agent.attachInterceptor(...)
```

An interceptor can observe important Agent events.

```mermaid
flowchart LR

    AGENT["🤖 Agent"]

    EVENT["📡 Agent Event"]

    INTERCEPTOR["👀 Interceptor"]

    LOG["📝 Logging"]
    TRACE["📊 Tracing"]
    COST["💰 Cost Tracking"]
    DEBUG["🐛 Debugging"]

    AGENT --> EVENT
    EVENT --> INTERCEPTOR

    INTERCEPTOR --> LOG
    INTERCEPTOR --> TRACE
    INTERCEPTOR --> COST
    INTERCEPTOR --> DEBUG

    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef event fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef obs fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#000

    class AGENT agent
    class EVENT event
    class INTERCEPTOR,LOG,TRACE,COST,DEBUG obs
```

For example, your code:

```ts
agent.attachInterceptor(message => {
    console.log(
        `Message: ${message.role}: ${message.content}`
    );
});
```

allows you to see what is happening inside the Agent.

---

# 11. ⚖️ Raw LLM API vs Agent SDK

| Dimension               | Raw LLM API                  | Agent SDK                        |
| ----------------------- | ---------------------------- | -------------------------------- |
| 🧠 **State**            | Developer manages history    | Agent runtime manages history    |
| 🛠️ **Tools**           | Manually implemented         | Tool registry + executor         |
| 🔄 **Loop**             | Usually one request/response | Multi-step execution loop        |
| 📜 **Instructions**     | Manually constructed         | Agent configuration              |
| 🏗️ **Configuration**   | Scattered parameters         | Builder pattern                  |
| 👀 **Observability**    | Manual logging               | Interceptors/hooks               |
| 🛡️ **Loop Safety**     | Developer responsibility     | `MAX_LOOP` / runtime limits      |
| 🧩 **Architecture**     | Low-level                    | Higher-level abstraction         |
| 🔁 **Multi-step Tasks** | Manual orchestration         | Agent orchestrates automatically |

---

# 12. 🧠 Complete Agent Architecture

Put everything together:

```mermaid
flowchart TD

    USER(["👤 USER"])

    subgraph SDK["🤖 AGENT SDK / RUNTIME"]

        BUILDER["🏗️ AgentBuilder"]

        CONFIG["📜 Instructions<br/>+ Harness Prompt"]

        TOOLS["🛠️ Tool Registry"]

        STATE["🧠 Message History"]

        LOOP["🔄 Agent Execution Loop<br/>MAX_LOOP = 30"]

        INTERCEPTOR["👀 Interceptors"]

    end

    LLM["🧠 LLM<br/>GPT / Claude / Gemini / Local"]

    EXECUTOR["⚙️ Tool Executor"]

    WORLD["🌍 External World<br/>CLI • API • DB • Files • Web"]

    OUTPUT(["✅ Final Output"])

    USER --> BUILDER

    BUILDER --> CONFIG
    BUILDER --> TOOLS

    CONFIG --> LOOP
    TOOLS --> LOOP
    STATE --> LOOP

    LOOP --> LLM
    LLM --> LOOP

    LOOP -->|"Tool Request"| EXECUTOR
    EXECUTOR --> TOOLS
    EXECUTOR --> WORLD
    WORLD --> EXECUTOR
    EXECUTOR --> STATE

    LOOP --> STATE

    LOOP --> INTERCEPTOR
    INTERCEPTOR --> LOG["📊 Logs / Traces"]

    LOOP -->|"OUTPUT"| OUTPUT

    classDef user fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef sdk fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef tool fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef output fill:#FCE4EC,stroke:#C2185B,stroke-width:3px,color:#000

    class USER user
    class BUILDER,CONFIG,TOOLS,STATE,LOOP,INTERCEPTOR sdk
    class LLM llm
    class EXECUTOR,WORLD,LOG tool
    class OUTPUT output
```

---

# 13. 🔗 How Your Two Files Connect

Your specific project can be understood like this:

```mermaid
flowchart TD

    subgraph INDEX["📄 index.ts"]

        TOOL1["🛠️ cliAccessTool"]
        TOOL2["🌤️ weatherTool"]

        BUILDER["Agent.builder()"]

        CONFIG["setIntructions()"]

        ADD["tool(cliAccessTool)"]

        BUILD["build()"]

        RUN["agent.run(query)"]

        TOOL1 --> ADD
        BUILDER --> CONFIG
        CONFIG --> ADD
        ADD --> BUILD
        BUILD --> RUN

    end

    subgraph AGENT["📄 agent.ts"]

        AB["🏗️ AgentBuilder"]

        A["🤖 Agent"]

        MAP["🗺️ toolMap"]

        HISTORY["🧠 messageHistory"]

        PROMPT["📜 System Prompt"]

        OPENAI["🔌 OpenAI Client"]

        LOOP["🔄 Execution Loop"]

        AB --> A

        A --> MAP
        A --> HISTORY
        A --> PROMPT
        A --> OPENAI
        A --> LOOP

    end

    LLM["🧠 LLM"]

    EXEC["⚙️ Tool Executor"]

    OS["💻 User Machine"]

    BUILD --> AB
    RUN --> LOOP

    PROMPT --> LLM
    HISTORY --> LLM

    LLM --> LOOP

    LOOP -->|"TOOL_REQUEST"| MAP
    MAP --> EXEC
    EXEC --> TOOL1
    TOOL1 --> OS

    OS --> EXEC
    EXEC --> HISTORY

    LLM -->|"OUTPUT"| DONE["✅ Done"]

    classDef index fill:#E3F2FD,stroke:#1565C0,stroke-width:3px,color:#000
    classDef agent fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef llm fill:#F3E5F5,stroke:#7B1FA2,stroke-width:3px,color:#000
    classDef tool fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#000
    classDef done fill:#FCE4EC,stroke:#C2185B,stroke-width:3px,color:#000

    class TOOL1,TOOL2,BUILDER,CONFIG,ADD,BUILD,RUN index
    class AB,A,MAP,HISTORY,PROMPT,OPENAI,LOOP agent
    class LLM llm
    class EXEC,OS tool
    class DONE done
```

---

# 14. 🧭 The Complete Mental Model

Remember the architecture in **7 steps**:

```text
1️⃣ USER
   ↓
2️⃣ AGENT
   ↓
3️⃣ INSTRUCTIONS + HISTORY
   ↓
4️⃣ LLM
   ↓
5️⃣ DECISION
   ↓
6️⃣ TOOL EXECUTION
   ↓
7️⃣ RESULT → HISTORY → LLM → OUTPUT
```

Or even shorter:

> **🧠 LLM decides → 🤖 Agent orchestrates → 🛠️ Tool acts → 🧠 State remembers → 🔄 Loop continues**

---

# 15. 🔑 Key Takeaways

### 1. 🤖 Agent ≠ LLM

An LLM generates decisions/responses.
The Agent runtime manages the entire execution process.

### 2. 🧠 State is managed by the runtime

The model doesn't magically remember previous API calls. The Agent maintains `messageHistory` and sends the relevant history back to the model.

### 3. 🛠️ Tools connect AI to the real world

```text
LLM
  ↓
Tool Request
  ↓
Agent
  ↓
Executor
  ↓
Real World
```

### 4. 🔄 The loop creates agentic behavior

```text
LLM
  ↓
Tool
  ↓
Result
  ↓
LLM
  ↓
Tool
  ↓
Result
  ↓
LLM
  ↓
Final Output
```

### 5. 🏗️ Builder makes Agent creation clean

```ts
Agent.builder()
    .setIntructions(...)
    .tool(...)
    .build();
```

### 6. 👀 Interceptors provide observability

They allow you to monitor:

* Messages
* Tool calls
* Tool results
* Errors
* Execution behavior

### 7. 🛡️ Production agents need safety controls

Your `MAX_LOOP = 30` is a basic safeguard. Production agents should additionally consider:

```text
Timeouts
Rate limits
Tool permissions
Sandboxing
Input validation
Output validation
Human approval
Error handling
Cost limits
Audit logging
```

## 🎯 Final Formula

$$
\boxed{
\text{Agent System}
=
\text{LLM}
+
\text{Instructions}
+
\text{State}
+
\text{Tools}
+
\text{Execution Loop}
+
\text{Observability}
}
$$

**The most important flow to remember:**

```text
👤 User
  ↓
🤖 Agent
  ↓
🧠 LLM decides
  ↓
🎯 Tool Request?
  ↓
🛠️ Execute Tool
  ↓
📦 Tool Result
  ↓
🧠 Update State
  ↓
🤖 LLM again
  ↓
✅ Final Output
```