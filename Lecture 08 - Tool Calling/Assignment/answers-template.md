# 📝 Lecture 08 — Answer Sheet (template)

> **How to use this file.** Copy it to `Assignment/answers.md` and write your answers under each heading. Do not
> edit this template in place — keep it so you can start again cleanly if you want to.
>
> **The rules.**
> 1. Every answer cites the §section it comes from, in the heading or the first line.
> 2. Where a question has two halves (*"… Then answer: …"*), the second half carries the marks. Answer it even if
>    you have to say "I am not sure, but here is my reasoning".
> 3. Where a question asks you to run something, paste the **command** and the **output**. A claim with no pasted
>    number scores nothing.
> 4. Write prose. Bullet fragments score as "definitions only" on the rubric.
> 5. If you disagree with the notes, say so and say why — that is the top band on row A of the rubric.

**Full question text:** [task.md](./task.md) → Part A.

---

## A1 — From Token Prediction to Tool Augmentation

**1. The single job (§01.1).**

> _Write here._

**2. Plausibility and its decay (§01.1.1).**

> _Write here._

**3. Generating is not acting (§01.2).**

> _Write here._

**4. The BPE defect (§01.3, §01.3.1).**

> _Write here. Name the tokenization problem and at least two of the three mechanical reasons._

**5. The generalisation that matters more (§01.3.2).**

> _Write here. Give one non-arithmetic example._

**6. Brain without hands (§01.4, §01.4.1, §01.4.2).**

> _Write here. Match each of the four missing things to a runtime component._

**7. Linguistic impedance mismatch (§01.5).**

> _Write here. Which side does JSON Schema fix, and which does it not?_

**8. Universal semantic decoder (§01.6, §01.6.1).**

> _Write here. Name one tool you would build first and one you would refuse._

**9. 🎯 Why "return JSON" fails (§01.7, §01.7.1).**

> _Write here. Five failure classes; then the mechanism that removes each — and the one that can only be bounded._

**10. The architectural fix (§01.7.2, §01.9).**

> _Write here. Assign each of the three decisions to a layer._

**11. Capability + permission (§01.8).**

> _Write here. Classify all six tools; name the one still dangerous even with perfect validation._

**12. 💻 See it for yourself.**

```text
(paste the command and output here)
```

> **(a)** where the arithmetic happened: _…_
> **(b)** which §01 section the trace illustrates: _…_
> **(c)** what the answer would have looked like without the tool, and why you cannot verify that against a live
> provider: _…_

---

## A2 — Tool Contracts: JSON Schema, OpenAPI & Parameter Typing

**1. The wrapper (§02.1).**

> _Write here._

**2. The four pillars (§02.2, §02.2.1).**

> _Write here. Then: which two would you keep?_

**3. The vocabulary you actually need (§02.2.2).**

> _Write here._

**4. 🎯 The highest-leverage text (§02.3, §02.3.1).**

> _Write here. Include your rewrite of the weakest description in the registry, and the failure mode it prevents._

**5. Description quality controls accuracy (§02.3.2).**

> _Write here._

**6. What a schema cannot do (§02.4).**

> _Write here. Give one schema-valid but semantically wrong argument._

**7. 💻 One schema, two consumers (§02.5).**

```text
(paste the /api/tools output for calculate here)
```

> **(a)** Zod construct → `parameters` keyword mapping: _…_
> **(b)** `additionalProperties` value and where the decision is made: _…_
> **(c)** what would drift if you hand-wrote the JSON Schema: _…_

**8. A worked argument schema (§02.5.1).**

> _Write here. Enums / bounded numbers / bounded strings / required — and the decision you would defend hardest._

**9. The registry (§02.6).**

> _Write here. Three facts from `/api/health`, and why the tier lives in the registry._

**10. Definition hygiene (§02.7, §02.7.1, §02.7.2).**

> _Write here. Then: the first symptom at twenty tools, and the metric that would show it._

**11. OpenAPI, two audiences (§02.8, §02.8.1).**

> _Write here._

**12. 🎯 Design a contract from a sentence.**

