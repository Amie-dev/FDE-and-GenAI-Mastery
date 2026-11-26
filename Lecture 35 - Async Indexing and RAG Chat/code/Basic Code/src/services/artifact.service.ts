import { store } from "../store/memory-store";

// Chapter 6: Learning artifacts (notes 06) - flashcards, quizzes, summaries from conversation
export async function generateArtifacts(conversationId: string, workspaceId: string, userId: string) {
  const conversation = store.getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const assistantTexts = conversation.messages.filter((m) => m.role === "ASSISTANT").map((m) => m.content);
  const joined = assistantTexts.join(" ");

  const flashcard = {
    type: "FLASHCARD" as const,
    front: "What is the key takeaway from this conversation?",
    back: joined.slice(0, 200),
    tags: ["conversation"],
    difficulty: "EASY" as const,
  };
  const quiz = {
    type: "QUIZ" as const,
    questions: [{ id: "q1", question: "Summarize the discussion in one sentence.", options: [], answer: joined.slice(0, 100) }],
  };
  const summary = { type: "SUMMARY" as const, summary: joined.slice(0, 500) };

  const artifacts = [flashcard, quiz, summary];
  for (const a of artifacts) {
    store.createArtifact({ ...a, conversationId, workspaceId, userId, content: a });
  }
  return artifacts;
}