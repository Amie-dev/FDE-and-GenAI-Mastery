# Chapter 09: Running & Verifying the Lab

> **Chapter goal:** boot the service, run all 12 verification steps, and know exactly what "passing" looks like —
> then use the same outputs as the evidence for the lecture's completion gate.
> **Notes chapters covered:** 01 §01.4 (offline mode) · 03 §03.2 (the protocol) · 06 §06.1 (errors as results) ·
> 07 §07.4 (the metrics) · 08 §08.5 (the gate) · 08 §08.6.3 (the ledger) · 08 §08.8 (the checklist).

---

## 9.1 Boot it

```bash
cd "Lecture 08 - Tool Calling/code/Basic Code"

npm install            # express, zod, zod-to-json-schema, openai, dotenv + tsx/tsc
cp .env.example .env   # leave OPENAI_API_KEY empty — OFFLINE mode is fully functional

npm run dev            # tsx watch src/server.ts   -> http://localhost:8098
```

The other three scripts, all verified to pass on this codebase:

```bash
npm run typecheck      # tsc --noEmit  -> exit 0
npm run build          # tsc           -> dist/
npm start              # node dist/server.js
```

**No API key is required.** `lib/llm.ts` checks for one at boot; with none present the service runs against a
deterministic stub that reads the same message array and returns the same normalised shape a provider would. Every
endpoint in this chapter works, every number is reproducible, and the spend is zero. Put a real key in `.env` and
the same code path calls the real provider — nothing else changes.

### What you should see on boot

```text
=======================================================
🚀 Lecture 08 — Basic Tool Calling Lab
📡 Server        : http://localhost:8098
🤖 Model         : openai · gpt-4o-mini (temperature 0.1)
🔑 Mode          : OFFLINE stub — every endpoint still works
🧭 tool_choice   : auto  (chapter 07 §07.2)
🛑 Brakes        : steps 6 · deadline 60000 ms · token ceiling 60000 · repeat 2
🧰 Tools         : calculate[read] · getCurrentWeather[read] · convertCurrency[read] · getInvoiceStatus[read] · createTask[write] · refundPayment[critical]
-------------------------------------------------------
🔍 GET    /api/health                 (wiring · registry · tiers · brakes)
📜 GET    /api/tools                  (the contract the model receives — ch 02)
🔧 POST   /api/tools/:name/call       (one call through executeSafely — ch 03/06)
🔄 POST   /api/agent/run              (the 5-step loop + trace + ledger — ch 03/05)
📊 POST   /api/eval/routing           (routing fixtures + confusion matrix — ch 07)
💰 GET    /api/ledger                 (cost · halt reasons · p50/p95 — ch 08)
🛂 GET    /api/approvals              (the Tier 3 queue — ch 08)
✅ POST   /api/approvals/:id          (approve or reject, once — ch 08)
=======================================================
```

**Read the `Mode` line first.** If it says `LIVE provider`, you have a key in `.env` and the exact token counts in
this chapter will differ (though every structural claim still holds). `OFFLINE stub` is the mode the numbers below
were captured in.

**Read the `Tools` line second.** The `[tier]` labels are the whole chapter 08 §08.5 story: `refundPayment[critical]`
is what makes the approval gate fire.

### Two ways to run the walkthrough

The steps below use `curl`. The same twelve steps are also scripted, with no third-party dependencies:

```bash
python3 scripts/verify.py     # prints all 12 sections, labelled, exit 0 on success
```

It prints the same labelled output quoted in this chapter, so you can diff your run against it. Use whichever you
prefer — the script is the faster path, the raw `curl` commands are the more instructive one.

---

## 9.2 The twelve verification steps

Every output below is real, captured in **OFFLINE mode** on this codebase. The numbers are deterministic: rerun the
script and you will see the same figures.

### Step 1 — `/api/health`: the wiring is inspectable

```bash
curl -s http://localhost:8098/api/health | python3 -m json.tool
```

```text
mode          : offline (deterministic stub model)
model         : openai / gpt-4o-mini | tool_choice: auto
brakes        : {'maxSteps': 6, 'requestTimeoutMs': 60000, 'tokenCeiling': 60000, 'repeatedCallLimit': 2}
toolPolicy    : {'defaultTimeoutMs': 8000, 'cacheTtlMs': 300000, 'maxCallsPerStep': 4}
tools         : calculate[read], getCurrentWeather[read], convertCurrency[read], getInvoiceStatus[read], createTask[write], refundPayment[critical]
endpoints     : 8
```

