import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { readFileSync } from "fs";

// Import all Inngest workflows
import { durablePipelineWorkflow } from "./inngest/functions/durablePipeline.js";
import { parallelMultiAgentWorkflow } from "./inngest/functions/parallelAgents.js";
import { humanInTheLoopWorkflow } from "./inngest/functions/humanInTheLoop.js";
import { concurrencyLimitedWorkflow } from "./inngest/functions/concurrencyLimits.js";
import { resilientFailureHandlingWorkflow } from "./inngest/functions/resilientFailure.js";

// Import routes
import routes from "./routes/index.js";

const app = express();
app.use(express.json());

// Register Inngest functions
const functions = [
  durablePipelineWorkflow,
  parallelMultiAgentWorkflow,
  humanInTheLoopWorkflow,
  concurrencyLimitedWorkflow,
  resilientFailureHandlingWorkflow,
];

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api", routes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await loadDemoData();

  const server = app.listen(PORT, () => {
    console.log("\n🚀 [Durable Execution Server] Listening on http://localhost:%s", PORT);
    console.log("🔌 [Inngest Webhook] Registered at http://localhost:%s/api/inngest", PORT);
    console.log("📊 Registered Functions: %d", functions.length);
    console.log("📋 Available Demos: %s", Object.keys(demoData).join(", "));
    console.log("\n");
  });

  const demoRunner = require("./demos/demoRunner.js");
  await demoRunner.runDemos();

  return server;
}

async function loadDemoData() {
  try {
    const demoDataContent = readFileSync("./src/demos/demoData.json", "utf8");
    global.demoData = JSON.parse(demoDataContent);
    console.log("📊 Demo data loaded successfully");
  } catch (error) {
    console.log("⚠️ Could not load demo data, using defaults");
    global.demoData = {
      durablePipeline: {
        description: "Chapter 1-2: Procedural vs Durable Execution",
        keyFeatures: ["State checkpointing", "Resumption from crash", "Zero duplicate work"],
      },
      parallelAgents: {
        description: "Chapter 5: Fan-out / Fan-in",
        keyFeatures: ["Parallel agent execution", "Critical path optimization", "Aggregation"],
      },
      humanInTheLoop: {
        description: "Chapter 4: WaitForEvent & approvals",
        keyFeatures: ["Durable pause", "Event-based approval", "Retry logic"],
      },
      concurrencyLimits: {
        description: "Chapter 6: Concurrency & Rate Limiting",
        keyFeatures: ["Per-worker limits", "Graceful degradation", "Provider throttling"],
      },
      resilientFailure: {
        description: "Chapter 7: Retries & Observability",
        keyFeatures: ["Exponential backoff", "Jitter", "Dead letter queues"],
      },
    };
  }
}

if (require.main === module) {
  startServer().catch(console.error);
}

export { app, startServer, functions };