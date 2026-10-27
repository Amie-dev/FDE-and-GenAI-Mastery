# 📝 Lecture 09 — Answer Sheet (template)

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

## A1 — First Principles of AI Agents & the Agency Spectrum

**1. Sensors and actuators (§01.1).**

> _Write here. Name both, and say which one the Lecture 08 lab already had._

**2. "The model predicts tokens" — complete yet misleading (§01.1).**

> _Write here. Give one design decision that changes under the prediction view._

**3. `writeFile` as capability + permission (§01.1).**

> _Write here. Which half does a prompt injection attack?_

**4. The four levels (§01.2).**

> _Write here. For each: who decides the next step, and how many decisions chain._

**5. Why Level 3 is still not an agent (§01.2).**

> _Write here. Then say what changes qualitatively at Level 4._

**6. The agency level as data (§01.2, `config.ts`).**

> _Write here. What breaks if it is an `if/else` chain inside the loop?_

**7. chatbot → copilot → agent mapped to levels (§01.3).**

> _Write here. Which label covers two levels, and why does that cause roadmap arguments?_

**8. Three questions for "we want an agent" (§01.3).**

> _Write here. Then name the level that answers "just do the thing"._

**9. The six components, mapped to files (§01.4).**

> _Write here. Six names, six paths under `src/`._

**10. Two causes of "the agent is unreliable" (§01.4).**

> _Write here. One concrete example of each from this lab._

**11. Brain / loop / tools — which is architectural (§01.5)?**

> _Write here. Defend the split._

**12. Workflow vs agent rule of thumb (§01.6).**

> _Write here. Apply to the compliance report and the failing test; say which must NOT be an agent._

**13. Three things an agent is not (§01.7).**

> _Write here. For each, name the later chapter that supplies the missing piece._

---

## A2 — Agent Architecture: Components & Request Lifecycle

**14. The reference architecture, deterministic vs not (§02.1).**

> _Write here. Which single box is non-deterministic?_

**15. Guardrails on both sides (§02.1).**

> _Write here. Name both gates and their files._

**16. Model-owned vs runtime-owned (§02.2).**

> _Write here. Place all six items on the correct side._

**17. The responsibility teams most often give away (§02.2).**

> _Write here. What does the failure look like in production?_

**18. What breaks when each component is missing (§02.2).**

> _Write here. Six components, six failures._

**19. Model selection as an architecture decision (§02.2).**

> _Write here. Two properties that matter; which does the stub trade away?_

**20. The flight-booking trace (§02.3).**

> _Write here. When does the model first see the user's words, and where is the second authz check?_

**21. Memory loaded before the model (§02.3).**

> _Write here. One reason for the ordering and one failure it prevents._

**22. The two formulas reconciled (§02.4, §02.5).**

> _Write here. State both and say why they are one idea._

**23. The layer map (§02.4).**

> _Write here. Why does the sandbox sit in the security layer and not the domain layer?_

**24. The forced design decisions (§02.7).**

> _Write here. Each decision, this lab's choice, and where you can see it._

**25. The architecture as data in `/api/health` (§02.6).**

> _Write here. What is the engineering value?_

---

## A3 — The Agent Loop: Perceive, Decide, Act & State Machines

**26. The three phases and their artefacts (§03.1).**

> _Write here. For each phase, the artefact the next phase consumes._

**27. "Perceive" is one line — what that implies (§03.2, §03.12).**

> _Write here. Use the word *retrieval*._

**28. Three kinds of decision (§03.3).**

> _Write here. Which one does a chat-only model produce?_

**29. The four-stage act pipeline and its owners (§03.4).**

> _Write here. Which stage is NOT the tool author's job?_

**30. Why `args: unknown` is honest (§03.4).**

> _Write here. What would `any` hide from `strict` mode?_

**31. Hand-trace the worked example (§03.5).**

> _Write here. Per hop: state, tool, argument from the previous observation, brake checked._

**32. Which hop depended on hop 3? (§03.5, §06.6)**

> _Write here. Hop number + reason._

