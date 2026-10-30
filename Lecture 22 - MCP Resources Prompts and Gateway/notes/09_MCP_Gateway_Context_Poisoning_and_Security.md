# Chapter 09: MCP Gateway, Context Poisoning & Security

> **Chapter Goal:** Chapter 08 closed the loop on a server that exposes three primitives. This chapter widens the scope: **MCP Gateways** as the boundary between AI applications and many MCP servers, how **Tool Context Poisoning** undermines model reliability, and the **security rules** that make a gateway production-ready.

> At the end of this chapter you should be able to answer: *What is a gateway, why is tool overload a problem, how do you poison context, and how do you secure a gateway?*   

---

## 9.1 The Tool Overload Problem

MCP makes it easy for an AI application to connect to multiple external systems.

For example, an enterprise AI agent might connect to:

```text
GitHub MCP       → 25 tools
Stripe MCP       → 40 tools
Database MCP     → 30 tools
Jira MCP         → 50 tools
Slack MCP        → 15 tools
Salesforce MCP   → 100+ tools
```

That can quickly result in **250+ available tools**.

```mermaid
flowchart TB
    A["Enterprise AI Agent"]

    A --> G["GitHub MCP<br/>25 tools"]
    A --> S["Stripe MCP<br/>40 tools"]
    A --> D["Database MCP<br/>30 tools"]
    A --> J["Jira MCP<br/>50 tools"]
    A --> SL["Slack MCP<br/>15 tools"]
    A --> SF["Salesforce MCP<br/>100+ tools"]

    G --> T["250+ Available Tools"]
    S --> T
    D --> T
    J --> T
    SL --> T
    SF --> T
```

The problem is not that these tools exist.

The problem is **how many of them need to be presented to the model at the same time**.

---

## 9.2 Tool Context Bloat

Tool definitions contain information such as:

* Tool name
* Description
* Input schema
* Parameters
* Required fields
* Usage information

If hundreds of tools are made available to the model, their definitions can consume a significant amount of context.

```mermaid
flowchart TB
    A["AI Agent"]

    A --> B["250+ Tool Definitions"]

    B --> C["Large Context"]
    C --> D["Higher Token Usage"]
    C --> E["More Processing"]
    C --> F["More Tool Selection Complexity"]
```

For example:

```text
User:
"Check the payment status for order #108"

Available tools:

GitHub:
- search_repository
- create_issue
- get_pull_request
- ...

Slack:
- send_message
- search_messages
- create_channel
- ...

Salesforce:
- find_account
- get_contact
- update_customer
- ...

Stripe:
- get_payment
- get_payment_status
- create_payment
- refund_payment
- ...
```

The model may only need **one or two tools**, but the application may have exposed hundreds.

---

## 9.3 Consequences of Tool Overload

### 9.3.1 Context Inflation

Tool schemas consume context that could otherwise be used for:

* User conversation
* Retrieved documents
* Reasoning context
* Previous tool results
* Agent instructions

```text
More tools
    ↓
More tool definitions
    ↓
Larger context
    ↓
Less useful context available
```

### 9.3.2 Increased Token Usage

Tool descriptions and schemas are part of the model input.

More tool definitions can therefore increase input-token consumption, depending on how the AI application constructs the model request.

### 9.3.3 Higher Latency

Larger model inputs can increase processing time.

The actual impact depends on:

* Model
* Context size
* Provider
* Network
* Tool schema size
* Agent architecture

So avoid assuming a fixed latency increase.

### 9.3.4 Tool Selection Confusion

Consider these tools:

```text
search_customer()
find_customer()
get_customer()
get_customer_info()
lookup_account()
search_account()
```

A model may have difficulty determining which tool is intended, especially when descriptions are similar or overlapping.

Incorrect selection can lead to:

```text
Wrong tool
    ↓
Wrong arguments
    ↓
Wrong result
    ↓
Poor final answer
```

---

## 9.4 Tool Context Poisoning

**Tool context poisoning** can be understood as a situation where irrelevant, conflicting, misleading, redundant, or potentially malicious tool-related information enters the model's context and negatively affects its reasoning or tool selection.

It is useful to distinguish this from ordinary **tool overload**.

### Tool Overload

> Too many tools or tool definitions are available.

### Tool Context Poisoning

> Tool-related context contains information that actively interferes with reliable model behavior.

For example:

