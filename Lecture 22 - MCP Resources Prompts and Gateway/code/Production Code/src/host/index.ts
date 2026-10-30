import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { createLogger, hostPort } from "../config/config.js";
import {
  ask,
  connect,
  disconnect,
  getPromptText,
  listPrompts,
  listResources,
  planDay,
  readResource,
} from "../client/client.js";

const logger = createLogger("host");

const connection = await connect();
const { client } = connection;

function query(request: Request, key: string): string | undefined {
  const value = request.query[key];

  return typeof value === "string" ? value : undefined;
}

/**
 * The route table. Each entry is one endpoint.
 *
 * Chapter 08 — `GET /plan?hours=4` is the lecture's end-to-end request:
 * Prompt → Resources + Tools → answer.
 */
const routes: Record<string, (request: Request) => Promise<string>> = {
  "/resources": async () => {
    const { resources, resourceTemplates } = await listResources(client);

    return [
      ...resources.map((resource) => `${resource.uri}\n    ${resource.description ?? ""}`),
      ...resourceTemplates.map((template) => `${template.uriTemplate}   (template)`),
    ].join("\n");
  },

  "/read": async (request) => readResource(client, query(request, "uri") ?? "task://guidelines"),

  "/prompts": async () =>
    (await listPrompts(client))
      .map((prompt) => `${prompt.name}   ${prompt.description ?? ""}`)
      .join("\n"),

  "/prompt": async (request) =>
    getPromptText(client, query(request, "name") ?? "plan_day", {
      availableHours: query(request, "hours") ?? "4",
    }),

  "/ask": async (request) => {
    const message = query(request, "message");

    if (!message) {
      throw new Error("Query parameter 'message' is required.");
    }

    return ask(client, message);
  },

  "/plan": async (request) => planDay(client, query(request, "hours") ?? "4"),
};

const app: Express = express();

app.disable("x-powered-by");

for (const [path, handler] of Object.entries(routes)) {
  app.get(path, async (request, response) => {
    response.type("text/plain").send(await handler(request));
  });
}

app.use((_request, response) => {
  response.status(404).type("text/plain").send(`Not found. Try one of:\n${Object.keys(routes).join("\n")}`);
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  logger.error({ error: error.message }, "Request error");
  response.status(500).type("text/plain").send(error.message);
});

const httpServer = app.listen(hostPort, "127.0.0.1", () => {
  logger.info({ port: hostPort }, "Task host listening");
  console.error(`Task host is running at http://127.0.0.1:${hostPort}`);
  console.error(`Try: http://127.0.0.1:${hostPort}/plan?hours=4`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "Shutting down Task host");
    void disconnect(connection);
    httpServer.close();
  });
}