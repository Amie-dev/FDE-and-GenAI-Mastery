# Chapter 13: End-to-End Verification

> **Chapter goal:** prove the completion gate from chapter 08 §08.7 with commands and real numbers — and know
> which trade-off you chose.
> **Notes chapters covered:** 08 §08.7 (the build task and the completion gate), §08.1 (the topology),
> 03 §03.9 (the context-bloat test), 06–07 (the hallucination test).

---

## 13.1 Setup

```bash
# from: code/Basic Code/
cp .env.example .env      # no key needed — the lab runs OFFLINE
npm install
npm run typecheck         # must print nothing
npm run build
npm start                 # or: npm run dev
```

The boot banner prints the live policy. Note down `Input budget`, `Context policy` and `Guardrails` — every
number below should be explainable from those three lines.

```bash
export B=http://localhost:8090/api
export U='x-user-id: u_101'
export J='content-type: application/json'
SID=$(curl -s -X POST $B/session -H "$U" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')
echo "session = $SID"
```

---

## 13.2 The nine checks

| # | What it proves | Endpoint | Expected |
| :--- | :--- | :--- | :--- |
| 1 | The process is running the config you think | `GET /api/health` | `mode`, `inputBudget`, `contextPolicy` match the banner |
| 2 | State lives in the application, not the model | `GET /api/session/:id` | `transcript` has `["user","assistant"]` after one turn |
| 3 | The quadratic bill is real | `POST /api/context/projection` | `naiveOverManaged` > 3 at 50 turns |
| 4 | The window is bounded by tokens, not by luck | `POST /api/chat` × N | `historyTrimmed` > 0 once the window fills |
| 5 | The layered pipeline is active | `POST /api/chat` × 12 | `anchorTurns`, `recalledTurns`, `summaryPresent` all set |
| 6 | Injection is stopped before it becomes context | `POST /api/chat` | refusal + `injection_*:block` findings |
| 7 | PII never reaches the context window | `POST /api/chat` | `pii_card:warn` and the text redacted |
| 8 | Answers are grounded and cited | `POST /api/chat` | `citations: ["kb_…"]`, `verification.ok: true` |
| 9 | Unsupported questions are refused | `POST /api/chat` | `isRefusal: true`, `verification.problems: ["no source chunks were retrieved"]` |

---

## 13.3 The completion gate, demonstrated

Chapter 08 §08.7 defines the gate as six requirements. Here is each one, with the command that shows it and the
output from a real run.

### Requirement 1 — the conversation exceeds the configured window

```bash
PAD=$(node -pe '"delivery tracking policy details ".repeat(50)')
for i in $(seq 1 30); do
  curl -s -X POST $B/chat -H "$U" -H "$J" \
    -d "{\"sessionId\":\"$SID\",\"message\":\"Turn $i: $PAD\"}" > /tmp/out.json
done
node -pe 'const c=JSON.parse(require("fs").readFileSync("/tmp/out.json","utf8")).data.context;
  JSON.stringify({historyKept:c.historyKept, historyTrimmed:c.historyTrimmed,
                  historyTokens:c.tokensByTier.history, notes:c.notes}, null, 1)'
```

Observed (with `HISTORY_TIER_SHARE=0.05`, `RECENT_TURNS=60`, window ≈ 5,733 tokens):

```json
{
  "historyKept": 23,
  "historyTrimmed": 33,
  "historyTokens": 5704,
  "notes": ["anchor: first 2 turn(s) pinned (K=2).",
            "eviction: 33 older turn(s) dropped from the verbatim window."]
}
```

**Read that as the budget working.** 33 turns were evicted, 23 were kept, and the history tier landed at
**5,704 of its 5,733-token budget** — 99.5% utilisation. The window is bounded by the *budget*, not by a
turn count.

> With the shipped defaults (`HISTORY_TIER_SHARE=0.35` → ~40,000 tokens) `historyTrimmed` stays `0`, because
> the recent window ($M=6$) is the binding constraint, not the budget. Both are correct; they are just
> different operating points on the cost/coherence triangle. This is a good first experiment: change the
> `.env`, restart, and watch which constraint binds.

### Requirement 2 — early facts survive

```bash
SID2=$(curl -s -X POST $B/session -H "$U" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.sessionId')
curl -s -X POST $B/chat -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID2\",\"message\":\"My order id is 4812 and my hard constraint is that I cannot restart the server.\"}" > /dev/null

for i in $(seq 2 59); do
  curl -s -X POST $B/chat -H "$U" -H "$J" \
    -d "{\"sessionId\":\"$SID2\",\"message\":\"Turn $i: what is the late delivery credit policy?\"}" > /dev/null
done

curl -s -X POST $B/chat -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID2\",\"message\":\"What is my order id and what was my hard constraint?\"}" > /tmp/t60.json

node -pe 'const c=JSON.parse(require("fs").readFileSync("/tmp/t60.json","utf8")).data.context;
  c.messages.slice(0,6).map(m=>m.role+": "+JSON.stringify(m.content.slice(0,80))).join("\n")'
```

