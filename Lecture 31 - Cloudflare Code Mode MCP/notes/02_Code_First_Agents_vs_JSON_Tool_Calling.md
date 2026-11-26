# Chapter 02 — Code-First Agents vs. JSON Tool Calling

> **Lecture 31 · Chapter 02 of 08** · Level: 🟠 Advanced · Phase 7 — Connectors, Code Mode & Proactive Workflows
> **Source:** `Cloudflare Code Mode Blog` · **Roadmap Reference:** [`roadmap-v1.md`](../../roadmap-v1.md#lecture-31--cloudflare-code-mode--isolated-code-execution-mcp-cloudflarecodemode)
> **Roadmap topics:** Why LLMs write TypeScript better than chaining raw JSON tool calls · training-data advantage · control flow (`for`, `filter`, `Promise.all`) · intermediate data hiding.

---

## 02.0 What this chapter is for

Cloudflare's central insight in *"Code Mode"* is deceptively simple:

> **LLMs have seen billions of lines of real-world TypeScript/JavaScript during pretraining — they have seen only a tiny fraction of synthetic JSON tool-calling syntax.**

Asking an LLM to orchestrate a 10-step workflow using sequential JSON tool calls is like forcing a senior engineer to program by filling out 10 separate tax forms. Letting the LLM write **a single typed TypeScript snippet** unlocks its strongest capability.

By the end of this chapter you should be able to:

1. Explain the **three architectural advantages** of Code-First agents over JSON tool calling.
2. Show how **control flow** (`for` loops, `if/else`, `Promise.all`, `Array.filter`) replaces multi-turn LLM roundtrips.
3. Explain **intermediate data hiding**: keeping 500 KB of raw API pagination out of the LLM context window.

---

## 02.1 JSON Tool Calling vs. Code-First Execution

Suppose a user asks: *"Find all active DNS zones on our account and return only the ones missing a DMARC TXT record."*

| Dimension | JSON Tool Calling | Code-First (`execute()`) |
| :--- | :--- | :--- |
| **LLM Roundtrips** | `1` call to list 50 zones + `50` calls to list DNS records = **51 LLM turns** | **`1` LLM turn** writes a `Promise.all` loop |
| **Context Window Bloat** | All 50 DNS JSON payloads (~200 KB) flood the LLM conversation history | Sandbox filters in memory; returns **only the 3 missing domain names** |
| **Model Reliability** | Models lose track of state across 51 turns | Standard `async/await` + TypeScript types |

```typescript
// What the LLM writes in ONE Code Mode turn:
const zones = await codemode.listZones({ status: "active" });
const missingDmarc = [];

for (const zone of zones.result) {
  const records = await codemode.listDnsRecords({ zoneId: zone.id, type: "TXT" });
  const hasDmarc = records.result.some((r) => r.content.includes("v=DMARC1"));
  if (!hasDmarc) missingDmarc.push(zone.name);
}

return missingDmarc; // Only 3 strings ever enter the LLM's context!
```

---

## 02.2 Key takeaways

1. **LLMs are native TypeScript programmers:** writing code against typed APIs is far more reliable than chaining 20 JSON tool calls.
2. **Loops, filtering, and joins stay inside the sandbox** — only the final compact answer enters the LLM's context window.
3. **One `execute()` call replaces $N$ sequential roundtrips**, slashing both token cost and wall-clock latency.

---

**Next:** [Chapter 03 — Single Code Tool Pattern (`codeMcpServer`)](./03_Single_Code_Tool_Pattern_codeMcpServer.md)