> _Write the full contract here (name, description with all six elements, parameters, tier)._
>
> Then: which parts are policy rather than interface, and why does that matter for review? _…_

---

## A3 — The 5-Step Wire Protocol & Double-Turn Tool Calling

1. **The central misconception (§03.1).** _Write here. Then: which component acts, which decides, and why different?_
2. **The five steps (§03.2).** _Write here. Who acts in each; which are provider calls._
3. **Turn 1 — the outbound payload (§03.3.1).** _Write here. Then: the `tools` array on every turn, and the cost link._
4. **🎯 Turn 2 — the proposal turn (§03.3.2).** _Write here. Then: why `arguments` is a string, and the error class it creates._
5. **Turn 3 — local execution (§03.3.3).** _Write here. Then: the two-stage guard; which stage catches which failure._
6. **Turn 4 — the result turn (§03.3.4).** _Write here. Then: the addressing field, what breaks without it, verbatim re-send._
7. **Turn 5 — synthesis (§03.3.5).** _Write here. Then: is the final message required to be a summary, and the risk if not?_
8. **Message-role invariants (§03.4).** _Write here. Then: which invariant the sample array violates, and the likely provider response._
9. **Why the split exists (§03.5, §03.5.1, §03.5.2).** _Write here. Then: the three consequences; which forces persistence of results._
10. **💻 Trace a real exchange.** _Paste the command and output. Then (a) provider calls, (b) tool hops and why they differ, (c) the derived argument and its hop, (d) which step produced it._
11. **Parallel calls (§03.6).** _Write here. Then: the batch trace, and what breaks with one combined `tool` message._
12. **Cross-provider and streaming (§03.7, §03.8).** _Write here. Then: which file absorbs the differences._

---

## A4 — Tool Taxonomy: Deterministic, Information & Action Tools

1. **The three families (§04.1).** _Write here. Then: idempotent / never-retry / in-between, and what decides._
2. **The policy matrix (§04.2).** _Write here. Then: which family needs a tier rather than a timeout._
3. **The safe calculator (§04.3, §04.3.1).** _Write here. Then: the design note that bounds a DoS from one argument._
4. **The four properties (§04.4, §04.4.1).** _Write here. Then: which is missing from a "usually works" tool, and the user-visible symptom._
5. **💻 Prove the cache.** _Paste both responses. Then (a) the field that flipped, (b) the field that proves no recompute, (c) which tools cache and which do not, (d) why the cache is a runtime concern._
6. **Normalising upstream shape (§04.4.2).** _Write here. Then: which file you would edit, and what breaks without normalisation._
7. **Composition (§04.5, §04.5.1).** _Write here. Then: the argument that proves an observation was used._
8. **The scoped lookup (§04.6, §04.6.1).** _Write here. Then: the rule that yields `NOT_FOUND` rather than `FORBIDDEN`, and why better._
9. **🎯 The action tool (§04.7, §04.7.1).** _Write here. Then: your sentence justifying `write` vs `critical`._
10. **Designing the result for the model (§04.8, §04.8.1).** _Write here. Then: your bad result, your good result, and the effect of each on the next turn._
11. **Results are untrusted input (§04.8.3).** _Write here. Then: a concrete payload, and the defence layer that catches it._
12. **Operational policy per class (§04.9, §04.9.1).** _Write here. Then: the three subtleties, and the one `maxCallsPerStep` bounds._

---

## A5 — Multi-Step Chaining & the ReAct Execution Loop