**33. The five state fields and the chapter that needs each (§03.6).**

> _Write here. One exists only to make a chapter-04 brake possible._

**34. The full state machine (§03.7).**

> _Write here. Seven states, every transition, terminal states + their `HaltReason`._

**35. `while (true)` vs state machine (§03.7).**

> _Write here. Five rows, and per row one thing you can do with a state machine._

**36. The tool runner and its single checkpoint (§03.8).**

> _Write here. Which file, which function?_

**37. "If the loop calls the tool directly, no later layer can help" (§03.9).**

> _Write here. Why is this about ordering, not strength?_

**38. Four stages, five failures placed (§03.9).**

> _Write here. Table + the five placements._

**39. The recovery loop and its three rules (§03.10).**

> _Write here. Which rule does "Something went wrong" break?_

**40. Error recovery ≠ unlimited retry (§03.11).**

> _Write here. Find the line, name the brake that would eventually catch it, and the cost paid first._

**41. Why a sandbox denial is not retried (§03.10, stub).**

> _Write here. Two sentences. What is a retrying model actually doing?_

**42. Agent vs RAG (§03.12).**

> _Write here. Both questions + one system that needs both._

**43. Agent loop vs chain-of-thought (§03.13).**

> _Write here. The one thing CoT lacks._

**44. Planning inside the loop (§03.14).**

> _Write here. Why is a never-revised plan a liability?_

---

## A4 — Loop Engineering & Harness Engineering

**45. Four things that can run away (§04.1).**

> _Write here. Why no single limit catches all four._

**46. The failure modes and their controls (§04.9).**

> _Write here. Each failure mode → the brake or control in this lab._

**47. The failure mode that is not a resource problem (§04.1, §04.9).**

> _Write here. Why a resource brake cannot catch it._

**48. `for`, not `while` (§04.2).**

> _Write here. One sentence on the review value._

**49. The post-loop fallthrough (§04.2).**

> _Write here. Why is it load-bearing, and what would the response return without it?_

**50. The nesting rule (§04.3).**

> _Write here. `tool timeout ⊂ ? ⊂ ?` + what goes wrong at each violation._

**51. Deadline computed before `initWorkspace()` (§04.3).**

> _Write here. In terms of what a request deadline bounds._

**52. `Promise.race` without an `AbortSignal` (§04.3).**

> _Write here. The trade-off, and when you must add the signal._

**53. The `O(N²)` token shape (§04.4).**

> _Write here. Paste the array, explain it, and say why "double" is wrong._

**54. The two estimator functions (§04.4).**

> _Write here. What each accounts for; why definitions are counted every hop._

**55. Token brake ≠ step brake (§04.4).**

> _Write here. A goal where steps are generous but tokens still save you._

**56. Three repetition detections (§04.5).**

> _Write here. Which is direct, which two fall out of it._

**57. Why `actionKey` includes arguments (§04.5).**

> _Write here. One legitimate call a name-only key would kill._

**58. This brake "requires state" (§04.5, §03.6).**

> _Write here. The field, the chapter, and the "pays for a safety control" sentence._

**59. The six termination conditions (§04.6).**

> _Write here. Per condition: the check, the `HaltReason`, what the user sees._

**60. Why `partialMessage`'s default must be unreachable (§04.6).**

> _Write here._

**61. Three halt demos (§04.6).**

> _Write here. Three `halted` + `state` pairs. Why THINK twice and ERROR once?_

**62. The brake stack vs spending (§04.7).**

> _Write here. Why check before the model call?_

**63. `rawArguments` as a string (§04.8).**

> _Write here. The one scenario where it saves two days._

**64. Why `pending` is a third outcome (§04.8).**

> _Write here. Name the chapter._

**65. The full defensive pipeline (§04.10).**

> _Write here. Label each box with its chapter. How many boxes is the loop?_

**66. Harness engineering (§04.11).**

> _Write here. One sentence + what this lab implements + the two items left to Lecture 26._

---

## A5 — Workspace Sandboxing & Agent Security

**67. The axiom, in code (§05.1).**