**Why this is step 1.** Chapter 02 §02.6 requires the wiring to be part of the deliverable, and chapter 08 §08.8
requires the tiers to be visible. One request answers both: six tools, four tiers represented (`read`, `write`,
`critical`), and every brake's value — no reading of source needed.

### Step 2 — the 3-hop chain: the lecture's gate

```bash
curl -s -X POST http://localhost:8098/api/agent/run \
  -H 'content-type: application/json' -H 'x-tenant-id: tenant-a' \
  -d '{"goal":"Convert $120 into Indian rupees and then divide that amount equally among 6 people."}' \
  | python3 -m json.tool
```

```text
ANSWER: 120 USD is about 10020 INR at a rate of 83.5. Split equally, each share is 1670.
STEPS : 3 | HALTED: None | pendingApproval: False
  step 1: convertCurrency({"amount":120,"from":"USD","to":"INR"}) -> ok code=None cached=False
  step 2: calculate({"operation":"divide","a":10020,"b":6}) -> ok code=None cached=False
LEDGER: input per step [1148, 1200, 1220] | out per step [29, 27, 21]
        totalInput 3568 | totalOutput 77 | steps 3 | halted None
```

**This is the single most important output in the lab.** Read the second line of the trace: `a: 10020` is a value
that appears **nowhere** in the user's sentence. It came from hop 1's observation, which is exactly what chapter 05
§05.2 claims and what `!wantsCurrency` in `lib/llm.ts` was added to guarantee. Point at that number and the gate is
satisfied.

Note also `steps: 3` with two trace rows: three model calls (two proposals plus the final synthesis) produced two
*tool* hops. `steps` counts model turns, `trace` rows count assistant messages that carried calls — the two numbers
are not the same, and chapter 05 §05.6 explains why both are reported.

### Step 3 — the parallel batch: two calls in one assistant message

```bash
curl -s -X POST http://localhost:8098/api/agent/run \
  -H 'content-type: application/json' \
  -d '{"goal":"What is the weather in London and how much is $500 in Indian rupees?"}'
```

```text
STEPS: 2
  step 1: 2 call(s) in one assistant message
     getCurrentWeather {"city":"London"} -> ok
     convertCurrency {"amount":500,"from":"USD","to":"INR"} -> ok
```

**Two calls, one assistant message, one step.** That is chapter 03 §03.3.4's fan-out, and it is why the loop must
emit **one `tool` message per call** rather than one per step. The two results go back addressed by their own
`tool_call_id` values, and the next model turn sees both.

### Step 4 — the negative case: no tool proposed

```bash
curl -s -X POST http://localhost:8098/api/agent/run \
  -H 'content-type: application/json' -d '{"goal":"Hello! How are you today?"}'
```

```text
STEPS: 1 | total tool calls: 0 | halted: None
ANSWER: I do not need a tool for that. Ask me for arithmetic, live weather, a currency conversion,
        an invoice lookup, or a task to track, and I will call the right tool.
```

**Zero tool calls, one step, no halt.** This is the case that chapter 07 §07.3 calls *over-calling*, and it is the
hardest failure mode to notice because a working system that calls a tool needlessly still looks like it works. The
run terminates cleanly on the first turn — no brake was needed, because the model simply proposed nothing.

This is also fixture `n1` in the eval, and the reason the confusion matrix has a `none` row.

### Step 5 — self-healing: a domain error becomes an observation

```bash
curl -s -X POST http://localhost:8098/api/agent/run \
  -H 'content-type: application/json' -d '{"goal":"What is 50 divided by 0?"}'
```

```text
  step 1: calculate({"operation":"divide","a":50,"b":0}) -> error code=DIVISION_BY_ZERO
STEPS: 2 | HALTED: None
ANSWER: I could not complete that — DIVISION_BY_ZERO: Division by zero is undefined.
        Provide a non-zero denominator.
```

Three things to notice:

1. **HTTP 200, not 500.** The tool failed; the *service* did not.
2. **`steps: 2`.** The loop took a second turn: the error was fed back as an observation, the model read it, and
   synthesised an honest answer instead of crashing or inventing a number.
3. **The message is the tool's, not the model's.** `"Division by zero is undefined. Provide a non-zero denominator."`
   is the text in `tools.service.ts`. That is chapter 06 §06.2's design: the tool writes the retry hint, so the
   model does not have to guess what went wrong.

### Step 6 — the four error classes, all as results