1. **Single-turn to multi-hop (§05.1).** _Write here. Then: who decides a second call is needed, and why that needs a loop._
2. **The dependency chain (§05.2, §05.2.1).** _Write here. Then: what orchestration code you did not write, and what replaced it._
3. **💻 Prove the chain.** _Paste the trace. Then (a) the dependent argument, (b) the message that carried it, (c) what the loop would have needed to know in advance._
4. **Parallel dispatch (§05.3, §05.3.1).** _Write here. Then: which rule prevents a correctness rather than a cost problem._
5. **Sequential or parallel? (§05.4).** _Write here. Then: your expectation for two sub-goals sharing an input, and what you would check._
6. **🎯 The ReAct triplet (§05.5, §05.5.1).** _Write here. Then: which element is not sent to the model, and what that means for auditability._
7. **Why interleaving wins (§05.5.2).** _Write here. Then: a task where planning first is better._
8. **The execution engine (§05.6, §05.6.1).** _Write here. Then: the four responsibilities and their files; the one that would be a security bug in the prompt._
9. **Do you need a framework? (§05.6.2).** _Write here. Then: your adoption criterion and the cost of adopting early._
10. **💻 Break the loop on purpose.** _Paste `steps`, `halted`, the answer. Then (a) the brake, (b) why the answer is still useful, (c) where you would read this in aggregate, (d) what the user sees if the runtime threw._
11. **The five brakes (§05.7, §05.7.1, §05.7.2).** _Write here. Then: which two cannot be triggered against the stub, and why that is a model property._
12. **Halting well, and the trace (§05.7.3, §05.8, §05.8.1, §05.8.3).** _Write here. Then: what raw argument strings make possible, and the debugging question a parsed trace cannot answer._

---

## A6 — Error Handling, Self-Healing & Result Re-injection

1. **The cardinal rule (§06.1).** _Write here. Then: what the rule does not say, and why the naive reading is wrong._
2. **Why "never throw" is wrong (§06.2).** _Write here. Then: the two categories that should still be non-2xx, and whose code is broken._
3. **The single boundary (§06.2.1).** _Write here. Then: the route that calls it without an approval id, and the consequence._
4. **The error taxonomy (§06.3, §06.3.1).** _Write here. Then: retryable? user-visible? — and the two tricky classes._
5. **💻 Prove that a failure is a result.** _Paste the response. Then (a) the status and why correct, (b) the stage that caught it, (c) what `retryable` tells the model, (d) the naive alternative and what breaks._
6. **The structured error contract (§06.4, §06.4.2).** _Write here. Then: each field's consumer, and what must never appear._
7. **The two-stage guard (§06.5, §06.5.1, §06.5.2).** _Write here. Then: an example where stage 1 passes and stage 2 fails._
8. **🎯 Repair strategies (§06.5.3).** _Write here. Then: your decision for each of the three strings, including the refusal._
9. **The self-healing loop (§06.6, §06.6.4).** _Write here. Then: what the model must be told at each level, and when healing is worse._
10. **💻 Watch it heal.** _Paste the trace and the answer. Then (a) steps, (b) why more than one hop, (c) the source of the retry hint, (d) what a "helpful" model would do that you must prevent._
11. **Retry policy (§06.7, §06.7.1).** _Write here. Then: the tool that must never auto-retry, what must exist first, and the field that encodes it._
12. **Anti-patterns (§06.8, §06.8.1).** _Write here. Then: the two most damaging, each with its production symptom._

---

## A7 — Routing, `tool_choice` & Testing Tool Selection

1. **A semantic match, not a lookup (§07.1, §07.1.1).** _Write here. Then: the six inputs, and which one you control._
2. **The four policies (§07.2, §07.2.1).** _Write here. Then: your default policy and why not the other three._
3. **Policies and tool-set size (§07.2.2).** _Write here. Then: where `auto` starts to degrade, and which two metrics move first._
4. **The six failure modes (§07.3, §07.3.1).** _Write here. Then: for each, the artefact you would change._
5. **🎯 A worked diagnosis (§07.3.2).** _Write here. Then: your diagnosis for the weather-returns-currency symptom — cause, then cheapest fix._
6. **Four metrics (§07.4, §07.4.1).** _Write here. Then: which metric is not about selection, and why it is still included._
7. **💻 Run the eval.** _Paste the summary and the matrix. Then (a) diagonal? (b) what a diagonal matrix fails to prove, (c) the row that catches over-calling, (d) the only 3-hop fixture._
8. **Designing the fixture set (§07.5, §07.5.1).** _Write here. Then: the two fixtures you would keep, justified from §07.3._
9. **The harness and the matrix (§07.5.2, §07.5.3).** _Write here. Then: what `calculate → convertCurrency: 3` tells you that a scalar cannot, and what you would change first._
10. **Regression discipline (§07.6, §07.6.1).** _Write here. Then: your CI gate — command, threshold, and the one thing you would not assert on._
11. **Beyond routing (§07.7, §07.7.1).** _Write here. Then: a trace-derived assertion a tool unit test cannot give you, and the chapter it protects._

