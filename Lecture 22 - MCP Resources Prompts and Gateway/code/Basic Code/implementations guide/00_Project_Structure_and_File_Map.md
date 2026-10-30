# Chapter 00 — Project Structure & File Map

> **Goal of this chapter:** give you the full picture before you walk any streets.
> You will see every file, every folder, and how they depend on each other.

---

## 0.1 File details

| | |
|---|---|
| **Paths** | `Basic Code/` (root), `src/`, `src/config/`, `src/server/`, `src/services/`, `src/tools/`, `src/resources/`, `src/prompts/`, `src/client/`, `src/routes/` |
| **Purpose** | Walkthrough every source file in the project, identify the dependency graph, and locate the minimum set of files you need to modify for a given task. |
| **Imports** | `dotenv/config` is the single import that makes `process.env` available everywhere. |
| **Exports** | The complete project structure (folders + files), `package.json` scripts, `tsconfig.json` settings, `.env` key names. |
| **Depends on** | nothing in `src/` — this is the top-of-the-graph chapter. |
| **Implements** | Lecture 01 (MCP Server & transport), Lecture 02 (server identity at `initialize`), Lecture 03 (URI ≠ URL), Lecture 04 (static / dynamic / templated Resources), Lecture 05 (four selection strategies), Lecture 06 (Prompt templates), Lecture 07 (Prompt flow vs LLM call), Lecture 08 (end-to-end `GET /plan?hours=4`), Lecture 09 (gateway boundary). |

---

## 0.2 Commands

```bash
npm install                          # install all dependencies (once)
npm run typecheck                    # type-checks the whole project, exits silently 0
node -e "import('./src/config/config.ts').then(c => console.log(c.serverInfo, c.hasModelKey))"
# Expected: { name: 'task-mcp-server', version: '1.0.0' } false  (offline mode)
```

---

## 0.3 Full file

**Project structure:**

```text
Basic Code/
├── .env                  # local runtime values; gitignored
├── .env.example                # committed template that `.env` is copied from
├── package.json                # dependencies + the npm scripts
├── package-lock.json           # the exact dependency tree `npm install` resolved
├── tsconfig.json               # TypeScript compiler configuration
├── README.md                   # the project's own overview (short)
├── implementations guide/      # ← you are here: this chapter-wise walkthrough
└── src/
    ├── index.ts                # the MCP server process (Streamable HTTP, :8081)
    ├── config/
    │   └── config.ts           # identity, URI schemes, ports, model
    ├── server/
    │   └── server.ts           # createServer(): the "standard door"
    ├── services/
    │   ├── taskService.ts      # the data layer (tasks + text views)
    │   └── resourceSelector.ts # how the APPLICATION picks a Resource
    ├── tools/
    │   └── tools.ts            # Tools — the MODEL holds the trigger
    ├── resources/
    │   └── resources.ts        # Resources — the APPLICATION holds it
    ├── prompts/
    │   └── prompts.ts          # Prompts — the USER holds the trigger
    ├── client/
    │   └── client.ts           # the MCP client + the lifecycle walkthrough
    └── routes/
        └── index.ts            # the HTTP host (Express): GET /plan?hours=4
```

**package.json** scripts:

```json
{
  "scripts": {
    "server": "tsx src/index.ts",
    "host": "tsx src/routes/index.ts",
    "lifecycle": "tsx src/client/client.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

**tsconfig.json** (minimal):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**.env.example** (the template you copy to `.env`):

```dotenv
MCP_SERVER_NAME=task-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_PORT=8081
MCP_SERVER_URL=http://127.0.0.1:8081/mcp
HOST_PORT=8080
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

---

## 0.4 Block-by-block explanation

### Block 0 — the folder tree

The project has exactly 10 top-level items plus the `src/` tree. No folder is optional —
each serves one lecture chapter's code.

### Block 1 — package.json and npm scripts

`npm run lifecycle` (Chapter 08) starts the whole walkthrough: it boots the server, then
walks `resources/list → resources/read → prompts/list → prompts/get → planDay`.
`npm run typecheck` runs `tsc --noEmit`; because we ship `@types/node` in `devDependencies`,
type-checking succeeds even with zero user code changes.

### Block 2 — tsconfig.json

- `target: ES2022` and `module: NodeNext` let us use top-level `await` and `import.meta.url`.
- `rootDir: ./src` and `outDir: ./dist` keep the source files next to their compiled output.
- `strict: true` turns on the full TypeScript strictness surface — no implicit `any`, no
  `Object is possibly undefined`, etc.
