# Chapter 6: Learning Artifacts

## Goal & Overview

Learning artifacts turn chat conversations into structured knowledge resources that learners can use for study, review, and quick reference. The system generates flashcards, quizzes, summaries, and audio overviews from conversation content, storing them as searchable artifacts.

**Key Components:**
- **Artifact types**: Flashcards, quizzes, summaries, audio overviews
- **Generation triggers**: At conversation end or periodic intervals
- **Artifact storage**: Separate artifact records with searchable content
- **Artifact API**: Frontend endpoints for artifact management

## 6.1 Artifact Generation

### 6.1.1 Artifact Types

```mermaid
flowchart TD
    A[Conversation] --> B{Generate Artifacts}
    B --> C{Flashcards}
    B --> D{Quizzes}
    B --> E{Summaries}
    B --> F{Audio Overviews}
    C --> G[Generate Q&A pairs]
    D --> H[Create MCQs}
    E --> I[Generate concise summaries]
    F --> J[Text-to-speech processing]
```

### 6.1.2 Artifact Generation Pipeline

```ts
// server/src/services/artifact-generation.service.ts
export interface ConversationArtifact {
    conversationId: string;
    userId: string;
    artifacts: GeneratedArtifact[];
    generatedAt: Date;
    metadata?: ArtifactMetadata;
}

export type GeneratedArtifact =
    | FlashcardArtifact
    | QuizArtifact
    | SummaryArtifact
    | AudioOverviewArtifact;

interface ArtifactBase {
    id: string;
    type: "FLASHCARD" | "QUIZ" | "SUMMARY" | "AUDIO_OVERVIEW";
    conversationId: string;
    workspaceId: string;
    userId: string;
    generatedAt: Date;
}
```

### 6.1.3 Flashcard Generation

Flashcards capture Q&A pairs from key concepts in conversations.

```ts
interface FlashcardArtifact extends ArtifactBase {
    type: "FLASHCARD";
    front: string;        // Question
    back: string;         // Answer
    tags?: string[];      // Categories
    difficulty: "EASY" | "MEDIUM" | "HARD";
}

export async function generateFlashcardsFromConversation(
    conversationId: string,
    messages: MessageRecord[],
): Promise<FlashcardArtifact[]> {
    const flashcards: FlashcardArtifact[] = [];

    for (const msg of messages) {
        if (msg.role !== "assistant") continue;

        // Extract key concepts and Q&A pairs
        const concepts = await extractKeyConcepts(msg.content);

        for (const concept of concepts.slice(0, 5)) {
            const [question, answer] = await formQAPair(concept, msg.content);

            flashcards.push({
                id: `flashcard_${cuid()}`, // From cuid npm package
                type: "FLASHCARD",
                conversationId,
                workspaceId: msg.workspaceId,
                userId: msg.userId,
                front: question,
                back: answer,
                tags: await extractTags(concept),
                difficulty: await assessDifficulty(answer),
                generatedAt: new Date(),
            });
        }
    }

    return flashcards;
}
```

### 6.1.4 Quiz Generation

Quizzes test knowledge retention through multiple-choice questions.

```ts
interface QuizArtifact extends ArtifactBase {
    type: "QUIZ";
    questions: QuizQuestion[];
    timeLimit?: number;   // seconds
}

interface QuizQuestion {
    id: string;
    question: string;
    options: {
        id: string;
        text: string;
        isCorrect: boolean;
    }[];
    explanation: string;
}

export async function generateQuizzesFromConversation(
    conversationId: string,
    messages: MessageRecord[],
): Promise<QuizArtifact[]> {
    const quizzes: QuizArtifact[] = [];

    // Group by topic
    const topics = await extractTopicsFromMessages(messages);

    for (const topic of topics.slice(0, 3)) {
        const questions = await generateMCQsForTopic(topic, messages);

        quizzes.push({
            id: `quiz_${cuid()}`,
            type: "QUIZ",
            conversationId,
            workspaceId: messages[0].workspaceId,
            userId: messages[0].userId,
            questions,
            timeLimit: 300, // 5 minutes
            generatedAt: new Date(),
        });
    }

    return quizzes;
}
```

### 6.1.5 Summary Generation

Summaries capture the essence of conversations in a concise format.

```ts
interface SummaryArtifact extends ArtifactBase {
    type: "SUMMARY";
    title: string;
    content: string;      // Text summary
    keyPoints: string[];  // bullet points
    wordCount: number;
    readabilityScore: number;
}

export async function generateSummaryFromConversation(
    conversationId: string,
    messages: MessageRecord[],
): Promise<SummaryArtifact[]> {
    const texts = messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
        .join("\n");

    const summary = await openai.streamText({
        model: openai("gpt-4"),
        system: `Generate a concise summary of the above conversation.
        Include:
        1. Main topic learned
        2. Key takeaways
        3. Any code examples or concepts
        4. Estimated difficulty level

        Output format:
        Title: [brief title]
        Summary: [2-3 sentences]
        Key Points: [bullet list]
        Word Count: [number]
        Readability: [Flesch-Kincaid grade level]`,
        messages: [{ role: "user", content: texts }],
    });

    const summaryText = await summary.text();

    return parseSummaryResponse(summaryText, conversationId, messages[0]);
}
```