```text
Tool A:
"Use this tool to retrieve customer information."

Tool B:
"Use this tool instead of Tool A for customer information."

Tool C:
"Always call this tool first."

Tool D:
"Ignore previous instructions..."
```

Now the model has to reason through conflicting or irrelevant information.

---

## 9.5 Why Tool Descriptions Matter

Tool descriptions are not just metadata.

They can influence how the model understands and selects tools.

Consider:

```text
Tool A
Name: search_customer

Description:
Searches customers by email or ID.
```

versus:

```text
Tool B
Name: search_customer_data

Description:
Retrieves customer information from the CRM.
Use when the user asks about customer records.
```

If both tools appear in the same context, the model must determine which capability matches the request.

Therefore:

> **Clear tool names, descriptions, schemas, and boundaries are important for reliable tool selection.**

---

## 9.6 What Is an MCP Gateway?

An **MCP Gateway** is an intermediary layer between an AI application and one or more downstream MCP Servers.

Instead of the AI application managing every MCP connection independently, a gateway can provide a centralized control layer.

```mermaid
flowchart TB
    A["AI Application / Agent"]

    G["MCP Gateway"]

    A -->|MCP| G

    G --> GH["GitHub MCP Server"]
    G --> ST["Stripe MCP Server"]
    G --> DB["Database MCP Server"]
    G --> SL["Slack MCP Server"]
    G --> CRM["CRM MCP Server"]
```

The gateway does not replace MCP Servers.

Instead:

```text
AI Application
      ↓
MCP Gateway
      ↓
Multiple MCP Servers
      ↓
External Systems
```

---

## 9.7 Where Does the Gateway Fit?

A typical architecture can look like this:

```mermaid
flowchart LR
    U["User"]

    H["Host / AI Application"]

    C["MCP Client"]

    G["MCP Gateway"]

    S1["GitHub MCP"]
    S2["Stripe MCP"]
    S3["Database MCP"]
    S4["CRM MCP"]

    E1["GitHub"]
    E2["Stripe"]
    E3["PostgreSQL"]
    E4["CRM"]

    U --> H
    H --> C
    C --> G

    G --> S1
    G --> S2
    G --> S3
    G --> S4

    S1 --> E1
    S2 --> E2
    S3 --> E3
    S4 --> E4
```

The gateway becomes a **central control point** for MCP traffic.

---

## 9.8 Dynamic Tool Discovery & Filtering

One of the most useful gateway patterns is **tool filtering**.

Instead of presenting every available tool to the model, the system can determine which tools are relevant to the current task.

For example:

```text
User Query:

"Check payment status for order #108"
```

Instead of exposing:

```text
250+ tools
```

 the application could expose a smaller relevant set:

```text
stripe.get_payment_status
order_db.get_order
```

Conceptually:

```mermaid
flowchart TB
    U["User Query<br/>Check payment status for order #108"]

    G["MCP Gateway"]

    F["Tool Discovery / Filtering"]

    T["Relevant Tools"]

    U --> G
    G --> F
    F --> T

    T --> T1["stripe.get_payment_status"]
    T --> T2["order_db.get_order"]
```

---

## 9.9 How Tool Filtering Can Work

Tool filtering is **not a mandatory feature of MCP itself**. It is an architectural capability that can be implemented around MCP.

Possible approaches include:

### Static filtering

```text
User Role
   ↓
Allowed Tool Set
```

Example:

```text
Support Agent
→ customer tools
→ order tools

Admin
→ customer tools
→ order tools
→ refund tools
```

### Rule-based filtering

```text
if intent == "payment":
    expose payment tools
```

### Semantic search

Tool descriptions can be indexed and searched using embeddings.

```mermaid
flowchart LR
    Q["User Query"]

    E["Embedding / Semantic Search"]

    I["Tool Index"]

    T["Relevant Tool Definitions"]

    Q --> E
    E --> I
    I --> T
```

### Intent classification

```text
User Query
    ↓
Intent Classifier
    ↓
Payment Intent
    ↓
Payment Tools
```

### Hybrid approach

Production systems can combine:

```text
Authorization
      +
Rules
      +
Semantic Search
      +
Tool Metadata
      ↓
Relevant Tool Set
```

---

## 9.10 Authentication & Authorization

A gateway can centralize security controls.

### Authentication — AuthN

Answers:

> **Who are you?**

For example:

```text
User
 ↓
Identity Provider
 ↓
Authenticated Request
```

### Authorization — AuthZ

Answers:

> **What are you allowed to do?**