> _Write here. State it, then name the two `Tool` fields._

**68. Why `runCommand` invalidates containment (§05.2).**

> _Write here. Use the word *egress*._

**69. The five vectors, attack + defence (§05.3).**

> _Write here. One line each._

**70. The vector with no complete fix (§05.3).**

> _Write here. Path vs semantic; then the three-layer defence._

**71. What `<untrusted_data>` achieves — and what it does not (§05.3).**

> _Write here._

**72. `safePath`'s five steps and the attack each defeats (§05.4).**

> _Write here._

**73. The trailing separator (§05.4).**

> _Write here. Give the concrete bypass path._

**74. Why `fs.realpath` cannot be a string check (§05.4).**

> _Write here. Use the word *resolution*._

**75. `ENOENT` is not an error (§05.4).**

> _Write here. What breaks if you treat it as one? What breaks if you skip the lexical check there?_

**76. Reject encoded separators rather than decoding (§05.4).**

> _Write here. The security argument._

**77. The escape matrix (§05.4).**

> _Write here. Six `outcome` + `code` pairs. Why do two attempts share a code?_

**78. The four tools and their verbs (§05.5, §06.3).**

> _Write here. Then the two refused tools and the chapter each would need._

**79. Reorder two of `writeFile`'s five steps (§05.5).**

> _Write here. Do the payload/quota pair and the containment/side-effect pair separately._

**80. `listFiles` is names-only, capped, non-recursive (§05.5).**

> _Write here. The attack prevented and the brake enforced at the tool layer._

**81. The four isolation tiers + this lab's tier (§05.6).**

> _Write here. Mechanism, strength, and why this lab's tier is defensible._

**82. The three isolation axes (§05.6).**

> _Write here. Which one makes the other two matter, and why?_

**83. Quotas as a security control (§05.7).**

> _Write here. Contrast a quota trip with an `ENOSPC`._

**84. The 12-item checklist, marked (§05.8).**

> _Write here. ✅ / 🟡 / ❌ per item. Name the one ❌ and why it is a documented choice._

**85. Three common mistakes and the line that avoids each (§05.9).**

> _Write here._

---

## A6 — Building an Autonomous Website-Builder Agent

**86. Advice vs actuation (§06.1).**

> _Write here. One sentence each, then the tool that makes the difference._

**87. The four prompt sentences and their jobs (§06.2).**

> _Write here. Per sentence: its job + the failure it prevents._

**88. Nothing in the prompt is a limit (§06.2).**

> _Write here. Four limits and where each actually lives. Then the intent-vs-enforce distinction._

**89. The four tools and their verbs (§06.3).**

> _Write here. Scaffold / produce / verify / explore, and why each is in the minimal set._

**90. The five temptations (§06.3.1).**

> _Write here. One-line reason each is wrong._

**91. Capability surface = blast radius (§06.3.1, §05.1).**

> _Write here. The inequality + the chapter each side belongs to._

**92. The controller/engine split (§06.4).**

> _Write here. What each owns, then the one line of code that is the controller's whole contribution._

**93. Why zero hardcoded site-generation logic (§06.4, §06.8).**

> _Write here. Answer in terms of general-purpose emergence._

**94. The 5-hop BrewLab trace (§06.5).**

> _Write here. Per hop: state, tool, tier, and the observation that fed the next decision._

**95. Run the build goal (§06.5).**

> _Write here. Paste the token array + `state`/`halted`. Which hop is not strictly necessary, and why is it there?_

**96. Where did `tenant-a` and `s-1` come from? (§06.5, §08.3)**

> _Write here. And what would have to be true for a cross-user write?_

**97. Without vs with `readFile` (§06.6).**

> _Write here. Across blindness, error discovery, repair, answerability._

**98. Trusting existence, distrusting contents (§06.6).**

> _Write here. Name the wrapper._

**99. `listFiles` + `readFile` = a project, not a file (§06.7).**

> _Write here. Give the concrete check that becomes possible._

**100. Same tools, three different products (§06.8).**

