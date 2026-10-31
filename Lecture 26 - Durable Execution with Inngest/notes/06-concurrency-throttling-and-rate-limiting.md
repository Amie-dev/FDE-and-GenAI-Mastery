# 📊 06 — Concurrency, Throttling, and Rate Limiting

## Goal: Understand the difference between concurrency and rate limiting, learn how to control workload characteristics, and understand trade-offs when applying limits to AI workloads.

### 1. 🔄 Definitions: Concurrency vs. Throttling vs. Rate Limiting

#### Concurrency

> **Concurrency**: The ability to have multiple operations in progress at the same time.

In software systems:

```text
Worker Concurrency
████████████████████████████████

Job A  Job B  Job C  Job D  Job E
  │     │     │     │     │
  ▼     ▼     ▼     ▼     ▼
All running                   

(10 jobs at a time)
```

This is a local resource constraint: number of parallel workers, threads, CPU cores, network connections, or concurrent database connections.

#### Throttling

> **Throttling**: A deliberate limit on the rate of work processed by a service.

Examples:

```text
Per user throttling
████████████████████████████████

User A  User B  User C
  │      │      │
  ▼      ▼      ▼
Active work

(User A cannot have > 1 active job)

Per provider throttling
████████████████████████████████

OpenAI API
  User A  User B  User C
  │      │      │
  ▼      ▼      ▼
API calls

(User A cannot have > 3000 rps)
```

Throttling controls access to a shared resource to prevent overload.

#### Rate Limiting

> **Rate Limiting**: Controlling the total rate at which requests are accepted or processed by a service.

Examples:

```text
Global rate limit
████████████████████████████████

Total requests/second
  User A → 100 rps
  User B → 100 rps
  User C → 100 rps

Total = 300 rps
```

Rate limiting enforces system-wide throughput limits.

### 2. 📊 Visual Comparison

```text
                                CONSTRAINT TYPE
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
       Concurrency            Throttling           Rate Limiting
           │                     │                     │
           ▼                     ▼                     ▼
   Parallel Jobs          Per-Resource         Total System
   (local)              Limits (fairness)    Limits
```

Think of them as different layers of control:

```text
Concurrency                     Throttling                 Rate Limiting
 ┌─────────────┐             ┌─────────────────┐    ┌──────────────────┐
 │ Job Slots    │             │ API QPS        │    │ Total QPS        │
 └─────────────┘             └─────────────────┘    └──────────────────┘
        │                         │                        │
        ▼                         ▼                        ▼
   Each worker                Each provider       Everything combined
   can run N jobs             has limit            has limit
   concurrently                (fair)               (system-wide)
```

### 3. 🎯 When to Use Each Control

| Control | Use Case | Example |
|---------|---------|---------|
| Concurrency | Maximize throughput of independent jobs | Worker pool size | `10` |
| Throttling | Ensure fairness, protect resources, prevent abuse | Per user credit usage |
| Rate Limiting | Protect system infrastructure, manage costs | Total API calls | `10000/hour` |

### 4. 📈 Concurrency Control Implementation

#### Worker Pool Concurrency

```javascript
const worker = new Worker(
  "research",
  async (job) => {
    // Worker processes 1 job at a time
    return await processJob(job.data);
  },
  {
    connection: redisConnection,

    // Concurrency controls how many jobs the worker
    // can process simultaneously
    concurrency: 5,  // Process up to 5 jobs at once
  }
);
```

What `concurrency: 5` means:

```text
Worker can process up to 5 jobs at once

Worker state:
┌─────────────────┐
│                 │   Active jobs:
│   Idle slot     │
│                 │
└─────────────────┘
    (5 slots total)
```

#### Concurrency in Queue Systems

Example: BullMQ

```javascript
const queue = new Queue("research", {
  redis: redisConnection,
});

const worker = new Worker(
  "research",
  async (job) => {
    return await processJob(job.data);
  },
  {
    concurrency: 10,
  }
);
```

#### Concurrency in Message Queues

RabbitMQ:

```text
Worker Connection
    │
    ├── Channel 1
    │
    │   ├─ Consumer tag A
    │   │     └── Processes job 1
    │   └─ Consumer tag B
    │         └── Processes job 2
    │
    ├── Channel 2
    │
    │   └─ Consumer tag C
    │         └── Processes job 3
    │
    └── ... etc.
```

Each channel has its own concurrency limit.

### 5. 🏗️ Throttling Strategies

#### Per-User Throttling

> Goal: No single user consumes all resources.

```text
User A → 10 rps
User B → 10 rps
User C → 10 rps
```

Implementation: Use request counts, tokens, or time windows.

Example: Using JWT or API key to identify users:

```javascript
const token = req.headers.authorization;
const userId = jwt.verify(token).userId;

if (userThrottled[userId] > MAX_PER_MINUTE) {
  return res.status(429).send("Too many requests");
}
```

#### Provider Throttling

> Goal: Respect API provider's rate limits.

