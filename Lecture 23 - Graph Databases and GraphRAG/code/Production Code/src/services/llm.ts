import { Driver } from "neo4j-driver";

/** Optional LLM client for GraphRAG. */
export class LLMService {
  private apiKey: string;
  private model: string;
  private baseURL = "https://api.openai.com/v1";

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content ?? "";
  }
}