Observed at **turn 60**, in the assembled payload:

```
system:    "# 1. ROLE\n- Identity: Senior Tier-1 Customer Support Specialist for \"Tomato\", a "
system:    "[CONVERSATION BACKGROUND]\n- user: Turn 56: what is the late delivery credit poli"
system:    "[CONTEXT]\n[kb_tracking] Order tracking: Live tracking is available in the app un"
user:      "My order id is 4812 and my hard constraint is that I cannot restart the server."
assistant: "Compensation ceiling: Compensation is capped at the value of the order. Support "
system:    "[RELEVANT EARLIER TURNS]\nassistant: Late delivery policy: If an order arrives mo"
```

**The turn-1 message is still there, verbatim, at turn 60.** Four layers are visible in six lines: layer 2
(the running summary), layer 2b (the `[CONTEXT]` evidence), layer 3 (the pinned anchor), and layer 4 (the
recalled earlier turns). This is the answer to the notes' *"I already told you that"* complaint.

### Requirement 3 — cost stays bounded

```bash
curl -s $B/session/$SID2 -H "$U" | node -pe '
  const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
  const ins=d.ledger.map(r=>r.inputTokens);
  JSON.stringify({turns:d.ledger.length, cumulative:d.cost.cumulativeInputTokens, peak:d.cost.peakInputTokens,
                  firstFive:ins.slice(0,5), lastFive:ins.slice(-5)}, null, 1)'
```

Observed over 60 turns:

```json
{
  "turns": 60,
  "cumulative": 48893,
  "peak": 996,
  "firstFive": [550, 520, 580, 640, 700],
  "lastFive": [832, 832, 832, 832, 996]
}
```

**That is a plateau, not a curve.** Per-turn input settles at ~832 tokens and the peak is 996. Compare it to
`POST /api/context/projection` at 50 turns: **325,500 naive vs 107,700 managed (3.02×)**, and the gap widens
with every turn. Requirement 3 is the difference between those two numbers.

### Requirement 4 — no starvation

