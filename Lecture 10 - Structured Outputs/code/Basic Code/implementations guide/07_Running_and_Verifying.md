# Chapter 07: Running & Verifying

> **Chapter goal:** reproduce every claim in this guide with a single command, and know what "verified" means for a
> structured-output system.
> **Notes chapters covered:** the lecture's **Gate** — *"you can prove — with a table — that your system never emits
> a malformed object, and you know what it does when the content is wrong"* (chapter 09 §09.3–§09.4, §09.9).

---

## 7.1 Start the service

```bash
cd "Lecture 10 - Structured Outputs/code/Basic Code"
npm install
npm run dev            # or: npm run build && npm start
```

You should see the banner:

```text
🚀 Lecture 10 — Basic Structured Outputs Lab
📡 Server        : http://localhost:8100
🤖 Model         : openai · gpt-4o-mini (temperature 0)
🔑 Mode          : OFFLINE stub — every endpoint still works
📐 Schema        : meeting.v1  (one declaration -> type + validator + wire contract — ch 02 §02.6)
🔒 Enforcement   : native_schema  of [native_schema > json_mode > instruction]  (ch 05 §05.7)
   └─ why        : Offline stub emulates native schema enforcement (chapter 05 §05.7).
🎯 Closed set    : ONE_ON_ONE | INTERVIEW | TEAM | OTHER  (ch 04 §04.4)
🔁 Loop          : 2 bounded repair(s) then the fallback ladder (ch 06 §06.7, §06.9)
🧪 Semantics     : duration > 240 min -> review · start in the past -> block (ch 06 §06.6)
⚠️  Silent limits : 6 keywords the decoder does NOT enforce — Zod does (ch 05 §05.4.3)
```

Every line is a claim from the notes, and every line is verifiable below.

---

## 7.2 The seven checks

### Check 1 — the architecture report (chapter 05 §05.5.1, §05.4.3)

```bash
curl -s localhost:8100/api/health | python3 -m json.tool
```

```json
{
  "status": "ok",
  "mode": "offline (deterministic stub model)",
  "model": "gpt-4o-mini",
  "enforcement": { "active": "native_schema",
                   "ladder": ["native_schema", "json_mode", "instruction"],
                   "reason": "Offline stub emulates native schema enforcement (chapter 05 §05.7)." },
  "schemaVersion": "meeting.v1",
  "silentLimits": ["minimum / maximum      -> validated by Zod, not by the decoder", "…"],
  "semanticPolicy": { "maxDurationMinutes": 240, "maxDurationDays": 30, "reviewDurationMinutes": 240 },
  "loop": { "maxRepairs": 2, "maxTokens": 700 }
}
```

**What this proves:** the process can state which enforcement rung it is on *and why* — and it knows which keywords
the decoder will not enforce.

---

### Check 2 — the wire contract (chapter 02 §02.6, chapter 04)

```bash
curl -s localhost:8100/api/schema | python3 -m json.tool
```

Look for three things:

| Look for | Proves |
| :--- | :--- |
| `artefacts` lists all three, including the two that are not JSON | The contract is one declaration, three artefacts |
| `"additionalProperties": false` inside `jsonSchema` | `.strict()` reached the wire (§04.12.6) |
| `unions: { "used": false, "reason": "…" }` | The union rule is a stated decision, not an accident (§04.12.1) |

> **The drift test.** Snapshot this output in CI. A change to the generated JSON Schema then fails the build until
> someone reviews it — the cheapest guard against a contract change reaching the model unreviewed (chapter 04 §04.15).

---

### Check 3 — the clean extraction (chapter 06 §06.2 step 5)

```bash
curl -s -X POST localhost:8100/api/extract \
  -H 'content-type: application/json' \
  -d '{"text":"Schedule a Docker discussion with Rahul tomorrow at 4 PM for 30 minutes. My email is rahul@acme.com"}'
```

```json
{
  "outcome": "ok",
  "attempts": 1,
  "value": {
    "schemaVersion": "meeting.v1",
    "reasoning": "The words \"with Rahul\" and \"16:00\" drove this extraction.",
    "title": "Docker",
    "attendeeName": "Rahul",
    "attendeeEmail": "rahul@acme.com",
    "startIso": "2026-10-28T16:00:00.000Z",
    "durationMinutes": 30,
    "type": "ONE_ON_ONE",
    "location": null,
    "needsHuman": false
  },
  "enforcement": "native_schema"
}
```

**What to verify, and why each one matters:**

