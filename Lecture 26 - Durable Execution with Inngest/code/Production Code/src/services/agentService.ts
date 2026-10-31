import { ResearchRequestedPayload, AgentResult, SynthesisResult } from "../types/types.js";

export const agentService = {
  async runInputPreprocessingAgent(input: { query: string; userId: string }): Promise<{
    normalizedQuery: string;
    timestamp: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      normalizedQuery: input.query.toLowerCase().trim(),
      timestamp: Date.now(),
    };
  },

  async runDeepWebSearchAgent(query: string): Promise<AgentResult> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      sourcesFound: 3,
      data: { websites: ["site1", "site2", "site3"] },
    };
  },

  async runArxivAcademicAgent(query: string): Promise<AgentResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      papersFound: 2,
      data: { papers: ["paper1", "paper2"] },
    };
  },

  async runGithubCodeAgent(query: string): Promise<AgentResult> {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return {
      reposAnalyzed: 5,
      data: { repos: ["repo1", "repo2", "repo3", "repo4", "repo5"] },
    };
  },

  async runSynthesisLLMAgent(input: {
    web?: AgentResult;
    academic?: AgentResult;
    code?: AgentResult;
  }): Promise<SynthesisResult> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      summaryTitle: "Synthesized Report",
      content: "Content from parallel agent results",
      citations: ["web1", "arxiv1", "github1"],
    };
  },

  async runDatabaseIndexingAgent(report: SynthesisResult): Promise<{
    indexed: boolean;
    recordId: string;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      indexed: true,
      recordId: `rec_${Date.now()}`,
    };
  },

  async runNotificationAgent(userId: string, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`📧 Notification sent to ${userId}: ${message}`);
  },
};