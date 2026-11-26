# 🧠 Chapter 03 — Steps API & Memoization Mechanics

## 1. Chapter Overview

In this chapter, we take a deep technical dive into the **Inngest Steps API** and the **Re-hydration Execution Model**.

Understanding how JavaScript functions are executed, paused, re-evaluated, and memoized by the Inngest Engine is vital to writing bug-free, deterministic multi-agent systems inside [src/inngest/functions/](../src/inngest/functions).

---

## 2. Exhaustive Technical Reference: The Inngest `step` Primitives

Inside an Inngest function handler `async ({ event, step }) => { ... }`, the `step` object provides several primitives:

| Primitive | Signature | Purpose & Behavior |
| :--- | :--- | :--- |
| **`step.run`** | `step.run(id, async () => result)` | Executes an async block, memoizes its JSON-serializable return value, and creates a durable checkpoint. |
| **`step.sleep`** | `step.sleep(id, duration)` | Durably pauses function execution for a specified duration (e.g., `'10s'`, `'2h'`, `'1d'`) without holding server threads open. |
| **`step.waitForEvent`**| `step.waitForEvent(id, { event, timeout, match })` | Durably pauses execution until a matching event signal is emitted or a timeout occurs. |
| **`step.sendEvent`** | `step.sendEvent(id, events)` | Publishes new events directly to the Inngest event bus inside a workflow step. |
| **`step.invoke`** | `step.invoke(id, { function, data })` | Invokes another Inngest function asynchronously or synchronously as a child workflow. |

---

## 3. The Re-hydration / Execution Loop Mechanics

Many developers assume Inngest works by "saving the thread memory state" or serializing JavaScript call stacks. **That is not how it works!**

Node.js cannot serialize call stacks. Instead, Inngest uses an ingenious pattern called **Function Re-hydration**.

### How Re-hydration Works Step-by-Step:

Suppose we have a function with 3 steps:

```javascript
async ({ event, step }) => {
  const a = await step.run('step-a', () => computeA());
  const b = await step.run('step-b', () => computeB(a));
  const c = await step.run('step-c', () => computeC(b));
  return c;
}
```

Here is the exact execution timeline:

```text
Pass 1 (Fresh Run):
 ├── Function enters from Line 1.
 ├── Encounters step.run('step-a').
 ├── 'step-a' is NOT in Inngest cache.
 ├── Executes computeA().
 ├── Sends HTTP Response to Inngest Engine: { stepId: 'step-a', result: DataA }.
 └── Function terminates immediately!

Pass 2 (Inngest re-invokes HTTP Endpoint):
 ├── Function enters from Line 1.
 ├── Encounters step.run('step-a').
 ├── Inngest SDK checks state memory: 'step-a' IS IN CACHE!
 ├── Instantly returns cached DataA WITHOUT calling computeA().
 ├── Encounters step.run('step-b').
 ├── 'step-b' is NOT in cache.
 ├── Executes computeB(DataA).
 ├── Sends HTTP Response: { stepId: 'step-b', result: DataB }.
 └── Function terminates!

Pass 3 (Inngest re-invokes HTTP Endpoint):
 ├── Function enters from Line 1.
 ├── Returns cached DataA for 'step-a'.
 ├── Returns cached DataB for 'step-b'.
 ├── Encounters step.run('step-c').
 ├── Executes computeC(DataB).
 └── Completes function run!
```

> [!IMPORTANT]
> **Key Insight**: The entire JavaScript function re-executes from top to bottom on every step boundary! Completed steps return instantly from cache, while new steps execute their callbacks.

---

## 4. Golden Rules of Inngest Functions

Because the function body re-evaluates top-to-bottom on every step pass, you must strictly follow these **4 Golden Rules**:

### Rule 1: Never Put Non-Deterministic Code Outside `step.run()`

```javascript
// ❌ BAD: Non-deterministic side effect outside step.run()
async ({ event, step }) => {
  const timestamp = Date.now(); // ⚠️ This will generate a NEW timestamp on every re-hydration pass!
  const randomId = Math.random(); // ⚠️ Changes on every pass!

  const result = await step.run('do-work', async () => {
    return await api.call(timestamp, randomId);
  });
}

// ✅ GOOD: Wrap side effects or computations inside step.run()
async ({ event, step }) => {
  const result = await step.run('do-work', async () => {
    const timestamp = Date.now();
    const randomId = Math.random();
    return await api.call(timestamp, randomId);
  });
}
```

### Rule 2: Never Perform Un-checkpointed Side Effects Outside `step.run()`

```javascript
// ❌ BAD: Database write outside step.run()
async ({ event, step }) => {
  await db.users.update({ id: event.data.userId, status: 'PROCESSING' }); // ⚠️ Will execute MULTIPLE times during re-hydration!

  await step.run('step-1', async () => { ... });
}

// ✅ GOOD: Put database writes inside step.run()
async ({ event, step }) => {
  await step.run('update-user-status', async () => {
    return await db.users.update({ id: event.data.userId, status: 'PROCESSING' });
  });

  await step.run('step-1', async () => { ... });
}
```

### Rule 3: Step Return Values Must Be JSON-Serializable

Step return values are transmitted over HTTP and stored in JSON format by Inngest.

- ✅ **Allowed**: Plain Objects, Arrays, Strings, Numbers, Booleans, `null`.
- ❌ **Forbidden**: Class instances with methods, Functions, Symbols, Circular References, Streams, DOM nodes, `undefined` properties.

### Rule 4: Step IDs Must Be Unique Within a Function Run

Step IDs (e.g., `'step-1-input-processing'`) serve as the lookup keys for cached state. Never duplicate a step ID within the same workflow path.

---

## 5. Architectural Design of `agentService.js`

In Day 13, all autonomous agent logic is encapsulated inside [agentService.js](../src/services/agentService.js):

```javascript
class AgentService {
  async runInputPreprocessingAgent(rawInput) { ... }
  async runDeepWebSearchAgent(query) { ... }
  async runArxivAcademicAgent(query) { ... }
  async runGithubCodeAgent(query) { ... }
  async runSynthesisLLMAgent(multiAgentOutputs) { ... }
  async runDatabaseIndexingAgent(synthesisData) { ... }
  async runNotificationAgent(userId, message) { ... }
}

module.exports = new AgentService();
```

### Why Decouple Services from Step Definitions?

1. **Separation of Concerns**: [agentService.js](../src/services/agentService.js) contains pure domain logic (calling AI models, formatting data, searching APIs).
2. **Clean Step Wrapping**: Inngest functions in [src/inngest/functions/](../src/inngest/functions) simply delegate to `agentService` inside `step.run()` callbacks:
   ```javascript
   const webResearch = await step.run('step-2-deep-web-search', async () => {
     return await agentService.runDeepWebSearchAgent(inputData.normalizedQuery);
   });
   ```
3. **Testability**: You can unit test [agentService.js](../src/services/agentService.js) functions independently without needing an Inngest runtime.

---

## 6. Summary & Next Steps

In this chapter, we mastered:
- The full Inngest Steps API (`step.run`, `step.sleep`, `step.waitForEvent`, `step.invoke`).
- The top-to-bottom Function Re-hydration model.
- Golden Rules for writing deterministic, side-effect-free step functions.
- Clean service encapsulation with [agentService.js](../src/services/agentService.js).

Next, proceed to [Chapter 04 — Parallel Agents & Human-in-the-Loop Signals](chapter-04-human-in-the-loop-and-parallel-agents.md)!
