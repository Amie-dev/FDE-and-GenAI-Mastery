// Chapter 5: User memory with Mem0 (notes 05) - stubbed so it runs without API key
export function getMem0Client() {
  return { add: async () => ({}), search: async () => ({ matches: [] }) };
}

export async function addMemoriesFromMessages(userId: string, messages: { role: string; content: string }[]) {
  // Real: mem0Client.add({ user_id: userId, messages })
  console.log(`[Mem0 stub] would add memories for user ${userId}:`, messages.length);
  return { memories: [] };
}

export async function searchUserMemories(userId: string, query: string, topK = 8) {
  // Real: mem0Client.search({ user_id: userId, query, top_k: topK })
  console.log(`[Mem0 stub] would search memories for user ${userId}: "${query}"`);
  return [];
}