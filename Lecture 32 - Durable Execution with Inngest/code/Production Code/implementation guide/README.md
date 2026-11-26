# Production Code — Durable Execution with Inngest

## Chapter 0 — Overview & Setup

This directory contains a production-grade TypeScript implementation of durable AI multi-agent workflows using Inngest.

### Project Structure

```text
code/Production Code/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                    # Entry point
│   ├── config/
│   │   └── config.ts               # Environment config with Zod validation
│   ├── types/
│   │   └── types.ts                # Shared TypeScript types
│   ├── inngest/
│   │   ├── client.ts               # Inngest client singleton
│   │   ├── events.ts               # Event payload definitions
│   │   └── functions/
│   │       ├── durablePipeline.ts     # Chapter 1-2: procedural vs durable
│   │       ├── parallelAgents.ts       # Chapter 5: fan-out/fan-in
│   │       ├── humanInTheLoop.ts       # Chapter 4: waitForEvent
│   │       ├── concurrencyLimits.ts   # Chapter 6: concurrency control
│   │       └── resilientFailure.ts    # Chapter 7: retries + dead letter
│   ├── routes/
│   │   └── index.ts                 # Express routes
│   ├── controllers/
│   │   └── workflowController.ts     # REST controllers
│   ├── services/
│   │   └── agentService.ts          # Agent simulation service
│   ├── middleware/
│   │   └── rateLimit.ts             # Rate limiting middleware
│   └── demos/
│       └── demoRunner.ts            # Demo execution runner
└── implementation guide/
    └── README.md
```

### Setup

```bash
cd code/Production Code
npm install
cp .env.example .env
# Edit .env with your INNGEST_APP_ID and INNGEST_EVENT_KEY
npm run dev
```

Then start Inngest dev mode:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

---
*Continue to chapter-01 for client setup and durable pipeline implementation.*