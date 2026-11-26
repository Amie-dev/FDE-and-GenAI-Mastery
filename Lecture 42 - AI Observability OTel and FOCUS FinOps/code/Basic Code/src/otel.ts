import {
  context,
  SpanKind,
  SpanStatusCode,
  trace,
  type Tracer,
} from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { calculateModelCostUsd } from "./finops.js";

export interface ModelCallSpec {
  provider: "openai" | "anthropic" | "aws_bedrock";
  model: string;
  inputTokens: number;
  cacheReadInputTokens?: number;
  outputTokens: number;
  finishReason?: string;
}

export interface ToolCallSpec {
  toolName: string;
  callId: string;
  costUsd?: number;
  succeeds?: boolean;
  errorMessage?: string;
}

export interface AgentTaskInput {
  agentName: string;
  tenantId: string;
  featureId: string;
  costCenter: string;
  environment?: "prod" | "staging" | "eval";
  modelCalls: ModelCallSpec[];
  toolCalls: ToolCallSpec[];
  taskSuccess: boolean;
}

export interface TracedAgentRun {
  traceId: string;
  rootSpanId: string;
  tenantId: string;
  featureId: string;
  costCenter: string;
  environment: string;
  provider: string;
  model: string;
  totalInputTokens: number;
  totalCacheReadTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  taskSuccess: boolean;
  startedAtIso: string;
  endedAtIso: string;
}

export interface OTelHarness {
  tracer: Tracer;
  exporter: InMemorySpanExporter;
  shutdown: () => Promise<void>;
}

/**
 * Creates an isolated in-memory OpenTelemetry tracer provider for deterministic
 * unit testing and local OTLP payload inspection.
 */
export function createOTelHarness(tracerName = "lecture-42-agent"): OTelHarness {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });

  return {
    tracer: provider.getTracer(tracerName, "1.0.0"),
    exporter,
    shutdown: () => provider.shutdown(),
  };
}

/**
 * Executes a simulated agent run emitting OTel GenAI semantic convention spans:
 *   agent.<name> (root)
 *     ├── chat <model> (child)
 *     └── execute_tool <toolName> (child)
 */
export function runInstrumentedAgentTask(
  tracer: Tracer,
  input: AgentTaskInput,
): TracedAgentRun {
  const environment = input.environment ?? "prod";
  const startedAtIso = new Date().toISOString();

  let traceId = "";
  let rootSpanId = "";
  let totalInputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  const rootSpan = tracer.startSpan(`agent.${input.agentName}`, {
    kind: SpanKind.SERVER,
    attributes: {
      "gen_ai.operation.name": "invoke_agent",
      "gen_ai.agent.name": input.agentName,
      "tenant.id": input.tenantId,
      "feature.id": input.featureId,
      "cost_center": input.costCenter,
      "deployment.environment": environment,
    },
  });

  traceId = rootSpan.spanContext().traceId;
  rootSpanId = rootSpan.spanContext().spanId;

  const rootCtx = trace.setSpan(context.active(), rootSpan);

  context.with(rootCtx, () => {
    for (const mc of input.modelCalls) {
      const cacheRead = mc.cacheReadInputTokens ?? 0;
      const modelCost = calculateModelCostUsd(
        mc.model,
        mc.inputTokens,
        cacheRead,
        mc.outputTokens,
      );

      totalInputTokens += mc.inputTokens;
      totalCacheReadTokens += cacheRead;
      totalOutputTokens += mc.outputTokens;
      totalCostUsd += modelCost;

      const modelSpan = tracer.startSpan(
        `chat ${mc.model}`,
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "gen_ai.operation.name": "chat",
            "gen_ai.system": mc.provider,
            "gen_ai.request.model": mc.model,
            "gen_ai.usage.input_tokens": mc.inputTokens,
            "gen_ai.usage.cache_read_input_tokens": cacheRead,
            "gen_ai.usage.output_tokens": mc.outputTokens,
            "gen_ai.response.finish_reasons": [mc.finishReason ?? "stop"],
            "gen_ai.cost_usd": Number(modelCost.toFixed(6)),
            "tenant.id": input.tenantId,
            "feature.id": input.featureId,
          },
        },
        rootCtx,
      );
      modelSpan.setStatus({ code: SpanStatusCode.OK });
      modelSpan.end();
    }

    for (const tc of input.toolCalls) {
      const toolCost = tc.costUsd ?? 0;
      totalCostUsd += toolCost;

      const toolSpan = tracer.startSpan(
        `execute_tool ${tc.toolName}`,
        {
          kind: SpanKind.INTERNAL,
          attributes: {
            "gen_ai.operation.name": "execute_tool",
            "gen_ai.tool.name": tc.toolName,
            "gen_ai.tool.call.id": tc.callId,
            "tool.cost_usd": Number(toolCost.toFixed(6)),
            "tenant.id": input.tenantId,
            "feature.id": input.featureId,
          },
        },
        rootCtx,
      );

      if (tc.succeeds === false) {
        toolSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: tc.errorMessage ?? "Tool execution failed",
        });
      } else {
        toolSpan.setStatus({ code: SpanStatusCode.OK });
      }
      toolSpan.end();
    }
  });

  rootSpan.setAttribute("task.success", input.taskSuccess);
  rootSpan.setAttribute("gen_ai.total_cost_usd", Number(totalCostUsd.toFixed(6)));
  rootSpan.setStatus({
    code: input.taskSuccess ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    message: input.taskSuccess ? undefined : "Agent task failed verification",
  });
  rootSpan.end();

  const endedAtIso = new Date().toISOString();
  const primaryModel = input.modelCalls[0]?.model ?? "unknown";
  const primaryProvider = input.modelCalls[0]?.provider ?? "unknown";

  return {
    traceId,
    rootSpanId,
    tenantId: input.tenantId,
    featureId: input.featureId,
    costCenter: input.costCenter,
    environment,
    provider: primaryProvider,
    model: primaryModel,
    totalInputTokens,
    totalCacheReadTokens,
    totalOutputTokens,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    taskSuccess: input.taskSuccess,
    startedAtIso,
    endedAtIso,
  };
}

/**
 * Formats ReadableSpans into an OTLP/HTTP JSON ExportTraceServiceRequest payload
 * suitable for shipping to OpenObserve (`POST /api/default/v1/traces`).
 */
export function toOpenObserveOtlpPayload(
  spans: ReadableSpan[],
  serviceName = "ai-agent-gateway",
) {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: serviceName } },
            { key: "telemetry.sdk.language", value: { stringValue: "nodejs" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "lecture-42-agent", version: "1.0.0" },
            spans: spans.map((s) => ({
              traceId: s.spanContext().traceId,
              spanId: s.spanContext().spanId,
              parentSpanId: s.parentSpanId ?? "",
              name: s.name,
              kind: s.kind,
              status: s.status,
              attributes: Object.entries(s.attributes).map(([key, val]) => ({
                key,
                value:
                  typeof val === "number"
                    ? { doubleValue: val }
                    : typeof val === "boolean"
                      ? { boolValue: val }
                      : { stringValue: String(val) },
              })),
            })),
          },
        ],
      },
    ],
  };
}