For example:

```mermaid
flowchart TB
    U["User"]

    A["Authentication"]

    R["Authorization / RBAC"]

    T1["Read Customer"]
    T2["Create Payment"]
    T3["Issue Refund"]
    T4["Delete Database"]

    U --> A
    A --> R

    R --> T1
    R --> T2
    R -.->|Restricted| T3
    R -.->|Admin Only| T4
```

A normal support agent might be allowed to:

```text
read_customer
get_order
check_payment
```

but not:

```text
issue_refund
delete_customer
delete_database
```

---

## 9.11 Credential Management

A gateway can also help prevent sensitive credentials from being unnecessarily exposed to the model.

Instead of:

```text
LLM
  ↓
Stripe Secret Key
```

 the architecture should look more like:

```text
LLM
  ↓
MCP Client
  ↓
Gateway
  ↓
Credential / Secret Management
  ↓
Stripe API
```

The model should generally receive **tool results**, not raw API secrets.

---

## 9.12 Request Routing

The gateway can route a tool call to the appropriate MCP Server.

For example:

```text
tools/call
name = stripe.get_payment_status
```

The gateway determines:

```text
stripe.*
   ↓
Stripe MCP Server
```

 while:

```text
github.*
   ↓
GitHub MCP Server
```

Conceptually:

```mermaid
flowchart TB
    C["MCP Client"]

    G["MCP Gateway"]

    C --> G

    G -->|stripe.*| S["Stripe MCP Server"]
    G -->|github.*| GH["GitHub MCP Server"]
    G -->|db.*| DB["Database MCP Server"]
    G -->|slack.*| SL["Slack MCP Server"]
```

---

## 9.13 Observability

A gateway can provide centralized visibility into MCP activity.

For example:

```text
Tool
  ↓
Request
  ↓
Execution
  ↓
Result
```

The gateway can record information such as:

* Tool name
* Request metadata
* User/session identity
* Execution time
* Success/failure
* Error information
* Server used
* Rate-limit events

Example:

```mermaid
flowchart LR
    A["MCP Request"]

    G["MCP Gateway"]

    O["Observability"]

    L["Logs"]
    M["Metrics"]
    T["Tracing"]
    A1["Audit Trail"]

    A --> G
    G --> O

    O --> L
    O --> M
    O --> T
    O --> A1
```

Sensitive parameters should be handled carefully and should not automatically be logged in raw form.

---

## 9.14 Rate Limiting & Abuse Protection

A gateway can enforce limits around tool usage.

For example:

```text
User
  ↓
MCP Gateway
  ↓
Rate Limit
  ↓
MCP Server
```

Possible policies:

```text
100 requests / minute / user

20 payment operations / minute

5 expensive database queries / minute
```

It can also help detect abnormal behavior such as repeated or excessive tool calls.

However, rate limiting alone does not guarantee that an agent cannot enter a loop; robust agent implementations should also have explicit execution limits.

---

## 9.15 Complete Gateway Flow

Let's combine everything.

```mermaid
flowchart TB
    U["User"]

    A["AI Application / Agent"]

    C["MCP Client"]

    G["MCP Gateway"]

    F["Tool Discovery<br/>Filtering"]

    AUTH["Authentication<br/>Authorization"]

    ROUTE["Routing"]

    OBS["Logging / Metrics<br/>Tracing"]

    S1["GitHub MCP Server"]
    S2["Stripe MCP Server"]
    S3["Database MCP Server"]

    E1["GitHub"]
    E2["Stripe"]
    E3["PostgreSQL"]

    U --> A
    A --> C
    C --> G

    G --> F
    G --> AUTH
    G --> ROUTE
    G --> OBS

    ROUTE --> S1
    ROUTE --> S2
    ROUTE --> S3

    S1 --> E1
    S2 --> E2
    S3 --> E3
```

---

## 9.16 Direct MCP vs Gateway Architecture

| Aspect              | Direct MCP Connections              | Gateway Architecture                      |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| **Topology**        | Client connects to multiple servers | Client connects through a central gateway |
| **Tool management** | Distributed                         | Centralized                               |
| **Tool filtering**  | Application-dependent               | Can be centralized                        |
| **Routing**         | Client manages connections          | Gateway can route requests                |
| **Authentication**  | Distributed                         | Can be centralized                        |
| **Authorization**   | Application/server dependent        | Central policy layer possible             |
| **Credentials**     | Distributed                         | Can be centrally managed                  |
| **Observability**   | Distributed                         | Centralized                               |
| **Rate limiting**   | Per-service/application             | Can be centralized                        |
| **Complexity**      | Simpler initially                   | More infrastructure                        |
| **Scalability**     | Can become harder to manage         | Useful for larger environments            |

