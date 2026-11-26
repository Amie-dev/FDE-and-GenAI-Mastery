# Lecture 31 - Cloudflare Code Mode MCP

> **Stage 2: Connect** · **Phase:** 7 · Connectors, Code Mode & Proactive Workflows · **Level:** 🟠 Advanced
> **Source:** `Cloudflare Code Mode Blog & Docs` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Eliminate the 2M-token tool-schema explosion by collapsing massive enterprise APIs (2,500+ endpoints) into ~1,000 tokens via typed TypeScript code execution inside isolated Cloudflare Dynamic Workers.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 27](../Lecture%2027%20-%20MCP%20Core/) · [Lecture 30](../Lecture%2030%20-%20Enterprise%20APIs%20OpenAPI-to-MCP%20and%20Computer-Use/) |
| **Unlocks** | [Lecture 37](../Lecture%2037%20-%20Agent%20UIs%20K8s%20and%20KEDA%20Scaling/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_31_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **The Tool Schema Scaling Wall** | Why exposing 500+ JSON tool schemas breaks reasoning and overflows context windows. |
| **02** | **Code-First Agents vs. JSON Tool Calling** | Why LLMs write TypeScript against typed APIs far more reliably than chaining raw JSON tool calls. |
| **03** | **Single Code Tool Pattern (`codeMcpServer`)** | Wrapping existing MCP servers into one `code` tool with a typed `codemode` TypeScript namespace. |
| **04** | **Search & Execute Pattern (`openApiMcpServer`)** | Publishing 2,500+ OpenAPI endpoints in ~1,000 tokens via `search()` and `execute()`. |
| **05** | **Dynamic Workers & Sandbox Isolation** | Keeping intermediate loop data, pagination state, and API credentials out of the LLM context. |
| **06** | **OAuth 2.1 & Scoped Delegated Execution** | Integrating Workers OAuth Providers to downscope permissions per user. |
| **07** | **Serving with Cloudflare Workers & Agents SDK** | Wiring `createLegacyMcpHandler` and deploying production Code Mode servers. |
| **08** | **Production Code Mode Governance & Evals** | Benchmarking token savings, multi-step latency reduction, and sandbox safety. |

---

## 🛠️ What You Will Build (`code/`)

A **Cloudflare Code Mode MCP Server** (`code/`) implementing both `codeMcpServer()` (wrapping an existing MCP server) and `openApiMcpServer()` (exposing a 200+ endpoint OpenAPI spec in ~1,000 tokens).

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 31** complete, verify all of the following:

Agent discovers endpoints via `search()` and executes a multi-step loop inside a single `execute()` snippet using `< 1,500` schema tokens and leaking zero API secrets.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ✅ |
| Write all chapter notes + `Lecture_31_Complete_Notes.md` in `notes/` | ✅ |
| Update `index.md` with links to every chapter | ✅ |
| Build & test the runnable implementation in `code/` | ✅ |
| Write & pass the completion gate in `Assignment/task.md` | ✅ |

---

## 📁 Layout

```text
Lecture 31 - Cloudflare Code Mode MCP/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_31_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [Cloudflare Blog: Code Mode](https://blog.cloudflare.com/code-mode/)
- [Cloudflare Docs: Build a Code Mode MCP Server](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 31**.