In the same 60-turn run: `fits: true` on every turn, and `historyKept` never fell to zero. The
`kept.length > 0` guard in `takeNewestWithinBudget` is what guarantees that even a single oversized message
cannot empty the window (chapter 03 §03.2's edge case).

### Requirement 5 — refusal is calibrated

```bash
# answerable → answered with a citation
curl -s -X POST $B/chat -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID2\",\"message\":\"Can I order food in Hyderabad?\"}" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
    JSON.stringify({refusal:d.isRefusal, citations:d.citations, ok:d.verification.ok})'
# {"refusal":false,"citations":["kb_delivery_areas"],"ok":true}

# unanswerable → refused, with the reason recorded
curl -s -X POST $B/chat -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID2\",\"message\":\"What are the enterprise pricing tiers?\"}" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).data;
    JSON.stringify({refusal:d.isRefusal, problems:d.verification.problems})'
# {"refusal":true,"problems":["no source chunks were retrieved"]}
```

Both directions are required. A system that refuses everything scores perfectly on hallucination and is
useless — which is why `refusalRate` is reported by `GET /api/session/:id` (ch 06 §06.9).

### Requirement 6 — the trade-off is named

The gate is not *"make it work"*. It is *"make it work, and defend the point you chose"* (§08.7). Fill in the
sentence with **your** `.env` values:

> *"I chose a **6-turn recent window** with a **2-turn pinned anchor** and **rolling summarisation at 8 turns**,
> backed by **durable user memory** for anything that must survive a session. The cost of that choice is the
> loss of exact older wording — mitigated by promoting durable facts to the memory store, and by semantic
> recall over the cold transcript. I verified it with the 60-turn gate: input tokens plateaued at ~832 per turn
> instead of growing quadratically, early facts survived via the anchor, and `historyTrimmed` stayed at 0
> because the turn count, not the budget, was the binding constraint."*

If you cannot say which of the three axes in §08.7 you optimised for, you have copied an implementation
rather than designed a system.

---

## 13.4 The full sweep

Run every endpoint once and confirm the shape of each response. This is the checklist to run after any change.

```bash
# 1  health — the live policy
curl -s $B/health | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
  JSON.stringify({mode:d.mode, inputBudget:d.inputBudget, window:d.contextPolicy.budgetTokens, strict:d.guardrails.strictVerification})'

# 2  create → 201
curl -s -o /dev/null -w 'POST /session            -> %{http_code}\n' -X POST $B/session -H "$U"

# 3  ownership — 401 and 403
curl -s -o /dev/null -w 'no header               -> %{http_code}\n' $B/session/$SID
curl -s -o /dev/null -w 'wrong user              -> %{http_code}\n' $B/session/$SID -H 'x-user-id: u_999'

# 4  validation — 400 before any token is spent
curl -s -o /dev/null -w 'empty body              -> %{http_code}\n' -X POST $B/chat -H "$U" -H "$J" -d '{}'

# 5  projection — the O(N^2) bill
curl -s -X POST $B/context/projection -H "$U" -H "$J" -d '{"turns":50}' \
  | node -pe 'JSON.stringify(JSON.parse(require("fs").readFileSync(0,"utf8")).data.summary)'

# 6  preview — assembly with no model call
curl -s -X POST $B/context/preview -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID\",\"message\":\"late delivery credit\"}" \
  | node -pe 'const b=JSON.parse(require("fs").readFileSync(0,"utf8")).data.budget;
    JSON.stringify({estimate:b.inputTokens, exact:b.exactInputTokens, tiers:b.tokensByTier, notes:b.notes})'

# 7  the stream — headers, frames, [DONE]
curl -s -N -X POST $B/chat/stream -H "$U" -H "$J" \
  -d "{\"sessionId\":\"$SID\",\"message\":\"Can I order food in Hyderabad?\"}" | tail -8

# 8  GDPR — erasure
curl -s -X DELETE $B/session/$SID -H "$U"; echo
curl -s -o /dev/null -w 'after delete            -> %{http_code}\n' $B/session/$SID -H "$U"
```

Two numbers in check 6 are worth pausing on: `estimate` (Tier 1, free, from `length / 4`) and `exact` (Tier 2,
the real BPE encoder). They differ by a few percent, and that difference is chapter 02 §02.4 in one line —
**use the estimate to decide, use the tokenizer to report.**

A note on check 4: an out-of-range `.env` value fails even earlier. Try
`HISTORY_TIER_SHARE=0.0002 npm start` and the process exits at boot with
`❌ Invalid environment configuration: • HISTORY_TIER_SHARE: Number must be greater than or equal to 0.05`.
That is §08.5's *fail fast, fail loud* — a bad deploy dies at boot, not on request one.

---

## 13.5 Where this goes next

| What is missing | Which lecture |
| :--- | :--- |
| Tools with real side effects (layer 3) | Lecture 08 — Tool Calling |
| Constrained decoding for the output contract (layer 5) | Lecture 10 — Structured Outputs |
| Vector retrieval instead of keyword overlap | Lecture 16 — RAG |
| Long-term memory across sessions and users | Lecture 19 — Agent Memory Systems |
| Durable execution for the compaction job | Lecture 26 — Durable Execution with Inngest |
| Faithfulness evals and regression gates (layer 7) | Lecture 30 — Evals and Testing |
| Prompt-injection defences beyond regexes | Lecture 31 — Security and Guardrails |

Every one of those is a **swap**, not a rewrite — which is the test of whether the layering in this codebase
was done properly. `searchKnowledge` is replaced without touching the prompt; `screenOutput` is extended
without touching the controller; `compactIfNeeded` becomes a durable job without touching assembly.

---

## 13.6 The final checklist

| # | Check | Command | Pass condition |
| :--- | :--- | :--- | :--- |
| 1 | Type-checks clean | `npm run typecheck` | no output |
| 2 | Builds | `npm run build` | `dist/server.js` exists |
| 3 | Boots with the right policy | `npm start` | banner matches `/api/health` |
| 4 | One turn closes the loop | `POST /api/chat` then `GET /api/session/:id` | `["user","assistant"]` |
| 5 | The window is bounded | 30 long turns | `historyTrimmed > 0`, `fits: true` |
| 6 | Early facts survive | 60 turns | turn 1 text still in the payload |
| 7 | Cost plateaus | `GET /api/session/:id` | last-five input tokens flat |
| 8 | Injection is blocked | adversarial message | refusal + `block` finding |
| 9 | Answers are cited | normal question | `verification.ok: true`, citations non-empty |
| 10 | Unsupported → refused | off-domain question | `isRefusal: true` |
| 11 | Streaming works | `curl -N …/chat/stream` | frames arrive incrementally, ends with `[DONE]` |
| 12 | Erasure works | `DELETE /api/session/:id` | `200`, then `404` |
| 13 | **You can name the trade-off** | — | §13.3 requirement 6, in your own words |

---

### Navigation

- **Previous:** [Chapter 12 — Routes, App & Server](./12_Routes_App_and_Server.md)
- **Back to the start:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)
- **Notes:** [../../notes/08_Complete_Enterprise_Chatbot_Architecture.md](../../../notes/08_Complete_Enterprise_Chatbot_Architecture.md)