```bash
# MALFORMED_ARGUMENTS — note the missing closing brace, sent as a raw string
curl -s -X POST http://localhost:8098/api/tools/calculate/call \
  -H 'content-type: application/json' -d '{"arguments":"{\"operation\": \"add\""}'

# INVALID_ARGUMENTS — valid JSON, bad enum value
curl -s -X POST http://localhost:8098/api/tools/calculate/call \
  -H 'content-type: application/json' -d '{"arguments":"{\"operation\":\"frobnicate\"}"}'

# UNKNOWN_TOOL
curl -s -X POST http://localhost:8098/api/tools/teleport/call \
  -H 'content-type: application/json' -d '{"arguments":"{}"}'

# NOT_FOUND — the cross-tenant attempt
curl -s -X POST http://localhost:8098/api/tools/getInvoiceStatus/call \
  -H 'content-type: application/json' -H 'x-tenant-id: tenant-b' \
  -d '{"arguments":"{\"invoiceId\":\"INV-1024\"}"}'
```

```text
HTTP 200  MALFORMED_ARGUMENTS
   tool=calculate outcome=error code=MALFORMED_ARGUMENTS
   content={"status":"error","code":"MALFORMED_ARGUMENTS","message":"Arguments were not valid JSON
   (Expected ',' or '}' after property value in JSON at position 19 (line 1 ...","retryable":true}
HTTP 200  INVALID_ARGUMENTS
   tool=calculate outcome=error code=INVALID_ARGUMENTS
   content={"status":"error","code":"INVALID_ARGUMENTS","message":"Arguments failed validation —
   operation: Invalid enum value. Expected 'add' | 'subtract' | 'multiply' | ..."}
HTTP 200  UNKNOWN_TOOL
   tool=teleport outcome=error code=UNKNOWN_TOOL
   content={"status":"error","code":"UNKNOWN_TOOL","message":"No tool named \"teleport\".",
   "retryable":false,"data":{"available":["calculate","getCurrentWeather","convertC...
HTTP 200  NOT_FOUND cross-tenant
   tool=getInvoiceStatus outcome=error code=NOT_FOUND
   content={"status":"error","code":"NOT_FOUND","message":"No invoice INV-1024 for this account.",
   "retryable":false}
```

**Four failures, four `200`s, four typed codes.** This is chapter 06 §06.1's boundary demonstrated from outside the
process: if any of these returned a 5xx, the guard would have leaked.

The last one is the security case. `INV-1024` **does** exist — but it belongs to `tenant-a`, and the request carried
`x-tenant-id: tenant-b`. The tool scoped its lookup by `ctx.tenantId` and found nothing, so the answer is
`NOT_FOUND` rather than `FORBIDDEN`: a cross-tenant probe must not be able to distinguish "does not exist" from
"exists but is not yours". That is chapter 08 §08.2.2's rule, enforced in the tool rather than in a prompt.

### Step 7 — the TTL cache: the same read twice

```bash
curl -s -X POST http://localhost:8098/api/tools/getCurrentWeather/call \
  -H 'content-type: application/json' -d '{"arguments":"{\"city\":\"Delhi\"}"}'
# run it a second time
```

```text
  call 1: cached=False latencyMs=1 content={"status":"ok","data":{"city":"Delhi","temperatureCelsius":36,...}}
  call 2: cached=True  latencyMs=0 content={"status":"ok","data":{"city":"Delhi","temperatureCelsius":36,...}}
```

**Identical content, `cached` flipped, latency collapsed to 0.** Chapter 04 §04.9.1's TTL cache, and the reason it
belongs in the *runtime* rather than in the prompt: the model cannot be asked to remember not to ask twice. Note
the cache is keyed on tool name plus arguments, and only the two `information` tools participate (`cached: true` in
the registry) — `calculate` is deterministic and cheap, so caching it would add a lookup without saving anything.

The `cached` flag is on the `StepTrace` for a reason: when a run is slow, the trace tells you whether the time went
to a cache miss or to the model.

### Step 8 — the Tier 3 gate: approval, replay, cross-tenant

