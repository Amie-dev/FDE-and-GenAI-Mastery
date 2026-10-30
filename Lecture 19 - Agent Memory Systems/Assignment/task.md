# Lecture 19 — Agent Memory Systems: Assignment & Practice Questions

> Complete these after reading the notes in `notes/` and reviewing the code in `code/Basic Code/`.
> Each task maps to a chapter. Use the code as a reference implementation, then extend or verify it yourself.

---

## How to use

1. Read the chapter in `notes/0X_<topic>.md`.
2. Read the matching source file in `code/Basic Code/src/` (see the implementations guide for block-by-block explanations).
3. Attempt the task below for that chapter.
4. Check your work against the completion gate at the end.

---

## Chapter 01 — Stateless LLM APIs & Context-Window Limitations

**Task 1.1 — Demonstrate statelessness (written answer)**

Explain why the LLM cannot answer "What is my name?" on the second request unless the application sends the first request's context. Use the stateless sequence diagram from the notes to show Request 1 → LLM → Response does not carry over to Request 2 → LLM.

**Task 1.2 — Four production failure points (written answer)**

List the four core production failure points of naive history management — context window exhaustion, network bandwidth & latency, attention dilution, quadratic token growth — and give a one-sentence fix for each.

**Related code:** `notes/01_Stateless_LLM_APIs_and_Context_Window_Limitations.md` (conceptual — no code file)

---

## Chapter 02 — Short-Term Memory (STM) & Sliding Windows

**Task 2.1 — Test the sliding window (code)**

Start the server (`npm run dev`) and send several messages in one session via `POST /api/chat`. Confirm `stmMessages` never exceeds `config.stmWindowSize` (default 6) no matter how many turns you send.

**Task 2.2 — Quadratic vs linear cost (written)**

For 30 turns averaging 80 tokens each, compute the cumulative tokens for full history (`30²/2 × 80 = 36,000`) vs sliding window (`30 × 80 = 2,400`). Explain why the sliding window bounds cost per request.

**Related code:** `src/services/stm.ts`, `implementations guide/chapter-02-stm-sliding-window.md`


---

## Chapter 03 — Long-Term Memory (LTM) Taxonomy & Fact Extraction

**Task 3.1 — Extract and store a fact (code)**

Send `POST /api/chat` with `message: "my name is Aminul"`. Confirm `newFacts: 1`.

**Task 3.2 — Recall a fact via LTM (code)**

On the next turn in the same session, ask "What is my name?". Confirm `ltmMemories: 1` and the reply recalls "My name is Aminul".

**Task 3.3 — Deduplication on write (code)**

Send the same fact again. Confirm `newFacts: 0` — the exact duplicate was not stored.

**Task 3.4 — Three memory types (written)**

Define semantic, episodic and graph memory in one sentence each, and give a user-preference example of each.

**Related code:** `src/services/ltm.ts`, `src/services/extraction.ts`, `implementations guide/chapter-03-ltm-fact-extraction.md`

---

## Chapter 04 — Dynamic Context Assembly (STM + LTM + Query)

**Task 4.1 — Confirm the token budget (code)**

Inspect `tokenBudget.used` and `tokenBudget.max` in every `/api/chat` response. Confirm `used <= max` (default max 2000).

**Task 4.2 — Context order (written)**

Explain why context is assembled as System → LTM memories → STM messages → current Query, and why recent STM turns sit closest to the generation point.

**Related code:** `src/services/context.ts`, `implementations guide/chapter-04-context-assembly.md`

---

## Chapter 05 — Memory Eviction, Contradiction Resolution & Decay

**Task 5.1 — Score a memory (written)**

Given `memoryScore = hitCount + max(0, 30 − ageDays)`, compute the score for a memory with 3 hits last accessed 10 days ago. Is it an eviction candidate at threshold 5?

**Task 5.2 — Run eviction (code)**