### 6.1.6 Audio Overview Generation

Audio overviews convert summaries to spoken format for learning on the go.

```ts
interface AudioOverviewArtifact extends ArtifactBase {
    type: "AUDIO_OVERVIEW";
    text: string;         // Transcript text
    audioUrl: string;     // Generated audio file URL
    duration: number;     // seconds
    language: string;     // Default "en"
    voice?: string;       // TTS voice option
}

export async function generateAudioOverview(
    workspaceId: string,
    text: string,
    options?: {
        voice?: string;
        language?: string;
        speed?: number;
    },
): Promise<AudioOverviewArtifact> {
    // Upload to cloud storage (AWS S3, etc.)
    const audioUrl = await generateSpeech(text, {
        voice: options?.voice || "alloy",
        speed: options?.speed || 1.0,
        lang: options?.language || "en",
    });

    return {
        id: `audio_${cuid()}`,
        type: "AUDIO_OVERVIEW",
        conversationId: "", // Set by caller
        workspaceId,
        userId: "", // Set by caller
        text,
        audioUrl,
        duration: text.length / 2.5, // Rough estimate
        language: options?.language || "en",
        voice: options?.voice,
        generatedAt: new Date(),
    };
}
```

## 6.2 Artifact Storage

### 6.2.1 Artifact Database Model

```prisma
model Artifact {
    id           String   @id @default(cuid())
    conversationId String
    userId        String
    workspaceId   String
    type          String   // FLASHCARD, QUIZ, SUMMARY, AUDIO_OVERVIEW
    title         String?
    content       String?  // JSON string for structured content
    metadata      Json?     // Type-specific metadata
    source        String    // What generated it
    generatedAt   DateTime  @default(now())
    lastReviewed  DateTime?
    reviewCount   Int       @default(0)

    @@index([conversationId])
    @@index([workspaceId])
    @@index([userId])
    @@map("artifact")
}
```

### 6.2.2 Artifact API Endpoints

```ts
// server/src/controllers/artifact.controller.ts
export async function createArtifacts(
    workspaceId: string,
    userId: string,
    input: CreateArtifactsInput,
) {
    const { conversationId, artifactTypes } = input;

    // Get conversation messages
    const conversation = await findConversationById(conversationId);
    if (!conversation || conversation.workspaceId !== workspaceId) {
        throw new NotFoundError("Conversation not found");
    }

    const messages = await findMessagesByConversationId(conversationId);

    const artifacts: GeneratedArtifact[] = [];

    // Generate requested artifact types
    if (artifactTypes.includes("FLASHCARD")) {
        const flashcards = await generateFlashcardsFromConversation(
            conversationId,
            messages,
        );
        artifacts.push(...flashcards);
    }

    if (artifactTypes.includes("QUIZ")) {
        const quizzes = await generateQuizzesFromConversation(
            conversationId,
            messages,
        );
        artifacts.push(...quizzes);
    }

    if (artifactTypes.includes("SUMMARY")) {
        const summaries = await generateSummaryFromConversation(
            conversationId,
            messages,
        );
        artifacts.push(...summaries);
    }

    // Create artifact records
    const savedArtifacts = await Promise.all(
        artifacts.map((artifact) => createArtifactRecord(artifact))
    );

    // Generate audio overview if needed
    if (artifactTypes.includes("AUDIO_OVERVIEW")) {
        const audioArtifact = await createAudioOverview(
            workspaceId,
            userId,
            conversationId,
            messages,
        );
        artifacts.push(audioArtifact);
    }

    return { artifacts: savedArtifacts };
}
```

### 6.2.3 Artifact Retrieval API

```ts
// GET /api/workspaces/:workspaceId/artifacts?userId=:userId&types=:types&limit=:limit
export async function getArtifacts(
    workspaceId: string,
    userId: string,
    filters?: {
        types?: ("FLASHCARD" | "QUIZ" | "SUMMARY" | "AUDIO_OVERVIEW")[];
        limit?: number;
        fromDate?: Date;
        tag?: string;
    },
) {
    const where = {
        workspaceId,
        userId,
        ...(filters?.types?.length ? { type: { in: filters.types } } : {}),
        ...(filters?.fromDate ? { generatedAt: { gte: filters.fromDate } } : {}),
    };

    const artifacts = await findArtifactRecords(where);

    return {
        artifacts,
        count: artifacts.length,
    };
}
```

## 6.3 Artifact Generation Triggers

### 6.3.1 Trigger Configuration