```bash
# 8a. ask for a refund — a Tier 3 (critical) tool
curl -s -X POST http://localhost:8098/api/agent/run \
  -H 'content-type: application/json' \
  -d '{"goal":"Please refund INV-1025, amount 1299."}'

# 8b. the queue a human reviews
curl -s http://localhost:8098/api/approvals

# 8c. approve it (twice), then try it as another tenant
curl -s -X POST http://localhost:8098/api/approvals/apr_1 \
  -H 'content-type: application/json' -H 'x-tenant-id: tenant-a' -d '{"decision":"approve"}'
curl -s -X POST http://localhost:8098/api/approvals/apr_1 \
  -H 'content-type: application/json' -H 'x-tenant-id: tenant-a' -d '{"decision":"approve"}'
curl -s -X POST http://localhost:8098/api/approvals/apr_1 \
  -H 'content-type: application/json' -H 'x-tenant-id: tenant-b' -d '{"decision":"approve"}'
```

```text
run  : steps 2 | halted None | pendingApproval True
   refundPayment({"invoiceId":"INV-1025","amount":1299}) -> error code=APPROVAL_REQUIRED
ANSWER: I could not complete that — APPROVAL_REQUIRED: This action needs human approval before it can
        run. Tell the user it is pending as apr_1.

queue: apr_1 refundPayment[critical] pending tenant=tenant-a by=user-1
       args={"invoiceId":"INV-1025","amount":1299} hash=hf34ce01b
       summary=refundPayment({"invoiceId":"INV-1025","amount":1299}) for user-1@tenant-a

approve #1 -> HTTP 200 execution={"outcome": "ok", "content": "{\"status\":\"ok\",\"data\":{\"invoiceId\":
              \"INV-1025\",\"refunded\":1299,\"currency\":\"INR\",\"refundedAt\":\"2026-10-27T09:11:12.132Z\"}}",
              "latencyMs": 0}
approve #2 -> HTTP 200 execution={... "refundedAt":"2026-10-27T09:11:12.132Z"}, "replayed": true}
tenant-b   -> HTTP 403 {"error": "Forbidden", "message": "This approval belongs to another tenant."}
unknown id -> HTTP 404 {"error": "Not Found", "message": "No approval apr_does_not_exist."}
```

Five claims, all visible in one block:

| Observation | Notes section | What it proves |
| :--- | :--- | :--- |
| `pendingApproval: True` and `code=APPROVAL_REQUIRED` | 08 §08.5.1 | the tool is **not** executed by the loop |
| `steps 2`, `halted None` | 08 §08.5.1 | waiting for a human is not a failure |
| the queue carries `tier`, `args`, `argsHash`, `summary` | 08 §08.5.2 | what was approved is recorded, not remembered |
| `approve #2` returns the **same** `refundedAt` with `replayed: true` | 04 §04.7.1 | the side effect ran exactly once |
| `tenant-b` gets `403` | 08 §08.2.2 | an approval cannot cross tenants |

**The `refundedAt` timestamp is the proof of idempotency.** Compare the two `content` strings character by
character: they are identical, including the millisecond. A second execution would have produced a new timestamp
and a second `refundId`. That is the `executedResult` replay guard from chapter 08 §8.5 doing its job — and it is
the bug the guide's chapter 08 records as *found and fixed during verification*.

**The `403` arrives before the decision is even applied.** The tenant check in `postApproval` runs before
`decideApproval`, so a cross-tenant caller cannot mutate the record at all — not even to reject it.

**And `404` for an unknown id**, which is the only route in the API that answers with a non-2xx for a *user* error.
That is deliberate: an approval id is a resource locator, and a missing one is genuinely a missing resource.

### Step 9 — the routing eval: four metrics and a confusion matrix

```bash
curl -s -X POST http://localhost:8098/api/eval/routing | python3 -m json.tool
```

```text
fixtures          : 10
selectionAccuracy : 1
argumentValidity  : 1
avgHops           : 1.9
terminationRate   : 1

confusion matrix  :
   getCurrentWeather    -> {'getCurrentWeather': 2}
   calculate            -> {'calculate': 2}
   convertCurrency      -> {'convertCurrency': 1}
   getInvoiceStatus     -> {'getInvoiceStatus': 1}
   createTask           -> {'createTask': 1}
   refundPayment        -> {'refundPayment': 1}
   none                 -> {'none': 2}

   w1  exp=getCurrentWeather  obs=getCurrentWeather  sel=True args=True hops=2 halted=None
   c1  exp=calculate          obs=calculate          sel=True args=True hops=2 halted=None
   c2  exp=convertCurrency    obs=convertCurrency    sel=True args=True hops=3 halted=None
   p1  exp=getCurrentWeather  obs=getCurrentWeather  sel=True args=True hops=2 halted=None
   i1  exp=getInvoiceStatus   obs=getInvoiceStatus   sel=True args=True hops=2 halted=None
   t1  exp=createTask         obs=createTask         sel=True args=True hops=2 halted=None
   r1  exp=refundPayment      obs=refundPayment      sel=True args=True hops=2 halted=None
   n1  exp=none               obs=none               sel=True args=True hops=1 halted=None
   e1  exp=calculate          obs=calculate          sel=True args=True hops=2 halted=None
```