| Field | Expected | The rule it demonstrates |
| :--- | :--- | :--- |
| `outcome` | `ok` | First-pass validity (§09.2) |
| `attempts` | `1` | No repair was needed |
| `durationMinutes` | `30` — a **number** | §04.8 · integer, not `"30"` |
| `startIso` | a full ISO instant, **tomorrow** | §04.7 · normalised, resolved against the prompt's "today" |
| `type` | one of the closed set | §04.4 · enum |
| `location` | `null` | §04.9 · required + nullable, not absent |
| `title` | `"Docker"`, not the whole sentence | §04.12.11 · bounded, and the `description` asked for a topic |
| `reasoning` | cites the words used | §04.10 · the reasoning field came first |
| no extra keys | — | §04.12.6 · closed object |

---

### Check 4 — the repair loop (chapter 03 §03.2 failures #7 and #9 → chapter 06 §06.7)

The stub deliberately emits a **wrong type** and an **enum drift** on the first attempt when the input omits the
duration and says "one to one":

```bash
curl -s -X POST localhost:8100/api/extract \
  -H 'content-type: application/json' \
  -d '{"text":"Schedule a one to one with Priya tomorrow at 2 PM in zoom"}'
```

```json
{
  "outcome": "repaired",
  "attempts": 2,
  "value": { "durationMinutes": 30, "type": "ONE_ON_ONE", "startIso": "2026-10-28T14:00:00.000Z",
             "location": "zoom", "attendeeEmail": null, "needsHuman": true },
  "issues": [
    { "path": "durationMinutes", "message": "Expected number, received string [invalid_type]", "severity": "block" },
    { "path": "type", "message": "Invalid enum value. Expected 'ONE_ON_ONE' | … received 'one-to-one' [invalid_enum_value]", "severity": "block" }
  ],
  "enforcement": "native_schema"
}
```

**What this proves — the whole lecture in one response:**

| Observation | Proves |
| :--- | :--- |
| `attempts: 2` | The repair loop ran exactly once (§06.7) |
| `issues[]` has `path` + message + severity | Errors are **data**, not exceptions (§06.5) |
| `durationMinutes: 30` (a number now) | The wrong type was **fixed**, not worked around |
| `type: "ONE_ON_ONE"` | The enum drift was fixed |
| `startIso` is still **tomorrow** | The original text stayed in the conversation; the repair did not lose it (§06.8) |
| `needsHuman: true` | The abstention flag is honest (§04.14.1) |
| HTTP `200`, not an error | A repaired extraction is a **success** |

> **The most important line is `startIso`.** A naive repair implementation *replaces* the user message with the
> repair prompt — and then the model no longer sees "tomorrow", so the repaired object silently uses today's date.
> That is a real bug this lab avoids by keeping the original turn (§06.8).

---

### Check 5 — the terminal outcomes (chapter 06 §06.10)

```bash
# a refusal — the model declines
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8100/api/extract \
  -H 'content-type: application/json' -d '{"text":"What is the weather in Delhi?"}'
# -> 422

# a truncation — the provider cut the output
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8100/api/extract \
  -H 'content-type: application/json' -d '{"text":"Schedule a TRUNCATE meeting with Sam tomorrow at 3 PM for 45 minutes"}'
# -> 502
```

| Response | What it proves |
| :--- | :--- |
| `422` for the refusal | A refusal is a **typed outcome**, not a `500` (§06.10) |
| `502` for the truncation | Truncation is detected via `finish_reason` **before** parsing, so the diagnosis is right |
| Neither is retried | Chapter 06 §06.10.1 — retrying a refusal wastes spend and can produce a worse answer |

> **Why the truncation check comes before the parse.** If you parsed first, the truncated text would surface as
> `parse_error` and the issue distribution would say `(root) :: parse` — sending you to fix the *prompt* when the real
> fix is `MAX_TOKENS`. Check ordering is what makes the metrics diagnostic.

---

### Check 6 — the two severities (chapter 06 §06.6.1)

```bash
curl -s -X POST localhost:8100/api/extract \
  -H 'content-type: application/json' \
  -d '{"text":"Schedule a team standup with Ana tomorrow at 10 AM for 300 minutes"}'
```

```json
{
  "outcome": "ok",
  "attempts": 1,
  "trace": { "semanticFlags": ["durationMinutes: Duration exceeds the 240-minute policy"] }
}
```

**What this proves:** a 300-minute meeting is **legal** (the schema allows up to 480) and **unusual** (the policy
wants a human). It is accepted *and* flagged. Rejecting it would be over-rejection; accepting it silently would be
under-rejection. Two severities solve both.

---

