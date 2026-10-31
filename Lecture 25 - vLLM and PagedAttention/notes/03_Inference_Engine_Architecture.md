# Chapter 03 - Inference Engine Architecture: Prefill vs Decode Phases

## Overview

This chapter covers the architecture of LLM inference engines — the serving layer that manages GPU resources, request scheduling, and KV cache efficiently. We focus on the two distinct computational phases: **Prefill** (processing input prompts) and **Decode** (generating output tokens). Understanding these phases is key to building high-throughput LLM serving systems.

---

## 1. What Is an Inference Engine?

### Traditional Approach

Without an inference engine, running an LLM would require directly managing many GPU-serving concerns:

```text
Traditional Web Application

User Requests
      ↓
Nginx Web Server
      ↓
Backend Application
```

### LLM Inference Engine

For LLMs, the inference engine works like Nginx sits between clients and backend servers — but with much more complexity:

```text
LLM Serving

User Requests
      ↓
┌─────────────────────┐
│   Inference Engine │
│                     │
│ • Request Queue     │
│ • Dynamic Batching  │
│ • KV Cache Manager  │
│ • GPU Scheduling    │
└──────────┬──────────┘
           ↓
     GPU VRAM / Cores
           ↓
        LLM Execution
```

### Main Responsibilities

#### 1. Request Queuing

Incoming requests are placed into a queue and scheduled for execution:

```text
Request A ─┐
Request B ─┤
Request C ─┼──→ Inference Engine ───→ GPU
Request D ─┘
```

This prevents every request from independently trying to access the GPU.

#### 2. Dynamic / Iteration-Level Batching

Instead of processing every request separately, the engine can combine active requests into batches that change dynamically as requests finish and new ones arrive.

#### 3. KV Cache Management

During generation, the model creates and uses **Key-Value (KV) cache** data. The inference engine manages how this cache is allocated and accessed in GPU memory.

#### 4. GPU Optimizations

Inference engines can use GPU-specific optimizations such as **CUDA Graphs** to reduce execution overhead and improve serving efficiency.

---

## 2. LLM Text Generation: Two Phases

Autoregressive LLM generation can be divided into two major phases with different computational characteristics:

```text
User Prompt
     │
     ▼
┌──────────────┐
│   PREFILL    │
│              │
│ Process      │
│ prompt       │
└──────┬───────┘
       │
       ▼
First Output Token
       │
       ▼
┌──────────────┐
│    DECODE    │
│              │
│ Generate     │
│ one token    │
│ at a time    │
└──────┬───────┘
       │
       ▼
   Final Response
```

These two phases have very different computational characteristics and resource requirements.

---

## 3. Prefill Phase

### What Is Prefill?

The **Prefill Phase** happens when the model receives the initial prompt. For example:

```text
Prompt:

"Explain how RAG works in production."
```

After tokenization:

```text
[T1] [T2] [T3] [T4] [T5] [T6]
```

### What Happens During Prefill?

1. The prompt is tokenized
2. Prompt tokens are processed by the transformer
3. Attention computations are performed
4. Key and Value states are generated
5. These states are stored in the **KV cache**
6. The model produces the first output token

### Important Characteristics

**Prefill Is:**

- **Highly parallel** — many tokens processed together
- **Computationally intensive** — large matrix multiplications
- **GPU compute-heavy** — saturates compute units
- **Responsible for processing the initial prompt**
- **Responsible for creating the initial KV cache**

### Prefill Computational Profile

| Characteristic | Detail |
|----------------|--------|
| **Parallelism** | High — many tokens simultaneously |
| **Compute Load** | Heavy — many FLOPs |
| **Memory Access** | Moderate — weights loaded once |
| **Purpose** | Encode prompt, create KV cache |
| **Output** | First output token |

---

## 4. Decode Phase

### What Is Decode?

After Prefill produces the first output token, the model enters the **Decode Phase**:

```text
Prompt → First Token (T5)

Generated Sequence:
T5 → T6 → T7 → T8 → T9 → ...
```

The generation happens **autoregressively** — each token depends on previously generated tokens.

### Simplified Decode Process

```text
Existing KV Cache
       +
Current Token
       ↓
     GPU
       ↓
   Next Token
       ↓
Update KV Cache
       ↓
     GPU
       ↓
   Next Token
       ↓
      ...
```

### Why KV Cache Matters

Without KV caching, the model would repeatedly recompute previous attention information:

Instead, previously calculated Key/Value information is stored and reused:

```text
Previous Context
      ↓
┌──────────────┐
│   KV Cache   │
└──────┬───────┘
       │
       ├───────────┐
       │           │
Current Token     Reuse Previous KV
       │           │
       └─────┬─────┘
              ↓
            GPU
              ↓
         Next Token
```

### Important Characteristics

**Decode Is:**

- **Sequential** — one token at a time
- **Autoregressive** — each token depends on previous ones
- **Repeated** — happens for every generated token
- **KV-cache dependent** — relies on efficient cache access
- **Memory-bandwidth sensitive** — frequently loads cache data

### Decode Computational Profile

| Characteristic | Detail |
|----------------|--------|
| **Parallelism** | Low — one token at a time |
| **Compute Load** | Moderate — matrix multiply only |
| **Memory Access** | High — KV cache read/write each token |
| **Purpose** | Token generation |
| **Output** | Continuous stream |

---

## 5. Prefill vs Decode Comparison

| Feature | Prefill | Decode |
|---------|---------|---------|
| **Purpose** | Process input prompt | Generate output |
| **Processing** | Highly parallel | Sequential |
| **Tokens** | Many prompt tokens together | Usually one new token at a time |
| **Main Work** | Encode prompt & build KV cache | Reuse KV cache & generate tokens |
| **Compute Characteristics** | Compute-heavy | Memory-bandwidth sensitive |
| **KV Cache** | Created/populated | Read and updated repeatedly |

The key distinction is:

> **Prefill processes the prompt; Decode generates the answer.**

---

## 6. Why Prefill and Decode Can Conflict

The two phases have different resource requirements:

```text
PREFILL
──────
Large prompt
     ↓
High parallel computation
     ↓
Heavy GPU workload


DECODE
─────
One token at a time
     ↓
Repeated KV-cache access
     ↓
Latency-sensitive
```

If a large Prefill request starts consuming substantial GPU resources while many users are waiting for Decode steps, those Decode requests may experience increased latency:

```text
Large Prompt
     │
     ▼
┌──────────────┐
│   PREFILL    │
│ Heavy GPU    │
│ computation  │
└──────┬───────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
 Decode A            Decode B
 waiting             waiting
```

This creates a scheduling problem for high-throughput LLM serving.

---

## 7. Disaggregated Prefill & Decode

To address this problem, large-scale inference infrastructure can separate the two workloads:

Instead of using the same GPU pool for everything:

```text
                     Requests
                        │
                        ▼
               ┌─────────────────┐
               │ Inference Layer │
               └────────┬────────┘
                        │
               ┌─────────┴─────────┐
               ▼                   ▼
       ┌──────────────┐     ┌──────────────┐
       │ Prefill      │     │ Decode       │
       │ Nodes        │     │ Nodes        │
       │              │     │              │
       │ Prompt       │     │ Token        │
       │ Processing   │     │ Generation   │
       └──────────────┘     └──────────────┘
```

### Prefill Nodes

**Optimized for:**

- Large prompt processing
- Parallel computation
- High compute utilization

### Decode Nodes

**Optimized for:**

- Continuous token generation
- KV-cache management
- Low-latency generation
- Efficient memory access

This architecture allows the infrastructure to tune resources independently for the two phases.

---

## 8. Complete Request Lifecycle

A simplified request looks like this:

```text
User
 │
 │ Prompt
 ▼
Inference Engine
 │
 ▼
┌──────────────────────┐
│      PREFILL         │
│                      │
│ Process all prompt   │
│ tokens in parallel   │
└──────────┬───────────┘
           │
           ▼
      First Token
           │
           ▼
┌──────────────────────┐
│       DECODE         │
│                      │
│ Generate T6          │
│ Generate T7          │
│ Generate T8          │
│ Generate T9          │
│       ...            │
└──────────┬───────────┘
           │
           ▼
    Streaming Response
           │
           ▼
         User
```

---

## 9. Key Takeaways

### Inference Engine

The inference engine manages:

```text
Requests
   ↓
Queue
   ↓
Batching
   ↓
KV Cache
   ↓
GPU Scheduling
   ↓
LLM
```

### Prefill

```text
Prompt
   ↓
Parallel Processing
   ↓
KV Cache Creation
   ↓
First Token
```

### Decode

```text
KV Cache + Current Token
           ↓
         GPU
           ↓
       Next Token
           ↓
       Repeat...
```

### Production Optimization

```mermaid
flowchart LR
                 LLM Serving
                     │
             ┌──────────┴──────────┐
             ▼                     ▼
          Prefill                Decode
       Compute-heavy         Memory-sensitive
             │                     │
             └──────────┬──────────┘
                        ▼
              Efficient Serving
```

> **Remember:** **Prefill is about processing the prompt efficiently. Decode is about generating tokens efficiently.** Separating these workloads can improve resource utilization and reduce interference between compute-heavy prompt processing and latency-sensitive token generation.

---

## 10. Study Questions

1. What is the main difference between Prefill and Decode?
2. What computational characteristics distinguish Prefill vs Decode?
3. Why does KV cache matter for Decode?
4. How do Prefill and Decode conflict in resource usage?
5. What is the benefit of separating Prefill and Decode workloads?

---

## Pseudo Code: Prefill vs Decode Implementation

```typescript
// PSEUDO CODE — illustrates Prefill vs Decode phases, not runnable

class LLMInferenceEngine {
  generateResponse(prompt: string, requestId: string) {
    // 1. Queue and schedule request
    this.requestQueue.enqueue(requestId);
    
    // 2. Request enters execution
    this.scheduler.scheduleRequest(requestId);
    
    // 3. Prefill phase - process prompt
    this.prefillPhase(prompt, requestId);
    
    // 4. Wait for first token
    const firstToken = this.kvCache.getFirstOutputToken(requestId);
    
    // 5. Stream tokens to client
    while (this.isGenerating(requestId)) {
      const nextToken = this.decodePhase(requestId, firstToken);
      firstToken = nextToken;
      this.streamToken(requestId, nextToken);
    }
  }

  // Prefill phase - process prompt
  prefillPhase(prompt: string, requestId: string) {
    const tokens = this.tokenizer.tokenize(prompt);
    
    // Process all tokens in parallel (prefill)
    const kvCache = new KVCache();
    
    // Parallel matrix multiplications
    for (const token of tokens) {
      const result = this.transformer.encodeToken(
        token, kvCache, this.model.weights
      );
      kvCache.addEntry(token, result);
    }
    
    // Store KV cache for decode phase
    this.kvCacheStore.store(requestId, kvCache);
    
    // Generate first output token
    const firstToken = this.transformer.generate(
      tokens, kvCache, this.model.weights
    );
    
    this.kvCache.setFirstToken(requestId, firstToken);
  }

  // Decode phase - generate tokens
  decodePhase(requestId: string, currentToken: Token): Token {
    const kvCache = this.kvCacheStore.get(requestId);
    const current = this.kvCache.getFirstToken(requestId);
    
    // Sequential token generation (decode)
    const nextToken = this.transformer.generateNextToken(
      kvCache, current, this.model.weights
    );
    
    // Update KV cache
    kvCache.addEntry(nextToken, nextToken.state);
    
    return nextToken;
  }
}
```