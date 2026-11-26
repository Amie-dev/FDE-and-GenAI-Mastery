# ⚡ Week 07 — Day 13: Inngest Workflows in AI & Durable Execution

Master implementation codebase for **Inngest Workflow Platform**, **Durable Execution Mechanics**, **Multi-Agent AI Pipeline Orchestration**, **Parallel Fan-Out / Fan-In**, **Human-in-the-Loop Approval Workflows**, **Concurrency & Rate Limiting**, and **Resilient Failure Handlers**.

---

## 📁 Repository Structure

```text
week07/learning/day13/code/
├── docker-compose.yml              # Optional local Inngest Dev Server container setup (Port 8288)
├── .env.example                    # Environment variable configuration template
├── .env                            # Active environment configuration
├── package.json                    # Project dependencies and script commands
├── index.js                        # Master CLI application entry point
├── explanations code.md            # Comprehensive line-by-line code explanation handbook
│
├── src/
│   ├── inngest/
│   │   ├── client.js               # Inngest client initialization
│   │   └── functions/
│   │       ├── proceduralVsDurableWorkflow.js     # Step memoization & crash recovery
│   │       ├── parallelMultiAgentWorkflow.js      # Parallel Promise.all Fan-Out & Synthesis
│   │       ├── humanInTheLoopWorkflow.js          # step.waitForEvent human approval
│   │       ├── concurrencyRateLimitedWorkflow.js  # Per-tenant concurrency & throttling
│   │       └── resilientFailureHandlingWorkflow.js# Retries & onFailure fallback hook
│   │
│   ├── services/
│   │   └── agentService.js         # Multi-Agent execution service (Agents 1-7)
│   ├── server.js                   # Express App serving /api/inngest webhook middleware
│   └── demos/
│       ├── demo-01-durable-pipeline.js  # Durable pipeline & crash resumption demo
│       ├── demo-02-parallel-agents.js   # Fan-out / Fan-in parallel multi-agent demo
│       ├── demo-03-human-in-the-loop.js # Human approval signal event demo
│       ├── demo-04-concurrency-limits.js# Concurrency & rate-limiting demo
│       └── demo-05-failure-recovery.js  # Retries & onFailure handler demo
│
└── implementation guide/
    ├── README.md                   # Implementation Guide Overview
    ├── chapter-01-inngest-architecture-and-client.md
    ├── chapter-02-procedural-vs-durable-execution.md
    ├── chapter-03-steps-api-and-memoization.md
    ├── chapter-04-human-in-the-loop-and-parallel-agents.md
    └── chapter-05-concurrency-and-error-resilience.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Master Demo
```bash
npm start
```

### 4. Run the Express Server & Inngest Webhook
```bash
npm run server
```
App runs at `http://localhost:3000`. Inngest endpoint served at `http://localhost:3000/api/inngest`.

### 5. Launch Inngest Local Dev Server UI (Optional)
```bash
npm run inngest:dev
```
Access local Inngest Dashboard at: `http://localhost:8288`

---

## 🧪 Individual Demo Commands

| Command | Description |
| :--- | :--- |
| `npm run demo:all` | Run all 5 interactive demonstrations end-to-end |
| `npm run demo:pipeline` | Run Procedural vs Durable Pipeline demo |
| `npm run demo:parallel` | Run Parallel Multi-Agent (Fan-out / Fan-in) demo |
| `npm run demo:human` | Run Human-in-the-Loop Approval Workflow demo |
| `npm run demo:concurrency` | Run Per-Tenant Concurrency & Rate Limiting demo |
| `npm run demo:failure` | Run Resilient Retries & `onFailure` Hook demo |