---

## A8 — Security, Permissions & the Token Economy

1. **The sovereign law (§08.1, §08.1.1, §08.1.2).** _Write here. Then: the two prohibitions, and what "the prompt is not a control" means for a prompt that does hold policy._
2. **The three-tier matrix (§08.2, §08.2.1).** _Write here. Then: classify all six tools and justify the two non-`read` ones._
3. **Three permission patterns (§08.2.2).** _Write here. Then: which one this lab implements, where, and what you would add for multi-tenant SaaS._
4. **The threat model (§08.3, §08.3.1).** _Write here. Then: the control per threat, and the threat only a combination stops._
5. **🎯 Indirect injection (§08.3.2, §08.3.3).** _Write here. Then: the three structural defences, why each is structural, and an attack against this lab's tools with the layer that stops it._
6. **Six defence layers (§08.4).** _Write here. Then: your two, and the failure the dropped layer allows._
7. **The containment checklist (§08.4.1).** _Write here. Then: the equivalent controls for `refundPayment`._
8. **Rate limiting and quotas (§08.4.2).** _Write here. Then: which dimension `maxCallsPerStep` implements, the three missing, and the shared state they need._
9. **The approval gate (§08.5, §08.5.1, §08.5.2).** _Write here. Then: the rule that binds an approval, and the attack a plain yes/no misses._
10. **💻 Exercise the gate end to end.** _Paste all five outputs. Then (a) executed during the run? (b) the two fields proving no re-execution, (c) the status for the other tenant and why correct, (d) why `pendingApproval: true` with `halted: null`, (e) which rule breaks if parsed arguments were stored._
11. **The token economy (§08.6, §08.6.1, §08.6.2).** _Write here. Then: the four levers, the one this lab uses, and the one that cuts cost without cutting capability._
12. **💻 Read the ledger.** _Paste the seven fields. Then (a) why p95 over the average, (b) which run set it, (c) where `completed` comes from, (d) value or change?_
13. **🎯 The two-question ship gate (§08.8.1).** _Write here. The 24-item checklist marked, then your two answers for your own agent._

---

## Part D — The gate

**D1 — The live demonstration.** _Record the six steps: the banner facts, the trace row with the intermediate value,
the message that carried it, the 3-calls-for-2-hops explanation, the ledger numbers, and the halt semantics._

> _Write here._

**D2 — Explain tool calling in 90 seconds.** _(Banned words: `tool`, `function call`, `JSON`, `schema`, `LLM`, `AI`,
`model`, `prompt`, `token`. Name which part may be wrong and which must not be.)_

> _Write here._

**D3 — The protocol, from memory.**

> _Write here: (1) the five steps and who acts, (2) the three `tool_calls` fields and the addressing one, (3) the rule
> for N calls, (4) the five brakes and their failure modes, (5) the four error-contract fields and their consumers._

**D4 — The three layers, drawn.**

> _Paste your mermaid diagram here, then answer which layer owns "may this run", and why not the other two._

**D5 — The trade-off, named.**

> _"I chose X; the cost is Y, mitigated by Z."_ — then: what you would give up to remove the cost, and why that
> trade is worse.

**D6 — Why a tool is not a plugin.**

> _Write here: four sentences, then the two properties a tool call has that a function call does not, with the
> component that handles each._

---

### Checklist before you submit

- [ ] Every A1–A8 question answered, each citing its §section
- [ ] Every 💻 question has a pasted command **and** its output
- [ ] Every "Then answer:" half answered, even where you were unsure
- [ ] D1–D6 written up, with the D1 demonstration recorded
- [ ] `b1-notes.md`, `b2-extensions.md`, `b3-defence.md`, `lab-report.md`, `gate-evidence.md` all present
- [ ] Self-graded against the rubric in [task.md](./task.md) → Part E
