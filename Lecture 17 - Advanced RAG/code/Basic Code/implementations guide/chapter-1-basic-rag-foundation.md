# Chapter 1 — Basic RAG Foundation (Entry Point & Express Server)

**Goal:** Wire up the Express server and the main RAG endpoint so the pipeline can receive a query and return an answer.
**Folder:** `src/` (entry files)
**Order:** Run after Chapter 0.

---

## 1.1 Files

### src/index.ts (server entry point)
```ts
import { app } from "./app";
import { config } from "./config/config";

app.listen(config.port, () => {
  console.log(`Advanced RAG server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`POST http://localhost:${config.port}/rag/query`);
});
```

**Block-by-block:**
- `import { app } from "./app"` — imports the configured Express app.
- `import { config } from "./config/config"` — reads port/env settings from Chapter 0 config.
- `app.listen(config.port, ...)` — starts the HTTP server on the configured port.
- The three `console.log` lines tell you the URL, environment, and the endpoint to call.

---

### src/app.ts (Express app)
```ts
import express from "express";
import { ragRouter } from "./routes";
import { config } from "./config/config";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "lecture-17-advanced-rag-basic" });
});

app.use("/rag", ragRouter);

export { app };
```

**Block-by-block:**
- `express()` — creates the Express application instance.
- `app.use(express.json())` — parses JSON request bodies (needed for `POST /rag/query`).
- `app.get("/health", ...)` — simple health-check endpoint.
- `app.use("/rag", ragRouter)` — mounts all RAG routes under the `/rag` prefix.
- `export { app }` — lets `index.ts` start the server and lets tests import the app.

---

### src/routes/rag.route.ts
```ts
import { Router } from "express";
import { ragQuery } from "../controllers/rag.controller";

const router = Router();

router.post("/query", ragQuery);

export default router;
```

**Block-by-block:**
- `Router()` — creates a new Express router.
- `router.post("/query", ragQuery)` — registers `POST /rag/query` handled by `ragQuery`.
- `export default router` — exports the router so `app.ts` can mount it.

---

### src/controllers/rag.controller.ts
```ts
import { Request, Response } from "express";
import {
  inputGuardrail,
  outputGuardrail,
  type GuardrailResult,
} from "../services/guardrail.service";
import { processQuery, type RouteDecision } from "../services/query-processing.service";
import { hybridSearch, type HybridRequest } from "../services/hybrid-search.service";
import { rerank, type RerankResult } from "../services/rerank.service";
import { assembleContext, type AssembledContext } from "../services/context-engineering.service";
import { evaluate, type CRAGEvaluation } from "../services/crag.service";
import { config } from "../config/config";

export interface RagResponse {
  answer: string;
  route: RouteDecision;
  translation: { original: string; rewritten: string };
  rerank: RerankResult;
  context: AssembledContext;
  crag: CRAGEvaluation;
  guardrails: { input: GuardrailResult; output: GuardrailResult };
}

export async function ragQuery(req: Request, res: Response): Promise<void> {
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const input = inputGuardrail(query);
  const safeQuery = input.text;

  const { translation, route } = processQuery(safeQuery);

  const filter: Record<string, unknown> = {};
  const hybridReq: HybridRequest = {
    query: translation.rewritten,
    topK: config.topK,
    filter: Object.keys(filter).length ? filter : undefined,
  };
  const { candidates } = hybridSearch(hybridReq);

  const rerankResult = rerank({
    query: translation.rewritten,
    candidates,
    topN: config.rerankTopN,
  });

  const context = assembleContext(rerankResult.candidates, {
    maxTokens: config.maxContextTokens,
    maxChunks: config.maxChunks,
  });

  const crag = evaluate(translation.rewritten, rerankResult.candidates);

  let answer: string;
  if (crag.sufficient) {
    answer = `Based on the retrieved context: ${rerankResult.candidates
      .map((c) => c.text)
      .join(" ")}`;
  } else {
    answer = "I cannot answer that confidently from the available evidence.";
  }

  const output = outputGuardrail(answer);

  const response: RagResponse = {
    answer: output.text,
    route,
    translation,
    rerank: rerankResult,
    context,
    crag,
    guardrails: { input, output },
  };

  res.json(response);
}
```

**Block-by-block (pipeline order — Chapter 01 §1.8):**
1. **Input validation** — rejects requests without a `query` string (400 error).
2. **Input guardrail (Ch 08)** — `inputGuardrail` masks PII (emails/phones) before the query reaches the system.
3. **Query processing (Ch 06)** — `processQuery` rewrites the query, generates a step-back variant, and routes to a data source.
4. **Hybrid search + RRF (Ch 04)** — `hybridSearch` runs dense + BM25 and fuses with RRF.
5. **Reranking (Ch 05)** — `rerank` re-orders the fused candidates with a cross-encoder.
6. **Context engineering (Ch 07)** — `assembleContext` orders specific-first, applies token budget, labels chunks.
7. **CRAG evaluation (Ch 08)** — `evaluate` checks whether evidence is sufficient to answer.
8. **Generation** — if evidence is sufficient, builds an answer from context; otherwise refuses.
9. **Output guardrail (Ch 08)** — `outputGuardrail` scans the answer for PII leakage before returning.
10. **Response** — returns answer plus all diagnostic metadata (route, translation, rerank, context, crag, guardrails).

---

## 1.2 Commands

```bash
# Start the server
npm run dev

# Test the endpoint
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Can I return my damaged headphones after 10 days?"}'

# Health check
curl http://localhost:3000/health
```

---
