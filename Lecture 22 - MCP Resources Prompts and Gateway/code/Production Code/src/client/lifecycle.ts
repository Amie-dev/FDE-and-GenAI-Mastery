import { spawn } from "node:child_process";
import { createLogger, mcpServerUrl } from "../config/config.js";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import type { Connection } from "./client.js";
import { connect, disconnect, getPromptText, listPrompts, listResources, planDay, readResource } from "./client.js";

const logger = createLogger("lifecycle");

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathToFileURL(__filename).pathname;

function indent(text: string): string {
  return text.split("\n").map((line) => `   ${line}`).join("\n");
}

async function isServerRunning(): Promise<boolean> {
  try {
    await disconnect(await connect());
    return true;
  } catch {
    return false;
  }
}

async function connectWithRetry(): Promise<Connection> {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      return await connect();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Could not reach the MCP server at ${mcpServerUrl}. Start it with: npm run server`);
}

async function main(): Promise<void> {
  // Start the MCP server if it's not already running
  const server = (await isServerRunning())
    ? undefined
    : spawn("npx", ["tsx", `${__dirname}/../server/index.ts`], { stdio: "inherit", detached: true });

  const connection = await connectWithRetry();
  const { client } = connection;

  try {
    logger.info({}, "Starting lifecycle walkthrough");

    console.log("\n1. resources/list — discovery, not consumption");
    const { resources, resourceTemplates } = await listResources(client);
    for (const resource of resources) {
      console.log(`   ${resource.uri}`);
    }
    for (const template of resourceTemplates) {
      console.log(`   ${template.uriTemplate}   (template)`);
    }

    console.log("\n2. resources/read task://guidelines — a STATIC Resource");
    console.log(indent(await readResource(client, "task://guidelines")));

    console.log("\n3. resources/read task://projects/fde — a TEMPLATED Resource, one definition");
    console.log(indent(await readResource(client, "task://projects/fde")));

    console.log("\n4. resources/read user://123/profile — a second template, same shape");
    console.log(indent(await readResource(client, "user://123/profile")));

    console.log("\n5. prompts/list — which workflows exist?");
    for (const prompt of await listPrompts(client)) {
      const args = prompt.arguments?.map((argument) => argument.name).join(", ") ?? "";
      console.log(`   ${prompt.name}(${args})`);
    }

    console.log('\n6. prompts/get plan_day { availableHours: "4" } — a template, not an answer');
    console.log(indent(await getPromptText(client, "plan_day", { availableHours: "4" })));

    console.log("\n7. the model step, after prompts/get — GET /plan?hours=4 in miniature");
    console.log(indent(await planDay(client, "4")));
  } finally {
    await disconnect(connection);

    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}