import { Router, Request, Response } from "express";
import { TOOL_DEFINITIONS, ToolDefinition } from "../services/chunking";
import { MCP_CONFIG } from "../config/config";

const router = Router();

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: MCP_CONFIG.serverName,
    timestamp: new Date().toISOString(),
  });
});

// List available tools - MCP discovery endpoint
router.get("/tools", (req: Request, res: Response) => {
  res.json({
    server: MCP_CONFIG.serverName,
    tools: TOOL_DEFINITIONS,
    transport: MCP_CONFIG.transport,
  });
});

// Single tool invocation endpoint
router.post("/tools/:toolName", (req: Request, res: Response) => {
  const { toolName } = req.params;
  const { input } = req.body;

  const tool = TOOL_DEFINITIONS.find((t) => t.name === toolName);

  if (!tool) {
    res.status(404).json({
      error: `Tool "${toolName}" not found`,
    });
    return;
  }

  const { valid, errors } = validateToolInput(tool, input);

  if (!valid) {
    res.status(400).json({
      error: "Invalid input",
      details: errors,
    });
    return;
  }

  res.json({
    tool: toolName,
    input,
    result: `Tool "${toolName}" executed successfully (placeholder)`,
    timestamp: new Date().toISOString(),
  });
});

interface ToolInput {
  [key: string]: unknown;
}

interface PropertySchema {
  type?: string;
  description?: string;
  default?: unknown;
}

function validateToolInput(
  tool: ToolDefinition,
  input: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null) {
    errors.push("Input must be an object");
    return { valid: false, errors };
  }

  const typedInput = input as ToolInput;

  if (tool.inputSchema.required) {
    for (const requiredField of tool.inputSchema.required) {
      if (!(requiredField in typedInput)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
  }

  if (tool.inputSchema.properties) {
    for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
      const schema = propSchema as PropertySchema;
      if (schema.type && typedInput[propName] !== undefined) {
        const value = typedInput[propName];
        if (schema.type === "string" && typeof value !== "string") {
          errors.push(`Field "${propName}" must be of type string`);
        }
        if (schema.type === "number" && typeof value !== "number") {
          errors.push(`Field "${propName}" must be of type number`);
        }
        if (schema.type === "boolean" && typeof value !== "boolean") {
          errors.push(`Field "${propName}" must be of type boolean`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export { router as mcpRouter };