# Chapter 01: Project Setup & `AG-UI` / `MCP Apps` Streaming

> **Chapter goal:** configure `package.json` / `tsconfig.json` and build `src/ag-ui.ts`.
> **Notes chapters covered:** 01 (`AG-UI` Protocol) & 02 (`MCP Apps`).

---

## 1.1 Full code: `package.json` & `tsconfig.json`

File path: `code/Basic Code/package.json`

```json
{
  "name": "lecture-37-ag-ui-k8s-keda-scaling",
  "version": "1.0.0",
  "description": "Lecture 37 Basic Code — AG-UI SSE Stream, MCP Apps, KEDA Autoscaling & gVisor/Python Sandbox",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx --test src/release-gate.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "ag-ui",
    "mcp-apps",
    "kubernetes",
    "keda",
    "gvisor",
    "typescript"
  ],
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

File path: `code/Basic Code/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

---

## 1.2 Full code: `src/ag-ui.ts`

File path: `code/Basic Code/src/ag-ui.ts`

```ts
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
```

### Explanation
- **`AgUiEventStream.emit()`:** Formats each event as valid SSE (`event: <TYPE>\ndata: <JSON>\n\n`) and records it so disconnected clients can replay missed events.
- **`createMcpAppWidget()`:** Attaches `_meta.uiResourceUri` and enforces `sandboxPolicy: "allow-scripts"` (no `allow-same-origin`).