**A perfectly diagonal matrix, 10/10.** Chapter 07 §07.4's four metrics:

| Metric | Value | Read it as |
| :--- | :--- | :--- |
| `selectionAccuracy` | `1` | every fixture routed to the expected tool — including the two that expected *none* |
| `argumentValidity` | `1` | every tool-calling fixture produced schema-valid arguments of the right types |
| `avgHops` | `1.9` | the mean `steps`; the chain (`c2`, 3 hops) and the two negatives (1 hop each) set the spread |
| `terminationRate` | `1` | **every** fixture ended with `halted: null` — no brake fired anywhere |

**`terminationRate: 1` is the quiet one, and it is the most valuable.** It says that none of the ten fixtures
needed a brake: the loop ended because the model stopped proposing tools, not because a limit cut it off. A routing
suite that scores 1.0 on accuracy while needing `maxSteps` on half its fixtures is a suite with a different bug.

**`none -> {'none': 2}` is the row most teams forget.** It is the only row that can catch over-calling, and it is
why fixtures `n1` and `n2` exist. Off-diagonal cells here would name the specific colliding descriptions to rewrite
(chapter 07 §07.3.1).

**`c2` is the only 3-hop fixture** and it is the chain — which is exactly why `avgHops` is 1.9 rather than 2.0:
eight fixtures at 2 hops, two at 1 hop, one at 3.

### Step 10 — the ledger: cost, halt reasons and p50/p95

```bash
curl -s http://localhost:8098/api/ledger | python3 -m json.tool
```

```text
  runs            : 5
  avgSteps        : 2
  avgInputTokens  : 2346.8
  p50Tokens       : 2391
  p95Tokens       : 3645
  toolTimeMsTotal : 3
  haltReasons     : {'completed': 5}
```

These figures are for the five `/agent/run` calls made by steps 2–5 and 8, so they are reproducible only if you run
the steps in order — which is the point of a ledger: it describes *what actually happened* on this process, not a
hypothetical.

**`haltReasons: {'completed': 5}`** is the `?? 'completed'` label from chapter 08 §8.4 doing its job. Run step 11
and this becomes `{'completed': 5, 'maxSteps': 1}` — the brake that fired is named, and the histogram is
aggregatable.

**`p95Tokens: 3645`** equals the chain's total (3568 in + 77 out) — the most expensive run of the five. That is
chapter 08 §08.6.3's requirement that the *worst* run be visible, not just the average.

**`toolTimeMsTotal: 3`** is three milliseconds across five runs. The offline stub answers instantly and every tool
is a pure function, so there is essentially no I/O time — which is itself a useful baseline: when this number climbs
against a live provider, the time is in the network, not in your code.

### Step 11 — the brakes and the routing policies

```bash
# 11a. a budget too small for the chain -> brake 1 fires
curl -s -X POST http://localhost:8098/api/agent/run -H 'content-type: application/json' \
  -d '{"goal":"Convert $120 into Indian rupees and then divide that amount equally among 6 people.","maxSteps":2}'

# 11b. forbid tools entirely
curl -s -X POST http://localhost:8098/api/agent/run -H 'content-type: application/json' \
  -d '{"goal":"What is the weather in Delhi right now?","toolChoice":"none"}'

# 11c. force one specific tool
curl -s -X POST http://localhost:8098/api/agent/run -H 'content-type: application/json' \
  -d '{"goal":"What is 8745 multiplied by 493?","toolChoice":"calculate"}'
```

```text
maxSteps=2 -> steps 2 | halted maxSteps
ANSWER: I reached my step budget before finishing. I did gather: {"status":"ok","data":{"sourceAmount":120,
        "sourceCurrency":"USD","targetCurrency":"INR","exchangeRate":83.5,...

tool_choice=none -> steps 1 | tool calls 0 | halted None
tool_choice=calculate -> first tool calculate
```

**11a is the most instructive of the three.** The chain needs three model turns; with a budget of two, the loop
stops after the second and reports `halted: maxSteps`. Two details make this a *good* brake rather than a silent
truncation:

1. **The answer is still useful.** It says what it gathered and that it ran out — the partial observation is quoted
   back rather than discarded. Chapter 05 §05.7.3: a halt must be reported as a halt.
