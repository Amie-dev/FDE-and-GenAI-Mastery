# Chapter 04: Host, Client and Server — The Three Roles

## Key Concepts

- **Host**: AI application owning UX, policy, consent, context, composition
- **MCP Client**: Talks protocol to exactly one server — discovery, invocation, resources, prompts
- **MCP Server**: Provides capabilities (tools, resources, prompts); does the actual work; no LLM needed

## Code Relation

| Role | Code File | What It Does |
|---|---|---|
| **Host** | `src/index.ts` | Entry point, entry transport binding (stdio client spawns server) |
| **MCP Server** | `src/server/server.ts` | `createServer()` factory assembling tools, resources, prompts |
| **Business Logic** | `src/services/taskService.ts` | Execution layer for tools |
| **Configuration** | `src/config/config.ts` | Server identity, transport mode |

## Transport

- STDIO is the local binding (child process over stdin/stdout)
- The same `createServer()` would be served over HTTP by swapping only the transport line in `index.ts`
- STDIO rule: stdout is the protocol channel — diagnostics go to stderr