> _Write here. What do you change, and what do you lose with a `generateSite()` function?_

**101. The five "what generalises" lessons (§06.9).**

> _Write here. Each with the artefact that embodies it._

---

## A7 — Human-in-the-Loop & Tool Authorization Tiers

**102. Why uniform treatment is wrong (§07.1).**

> _Write here. Over-gating and under-gating, with one example each._

**103. The tier matrix (§07.2).**

> _Write here. Tier → policy name → risk profile → execution mode → this lab's tools._

**104. The classification tree, five tools (§07.2.2).**

> _Write here. Tier + the branch that decided it for each._

**105. The five tiering rules (§07.2.3).**

> _Write here. Each with the line or design choice that enforces it._

**106. Tier inflation vs tier deflation (§07.2.3).**

> _Write here. Explain the asymmetry._

**107. The threshold in code, not the prompt (§07.4.3).**

> _Write here. Two sentences + the chapter whose principle it reuses._

**108. Sync vs async HITL (§07.3).**

> _Write here. Both drawn, plus three production problems with sync._

**109. Why `pending`, not `error` (§07.3).**

> _Write here. The third outcome + the state the run ends in._

**110. The five durable-HITL steps (§07.4.1).**

> _Write here. Each with the `PendingApproval` field that enables it._

**111. Why the full message array is persisted (§07.4.1).**

> _Write here._

**112. Nine `PendingApproval` fields (§07.4.2).**

> _Write here. Each with the §section that requires it._

**113. Lazy expiry on read (§07.4.2).**

> _Write here. One correctness and one operational advantage._

**114. The policy engine's two decisions (§07.4.3).**

> _Write here. Why validated args, not the raw string?_

**115. `CRITICAL_TOOLS` vs `tier === 3` (§07.4.3).**

> _Write here. The scenario where they disagree._

**116. The five webhook correctness requirements (§07.5.1).**

> _Write here. Each with the line in `resumeAgent`._

**117. Requirement 4's three details (§07.5).**

> _Write here. The `tool_call_id`, the denial shape, the approval shape._

**118. 200 for rejection, 409 for replay (§07.5).**

> _Write here. One sentence each._

**119. The two idempotency layers (§07.6).**

> _Write here. What each protects against, and where it lives._

**120. Why the idempotency key is derived (§07.6).**

> _Write here. What a random key fails to do._

**121. Park → approve → replay (§07.6).**

> _Write here. Paste the status, the `error`, and the evidence of no double effect._

**122. The reject path (§07.4.1 note).**

> _Write here. Paste the answer, then quote the note on why the loop resumes._

**123. Idempotency as part of the Tier 3 contract (§07.6).**

> _Write here. Where `refundCustomer` honours it._

**124. Three non-blocking responses (§07.7).**

> _Write here. Each with its effect._

**125. The nine HITL checklist items (§07.8).**

> _Write here. Each with the file/field that satisfies it._

---

## A8 — RBAC, the Defensive Wrapper & Platform Guardrails

**126. Authentication vs authorization (§08.1).**

> _Write here. One line each, then the three things `sessionContext` resolves._

**127. Failing closed to `learner` (§08.1).**

> _Write here. Name the property and the bug it prevents._

**128. The three roles and their permissions (§08.2).**

> _Write here. Which permission is interesting, and why it does not grant access alone._

**129. Why `?? false` (§08.2).**

> _Write here._

**130. Filtering the registry before the model sees it (§08.2.2).**

> _Write here. Quote it, then explain why it is stronger._

**131. `GET /api/tools` as two roles (§08.2.2).**

> _Write here. Paste both `tools` and both `withheldFromThisRole` lists._

**132. The refund goal as a learner (§08.2.2).**

> _Write here. Paste the answer. Why `UNKNOWN_TOOL` beats `FORBIDDEN`, twice over?_

**133. The access path with two authz checks (§08.3).**

> _Write here. Draw it; explain why the second is not redundant._

**134. "Proposal vs decision" (§08.3).**

> _Write here. Restate in terms of the registry filter; describe the lost architecture._

