# Lecture 04 — Basic Code (LLM APIs & Multi-SDK)

A **minimum, readable** Express + TypeScript service that implements only the features described in
[`../../notes/`](../../notes/). One file per concern, no frameworks beyond Express/Zod, no abstractions
you cannot trace in one sitting.

> 📖 **Step-by-step tutorial:** [`implementations guide/`](./implementations%20guide/) — Chapter 00 → 09,
> with the full code of every file and a block-by-block explanation.

---

## 🧠 What this code implements (and where it comes from)

| Notes chapter | Feature | Implemented in |
| :--- | :--- | :--- |
| [01](../../notes/01_GenAI_Applications_vs_Raw_LLMs_The_Engine_vs_Car_Model.md) | The app (this service) owns the LLM call, not the client | the whole service |
| [02](../../notes/02_The_LLM_API_Protocol_HTTP_Components_and_Postman.md) | The four invariant components: endpoint · auth · model · input | `src/config/config.ts`, `GET /api/health` |
| [03](../../notes/03_Message_Roles_and_Prompt_Hygiene.md) | Role separation + prompt hygiene (instructions vs data) | `src/services/chat.service.ts`, `src/middleware/validate.ts` |
| [04](../../notes/04_Token_Economics_Prefill_Decode_Metadata_and_Cost.md) | Usage metadata → cost per call | `src/services/token.service.ts`, `src/utils/telemetry.ts` |
| [05](../../notes/05_Token_Counting_and_Context_Budgeting_with_Tokenizers.md) | Token counting + context budgeting | `src/services/token.service.ts`, `POST /api/tokens/count` |
| [06](../../notes/06_Rate_Limits_Quotas_Throttling_and_Retry_Backoff.md) | Rate limits → retry with exponential backoff + jitter | `src/lib/retry.ts` |
| [07](../../notes/07_Multi_SDK_Integration_OpenAI_Gemini_Groq_Mistral_Anthropic_Ollama.md) | Multi-SDK: one interface, several providers | `src/lib/client.ts` |
| [08](../../notes/08_Building_the_Service_Express_TypeScript_Config_Singletons_and_Telemetry.md) | Express layering, config singleton, telemetry | `src/app.ts`, `src/server.ts`, `src/config/`, `src/utils/` |
| [09](../../notes/09_AI_Slop_and_Model_Collapse.md) | Anti-slop output screen | `src/guards/slop.guard.ts` |

---

## 🚀 Quick start

```bash
cd "Lecture 04 - LLM APIs and Multi-SDK/code/Basic Code"

npm install                 # install dependencies
cp .env.example .env        # then put a real key in OPENAI_API_KEY
npm run dev                 # http://localhost:8080
```

Other scripts: `npm run build` (tsc → `dist/`), `npm start` (run the build), `npm run typecheck`.

---

## 🔌 Endpoints

| Method | Path | Notes chapter | Cost |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | 02 · 08 | free — shows provider, model, endpoint, budget |
| `POST` | `/api/chat` | 03 · 04 · 06 · 07 · 09 | one provider call |
| `POST` | `/api/tokens/count` | 05 | free — counts and budgets without calling anyone |

Use [`test-requests.http`](./test-requests.http) (VS Code REST Client) or the `curl` examples in the guide.

---

## 📂 Structure

```text
Basic Code/
├── .env / .env.example     # secrets + the four invariant components
├── package.json            # scripts and dependencies
├── tsconfig.json           # ES2022 · NodeNext · strict
├── test-requests.http      # ready-to-run requests
├── implementations guide/  # Chapter 00 → 09 tutorial
└── src/
    ├── server.ts                        # boot + banner
    ├── app.ts                           # Express app, 404, error mapping
    ├── config/config.ts                 # Zod-validated env, endpoints, pricing
    ├── lib/client.ts                    # provider adapters + client singleton
    ├── lib/retry.ts                     # backoff, jitter, retryable statuses
    ├── services/chat.service.ts         # messages → budget → call → cost → slop
    ├── services/token.service.ts        # estimate, count, budget, cost
    ├── controllers/chat.controller.ts   # thin HTTP handlers
    ├── middleware/validate.ts           # Zod request shape = privilege boundary
    ├── guards/slop.guard.ts             # filler-phrase screen
    ├── routes/index.ts                  # /health, /chat, /tokens/count
    └── utils/telemetry.ts               # one structured log line per call
```

---

## 🔁 Switching provider

Change one line in `.env` — nothing else in the codebase moves:

```ini
AI_PROVIDER=ollama      # openai | groq | mistral | ollama | gemini
AI_MODEL=llama3.2
```

| Provider | Dialect | Key needed |
| :--- | :--- | :--- |
| OpenAI / Groq / Mistral / Ollama | OpenAI-compatible (`messages`) | yes / yes / yes / no |
| Gemini | native (`contents` + `parts`) | yes |

> ⚠️ **Never commit `.env`.** `.env.example` is the committed template.

---

## 🔗 Related

- Notes: [`../../notes/`](../../notes/) · Lecture index: [`../../index.md`](../../index.md)
- Assignment: [`../../Assignment/task.md`](../../Assignment/task.md)