For example, OpenAI has:

```text
Per-organization: 10000 requests/minute
Per-project: 3000 requests/minute
Per-user: 3000 requests/minute
```

Implementation: Track usage and respond before limit is reached:

```javascript
const openai = new OpenAI({
  maxRetries: 1,
  timeout: 30000,
});

const openaiUsage = getOrganizationUsage();

if (openaiUsage > 3000) {
  await sleep(60000); // Wait 1 minute
}
```

#### Throttling Implementation Patterns

```javascript
// Token bucket approach
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRate = refillRate; // tokens per ms
  }

  consume(tokens) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate / 1000
    );

    this.lastRefill = now;
  }
}
```

### 6. 🎯 Rate Limiting Strategies

#### Token Bucket Algorithm

```text
Bucket with capacity C, refill rate R

Refill: add tokens over time

Consume: remove tokens if available
```

#### Fixed Window Counter

```text
Requests per 60 seconds

Window: [0:59] | [60:119] | [120:179] | ...

Count in current window
```

#### Sliding Window Log

```text
Log all request timestamps

Count requests within last T seconds
```

#### Leaky Bucket Algorithm

```text
Requests enter a queue, exit at constant rate

Burst capacity limited
```

### 7. ⚡ Concurrency vs. Resource Limits

Understanding the difference between **concurrency** (parallel jobs) and **resource consumption** (CPU, memory, provider limits) is crucial.

```text
                     Concurrency (parallel jobs)
                                  │
                     ┌───────────┴───────────┐
                     ▼                         ▼
            Throttling (fairness)    Rate Limiting (system)
                     │                         │
                     ▼                         ▼
    ┌─────────────────┐    ┌─────────────────┐
    │ Per-user limit  │    │ Total system   │
    │ (e.g., 5 rps)   │    │ limit (e.g., 1000 rps) |
    └─────────────────┘    └─────────────────┘
```

### 8. 🧠 Real-World Implementation: AI Job Queue

```text
User submits AI research request
      │
      ▼
Add to researchQueue
      │
      ├─ Worker concurrency = 10
      │
      ├─ Per user throttling = 3 concurrent jobs
      │
      ├─ Provider throttling (OpenAI) = 10 rps
      │
      └─ System rate limiting = 1000 rps total
```

Implementation:

```javascript
// BullMQ worker with concurrency
const worker = new Worker(
  "research",
  async (job) => {
    // Each worker processes 1 job at a time
    return await processJob(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 10,  // 10 jobs can run concurrently

    // Optional: backpressure handling
    removeOnComplete: 10,  // Keep only last 10 completed jobs
    removeOnFail: 5,      // Keep only last 5 failed jobs
  }
);
```

### 9. 🚦 Throttling Implementation with Express

```javascript
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,           // 1000 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user throttling using Redis
const perUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,           // 100 requests per minute per user
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  store: new RedisStore({
    client: redis,
  }),
});

// Provider throttling (OpenAI)
class OpenAIThrottler {
  constructor(maxRequests = 1000, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // userId -> timestamps
  }

  canMakeRequest(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests
    const validRequests = userRequests.filter(
      ts => now - ts < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return true;
  }
}

const openaiThrottler = new OpenAIThrottler(10, 60 * 1000);
```

### 10. 📊 Trade-Offs and Considerations

| Factor | Concurrency Control | Throttling | Rate Limiting |
|--------|-------------------|------------|---------------|
| Primary Goal | Maximize throughput | Fairness | System protection |
| Granularity | Worker/Job | User/Resource | System/IP |
| Implementation Complexity | Low | Medium | High |
| Monitoring Needs | Worker metrics | Per-resource tracking | System metrics |
| Response Time | Predictable | Variable per user | System-dependent |

### 11. ⚠️ Important: Monitoring and Metrics

#### Monitoring Concurrency

```text
Worker metrics to track:
  └─ Active workers
  └─ Jobs processed per second
  └─ Queue depth
  └─ Worker latency
  └─ Worker memory usage
```

#### Monitoring Throttling

```text
Throttling metrics to track:
  └─ Per-user rate violations
  └─ Provider usage limits
  └─ Fairness metrics
  └─ Denied request reasons
```

#### Monitoring Rate Limiting

```text
Rate limit metrics to track:
  └─ Total requests per second
  └─ Request distribution by IP
  └─ Peak usage patterns
  └─ Error rates under load
```

### 12. 🛡️ Fault Tolerance Considerations

#### Concurrency Limits

```text
If concurrency = 10 but workers fail
───────────────────────────────────

10 slots available
2 workers fail
8 slots active
```

What happens to queued jobs?

- If concurrency limit is reached: queued jobs wait
- If workers fail: queued jobs wait until new workers start

#### Throttling Limits

```text
If user hits per-user limit:
  └─ New requests rejected (429)
  └─ User experience: need to wait or reduce load
  └─ System stability: protected
```