**135. Blast radius and the four reducers (§08.4).**

> _Write here. Both diagrams + the reducers with their chapters._

**136. The jailbreak chain (§08.5).**

> _Write here. Prompt, compliant reply, then the runtime reality. Which path stops it?_

**137. The injection goal through `/api/agent/run` (§08.5).**

> _Write here. Paste the status and score. Would the outcome differ if the gate had not blocked it?_

**138. The five-step tool path (§08.6.1).**

> _Write here. Which step does `authorizeTool` own?_

**139. The question RBAC cannot answer (§08.6.2).**

> _Write here. The question, the IDOR attack, the clause that closes it._

**140. The Zod trap (§08.6.2, §05.5).**

> _Write here. How a correct check passes every request, the rule that prevents it, and the field affected._

**141. `objectAllowed`'s four clauses (§08.6.2).**

> _Write here. In order. Why is ownership first and permission-free?_

**142. Why `billing:refund` has no object (§08.6).**

> _Write here. Why checking one anyway is theatre._

**143. The ABAC demo (§08.6.2, §08.6.4).**

> _Write here. Both outcomes + the roster explanation._

**144. RBAC vs ABAC, and the layering (§08.6.3, §08.6.4).**

> _Write here. The table, then why the layering wins._

**145. The wrapper and its two gates (§08.7).**

> _Write here. Draw it; why the guard analogy applies both ways._

**146. The six injection patterns (§08.7.2).**

> _Write here. Example + attacker's goal each. Which are defeated by "a claimed reason is not authorization"?_

**147. Risk scores and bands (§08.7.3).**

> _Write here. The table, the four bands, and three pasted scan results._

**148. The two keyword-detection warnings (§08.7.3).**

> _Write here. Which is a coverage warning and which is a role warning?_

**149. Pattern 6 keyed by actor, not IP (§08.7.3).**

> _Write here. One case where IP-keying misattributes._

**150. The output gate's two branches (§08.7.4).**

> _Write here. Both branches, then why redaction beats blocking for credentials/PII._

**151. Wrapper vs guardrail vs firewall, and the eight gaps (§08.7.5–§08.7.7).**

> _Write here. The distinction, then the eight items with the file that solves each._

**152. Platform guardrails vs RBAC (§08.8).**

> _Write here. Three capabilities + one control each; then the table and why you need both._

**153. Why `SecurityEvent` is not a log line (§08.9).**

> _Write here. The two fields that make an incident triageable._

**154. Four audit events of different types (§08.9).**

> _Write here. Paste four; say which severity pages someone._

**155. §08.10's principle and its six consequences (§08.10).**

> _Write here._

**156. The complete security architecture (§08.11).**

> _Write here. Draw it, mark the model, and say what is wrong when the model sits at the top._

---

## A9 — Enterprise Agent Patterns, Failure Modes & the 25 Principles

**157. The three patterns (§09.1).**

> _Write here. One system each + the comparison table._

**158. The rule of thumb, and the hybrid rule (§09.1).**

> _Write here._

**159. The hybrid topology (§09.1.1).**

> _Write here. Why each element is deterministic; then the design heuristic._

**160. The one non-deterministic box (§09.1.1).**

> _Write here. Why does it exist at all?_

**161. The four topologies (§09.2).**

> _Write here. Each with its trade-off; which does this lab implement?_

**162. Naive chatbot vs enterprise agent (§09.3).**

> _Write here. Five dimensions; which one do non-engineers miss?_

**163. The four failure classes (§09.4).**

> _Write here. Symptom + control for each._

**164. The non-technical failure class (§09.4).**

> _Write here. The organisational control, and why engineering cannot fix it._

**165. Ten of the 25 principles (§09.5).**

> _Write here. Each with the file or line that implements it — or the lecture that will._

**166. "The application is the kernel" (§09.6).**

> _Write here. One paragraph + three places it is visible in code._

**167. Kernel vs orchestrator (§09.6).**

> _Write here. In terms of who is allowed to fail._

