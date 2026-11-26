// Chapter 5: Web search with Tavily (notes 05) - stubbed so it runs without API key
export async function webSearch(query: string, maxResults = 5) {
  // Real: tavily.search({ query, maxResults })
  console.log(`[Tavily stub] would search web: "${query}"`);
  return [
    { url: "https://example.com", title: "Example result", content: `Stub result for: ${query}`, score: 1.0 },
  ];
}