#### Rate Limits

```text
If system hits rate limit:
  └─ All requests rejected (429)
  └─ System stability: guaranteed
  └─ User experience: degraded service
```

### 13. 🔀 Interaction Between Controls

```text
System controls interact:

1. Concurrency → Throttling → Rate Limiting

   └─ High concurrency
         │
         ▼
   Throttling kicks in (per-user)
         │
         ▼
   Rate Limiting kicks in (system)
```

Real-world example:

```text
System configuration:
┌─────────────────┐
│ Concurrency = 10│
└─────────────────┘
┌─────────────────┐
│ Per-user = 3    │
└─────────────────┘
┌─────────────────┐
│ Global = 1000   │
└─────────────────┘
```

What happens:

```text
User A: 3 active jobs (throttled)
User B: 3 active jobs (throttled)
User C: 3 active jobs (throttled)

Other users: cannot start jobs due to per-user limits

System total: 9 active jobs (under 1000 limit)
```

### 14. 💡 Practical AI System Example

```text
                       INNGEST SYSTEM
                            │
                            ▼
                   ┌─────────────────┐
                   │ Concurrency = 5 │
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Per-user = 2    │
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Global = 1000   │
                   └─────────────────┘
                            │
                            ▼
                    AI Research Jobs
```

#### System Behavior Example:

```text
User submits research request
      │
      ▼
System state:
- User has 0 active jobs (OK for per-user limit)
- System has 2 active jobs (OK for global limit)
- Can accept new job

Concurrent execution:
- User A: Job 1
- User A: Job 2
- User B: Job 1

User A attempts new job:
- User A has 2 active jobs (at per-user limit)
- Request rejected with HTTP 429
```

### 15. 🎯 Decision Framework

When designing an AI system, answer these questions:

1. **How many jobs should run in parallel?**
   - Use `concurrency` control
   - What is your hardware limit? (CPU cores, memory)
   - What is your API provider limit? (tokens/second)

2. **How much should each user get?**
   - Use `throttling` control
   - Need fairness? (prevent one user from dominating)
   - Need to protect resources? (database connections)

3. **How much should the system accept?**
   - Use `rate limiting` control
   - Want to avoid overload? (system stability)
   - Want to manage costs? (API spend)

### 16. 🧠 Interview Questions

#### Q1. What is the difference between concurrency and throttling?

> Concurrency: Local parallelism (how many jobs can run simultaneously). Throttling: Per-resource limits (how many requests from a specific user or to a specific provider are allowed).

#### Q2. When should you use rate limiting vs. throttling?

> Rate limiting controls system-wide request rate. Throttling controls per-user or per-resource request rates to ensure fairness.

#### Q3. What is the token bucket algorithm?

> Token bucket algorithm: a rate limiting strategy where tokens are added to a bucket over time, and requests are allowed only if enough tokens are available. It supports burst requests up to bucket capacity.

#### Q4. How does concurrency interact with throttling and rate limiting?

> Concurrency creates parallel jobs. Throttling limits per-user/request rates. Rate limiting limits total system rate. They work together: concurrency creates load, throttling ensures fairness, rate limiting protects system.

#### Q5. What are typical values for AI system limits?

> Concurrency: 5-50 (depending on hardware). Throttling: 10-100 requests/minute per user. Rate Limiting: 1000-10000 requests/minute globally.

### 17. 🧾 Cheat Sheet

```javascript
// Concurrency (BullMQ worker)
const worker = new Worker("queue", async (job) => {
  return await processJob(job.data);
}, {
  connection: redis,
  concurrency: 10, // Number of jobs that can run simultaneously
});

// Throttling (express-rate-limit)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,           // 100 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Rate Limiting (Token bucket)
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  canConsume(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}
```

### Common mistakes:

1. Confusing concurrency, throttling, and rate limiting
2. Not accounting for provider rate limits when setting concurrency
3. Implementing only system-wide rate limiting without per-user fairness
4. Not monitoring the interaction between different controls
5. Overlooking the resource costs of parallel execution
6. Ignoring provider API limits when designing concurrency
7. Not considering the combined impact of all three controls
8. Not accounting for downstream API provider rate limits
9. Assuming that concurrency directly translates to throughput

### Key takeaways:

- Concurrency: Local parallelism (how many jobs run simultaneously)
- Throttling: Per-resource fairness limits (prevent abuse, ensure equity)
- Rate Limiting: System-wide throughput limits (protect infrastructure)
- They work together to create balanced, predictable systems
- Token bucket algorithm is simple and effective for rate limiting
- Per-user throttling is essential for fairness in multi-tenant systems
- Provider rate limits are often the hardest constraint to manage
- Monitoring and metrics are crucial for understanding system behavior
- Configuration requires balancing throughput, fairness, and stability

---
*Source: gen-ai-cohort/week07/learning/day13/notes/06-concurrency-throttling-and-rate-limiting.md, plus roadmap.md Lecture 26 topics*