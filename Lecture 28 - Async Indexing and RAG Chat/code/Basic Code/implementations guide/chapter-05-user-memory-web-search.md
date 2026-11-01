# Chapter 5: User Memory & Web Search

Based on `notes/05_User_Memory_Web_Search.md`.

## 5.1 Files involved

- `src/services/memory.service.ts` — Mem0 stub
- `src/services/web-search.service.ts` — Tavily stub

## 5.2 Commands

No HTTP endpoints for these stubs — they're called from the chat/logic layer. Console logs show where the real providers would be invoked.

## 5.3 Full code — src/services/memory.service.ts

```ts
export function getMem0Client() {
  return { add: async () => ({}), search: async () => ({ matches: [] }) };
}

export async function addMemoriesFromMessages(userId: string, messages: { role: string; content: string }[]) {
  console.log(`[Mem0 stub] would add memories for user ${userId}:`, messages.length);
  return { memories: [] };
}

export async function searchUserMemories(userId: string, query: string, topK = 8) {
  console.log(`[Mem0 stub] would search memories for user ${userId}: "${query}"`);
  return [];
}
```

## 5.4 Full code — src/services/web-search.service.ts

```ts
export async function webSearch(query: string, maxResults = 5) {
  console.log(`[Tavily stub] would search web: "${query}"`);
  return [
    { url: "https://example.com", title: "Example result", content: `Stub result for: ${query}`, score: 1.0 },
  ];
}
```

## 5.5 Block-by-block explanation

| Block | What it does |
|-------|--------------|
| `getMem0Client` | Returns a Mem0 client stub. Real: `new Mem0Client({ apiKey: process.env.MEM0_API_KEY })`. |
| `addMemoriesFromMessages` | Stores facts about a user across sessions, scoped by `user_id` (privacy rule from the notes). |
| `searchUserMemories` | Retrieves relevant memories via similarity search, scoped by `user_id` so facts never leak across users. |
| `webSearch` | Tavily stub: returns live web results for a query. In production this feeds web citations (`sourceType: "WEB"`) into the RAG chat. |

## 5.6 How it works

These are intentional stubs so the code runs without API keys. To go production, plug real `mem0ai` and `tavily-client` packages here, keep `user_id` scoping, and add retrieved memories/web hints to the chat system prompt (notes 5.4).