**168. The maturity model (§09.7).**

> _Write here. Five levels; place this lab with two things it does and two it does not._

**169. The one artefact that moves you up a level (§09.7).**

> _Write here. Why is it the gating one?_

**170. The build and the gate restated (§09.8).**

> _Write here. Which chapter supplies each half of the gate?_

**171. Four connecting lectures (§09.11).**

> _Write here. Each with the capability it adds to your agent._

**172. The closing paragraph (§09.8).**

> _Write here. "What is the blast radius of the agent you built, and what is the exact control that limits it?"_

---

## Part B — Code findings

> One entry per check. Copy the block below 48 times (plus 3 for the ABAC extras).

```text
Check NN — <what it proves>
  Command  :
  Output   :
  Reading  : <one sentence — what this tells you, not what it printed>
```

## Part C — Capstone artefacts

**C2 — Attack log.** (10 rows; the last two are your own invention)

| # | Attack | Expected | Observed | Control |
| :---: | :--- | :--- | :--- | :--- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | *(yours)* | | | |
| 10 | *(yours)* | | | |

**C4 — Blast-radius statement.**

| Question | Your answer |
| :--- | :--- |
| What can the agent **read**? | |
| What can the agent **write**, and where exactly? | |
| Worst case if fully compromised? | |
| The **single control** that bounds it? | |
| What that control does **not** bound? | |
| Remove control X → new blast radius? | |
| Structural vs probabilistic threats? | |
| Isolation tier, and is it justified? | |

**C5 — Cost table.**

| `MAX_STEPS` | steps | halted | input | output | total | tokens/step |
| :---: | :---: | :--- | ---: | ---: | ---: | ---: |
| 3 | | | | | | |
| 6 | | | | | | |
| 8 | | | | | | |

> _Then the four prose answers: why tokens/step grows, why "double" is wrong, the tool-definition fraction, and the
> 10,000-runs/day arithmetic._

---

## Part D — The gate

**D1 — The live demonstration (the gate itself).**

```text
1. Blast radius in ONE sentence    :
2. The SINGLE bounding control     :
3. That control firing (command + code) :
4. The control I am NOT relying on :
5. What the bounding control does NOT bound :
6. If the model is fully jailbroken :
```

**D2 — Explain agents to a non-engineer (90 s, banned words avoided).**

> _Write here. Then say which of the four levels their model landed on._

**D3 — The state machine, from memory.**

> _Draw it. Seven states, every transition, terminal states + `HaltReason`. Then: which state for "a human must
> decide", and why is that not terminal?_

**D4 — The four brakes.**

| Brake | Env var | Default | Failure mode | The line that checks it |
| :--- | :--- | ---: | :--- | :--- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |

> _Then: which brake catches a pathology that stays inside every other budget?_

**D5 — The authorization path.**

> _Draw it. Mark authentication, both authorization points, and where the model sits. Then: why is the second check
> not redundant?_

**D6 — Three things that must never be in the prompt.**

| # | Policy value | Why it lives in `config.ts` |
| :---: | :--- | :--- |
| 1 | | |
| 2 | | |
| 3 | | |

> _Then the general principle: "capability in the ___, control in the ___."_

**D7 — The tier decision on a new tool.**

> _Tier, the branch that decided it, whether a human is needed, and what the approver must be shown._

---

### Checklist before you submit

- [ ] Every A1–A9 answer cites its `§` section
- [ ] Every check that asked for a paste has a **command and an output**, not a summary
- [ ] Every check has a one-sentence **Reading**, not a restatement of the output
- [ ] The nine-endpoint table is complete
- [ ] All 8 extensions are recorded with before/after output
- [ ] `npm run typecheck` exits 0
- [ ] The attack log has 10 rows, the last two your own
- [ ] The blast-radius table has all eight rows, including the honest gap
- [ ] The cost table has three real runs
- [ ] The D1 demonstration is recorded, and you can repeat it with no notes in under five minutes
- [ ] D2 was delivered without any banned word
- [ ] No `.env`, no `dist/`, no `node_modules/` committed





