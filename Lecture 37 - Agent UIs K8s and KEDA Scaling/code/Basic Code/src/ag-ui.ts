export type AgUiEventType =
  | "RUN_STARTED"
  | "STEP_STARTED"
  | "TOOL_CALL_START"
  | "TOOL_CALL_RESULT"
  | "APPROVAL_REQUIRED"
  | "TEXT_MESSAGE_CONTENT"
  | "RUN_FINISHED"
  | "RUN_ERROR";

export interface AgUiEvent {
  type: AgUiEventType;
  runId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

/**
 * Emits AG-UI protocol events formatted for Server-Sent Events (SSE) transport.
 */
export class AgUiEventStream {
  private readonly events: AgUiEvent[] = [];

  constructor(private readonly runId: string) {}

  emit(type: AgUiEventType, payload: Record<string, unknown>): string {
    const event: AgUiEvent = {
      type,
      runId: this.runId,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.events.push(event);
    return `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  }

  getEvents(): AgUiEvent[] {
    return [...this.events];
  }
}

export interface McpAppToolResult {
  content: Array<{ type: "text"; text: string }>;
  _meta: {
    uiResourceUri: string;
    sandboxPolicy: "allow-scripts";
  };
}

/** Builds an MCP App response linking a text summary with a sandboxed `ui://` widget. */
export function createMcpAppWidget(summaryText: string, uiResourceUri: string): McpAppToolResult {
  return {
    content: [{ type: "text", text: summaryText }],
    _meta: {
      uiResourceUri,
      sandboxPolicy: "allow-scripts",
    },
  };
}

