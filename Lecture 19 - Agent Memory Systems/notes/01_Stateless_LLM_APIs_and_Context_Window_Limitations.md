# Chapter 1: Stateless LLM APIs & Context-Window Limitations

## Core Concept

LLM APIs are **stateless**: the model does not automatically retain information from previous requests. Each API call is independent. The application must explicitly store, manage, and selectively send conversation context with every request.

## 1. The Stateless Nature of LLM APIs

### How a Stateless API Works

```mermaid
sequenceDiagram
    participant App as Application
    participant LLM as LLM API

    App->>LLM: POST /chat/completions
    App->>LLM: {"messages": [{"role": "user", "content": "Hi, I am Alex"}]}
    LLM-->>App: {"choices": [{"message": {"content": "Hello Alex!"}}]}

    App->>LLM: POST /chat/completions
    App->>LLM: {"messages": [{"role": "user", "content": "What is my name?"}]}
    LLM-->>App: {"choices": [{"message": {"content": "I don't have that information"}}]}
```

**Key insight**: Request 1 → LLM → Response ≠ Request 2 → LLM → Response
The second request to the LLM does not automatically contain the context from Request 1.

## 2. Why Application-Level Memory is Necessary

### The Conversation Memory Problem

Without explicit memory management, a stateless LLM cannot:
- Remember user names or preferences established in earlier turns
- Recall facts extracted from previous messages
- Maintain coherent long-running conversations
- Provide personalized responses across sessions

### The Memory Hierarchy

```mermaid
flowchart TD
    subgraph MODEL["LLM Model (Stateless)"]
        W[Weights<br/>Frozen during session]
    end

    subgraph APP["Application (Stateful)"]
        H[Conversation History<br/>Database]
        STM[Short-Term Memory<br/>Recent N turns]
        LTM[Long-Term Memory<br/>Persistent facts]
        PROFILE[User Profile<br/>Structured attributes]
    end

    H --> STM
    LTM --> LLMCTX[LLM Context Builder]
    STM --> LLMCTX
    PROFILE --> LLMCTX
    LLMCTX --> W
    W --> A[Response]
    A --> H

    style W fill:#cba6f7,color:#1e1e2e
    style H fill:#89b4fa,color:#1e1e2e
    style STM fill:#f9e2af,color:#1e1e2e
    style LTM fill:#94e2d5,color:#1e1e2e
    style PROFILE fill:#a6e3a1,color:#1e1e2e
```

## 3. The Four Core Production Failure Points

When naive history management is used, four critical issues emerge:

### 3.1 Context Window Exhaustion

Every LLM has a maximum context length (e.g., 128K tokens for Claude 3.7, 1M for some models).

```mermaid
pie showData
    title Context Composition
    "System Instructions" : 500
    "Conversation History" : 85000
    "Retrieved Documents" : 20000
    "Tool Results" : 5000
    "Current User Query" : 150
```

**Problem**: As conversation grows, `Conversation History` eventually exceeds the model's context window.

### 3.2 Network Bandwidth & Latency

Sending growing context with every request creates unnecessary network overhead.

```mermaid
flowchart LR
    subgraph Request1["Request 1"]
        A1["10 tokens"] --> API1["LLM API"]
    end
    subgraph RequestN["Request N"]
        AN["20,000 tokens"] --> APIN["LLM API"]
    end
    subgraph Latency["Latency Impact"]
        B1["100ms"] --> B2["Fast"]
    end
    subgraph LatencySlow["Latency Impact"]
        BN["1000ms+"] --> BN2["Slow"]
    end

    Request1 --> Latency
    RequestN --> LatencySlow
```

**Cost**: 20x increase in payload size = 20x increase in network transmission time.

### 3.3 Increasing Token Costs

LLM APIs charge per token processed. Resending historical context means paying for the same tokens repeatedly.

| Request | New Tokens | Historical Tokens | Total Input | Cost Multiplier |
|---------|-----------|-------------------|-------------|-----------------|
| 1       | 10        | 0                 | 10          | 1x              |
| 2       | 10        | 10                | 20          | 2x              |
| 3       | 10        | 20                | 30          | 3x              |
| N       | 10        | ~N*10             | ~N×10       | N×              |