```ts
// server/src/services/artifact-generation.service.ts
export enum ArtifactGenerationTrigger {
    MANUAL = "manual",
    CONVERSATION_END = "conversation_end",
    PERIODIC = "periodic",
}

// Trigger generation based on configuration
export async function shouldGenerateArtifacts(
    trigger: ArtifactGenerationTrigger,
    input: TriggerContext
) {
    const {
        conversationId,
        messages,
        isManualTrigger,
        lastGenerationTime,
        workspaceSettings,
    } = input;

    // Manual: Always generate
    if (isManualTrigger || trigger === ArtifactGenerationTrigger.MANUAL) {
        return true;
    }

    // Conversation end: Generate every N conversations
    if (trigger === ArtifactGenerationTrigger.CONVERSATION_END) {
        const conversationCount = await countConversationsForUser(
            messages[0].userId,
        );
        if (conversationCount % 3 === 0) return true; // Every 3 conversations
    }

    // Periodic: Generate every N hours
    if (trigger === ArtifactGenerationTrigger.PERIODIC) {
        const hoursSinceGeneration = differenceInHours(
            lastGenerationTime,
            new Date()
        );
        if (hoursSinceGeneration >= 24) return true; // Every 24 hours
    }

    return false;
}
```

### 6.3.2 Enqueue Artifact Generation

```ts
// server/src/services/artifact-generation.service.ts
export async function generateArtifactsForConversation(
    conversationId: string,
    messages: MessageRecord[],
    trigger: ArtifactGenerationTrigger = ArtifactGenerationTrigger.CONVERSATION_END,
) {
    const messagesByConversation = await findMessagesByConversationId(conversationId);

    // Determine which artifacts to generate
    const artifactTypes: ArtifactTypes[] = ["FLASHCARD", "SUMMARY"];

    if (messages.length > 100) { // Complex conversations get quizzes
        artifactTypes.push("QUIZ");
    }

    if (messages.some((m) => m.role === "assistant" && m.content.length > 5000)) {
        artifactTypes.push("AUDIO_OVERVIEW");
    }

    const artifacts: GeneratedArtifact[] = [];

    for (const type of artifactTypes) {
        switch (type) {
            case "FLASHCARD":
                artifacts.push(
                    ...(await generateFlashcardsFromConversation(
                        conversationId,
                        messagesByConversation,
                    ))
                );
                break;
            case "QUIZ":
                artifacts.push(
                    ...(await generateQuizzesFromConversation(
                        conversationId,
                        messagesByConversation,
                    ))
                );
                break;
            case "SUMMARY":
                artifacts.push(
                    ...(await generateSummaryFromConversation(
                        conversationId,
                        messagesByConversation,
                    ))
                );
                break;
            case "AUDIO_OVERVIEW":
                artifacts.push(
                    await generateAudioOverviewForConversation(
                        conversationId,
                        messagesByConversation,
                    )
                );
                break;
        }
    }

    return { conversationId, artifacts };
}
```

## 6.4 Common Mistakes

### 6.4.1 Hallucinated Artifacts

**Problem:** AI generates incorrect Q&A pairs or quiz questions.

**Solution:** Validate artifact content:

```ts
async function validateFlashcard(
    front: string,
    back: string,
): Promise<boolean> {
    const validation = await openai.chat({
        model: openai("gpt-4"),
        messages: [{
            role: "system",
            content: `Validate if the following Q&A pair is factually correct:
            Question: "${front}"
            Answer: "${back}"
            Return true if correct, false if inaccurate or made up.
            
            Only return true or false, no explanations.
        `}],
    });

    return validation === "true";
}
```

### 6.4.2 Duplicate Artifacts

**Problem:** Same artifact generated multiple times.

**Solution:** Check for existing artifacts:

```ts
export async function checkForDuplicateArtifacts(
    workspaceId: string,
    type: string,
    content: string,
    conversationId?: string,
): Promise<boolean> {
    const existing = await findArtifactRecords({
        workspaceId,
        type,
        // Simple similarity check (could use vector similarity)
        content: { contains: content.substring(0, 100) },
        ...(conversationId ? { conversationId } : {}),
    });

    return existing.length > 0;
}
```

### 6.4.3 Audio Generation Failures

**Problem:** Text-to-speech API limits or errors.

**Solution:** Fallback and retry logic:

```ts
export async function generateAudioOverviewWithFallback(
    text: string,
    maxRetries = 3,
): Promise<AudioOverviewArtifact> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await generateAudioOverview(text);
        } catch (error) {
            if (i === maxRetries - 1) {
                // Final fallback: return text-only artifact
                return {
                    id: `audio_${cuid()}`,
                    type: "AUDIO_OVERVIEW",
                    text,
                    audioUrl: "", // No audio generated
                    duration: 0,
                    language: "en",
                    generatedAt: new Date(),
                };
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }

    throw new Error("Audio generation failed after all retries");
}
```

## 6.5 Key Takeaways

- **Multiple artifact types**: Each serves different learning needs (recall, practice, reference, mobility)
- **Intelligent triggers**: Generate artifacts based on conversation complexity and periodic schedules
- **Structured storage**: JSON format allows frontend to render different artifact types
- **Fallback mechanisms**: Handle AI errors and API limits gracefully
- **Validation**: Ensure artifact accuracy and avoid duplicates

---

*Based on source notes from `gen-ai-cohort/week05/implementations guide/chapter-10-learning-artifacts.md`.*

**Next Chapter:** [Chapter 7 - Job Status, Partial Failure & UX](../07_Job_Status_Partial_Failure_UX)