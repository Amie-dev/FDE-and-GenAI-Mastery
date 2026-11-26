export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  method: HttpMethod;
  path: string;
  requiredParams: string[];
  approvalThresholdUsd?: number;
}

export interface OpenApiSpec {
  title: string;
  baseUrl: string;
  operations: OpenApiOperation[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  requiresIdempotency: boolean;
  approvalThresholdUsd?: number;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolExecutionResponse {
  status: "EXECUTED" | "REPLAYED" | "PENDING_APPROVAL";
  replayed: boolean;
  data: Record<string, unknown>;
}

export interface BrowserActionStep {
  action: "goto" | "fill" | "click" | "waitForSelector";
  selectorOrUrl: string;
  value?: string;
}