Call `POST /api/dream` with a `userId`. Confirm low-value memories are removed. Inspect the `actions` array.

**Task 5.3 — Immutable log (written)**

Why should the original conversation be stored separately from derived memories? How does this help auditability?

**Related code:** `src/services/ltm.ts` (`memoryScore`, `findEvictionCandidates`, `deleteMemory`), `src/services/dream.ts`, `implementations guide/chapter-05-eviction-decay.md`


---

## Chapter 06 — Claude-Style Memory Dreaming & Background Reflection

**Task 6.1 — Background vs synchronous (written)**

Why must dreaming run outside the user request path? What happens to chat latency if it runs synchronously on every turn?

**Task 6.2 — Run dreaming (code)**

Call `POST /api/dream` with a `userId`. Confirm it returns `totalMemories`, `duplicatesRemoved`, `evicted`, and `actions`.

**Task 6.3 — Memory lifecycle fields (written)**

List the metadata fields on a `Memory` (`createdAt`, `updatedAt`, `lastAccessedAt`, `hitCount`, `version`, `confidence`, `source`) and say what each tracks.

**Related code:** `src/services/dream.ts`, `implementations guide/chapter-06-dreaming-reflection.md`

---

## Chapter 07 — Managed Memory (mem0) + Multi-tenancy, Privacy & Compliance

**Task 7.1 — User isolation (written)**

Explain why every memory operation must include `userId`. What breaks if two users share the same memory store without isolation?

**Task 7.2 — mem0 vs custom (written)**

Compare building memory from scratch (this code) vs using mem0: fact extraction, embeddings, vector DB, deduplication, user isolation — which does mem0 handle built-in?

**Task 7.3 — Deletion & privacy (written)**

What must a production system do to comply with data deletion requests? List encryption at rest, consent checks, and TTL on cached profiles.

**Related code:** `notes/07_Managed_Memory_mem0_Multi_Tenancy_Privacy_Compliance.md` (conceptual — the basic code isolates by `userId`)

---

## Chapter 08 — Production Memory System Architecture

**Task 8.1 — Draw the data flow (written)**

Sketch the three layers (API layer → Memory layer → Background layer) and the storage layer (Vector DB, Relational DB, Cache, Immutable Log).

**Task 8.2 — Missing production pieces (written)**

The basic code is in-memory. List what must change for production: persistent DB for STM/LTM, circuit breakers, cache TTL, monitoring, auth middleware, backup/restore. Which of these does your code implement, and which are missing?

**Related code:** `notes/08_Production_Memory_System_Architecture.md` (conceptual)

---

## Completion Gate

You can move on to Lecture 20 when you can do all of the following:

- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] `POST /api/chat` stores a user turn and returns a `reply` with `stmMessages` bounded to the window size
- [ ] Sending `"my name is Aminul"` stores a fact (`newFacts: 1`); asking "What is my name?" recalls it via LTM
- [ ] Sending the same fact twice returns `newFacts: 0` (deduplication)
- [ ] `tokenBudget.used <= tokenBudget.max` on every chat response
- [ ] `POST /api/dream` returns `duplicatesRemoved`, `evicted`, and `actions`
- [ ] Explain STM vs LTM vs the context assembly order without notes

> **Gate evidence:** keep a `scratch/` folder (or notes) with your curl outputs. The roadmap gate for Lecture 19 is: *without notes, explain how STM + LTM + memory dreaming give an agent durable memory — name the code files and the key functions involved.*

---

## Capstone (end-to-end)

**Task C.1 — Full memory demo (code)**

Run one session where you:

1. Tell the agent your name, location and one preference (3 facts stored in LTM)
2. Ask a question that needs those facts (confirm LTM recall)
3. Send 10+ turns (confirm STM stays bounded at 6)
4. Run `POST /api/dream` (confirm cleanup ran)

If all four work, you've implemented the complete STM + LTM + dreaming memory loop from the notes.