- `resolveJsonModule: true` lets `config.json` files be imported directly.

### Block 3 — .env.example

The shipped `.env.example` is committed to the repo; each developer copies it to `.env`
(local `.env` is gitignored). Every constant in `src/config/config.ts` reads from `process.env`,
so the project works out of the box without any `.env` at all (it just uses the defaults).

### Block 4 — src/ layout

```
src/
├── config/       one file: config.ts   ← Chapter 01
├── server/      one file: server.ts    ← Chapter 07
├── services/    two files: taskService.ts + resourceSelector.ts
├── tools/       one file: tools.ts     ← Chapter 06
├── resources/   one file: resources.ts ← Chapter 04
├── prompts/     one file: prompts.ts   ← Chapter 05
├── client/      one file: client.ts    ← Chapter 08
└── routes/      one file: index.ts     ← Chapter 09
```

One file per sub-folder (except `services/`, which needs two — data + decision).

### Block 5 — why one file per folder?

Splitting code by *concept* rather than by *file-count* makes the dependency graph
visible. If you want to change how Resources are registered, you go to
`src/resources/resources.ts`. If you want to change how the host renders
`GET /plan?hours=4`, you go to `src/routes/index.ts`. There is exactly one place
for every concern.

### Block 6 — the dependency graph (build order)

The code actually depends on itself in this order:

```
config.ts           → everything else imports it
taskService.ts      → shared by resources + client
resources.ts        ← depends on config + taskService
resourceSelector.ts ← depends on resources.ts
prompts.ts          ← independent of resources
tools.ts            ← independent of resources
server.ts           ← depends on tools + resources + prompts
client.ts           ← depends on config + taskService + resources + prompts + tools
index.ts            ← depends on server + config
routes/index.ts     ← depends on client + config
```

Reading top to bottom guarantees that every import is satisfied before it is used.

---

## 0.5 Run / verify

```bash
npm run typecheck    # silent, exit 0
npm run lifecycle    # walks the whole lifecycle, prints steps 1–7 (offline)
# OR
npm run server       # starts the MCP server (background)
npm run host         # starts the HTTP host (second terminal)
```

Expected `npm run lifecycle` output (offline, no API key):

```text
[task-mcp-server] v1.0.0 MCP endpoint on http://127.0.0.1:8081/mcp

1. resources/list — discovery, not consumption
   task://guidelines
   task://backlog
   task://summary
   task://projects/{projectId}   (template)
   user://{userId}/profile   (template)

2. resources/read task://guidelines — a STATIC Resource
   Task Management Guidelines:
   1. Deep work tasks should preferably be done before 12 PM.
   ...

3. resources/read task://projects/fde — a TEMPLATED Resource, one definition
   Project: fde
   Tasks: 2
   - [open] Write MCP notes
   - [open] Review pull request

4. resources/read user://123/profile — a second template, same shape
   User: 123
   Open tasks: 2 of 2
   ...

5. prompts/list — which workflows exist?
   plan_day(availableHours)
   review_workload()

6. prompts/get plan_day { availableHours: "4" } — a template, not an answer
   Help me plan my pending tasks for today.
   First read my current pending tasks, then apply the task guidelines.
   I have 4 hours available today.
   ...

7. the model step, after prompts/get — GET /plan?hours=4 in miniature
   (offline — no OPENAI_API_KEY, so no model was called)
   USER:
   Help me plan my pending tasks for today.
   ...
```

---

## 0.7 Checkpoint

1. **Why is `dotenv/config` the first line in `src/config/config.ts`?** → imports are evaluated
   before the module body, so `process.env` is populated before any `export const …` reads it.
2. **Why does `services/` have two files instead of one?** → it holds the data layer
   (`taskService.ts`, shared by resources + client) and a decision layer
   (`resourceSelector.ts`, Chapter 05‑only). Splitting them keeps each file small and
   focused.
3. **What does `hasModelKey === false` change?** → `askModel()` skips the OpenAI call and returns
   the prompt text, so `resources/read` and `prompts/get` stay demonstrable offline.
4. **Why exactly one file per `src/` sub‑folder?** → it makes the dependency graph visible:
   every import has exactly one source, and every source has exactly one destination.

**Next:** [Chapter 01 — Config: Server Identity & Schemes](./01_Config_Server_Identity_and_Schemes.md)