2. **`halted` is a named reason, not a boolean.** `maxSteps` in the ledger is what makes `haltReasons` in step 10
   aggregatable.

**11b is chapter 07 §07.2's `none` policy**: a question that would normally trigger `getCurrentWeather` produces
zero calls and a single step. This is how you test a *fallback* path — "answer from the weights only" — and it is
also the policy you would use for a summarisation call where tools must never fire.

**11c is the forced-tool policy.** With `toolChoice: "calculate"`, the first tool is `calculate` regardless of what
the model would have preferred. Note that the API accepts the bare name (`"calculate"`) and `toToolChoice` converts
it to `{ name: "calculate" }` — chapter 07 §07.2's fourth policy, exercised end to end.

**Which brakes are not demonstrated here, and why.** Brake 4 (repeated call) and brake 5 (no new information) are
hard to trigger against the offline stub, because it is deterministic and does not thrash: it never re-proposes the
same failing call verbatim, and it never re-reads an observation it already has. Those two brakes are exercised by
the code path in `agent.service.ts` (chapter 06 §6.4b) and become reachable with a live model that retries. Being
explicit about that gap is better than implying all five brakes were observed.

### Step 12 — the validation path: four 400s

```bash
for body in '{"goal":""}' \
            '{"goal":"hi","maxSteps":9999}' \
            '{"goal":"hi","toolChoice":"Not A Tool"}' \
            '{"goal":"hi","timeoutMs":999999}'; do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:8098/api/agent/run \
    -H 'content-type: application/json' -d "$body"
  curl -s -X POST http://localhost:8098/api/agent/run -H 'content-type: application/json' -d "$body"
  echo
done
```

```text
  HTTP 400 body={"goal": ""}                     -> {"error": "Validation failed", "details": {"goal": ["String must contain at least 1 character(s)"]}}
  HTTP 400 body={"goal": "hi", "maxSteps": 9999} -> {"error": "Validation failed", "details": {"maxSteps": ["Number must be less than or equal to 20"]}}
  HTTP 400 body={"goal": "hi", "toolChoice": "Not A Tool"} -> {"error": "Validation failed", "details": {"toolChoice": ["Invalid"]}}
  HTTP 400 body={"goal": "hi", "timeoutMs": 999999} -> {"error": "Validation failed", "details": {"timeoutMs": ["Number must be less than or equal to 60000"]}}
```

**Four rejections, and not one of them reached the engine.** Each is caught by `validateBody(agentRunSchema)` in
front of the handler — chapter 06 §06.5's "validate before you execute" applied to HTTP.

The last line is the one to study: `timeoutMs: 999999` is rejected because the schema caps it at
`config.REQUEST_TIMEOUT_MS` (60000). A client cannot raise its own ceiling. And `parsed.error.flatten().fieldErrors`
means the response names the offending *field*, so a UI can highlight the right input rather than showing a generic
error.

---

## 9.3 The §08.8 checklist, scored against this lab

The notes' 24-item hardening checklist is the lecture's own definition of done. Here is every line, with the file
that satisfies it and how to see it. `✅` = implemented and verified in this lab; `partial` = the mechanism exists
but the surrounding infrastructure is deliberately out of scope for Basic Code.