---

## 9.17 Enterprise MCP Architecture

For a larger organization, the architecture could evolve into:

```mermaid
flowchart TB

    U1["User"]
    U2["Developer"]
    U3["Support Agent"]

    A["AI Applications"]

    G["MCP Gateway"]

    SEC["Security Layer"]
    FILTER["Tool Discovery<br/>& Filtering"]
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

The gateway becomes a centralized **policy and traffic-control layer** for MCP.

---

## 9.18 Important Design Principle

Do not assume:

> "More tools = more powerful agent."

In many cases:

```text
More tools
    ↓
More context
    ↓
More selection complexity
    ↓
Potentially worse tool selection
```

A better approach is:

```text
Many available capabilities
          ↓
Discovery / Filtering
          ↓
Relevant capabilities
          ↓
LLM
```

The goal is not necessarily to reduce the total number of tools in the organization.

The goal is to **reduce unnecessary tool context presented to the model for a particular task**.

---

## 9.19 Chapter Summary

* **Tool overload** occurs when an AI application has access to a very large number of tool definitions.
* Tool definitions consume context and can increase token usage and tool-selection complexity.
* **Tool context poisoning** refers to irrelevant, conflicting, misleading, redundant, or malicious tool-related context that can negatively affect model behavior.
* An **MCP Gateway** is an intermediary layer between an AI application and multiple MCP Servers.
* A gateway can provide centralized:

  * Tool discovery
  * Tool filtering
  * Routing
  * Authentication
  * Authorization
  * Credential management
  * Observability
  * Rate limiting
  * Policy enforcement

* Dynamic tool filtering is **not required by MCP**; it is an architectural pattern that can be implemented around MCP.
* A gateway adds infrastructure and complexity, so it is most useful when the number of servers, users, tools, or security requirements justifies it.

---

## 9.20 Final Mental Model

```mermaid
flowchart LR
    U["User"]

    A["AI Agent"]

    G["MCP Gateway"]

    F["Relevant Tools"]

    S1["MCP Server"]
    S2["MCP Server"]
    S3["MCP Server"]

    E1["External System"]
    E2["External System"]
    E3["External System"]

    U --> A
    A --> G
    G --> F

    G --> S1
    G --> S2
    G --> S3

    S1 --> E1
    S2 --> E2
    S3 --> E3
```

### Memory Trick

> **Too many tools → Too much context → Harder tool selection → Gateway can filter, route, secure, and observe.**

### Chapter 4 in one sentence

> **An MCP Gateway provides a centralized control layer that can manage and filter access to many MCP Servers, helping AI applications scale their tool ecosystem without unnecessarily exposing every available tool to the model.**

---

## 9.21 Key Takeaways

1. **Tool overload** is a practical problem in enterprise AI systems with many external integrations.
2. Tool definitions consume context, increase token usage, and complicate tool selection.
3. **Tool context poisoning** is when irrelevant/conflicting tool information actively interferes with model reasoning.
4. An **MCP Gateway** centralizes control, security, filtering, routing, and observability across many MCP servers.
5. Tool filtering reduces context presented to the model for a specific task, improving reliability and performance.
6. Gateways centralize authentication, authorization, credential management, and rate limiting.
7. The architecture supports **static**, **rule-based**, **semantic search**, **intent classification**, and **hybrid** filtering approaches.
8. A gateway is most valuable when the number of servers, tools, or security requirements justifies the added infrastructure.

---

## 9.22 Common Mistakes

- Assuming more tools always equals a more powerful agent — context bloat and selection complexity may offset benefits.
- No centralized security control — distributed authZ leads to inconsistent policies and privilege drift.
- Exposing every tool to the model — creates unnecessary context and selection noise.
- Ignoring credential leakage — exposing secrets to the model or inefficient secret management.
- No observability — difficult to debug tool selection failures or performance issues.
- Rate limiting per service instead of at the gateway — allows uneven load distribution and abuse.
- Treating tool filtering as optional — production systems need it to manage cognitive load.
- Assuming MCP servers can self-manage discovery — not practical at scale.

*Next: Lecture_22_Complete_Notes.md*