### Check 7 — the metrics table (chapter 09 §09.2 — the Gate)

Run the six requests above, then:

```bash
curl -s localhost:8100/api/metrics | python3 -m json.tool
```

```json
{
  "metrics": {
    "calls": 5,
    "attempts": 6,
    "firstPassValidityRate": 0.4,
    "repairRate": 0.2,
    "finalFailureRate": 0,
    "refusalRate": 0.2,
    "semanticFlagRate": 0.2,
    "p95LatencyMs": 5,
    "issueDistribution": [
      { "path": "durationMinutes", "type": "invalid_type",       "count": 2 },
      { "path": "type",            "type": "invalid_enum_value", "count": 2 },
      { "path": "(root)",          "type": "truncated",          "count": 1 }
    ],
    "byEnforcement": { "native_schema": { "calls": 5, "firstPassValid": 2, "validityRate": 0.4 } }
  },
  "cost": { "inputTokens": 946, "outputTokens": 317, "repairMultiplier": 1.2, "schemaTokenCost": 391 },
  "flaggedTraces": 1
}
```

**The four things to read, in order:**

1. **`calls: 5`, `attempts: 6`.** The difference is the one repair. This is the invariant to assert: `attempts ≥ calls`,
   and `attempts − calls` is the total number of repairs. Getting this wrong (remembering per attempt) inflates
   `calls` and corrupts every rate.
2. **`issueDistribution`** — the ranked list of fixable defects. `durationMinutes :: invalid_type (2)` means the
   duration arrived as a string twice. That is a ticket, not a complaint.
3. **`byEnforcement`** — **this is the lecture's Gate.** Validity dimensioned by enforcement rung.
4. **`cost.repairMultiplier: 1.2`** — the `1 + repairRate` factor from §09.5, measured rather than assumed. And
   `schemaTokenCost: 391` is the fixed overhead paid on every call.

---

## 7.3 The Gate: the validity-per-rung table

The lecture's completion gate is: *"you can prove — with a table — that your system never emits a malformed object,
and you know what it does when the content is wrong."*

**Part 1 — "never emits a malformed object."** The proof is the metrics table plus one assertion:

```text
finalFailureRate: 0        <- nothing reached the caller as unusable
```

and the reason it is zero is structural: `extract()` has **one exit point**, and every path through it returns either
a validated object or a typed failure. There is no path that returns raw model text.

**Part 2 — the table.** Because enforcement is a *configuration* value, you can produce the table without touching
code. For each rung:

```bash
# 1 · set the rung
sed -i 's/^ENFORCEMENT=.*/ENFORCEMENT=instruction/' .env     # then json_mode, then native_schema
# 2 · restart, replay the same six requests, record /api/metrics
# 3 · repeat
```

| Enforcement | Layer | Guarantee | `firstPassValidityRate` (illustrative) | `finalFailureRate` |
| :--- | :---: | :--- | :--- | :--- |
| `instruction` | 0 | none | lowest — every failure class is live | 0 (the validator + degraded object still catch it) |
| `json_mode` | 1 | syntax only | higher — preamble and fence failures are gone | 0 |
| `native_schema` | 2 | syntax + shape | highest — drift, type and enum failures are gone | 0 |

> **The lesson the table teaches.** `finalFailureRate` is **0 at every rung**, because validation and the degraded
> object are *always* present. What the rung changes is `firstPassValidityRate` and `repairRate` — i.e. **cost and
> latency, not correctness.** That is the strongest possible statement of chapter 05's thesis: enforcement and
> validation are complements, and it is validation that bounds the damage.

**Part 3 — "what it does when the content is wrong."** The answer is a sequence, and every step is observable:

| When the content is wrong | What the system does | Where to see it |
| :--- | :--- | :--- |
| Shape is wrong | Bounded repair with the issues | Check 4 |
| Meaning is wrong but plausible | Accept + `review` flag | Check 6 |
| Meaning is wrong and unsafe | Repair → degraded object | §7.4 |
| The model declines | `422 refused`, no retry | Check 5 |
| The provider truncates | `502 truncated`, budget raised | Check 5 |
| All repairs exhausted | **Degraded object**: valid shape, explicit `null`s, `needsHuman: true` | §7.4 |

---

## 7.4 The degraded-object experiment

The single most instructive experiment in the lab. Set the bound to zero:

```bash
sed -i 's/^MAX_REPAIRS=.*/MAX_REPAIRS=0/' .env
npm run dev
```

Then send the duration-less input from Check 4:

```json
{
  "outcome": "degraded",
  "attempts": 1,
  "value": { "reasoning": "Degraded: durationMinutes: Expected number, received string [invalid_type]; …",
             "title": "Untitled meeting", "attendeeName": "Unknown", "attendeeEmail": null,
             "durationMinutes": 30, "type": "OTHER", "location": null, "needsHuman": true },
  "reason": "durationMinutes: Expected number, received string [invalid_type]; …"
}
```

**Four properties, and each is a design rule (chapter 06 §06.9.1):**

| Property | Why it matters |
| :--- | :--- |
| The **shape is valid** | Downstream code needs no special case — it is a `Meeting` like any other |
| Unknowns are explicit `null`s | Nothing was fabricated to fill a hole |
| `needsHuman: true` | The workflow routes it to a human |
| `reasoning` starts with `Degraded:` | The degradation is **loud**, in the object, not just in a log |

Restore `MAX_REPAIRS=2` afterwards.

---

## 7.5 The verification checklist

Print this and tick it as you go. Every row is a claim from the notes with a command that tests it.

| # | Claim (chapter) | Command | Expected |
| :--: | :--- | :--- | :--- |
| 1 | The rung is chosen and explainable (§05.7) | `GET /api/health` | `enforcement.active` + `reason` |
| 2 | The silent limits are known (§05.4.3) | `GET /api/health` | `silentLimits[]` non-empty |
| 3 | One declaration → three artefacts (§02.6) | `GET /api/schema` | `artefacts` lists 3 |
| 4 | The object is closed (§04.12.6) | `GET /api/schema` | `additionalProperties: false` |
| 5 | No unions (§04.12.1) | `GET /api/schema` | `unions.used === false` |
| 6 | Clean extraction is first-pass valid (§09.2) | Check 3 | `ok`, `attempts: 1` |
| 7 | Numbers are numbers (§04.8) | Check 3 | `durationMinutes: 30` |
| 8 | Dates are resolved, not relative (§04.7) | Check 3 | an ISO instant for *tomorrow* |
| 9 | Unknowns are `null`, not absent (§04.9) | Check 3 | `location: null` |
| 10 | The repair loop works (§06.7) | Check 4 | `repaired`, `attempts: 2` |
| 11 | Issues are machine-readable (§06.5) | Check 4 | `issues[].path` + message + severity |
| 12 | The repair does not lose the original input (§06.8) | Check 4 | `startIso` is still tomorrow |
| 13 | A refusal is a typed outcome (§06.10) | Check 5 | HTTP `422` |
| 14 | Truncation is detected, not guessed (§06.10) | Check 5 | HTTP `502` |
| 15 | A `review` is accepted *and* flagged (§06.6.1) | Check 6 | `ok` + `semanticFlags` |
| 16 | Metrics are per **call**, not per attempt (§09.2) | Check 7 | `attempts ≥ calls` |
| 17 | The issue distribution is ranked (§09.2) | Check 7 | sorted descending |
| 18 | Validity is dimensioned by rung (the **Gate**) | Check 7 + §7.3 | `byEnforcement` present |
| 19 | Cost includes the repair multiplier (§09.5) | Check 7 | `repairMultiplier > 1` |
| 20 | The ladder ends in a degraded object (§06.9) | §7.4 | `degraded`, `needsHuman: true` |

**If all twenty pass, the lecture's gate is satisfied.**

---

## 7.6 What is deliberately missing

A lab is defined as much by what it leaves out. These are real production concerns, and each belongs to a later
lecture:

| Missing | Where it is taught |
| :--- | :--- |
| A **golden set** and an evaluation harness | Lecture 30 (Evals and Testing) · chapter 09 §09.3–§09.4 |
| A **metrics store** and dashboards | chapter 09 §09.6 — the two-store pattern |
| **Schema versioning rollout** (shadow → canary → full) | chapter 09 §09.7 |
| **Tool calling** and the action pipeline | Lecture 08 · chapter 07 |
| **Integrations, adapters, idempotency, MCP** | Lecture 21–22 · chapter 08 |
| **Guardrails** and prompt-injection defences | Lecture 31 · chapter 07 §07.9.1 |
| **Batch / async extraction** and caching | chapter 09 §09.5.2 |
| **Multi-tenant cache keying** | chapter 05 §05.8.1 |

> The **Production Code** folder in this lecture takes the same features and rebuilds them with a production folder
> structure, an evaluation harness and a rollout plan — which is where §09.3–§09.7 stop being a checklist and become
> code.

---

**Back to:** [Chapter 00 — Overview & File Structure](./00_Overview_and_File_Structure.md)