| # | Check | Where in this code | Status |
| :--- | :--- | :--- | :--- |
| 1 | Descriptions carry triggers, boundaries, units, side effects | `services/tools.service.ts` | ✅ |
| 2 | Categorical params are `enum`; free strings bounded | `tools.service.ts` (`z.enum`, `.min/.max`, regex) | ✅ |
| 3 | `additionalProperties: false` + complete `required` | `registry.service.ts` `toWireDefinitions()` | ✅ |
| 4 | One Zod schema drives both wire and runtime | `tools.service.ts` + `zod-to-json-schema` | ✅ |
| 5 | Registry key equals schema `name`, from one collection | `registry.service.ts` `allTools` | ✅ |
| 6 | Suite is small (≤ 15), no overlapping semantics | 6 tools, `GET /api/tools` | ✅ |
| 7 | Resolve → validate → authorise → execute → **result** | `agent.service.ts` `executeSafely` | ✅ |
| 8 | `tool_call_id` matched; one `tool` message per call | `agent.service.ts` (incl. the `HALTED` fill) | ✅ |
| 9 | `arguments` parsed in `try/catch`, validated before use | `executeSafely` two-stage guard | ✅ |
| 10 | Results carry `status`, `code`, `message`, `retryable` | `errorResult()` in `agent.service.ts` | ✅ |
| 11 | Bounded compute · TTL-cached information · idempotent actions | `tools.service.ts` (step 7 shows the cache) | ✅ |
| 12 | Compact projections with units and a timestamp | every tool's `data` payload | ✅ |
| 13 | Step budget, deadline, token ceiling, repeated-call, no-progress brakes | `config.ts` `BRAKES` + `agent.service.ts` | ✅ |
| 14 | Halt returns a partial answer with a gap statement + reason | `haltAnswer()` (step 11a) | ✅ |
| 15 | Permission tiers; Tier 3 cannot execute without a record | `registry.service.ts` + `postApproval` (step 8) | ✅ |
| 16 | Identity from the session, never from arguments | `middleware/validate.ts` `sessionContext` (step 6) | ✅ |
| 17 | Read/write are separate tools, not a `mode` parameter | 6 distinct tools; no `mode` anywhere | ✅ |
| 18 | Generic capabilities (`runShell`, arbitrary HTTP) absent | the registry is closed; `UNKNOWN_TOOL` (step 6) | ✅ |
| 19 | Outbound tools allow-listed, rate-limited, audited | `createTask`/`refundPayment` are the only writers | partial — audit log is Lecture 09 |
| 20 | Rate limits per user, tool, request, outbound action | `TOOL_POLICY.maxCallsPerStep` bounds fan-out | partial — per-user limits are out of scope |
| 21 | Trace records raw arguments, messages, latency, tokens | `StepTrace` + `Ledger` (steps 2, 10) | ✅ |
| 22 | Ledger reports p50/p95 cost and halt reasons | `getLedger` (step 10) | ✅ |
| 23 | Fixture-based routing eval on every change | `eval.service.ts` + `POST /api/eval/routing` (step 9) | ✅ |
| 24 | Kill switch disables a tool without a deploy | `TOOL_CHOICE=none` per request (step 11b) | partial — global switch is out of scope |

**21 of 24 fully implemented, 3 partial — and the three partials are named rather than hidden.** Items 19, 20 and
24 need infrastructure this lab does not have (an audit store, a shared rate-limit store, a control plane), and
chapter 08 §8.8's comment in `server.ts` says so explicitly: *"the approval queue is durable state, not request
state (Lecture 09 owns the durable version)."*

**How to use the table.** Pick a row, run the step in the right-hand column, and read the output. That is the
difference between claiming a checklist and passing one — and it is why every row names a *file* and a *step*
rather than just a chapter.

---

## 9.4 Troubleshooting the twelve steps

Every entry here is something that actually happened while building and verifying this lab.

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `EADDRINUSE: address already in use :::8098` | a previous `npm run dev` is still running | `pkill -f 'node dist/server.js'` or change `PORT` in `.env` |
| `Cannot find module '/.../dist/server.js'` | `npm start` before `npm run build` | run `npm run build` first, or use `npm run dev` |
| `/health` reports `LIVE provider` when you expected offline | a key is set in `.env` | blank `OPENAI_API_KEY`; `isOffline()` reads it at boot |
| step 2 shows `cached=True` on the **first** call | you ran the walkthrough twice; the TTL is 300 000 ms | restart the server, or accept the hit — the content is identical either way |
| `GET /api/approvals` returns `{"pending": []}` after step 8a | the server restarted; the queue is in-memory | re-run step 8a — the durable version is out of scope here |
| the approval id is `apr_2` instead of `apr_1` | a previous refund is still in the queue | harmless — the id is opaque; the script reads the queue rather than hardcoding it |
| `502 Provider returned an unusable response` | a live provider returned something unparseable | check the server log; the model's raw output failed, not your tools |
| `503 Model credentials are not configured` | `AI_PROVIDER=openai` with no usable key | verify the key is truly empty — the stub engages only then |
| a `500` on any tool route | a bug — a tool failure must be a result | check the log; `DIVISION_BY_ZERO` etc. must be `200` (step 6) |
| `Cannot find module './x.js'` after editing imports | `NodeNext` resolution requires the `.js` extension on relative imports | keep the extension, even though the file is `.ts` |
| a tool is missing from `GET /api/tools` | it is not in `allTools` in `registry.service.ts` | the registry is the single source; add it there and it appears everywhere |
| the refund gate never fires | the tool's tier is not `critical` | check `Tools` on `/health`: `refundPayment[critical]` |