**Formula**: Total Input Tokens = Σ(System + History + Query) for all requests

### 3.4 Attention Degradation

Large context with irrelevant historical information can cause "lost in the middle" behavior.

```mermaid
flowchart TD
    Context[Huge Context<br/>10K+ tokens] --> Old["Old Questions<br/>(irrelevant)"]
    Context --> Ans["Old Answers<br/>(already answered)"]
    Context --> Tools["Tool Outputs<br/>(may be stale)"]
    Context --> Temp["Temporary Instructions<br/>(no longer needed)"]
    Context --> Rep["Repeated Info<br/>(noise)"]
    Context --> Curr["Current Query<br/>(what matters)"]

    Old --> Attn[🧠 Model Attention]
    Ans --> Attn
    Tools --> Attn
    Temp --> Attn
    Rep --> Attn
    Curr --> Attn

    Attn --> Out[Generated Answer]

    style Curr fill:#a6e3a1
    style Old fill:#f38ba8
    style Rep fill:#f38ba8
```

**Result**: Model struggles to identify what actually matters; performance degrades.

## 4. Quadratic Token Growth in Chatbots

In a sliding window scenario, tokens are billed multiple times:

```mermaid
flowchart LR
    T1["Turn 1<br/>10 tokens"] --> T2["Turn 2<br/>20 tokens (10 old + 10 new)"]
    T2 --> T3["Turn 3<br/>30 tokens (20 old + 10 new)"]
    T3 --> T4["Turn N<br/>~N tokens"]

    style T1 fill:#a6e3a1
    style T4 fill:#f38ba8
```

**Cumulative cost**: For 30 turns averaging 80 tokens each:
`30²/2 × 80 = 36,000 tokens cumulatively`

vs. `30 × 80 = 2,400 tokens` if each message were sent only once.

## 5. The Cost of Context Inflation

As memory is added to provide context, the prompt size grows.

```mermaid
flowchart TD
    A[Minimal Context] --> B{Memory Added?}
    B -->|Yes| C[Larger Prompt]
    B -->|No| D[Smaller Prompt]
    C --> E[More Tokens]
    C --> F[Higher Latency]
    C --> G[Higher Cost]
    E --> H[Context Inflation]
    F --> H
    G --> H

    H --> I[Trade-off: Better Recall<br/>vs Longer Costs]
```

**This is the fundamental tension**: memory improves quality but inflates context.

## 6. Memory as a Budget Problem

The production solution reframes memory as a budget allocation problem:

```mermaid
flowchart LR
    Budget[Context Budget<br/>100K tokens] --> Rules[System Rules<br/>400 tokens"]
    Budget --> Profile[User Profile<br/>150 tokens"]
    Budget --> Summary[Conversation Summary<br/>300 tokens"]
    Budget --> Recent[Recent Turns<br/>800 tokens"]
    Budget --> Retrieved[Retrieved Docs<br/>1,500 tokens"]
    Budget --> Query[Current Query<br/>100 tokens"]

    Rules --> Total[TOTAL: ~3kW tokens"]
    Profile --> Total
    Summary --> Total
    Recent --> Total
    Retrieved --> Total
    Query --> Total
```

## Common Mistakes

| Mistake | Effect | Fix |
|---------|--------|-----|
| Resending all history every turn | Quadratic token growth, high costs | Implement STM with sliding window |
| Only keeping recent turns in DB | Lost information on restart | Persist complete history to database |
| Ignoring attention dilution | Poor answer quality | Selectively retrieve relevant LTM |
| No memory budget | Context overflow | Calculate and enforce token limits |
| Treating all history equally | Noise drowning signal | Prioritize by recency and relevance |

## Key Takeaways

1. **LLM APIs are stateless** — the model never remembers; you must build the memory layer
2. **Context is expensive** — every token has latency, bandwidth, and cost implications
3. **Attention dilutes** — large context can harm answer quality, not improve it
4. **Memory is a trade-off** — between recall (remembering everything) and efficiency (keeping context lean)
5. **Production requires budget management** — allocate tokens strategically across system prompt, profile, summary, recent turns, retrieved docs, and query
6. **The complete solution needs both STM and LTM** — sliding windows handle immediate context; long-term memory handles persistent facts