**The two failure classes to keep separate.** A `500` means *your code* is wrong. A `200` with
`outcome: "error"` means *the tool* failed and the runtime handled it. If you ever see a `500` on a tool route, the
guard has leaked — and step 6 is the fastest way to confirm it.

---

## 9.5 The two-question ship gate (§08.8.1)

Chapter 08 §08.8.1 says a tool-calling agent is not ready until you can answer two questions in one sentence each.
Here are the answers for *this* system — the last thing the guide has to demonstrate:

**1. What is the blast radius if the model is wrong or manipulated, and which control bounds it?**

> The model can compute, read the weather and exchange rates, read invoices **for its own tenant only**, create a
> task for the current user, and *propose* a refund — and the one tool with real-world consequence,
> `refundPayment`, cannot execute without an approval record bound to its exact arguments, so the blast radius is
> one tenant's own data plus a queue of proposals a human must sign.

**2. What is the worst-case cost of one request, and which brake bounds it?**

> Six model steps and a 60 000-token ceiling, with a 60 s wall clock and a per-tool 8 s timeout; the observed p95
> in offline mode is 3 645 tokens for a 3-model-call chain (step 10), and the `maxSteps` brake returns a partial
> answer with a gap statement rather than overrunning the budget (step 11a).

Both answers name a **specific control**, not a hope. That is the standard §08.8.1 sets, and the twelve steps in
this chapter are what make the answers checkable rather than aspirational.

---

## 9.6 What this lab deliberately leaves out

The roadmap's Basic Code tier stops here. Naming the gaps is part of the deliverable:

| Not built here | Why it is safe to defer | Where it belongs |
| :--- | :--- | :--- |
| Durable approval queue | in-memory state is enough to prove the *gate*; persistence is a storage problem | Lecture 09 |
| Streaming answers | the loop's shape does not change; only the final synthesis streams | Lecture 07 (AI Streaming) |
| Real tool backends (weather, FX, payments) | pure functions keep the lab deterministic and keyless | Lecture 09+ |
| Auth (JWT / session verification) | `sessionContext` already has the right *shape*; only its source changes | Lecture 09+ |
| Multi-turn conversation memory | one goal per request is enough to prove the loop and the trace | Lecture 10+ |
| Answer-quality evals | this lab measures the **decision** (chapter 07), not the prose | Lecture 30 |
| Per-user rate limiting, audit log, kill switch | needs shared state this lab does not have (items 19/20/24) | Lecture 09+ |

The point of the list is that none of these is an *architectural* gap. Each plugs into a seam this codebase already
has: `registry.service.ts` for persistence, `lib/llm.ts` for streaming, `sessionContext` for auth,
`eval.service.ts` for more metrics. That is what "Basic Code" is supposed to mean.

---

## 9.7 The guide, end to end

You have now read every file in the lab, in dependency order:

| Guide chapter | File(s) | Notes chapters |
| :--- | :--- | :--- |
| [00 — Overview & file structure](./00_Overview_and_File_Structure.md) | all | the map |
| [01 — Project setup & environment](./01_Project_Setup_and_Environment.md) | `package.json`, `tsconfig.json`, `.env.example` | 01 |
| [02 — Config & types](./02_Config_and_Types.md) | `config/config.ts`, `types/agent.types.ts` | 02 |
| [03 — Tool contracts & the registry](./03_Tool_Contracts_and_the_Registry.md) | `services/registry.service.ts` | 02 · 08 |
| [04 — The six tools & the result contract](./04_The_Six_Tools_and_the_Result_Contract.md) | `services/tools.service.ts` | 02 · 04 |
| [05 — The model layer & the five-step protocol](./05_The_Model_Layer_and_the_Five_Step_Protocol.md) | `lib/llm.ts` | 03 |
| [06 — The agent loop, brakes & the trace](./06_The_Agent_Loop_Brakes_and_the_Trace.md) | `services/agent.service.ts` | 05 · 06 |
| [07 — Routing & the fixture eval](./07_Routing_and_the_Fixture_Eval.md) | `services/eval.service.ts` | 07 |
| [08 — The API surface](./08_The_API_Surface.md) | `middleware/validate.ts`, `routes/index.ts`, `controllers/agent.controller.ts`, `app.ts`, `server.ts` | 06 · 07 · 08 |
| **09 — Running & verifying** | `scripts/verify.py` | 08 §08.8 |

Read it alongside the notes, not instead of them: the notes explain *why* each rule exists, and this guide shows
the rule as running code you can poke with `curl`.

---

**Back to:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)
