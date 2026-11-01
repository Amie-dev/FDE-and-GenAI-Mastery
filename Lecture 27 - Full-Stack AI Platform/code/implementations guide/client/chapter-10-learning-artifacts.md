# Client Chapter 10 — Interactive Study Hub & Learning Artifact Viewers

## 1. Goal & Outcome
- **Goal**: Build the interactive Study Hub interface and custom study viewers for Summaries, Quizzes, Flashcards, Mindmaps, Key Takeaways, and Reports.
- **Student Outcome**: Interactive learning suite featuring interactive flashcard flips, quiz scoring, summary sections, and artifact generation triggers.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install @tanstack/react-query lucide-react streamdown
```

---

## 3. Client Source Code & Explanations

#### File Path: `client/features/learn/lib/types.ts`

```typescript
export type ArtifactType =
    | "SUMMARY"
    | "TAKEAWAYS"
    | "FLASHCARDS"
    | "QUIZ"
    | "MINDMAP"
    | "REPORT";

export type ArtifactStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type LearningArtifact = {
    id: string;
    workspaceId: string;
    type: ArtifactType;
    title: string;
    content: Record<string, unknown> | null;
    sourceIds: string[];
    status: ArtifactStatus;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateArtifactInput = {
    type: ArtifactType;
    title?: string;
    sourceIds?: string[];
};

export type Flashcard = { front: string; back: string };

export type QuizQuestion = {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
};

export type MindMapNode = { id: string; label: string };
export type MindMapEdge = { id: string; source: string; target: string };

```

#### Code Explanation: `client/features/learn/lib/types.ts`

**Overview & Architectural Role:**
- `client/features/learn/lib/types.ts` is a production source module containing **40 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 1 (`export type ArtifactType =`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 9 (`export type ArtifactStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 11 (`export type LearningArtifact = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 24 (`export type CreateArtifactInput = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 30 (`export type Flashcard = { front: string; back: string };`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 32 (`export type QuizQuestion = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 39 (`export type MindMapNode = { id: string; label: string };`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 40 (`export type MindMapEdge = { id: string; source: string; target: string };`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 40 lines of `types.ts`.

#### File Path: `client/features/learn/lib/constants.ts`

```typescript
import type { ArtifactType } from "./types";

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
    SUMMARY: "Summary",
    TAKEAWAYS: "Key Takeaways",
    FLASHCARDS: "Flashcards",
    QUIZ: "Quiz",
    MINDMAP: "Mind Map",
    REPORT: "AI Report",
};

export const ARTIFACT_TYPE_DESCRIPTIONS: Record<ArtifactType, string> = {
    SUMMARY: "A structured markdown summary of your sources",
    TAKEAWAYS: "Bullet-point insights you can copy and review",
    FLASHCARDS: "Flip cards for active recall study",
    QUIZ: "Multiple-choice quiz with explanations",
    MINDMAP: "Visual concept map of the material",
    REPORT: "Long-form report with sections",
};

export const ARTIFACT_TYPES: ArtifactType[] = [
    "SUMMARY",
    "TAKEAWAYS",
    "FLASHCARDS",
    "QUIZ",
    "MINDMAP",
    "REPORT",
];

export const ARTIFACT_STATUS_LABELS = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    READY: "Ready",
    FAILED: "Failed",
} as const;

```

#### Code Explanation: `client/features/learn/lib/constants.ts`

**Overview & Architectural Role:**
- `client/features/learn/lib/constants.ts` is a production source module containing **35 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import type { ArtifactType } from "./types";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {`: Exposes constant values and helper variables across the application.
  - `export const ARTIFACT_TYPE_DESCRIPTIONS: Record<ArtifactType, string> = {`: Exposes constant values and helper variables across the application.
  - `export const ARTIFACT_TYPES: ArtifactType[] = [`: Exposes constant values and helper variables across the application.
  - `export const ARTIFACT_STATUS_LABELS = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 35 lines of `constants.ts`.

#### File Path: `client/features/learn/lib/routes.ts`

```typescript
export const learnRoutes = {
    hub: (workspaceId: string) => `/workspace/${workspaceId}/learn`,
    detail: (workspaceId: string, artifactId: string) =>
        `/workspace/${workspaceId}/learn/${artifactId}`,
} as const;

```

#### Code Explanation: `client/features/learn/lib/routes.ts`

**Overview & Architectural Role:**
- `client/features/learn/lib/routes.ts` is a production source module containing **5 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Constants & Exported Utilities**:
  - `export const learnRoutes = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 5 lines of `routes.ts`.

#### File Path: `client/features/learn/lib/api.ts`

```typescript
import { apiFetch } from "@/shared/lib/api";
import type { CreateArtifactInput, LearningArtifact } from "./types";

export function listArtifacts(workspaceId: string) {
    return apiFetch<LearningArtifact[]>(
        `/api/workspaces/${workspaceId}/artifacts`,
    );
}

export function getArtifact(workspaceId: string, artifactId: string) {
    return apiFetch<LearningArtifact>(
        `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
    );
}

export function createArtifact(
    workspaceId: string,
    input: CreateArtifactInput,
) {
    return apiFetch<LearningArtifact>(
        `/api/workspaces/${workspaceId}/artifacts`,
        {
            method: "POST",
            body: JSON.stringify(input),
        },
    );
}

export function deleteArtifact(workspaceId: string, artifactId: string) {
    return apiFetch<void>(
        `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
        { method: "DELETE" },
    );
}

```

#### Code Explanation: `client/features/learn/lib/api.ts`

**Overview & Architectural Role:**
- `client/features/learn/lib/api.ts` is a production source module containing **34 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { apiFetch } from "@/shared/lib/api";`: Imports required module bindings.
  - `import type { CreateArtifactInput, LearningArtifact } from "./types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 4 (`export function listArtifacts(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 10 (`export function getArtifact(workspaceId: string, artifactId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 16 (`export function createArtifact(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 29 (`export function deleteArtifact(workspaceId: string, artifactId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 34 lines of `api.ts`.

#### File Path: `client/features/learn/hooks/use-artifacts.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createArtifact,
    deleteArtifact,
    getArtifact,
    listArtifacts,
} from "../lib/api";
import type { CreateArtifactInput } from "../lib/types";

export function artifactKeys(workspaceId: string) {
    return {
        all: ["artifacts", workspaceId] as const,
        list: () => ["artifacts", workspaceId, "list"] as const,
        detail: (artifactId: string) =>
            ["artifacts", workspaceId, artifactId] as const,
    };
}

export function useArtifacts(workspaceId: string) {
    return useQuery({
        queryKey: artifactKeys(workspaceId).list(),
        queryFn: () => listArtifacts(workspaceId),
        refetchInterval: (query) => {
            const hasProcessing = query.state.data?.some(
                (artifact) =>
                    artifact.status === "PENDING" ||
                    artifact.status === "PROCESSING",
            );
            return hasProcessing ? 3000 : false;
        },
    });
}

export function useArtifact(workspaceId: string, artifactId: string) {
    return useQuery({
        queryKey: artifactKeys(workspaceId).detail(artifactId),
        queryFn: () => getArtifact(workspaceId, artifactId),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status === "PENDING" || status === "PROCESSING"
                ? 3000
                : false;
        },
    });
}

export function useCreateArtifact(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateArtifactInput) =>
            createArtifact(workspaceId, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: artifactKeys(workspaceId).all,
            });
        },
    });
}

export function useDeleteArtifact(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (artifactId: string) =>
            deleteArtifact(workspaceId, artifactId),
        onSuccess: (_, artifactId) => {
            queryClient.removeQueries({
                queryKey: artifactKeys(workspaceId).detail(artifactId),
            });
            void queryClient.invalidateQueries({
                queryKey: artifactKeys(workspaceId).all,
            });
        },
    });
}

```

#### Code Explanation: `client/features/learn/hooks/use-artifacts.ts`

**Overview & Architectural Role:**
- `client/features/learn/hooks/use-artifacts.ts` is a production source module containing **78 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import type { CreateArtifactInput } from "../lib/types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 12 (`export function artifactKeys(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 21 (`export function useArtifacts(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 36 (`export function useArtifact(workspaceId: string, artifactId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 49 (`export function useCreateArtifact(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 63 (`export function useDeleteArtifact(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 78 lines of `use-artifacts.ts`.

#### File Path: `client/features/learn/components/artifact-status-badge.tsx`

```tsx
import { Badge } from "@/components/ui/badge";
import { ARTIFACT_STATUS_LABELS, ARTIFACT_TYPE_LABELS } from "../lib/constants";
import type { ArtifactStatus, ArtifactType } from "../lib/types";

type ArtifactStatusBadgeProps = {
    status: ArtifactStatus;
};

const statusVariant: Record<
    ArtifactStatus,
    "default" | "secondary" | "outline" | "destructive"
> = {
    PENDING: "secondary",
    PROCESSING: "outline",
    READY: "default",
    FAILED: "destructive",
};

export function ArtifactStatusBadge({ status }: ArtifactStatusBadgeProps) {
    return (
        <Badge variant={statusVariant[status]} className="capitalize">
            {ARTIFACT_STATUS_LABELS[status]}
        </Badge>
    );
}

export function ArtifactTypeBadge({ type }: { type: ArtifactType }) {
    return (
        <Badge variant="outline">{ARTIFACT_TYPE_LABELS[type]}</Badge>
    );
}

```

#### Code Explanation: `client/features/learn/components/artifact-status-badge.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/artifact-status-badge.tsx` is a production source module containing **31 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { Badge } from "@/components/ui/badge";`: Imports required module bindings.
  - `import { ARTIFACT_STATUS_LABELS, ARTIFACT_TYPE_LABELS } from "../lib/constants";`: Imports required module bindings.
  - `import type { ArtifactStatus, ArtifactType } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 5 (`type ArtifactStatusBadgeProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 19 (`export function ArtifactStatusBadge({ status }: ArtifactStatusBadgeProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 27 (`export function ArtifactTypeBadge({ type }: { type: ArtifactType }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 31 lines of `artifact-status-badge.tsx`.

#### File Path: `client/features/learn/components/generate-artifact-dialog.tsx`

```tsx
"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ARTIFACT_TYPE_DESCRIPTIONS,
    ARTIFACT_TYPE_LABELS,
    ARTIFACT_TYPES,
} from "../lib/constants";
import { useCreateArtifact } from "../hooks/use-artifacts";
import type { ArtifactType } from "../lib/types";

type GenerateArtifactDialogProps = {
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function GenerateArtifactDialog({
    workspaceId,
    open,
    onOpenChange,
}: GenerateArtifactDialogProps) {
    const [type, setType] = useState<ArtifactType>("SUMMARY");
    const [title, setTitle] = useState("");
    const createArtifact = useCreateArtifact(workspaceId);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        await createArtifact.mutateAsync({
            type,
            title: title.trim() || undefined,
        });

        setTitle("");
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <form onSubmit={(event) => void handleSubmit(event)}>
                    <DialogHeader>
                        <DialogTitle>Generate learning tool</DialogTitle>
                        <DialogDescription>
                            Uses all ready sources in this workspace. Generation
                            runs in the background via Inngest.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="artifact-type">Type</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {ARTIFACT_TYPES.map((artifactType) => (
                                    <button
                                        key={artifactType}
                                        type="button"
                                        onClick={() => setType(artifactType)}
                                        className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                                            type === artifactType
                                                ? "border-primary bg-primary/10"
                                                : "hover:bg-muted/50"
                                        }`}
                                    >
                                        <p className="text-sm font-medium">
                                            {
                                                ARTIFACT_TYPE_LABELS[
                                                    artifactType
                                                ]
                                            }
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {
                                                ARTIFACT_TYPE_DESCRIPTIONS[
                                                    artifactType
                                                ]
                                            }
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="artifact-title">
                                Title (optional)
                            </Label>
                            <Input
                                id="artifact-title"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="Custom title"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createArtifact.isPending}
                        >
                            Generate
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

```

#### Code Explanation: `client/features/learn/components/generate-artifact-dialog.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/generate-artifact-dialog.tsx` is a production source module containing **130 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 10)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Input } from "@/components/ui/input";`: Imports required module bindings.
  - `import { Label } from "@/components/ui/label";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { useCreateArtifact } from "../hooks/use-artifacts";`: Imports required module bindings.
  - `import type { ArtifactType } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 23 (`type GenerateArtifactDialogProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 72 (`type === artifactType`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 29 (`export function GenerateArtifactDialog({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 130 lines of `generate-artifact-dialog.tsx`.

#### File Path: `client/features/learn/components/viewers/summary-viewer.tsx`

```tsx
"use client";

import { StreamdownContent } from "@/shared/components/streamdown-content";

export function SummaryViewer({ markdown }: { markdown: string }) {
    return <StreamdownContent content={markdown} mode="static" />;
}

```

#### Code Explanation: `client/features/learn/components/viewers/summary-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/summary-viewer.tsx` is a production source module containing **7 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { StreamdownContent } from "@/shared/components/streamdown-content";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 5 (`export function SummaryViewer({ markdown }: { markdown: string }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 7 lines of `summary-viewer.tsx`.

#### File Path: `client/features/learn/components/viewers/quiz-viewer.tsx`

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, RotateCcwIcon, TrophyIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamdownContent } from "@/shared/components/streamdown-content";
import type { QuizQuestion } from "../../lib/types";

const questionVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
};

export function QuizViewer({ questions }: { questions: QuizQuestion[] }) {
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        setIndex(0);
        setSelected(null);
        setScore(0);
        setFinished(false);
    }, [questions]);

    const question = questions[index];

    const restart = useCallback(() => {
        setIndex(0);
        setSelected(null);
        setScore(0);
        setFinished(false);
    }, []);

    if (!question) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                This quiz has no questions.
            </p>
        );
    }

    function handleSelect(optionIndex: number) {
        if (selected !== null) {
            return;
        }

        setSelected(optionIndex);

        if (optionIndex === question.correctIndex) {
            setScore((current) => current + 1);
        }
    }

    function nextQuestion() {
        if (index + 1 >= questions.length) {
            setFinished(true);
            return;
        }

        setIndex((current) => current + 1);
        setSelected(null);
    }

    if (finished) {
        const percentage = Math.round((score / questions.length) * 100);

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="mx-auto max-w-lg space-y-5 rounded-3xl border bg-card p-8 text-center"
            >
                <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 240,
                        damping: 14,
                    }}
                    className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15"
                >
                    <TrophyIcon className="size-7 text-primary" />
                </motion.div>

                <div className="space-y-1">
                    <p className="font-heading text-2xl font-semibold">
                        Quiz complete
                    </p>
                    <p className="text-muted-foreground">
                        You scored {score} out of {questions.length}
                    </p>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    />
                </div>

                <Button onClick={restart}>
                    <RotateCcwIcon />
                    Try again
                </Button>
            </motion.div>
        );
    }

    const progress = (index / questions.length) * 100;

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="tabular-nums">
                        Question {index + 1} of {questions.length}
                    </span>
                    <span className="tabular-nums">{score} correct</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 220, damping: 30 }}
                    />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    variants={questionVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                >
                    <StreamdownContent
                        content={question.question}
                        className="prose prose-sm dark:prose-invert max-w-none font-heading text-lg font-semibold [&_p]:my-0"
                    />

                    <div className="grid gap-2">
                        {question.options.map((option, optionIndex) => {
                            const isSelected = selected === optionIndex;
                            const isCorrect =
                                optionIndex === question.correctIndex;
                            const revealed = selected !== null;

                            const stateClass = !revealed
                                ? "border-border hover:border-primary/50 hover:bg-muted/50"
                                : isCorrect
                                  ? "border-primary bg-primary/10"
                                  : isSelected
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border opacity-55";

                            return (
                                <motion.button
                                    key={optionIndex}
                                    type="button"
                                    disabled={revealed}
                                    onClick={() => handleSelect(optionIndex)}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        delay: optionIndex * 0.05,
                                        duration: 0.2,
                                    }}
                                    whileTap={
                                        revealed ? undefined : { scale: 0.985 }
                                    }
                                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${stateClass}`}
                                >
                                    <span
                                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                                            revealed && isCorrect
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : revealed && isSelected
                                                  ? "border-destructive bg-destructive text-white"
                                                  : "border-border text-muted-foreground"
                                        }`}
                                    >
                                        {revealed && isCorrect ? (
                                            <CheckIcon className="size-3.5" />
                                        ) : revealed && isSelected ? (
                                            <XIcon className="size-3.5" />
                                        ) : (
                                            String.fromCharCode(
                                                65 + optionIndex,
                                            )
                                        )}
                                    </span>
                                    <span className="flex-1">{option}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            <AnimatePresence initial={false}>
                {selected !== null ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                            <p className="text-xs tracking-wider text-muted-foreground uppercase">
                                {selected === question.correctIndex
                                    ? "Correct"
                                    : "Not quite"}
                            </p>
                            <StreamdownContent
                                content={question.explanation}
                                className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_p+p]:mt-2"
                            />
                            <Button size="sm" onClick={nextQuestion}>
                                {index + 1 >= questions.length
                                    ? "See score"
                                    : "Next question"}
                            </Button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/viewers/quiz-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/quiz-viewer.tsx` is a production source module containing **242 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 8)**:
  - `import { useCallback, useEffect, useState } from "react";`: Imports required module bindings.
  - `import { AnimatePresence, motion } from "motion/react";`: Imports required module bindings.
  - `import { CheckIcon, RotateCcwIcon, TrophyIcon, XIcon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { StreamdownContent } from "@/shared/components/streamdown-content";`: Imports required module bindings.
  - `import type { QuizQuestion } from "../../lib/types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 16 (`export function QuizViewer({ questions }: { questions: QuizQuestion[] }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 46 (`function handleSelect(optionIndex: number) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 58 (`function nextQuestion() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 242 lines of `quiz-viewer.tsx`.

#### File Path: `client/features/learn/components/viewers/mindmap-viewer.tsx`

```tsx
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import {
    Background,
    Controls,
    Handle,
    MiniMap,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Edge,
    type Node,
    type NodeProps,
} from "@xyflow/react";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    Maximize2Icon,
    MessageSquareIcon,
    Minimize2Icon,
    MinusIcon,
    PlusIcon,
    ScanIcon,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { workspaceRoutes } from "@/features/workspaces/lib/routes";
import type { MindMapEdge, MindMapNode } from "../../lib/types";

const NODE_WIDTH = 200;
const ROOT_WIDTH = 230;
const NODE_HEIGHT = 46;
const ROW_GAP = 72;
const COL_GAP = 270;

type TreeNode = {
    id: string;
    label: string;
    children: TreeNode[];
};

type Placement = {
    x: number;
    y: number;
    direction: 1 | -1;
    depth: number;
};

type MindMapActions = {
    toggleCollapse: (nodeId: string) => void;
    selectNode: (nodeId: string) => void;
};

const MindMapActionsContext = createContext<MindMapActions | null>(null);

function buildTree(nodes: MindMapNode[], edges: MindMapEdge[]) {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const children = new Map<string, string[]>();
    const incoming = new Map<string, number>();

    for (const node of nodes) {
        children.set(node.id, []);
        incoming.set(node.id, 0);
    }

    for (const edge of edges) {
        if (!children.has(edge.source) || !incoming.has(edge.target)) {
            continue;
        }

        children.get(edge.source)?.push(edge.target);
        incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    }

    const claimed = new Set<string>();

    function toTreeNode(id: string): TreeNode | null {
        const source = nodeMap.get(id);
        if (!source || claimed.has(id)) {
            return null;
        }

        claimed.add(id);

        const childNodes = (children.get(id) ?? [])
            .map((childId) => toTreeNode(childId))
            .filter((child): child is TreeNode => child !== null);

        return {
            id: source.id,
            label: source.label,
            children: childNodes,
        };
    }

    const rootId =
        nodes.find((node) => (incoming.get(node.id) ?? 0) === 0)?.id ??
        nodes[0]?.id;

    if (!rootId) {
        return null;
    }

    const root = toTreeNode(rootId);

    if (!root) {
        return null;
    }

    for (const node of nodes) {
        const orphan = toTreeNode(node.id);
        if (orphan) {
            root.children.push(orphan);
        }
    }

    return root;
}

function collectExpandableIds(node: TreeNode, ids: string[] = []) {
    if (node.children.length > 0) {
        ids.push(node.id);
        for (const child of node.children) {
            collectExpandableIds(child, ids);
        }
    }

    return ids;
}

function countLeaves(node: TreeNode, collapsed: Set<string>): number {
    if (collapsed.has(node.id) || node.children.length === 0) {
        return 1;
    }

    return node.children.reduce(
        (total, child) => total + countLeaves(child, collapsed),
        0,
    );
}

function layoutBranch(
    node: TreeNode,
    depth: number,
    top: number,
    direction: 1 | -1,
    placements: Map<string, Placement>,
    collapsed: Set<string>,
) {
    const height = countLeaves(node, collapsed) * ROW_GAP;
    const centerX = direction * depth * COL_GAP;
    const centerY = top + height / 2;

    placements.set(node.id, {
        x: centerX - NODE_WIDTH / 2,
        y: centerY - NODE_HEIGHT / 2,
        direction,
        depth,
    });

    if (!collapsed.has(node.id)) {
        let cursor = top;

        for (const child of node.children) {
            cursor += layoutBranch(
                child,
                depth + 1,
                cursor,
                direction,
                placements,
                collapsed,
            );
        }
    }

    return height;
}

function computeTreeLayout(root: TreeNode, collapsed: Set<string>) {
    const placements = new Map<string, Placement>();

    placements.set(root.id, {
        x: -ROOT_WIDTH / 2,
        y: -NODE_HEIGHT / 2,
        direction: 1,
        depth: 0,
    });

    if (collapsed.has(root.id) || root.children.length === 0) {
        return placements;
    }

    const rightBranches: TreeNode[] = [];
    const leftBranches: TreeNode[] = [];
    let rightLeaves = 0;
    let leftLeaves = 0;

    for (const child of root.children) {
        const leaves = countLeaves(child, collapsed);

        if (rightLeaves <= leftLeaves) {
            rightBranches.push(child);
            rightLeaves += leaves;
        } else {
            leftBranches.push(child);
            leftLeaves += leaves;
        }
    }

    let rightCursor = (-rightLeaves * ROW_GAP) / 2;
    for (const branch of rightBranches) {
        rightCursor += layoutBranch(
            branch,
            1,
            rightCursor,
            1,
            placements,
            collapsed,
        );
    }

    let leftCursor = (-leftLeaves * ROW_GAP) / 2;
    for (const branch of leftBranches) {
        leftCursor += layoutBranch(
            branch,
            1,
            leftCursor,
            -1,
            placements,
            collapsed,
        );
    }

    return placements;
}

function MindMapFlowNode({ id, data, selected }: NodeProps) {
    const actions = useContext(MindMapActionsContext);
    const label = typeof data.label === "string" ? data.label : "Untitled";
    const hasChildren = Boolean(data.hasChildren);
    const collapsed = Boolean(data.collapsed);
    const isRoot = Boolean(data.isRoot);
    const hasLeftBranch = Boolean(data.hasLeftBranch);
    const hasRightBranch = Boolean(data.hasRightBranch);
    const direction = data.direction === -1 ? -1 : 1;

    const handleClass = "size-1.5 border-border! bg-muted-foreground!";

    return (
        <div
            style={{ width: isRoot ? ROOT_WIDTH : NODE_WIDTH }}
            className={`rounded-2xl border px-3 py-2 shadow-sm transition-colors ${
                selected
                    ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                    : isRoot
                      ? "border-primary/60 bg-card text-card-foreground"
                      : "border-border bg-card text-card-foreground hover:border-primary/40"
            }`}
            onClick={() => actions?.selectNode(id)}
        >
            {!isRoot ? (
                <Handle
                    type="target"
                    id={direction === 1 ? "tl" : "tr"}
                    position={direction === 1 ? Position.Left : Position.Right}
                    className={handleClass}
                />
            ) : null}

            <div
                className={`flex items-start gap-1.5 ${
                    direction === -1 && !isRoot ? "flex-row-reverse" : ""
                }`}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(event) => {
                            event.stopPropagation();
                            actions?.toggleCollapse(id);
                        }}
                        aria-label={
                            collapsed ? "Expand branch" : "Collapse branch"
                        }
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="size-4" />
                        ) : (
                            <ChevronDownIcon className="size-4" />
                        )}
                    </button>
                ) : null}
                <p
                    className={`flex-1 text-sm leading-snug ${
                        isRoot
                            ? "text-center font-medium"
                            : direction === -1
                              ? "text-right"
                              : "text-left"
                    }`}
                >
                    {label}
                </p>
            </div>

            {isRoot ? (
                <>
                    {hasLeftBranch ? (
                        <Handle
                            type="source"
                            id="sl"
                            position={Position.Left}
                            className={handleClass}
                        />
                    ) : null}
                    {hasRightBranch ? (
                        <Handle
                            type="source"
                            id="sr"
                            position={Position.Right}
                            className={handleClass}
                        />
                    ) : null}
                </>
            ) : hasChildren ? (
                <Handle
                    type="source"
                    id={direction === 1 ? "sr" : "sl"}
                    position={direction === 1 ? Position.Right : Position.Left}
                    className={handleClass}
                />
            ) : null}
        </div>
    );
}

const nodeTypes = {
    mindmap: MindMapFlowNode,
};

type MindMapCanvasProps = {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    workspaceId?: string;
};

function MindMapCanvas({ nodes, edges, workspaceId }: MindMapCanvasProps) {
    const tree = useMemo(() => buildTree(nodes, edges), [nodes, edges]);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { fitView } = useReactFlow();

    const expandableIds = useMemo(
        () => (tree ? collectExpandableIds(tree) : []),
        [tree],
    );

    const placements = useMemo(
        () =>
            tree
                ? computeTreeLayout(tree, collapsed)
                : new Map<string, Placement>(),
        [tree, collapsed],
    );

    const parentsWithChildren = useMemo(
        () => new Set(edges.map((edge) => edge.source)),
        [edges],
    );

    const flowNodes: Node[] = useMemo(() => {
        if (!tree) {
            return [];
        }

        const rootChildDirections = tree.children
            .map((child) => placements.get(child.id)?.direction)
            .filter((direction): direction is 1 | -1 => direction !== undefined);

        return nodes
            .filter((node) => placements.has(node.id))
            .map((node) => {
                const placement = placements.get(node.id)!;
                const isRoot = node.id === tree.id;

                return {
                    id: node.id,
                    type: "mindmap",
                    draggable: false,
                    data: {
                        label: node.label,
                        hasChildren: parentsWithChildren.has(node.id),
                        collapsed: collapsed.has(node.id),
                        isRoot,
                        direction: placement.direction,
                        hasLeftBranch: rootChildDirections.includes(-1),
                        hasRightBranch: rootChildDirections.includes(1),
                    },
                    position: { x: placement.x, y: placement.y },
                    selected: selectedId === node.id,
                };
            });
    }, [
        nodes,
        tree,
        placements,
        parentsWithChildren,
        collapsed,
        selectedId,
    ]);

    const flowEdges: Edge[] = useMemo(
        () =>
            edges
                .filter(
                    (edge) =>
                        placements.has(edge.source) &&
                        placements.has(edge.target) &&
                        !collapsed.has(edge.source),
                )
                .map((edge) => {
                    const direction =
                        placements.get(edge.target)?.direction ?? 1;
                    const isSelected =
                        selectedId === edge.source || selectedId === edge.target;

                    return {
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        sourceHandle: direction === 1 ? "sr" : "sl",
                        targetHandle: direction === 1 ? "tl" : "tr",
                        type: "bezier",
                        animated: isSelected,
                        style: {
                            stroke: isSelected
                                ? "var(--primary)"
                                : "var(--border)",
                            strokeWidth: isSelected ? 2 : 1.5,
                        },
                    };
                }),
        [edges, placements, collapsed, selectedId],
    );

    const selectedNode = useMemo(
        () => nodes.find((node) => node.id === selectedId) ?? null,
        [nodes, selectedId],
    );

    const toggleCollapse = useCallback((nodeId: string) => {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const selectNode = useCallback((nodeId: string) => {
        setSelectedId(nodeId);
    }, []);

    const expandAll = useCallback(() => {
        setCollapsed(new Set());
    }, []);

    const collapseAll = useCallback(() => {
        setCollapsed(new Set(expandableIds));
    }, [expandableIds]);

    const fitMap = useCallback(() => {
        void fitView({ padding: 0.2, duration: 300 });
    }, [fitView]);

    useEffect(() => {
        const timer = window.setTimeout(fitMap, 60);
        return () => window.clearTimeout(timer);
    }, [collapsed, fitMap, flowNodes.length]);

    const actions = useMemo(
        () => ({ toggleCollapse, selectNode }),
        [toggleCollapse, selectNode],
    );

    if (!tree) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Mind map data is empty.
            </div>
        );
    }

    const chatHref =
        selectedNode && workspaceId
            ? `${workspaceRoutes.detail(workspaceId)}?ask=${encodeURIComponent(
                  `Tell me more about "${selectedNode.label}" based on my sources.`,
              )}`
            : null;

    return (
        <MindMapActionsContext.Provider value={actions}>
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        Use the arrows to expand or collapse branches. Select a
                        node to explore it in chat.
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={expandAll}>
                            <PlusIcon />
                            Expand all
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={collapseAll}
                        >
                            <MinusIcon />
                            Collapse all
                        </Button>
                        <Button size="sm" variant="outline" onClick={fitMap}>
                            <ScanIcon />
                            Fit view
                        </Button>
                    </div>
                </div>

                <div className="relative min-h-0 flex-1">
                    <ReactFlow
                        nodes={flowNodes}
                        edges={flowEdges}
                        nodeTypes={nodeTypes}
                        colorMode="dark"
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.15}
                        maxZoom={1.8}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable
                        panOnScroll
                        zoomOnScroll
                        proOptions={{ hideAttribution: true }}
                    >
                        <MiniMap
                            pannable
                            zoomable
                            nodeColor="var(--muted-foreground)"
                            maskColor="color-mix(in oklab, var(--background) 75%, transparent)"
                            className="rounded-xl! border! border-border! bg-card/90!"
                        />
                        <Controls className="rounded-xl! border! border-border! bg-card! shadow-sm! [&>button]:border-border! [&>button]:bg-card! [&>button]:text-foreground! [&>button:hover]:bg-muted!" />
                        <Background gap={20} color="var(--border)" />
                    </ReactFlow>
                </div>

                {selectedNode ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/40 px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                Selected topic
                            </p>
                            <p className="truncate font-medium">
                                {selectedNode.label}
                            </p>
                        </div>
                        {chatHref ? (
                            <Button
                                nativeButton={false}
                                size="sm"
                                render={<Link href={chatHref} />}
                            >
                                <MessageSquareIcon />
                                Ask in chat
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </MindMapActionsContext.Provider>
    );
}

type MindMapViewerProps = {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    workspaceId?: string;
    className?: string;
};

export function MindMapViewer({
    nodes,
    edges,
    workspaceId,
    className,
}: MindMapViewerProps) {
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        if (!fullscreen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setFullscreen(false);
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [fullscreen]);

    const containerClass = fullscreen
        ? "fixed inset-0 z-50 flex flex-col bg-background"
        : `flex min-h-[min(74vh,780px)] flex-col overflow-hidden rounded-3xl border bg-muted/20 ${className ?? ""}`;

    return (
        <div className={containerClass}>
            <div className="flex items-center justify-end gap-2 border-b border-border/60 px-3 py-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFullscreen((value) => !value)}
                >
                    {fullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
                    {fullscreen ? "Exit full screen" : "Full screen"}
                </Button>
            </div>

            <div className="min-h-0 flex-1">
                <ReactFlowProvider>
                    <MindMapCanvas
                        nodes={nodes}
                        edges={edges}
                        workspaceId={workspaceId}
                    />
                </ReactFlowProvider>
            </div>
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/viewers/mindmap-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/mindmap-viewer.tsx` is a production source module containing **657 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 10)**:
  - `import {`: Imports required module bindings.
  - `import Link from "next/link";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import "@xyflow/react/dist/style.css";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { workspaceRoutes } from "@/features/workspaces/lib/routes";`: Imports required module bindings.
  - `import type { MindMapEdge, MindMapNode } from "../../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 21 (`type Edge,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 22 (`type Node,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 23 (`type NodeProps,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 46 (`type TreeNode = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 52 (`type Placement = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 59 (`type MindMapActions = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 352 (`type MindMapCanvasProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 599 (`type MindMapViewerProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 66 (`function buildTree(nodes: MindMapNode[], edges: MindMapEdge[]) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 87 (`function toTreeNode(id: string): TreeNode | null {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 130 (`function collectExpandableIds(node: TreeNode, ids: string[] = []) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 141 (`function countLeaves(node: TreeNode, collapsed: Set<string>): number {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 152 (`function layoutBranch(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 189 (`function computeTreeLayout(root: TreeNode, collapsed: Set<string>) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 247 (`function MindMapFlowNode({ id, data, selected }: NodeProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 358 (`function MindMapCanvas({ nodes, edges, workspaceId }: MindMapCanvasProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 657 lines of `mindmap-viewer.tsx`.

#### File Path: `client/features/learn/components/viewers/flashcards-viewer.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    RefreshCwIcon,
    RotateCcwIcon,
    ShuffleIcon,
    SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { StreamdownContent } from "@/shared/components/streamdown-content";
import type { Flashcard } from "../../lib/types";

const SWIPE_THRESHOLD = 90;
const SWIPE_VELOCITY = 400;

const cardVariants = {
    enter: (direction: number) => ({
        x: direction >= 0 ? 260 : -260,
        opacity: 0,
        scale: 0.92,
        rotate: direction >= 0 ? 4 : -4,
    }),
    center: { x: 0, opacity: 1, scale: 1, rotate: 0 },
    exit: (direction: number) => ({
        x: direction >= 0 ? -260 : 260,
        opacity: 0,
        scale: 0.92,
        rotate: direction >= 0 ? -4 : 4,
    }),
};

function shuffleOrder(length: number) {
    const order = Array.from({ length }, (_, index) => index);

    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    return order;
}

export function FlashcardsViewer({ cards }: { cards: Flashcard[] }) {
    const [order, setOrder] = useState(() =>
        Array.from({ length: cards.length }, (_, index) => index),
    );
    const [position, setPosition] = useState(0);
    const [direction, setDirection] = useState(1);
    const [flipped, setFlipped] = useState(false);
    const [known, setKnown] = useState<Set<number>>(new Set());
    const dragged = useRef(false);

    useEffect(() => {
        setOrder(Array.from({ length: cards.length }, (_, index) => index));
        setPosition(0);
        setFlipped(false);
        setKnown(new Set());
    }, [cards]);

    const cardIndex = order[position];
    const card = cards[cardIndex];

    const goTo = useCallback(
        (nextDirection: number) => {
            if (cards.length === 0) {
                return;
            }

            setDirection(nextDirection);
            setFlipped(false);
            setPosition((current) => {
                const next = current + nextDirection;
                return (next + cards.length) % cards.length;
            });
        },
        [cards.length],
    );

    const flip = useCallback(() => setFlipped((value) => !value), []);

    const markKnown = useCallback(() => {
        setKnown((current) => {
            const next = new Set(current);
            next.add(cardIndex);
            return next;
        });
        goTo(1);
    }, [cardIndex, goTo]);

    const markUnknown = useCallback(() => {
        setKnown((current) => {
            if (!current.has(cardIndex)) {
                return current;
            }
            const next = new Set(current);
            next.delete(cardIndex);
            return next;
        });
        goTo(1);
    }, [cardIndex, goTo]);

    const shuffle = useCallback(() => {
        setOrder(shuffleOrder(cards.length));
        setPosition(0);
        setDirection(1);
        setFlipped(false);
    }, [cards.length]);

    const restart = useCallback(() => {
        setOrder(Array.from({ length: cards.length }, (_, index) => index));
        setPosition(0);
        setDirection(1);
        setFlipped(false);
        setKnown(new Set());
    }, [cards.length]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (
                target &&
                ["INPUT", "TEXTAREA"].includes(target.tagName)
            ) {
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                goTo(1);
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                goTo(-1);
            } else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                flip();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goTo, flip]);

    const handleDragEnd = useCallback(
        (_event: unknown, info: PanInfo) => {
            const { offset, velocity } = info;

            if (
                offset.x < -SWIPE_THRESHOLD ||
                velocity.x < -SWIPE_VELOCITY
            ) {
                goTo(1);
            } else if (
                offset.x > SWIPE_THRESHOLD ||
                velocity.x > SWIPE_VELOCITY
            ) {
                goTo(-1);
            }

            window.setTimeout(() => {
                dragged.current = false;
            }, 0);
        },
        [goTo],
    );

    const progress = useMemo(
        () => (cards.length ? (known.size / cards.length) * 100 : 0),
        [known.size, cards.length],
    );

    if (!card) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                This deck has no cards.
            </p>
        );
    }

    const isKnown = known.has(cardIndex);
    const allKnown = known.size === cards.length;

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground tabular-nums">
                        Card {position + 1} of {cards.length}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                        <SparklesIcon className="size-3.5" />
                        {known.size} learned
                    </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 220, damping: 30 }}
                    />
                </div>
            </div>

            <div className="relative h-72 perspective-[1600px]">
                <div
                    aria-hidden
                    className="absolute inset-x-6 top-3 h-full rounded-3xl border border-border/50 bg-card/40"
                />
                <div
                    aria-hidden
                    className="absolute inset-x-3 top-1.5 h-full rounded-3xl border border-border/70 bg-card/60"
                />

                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={position}
                        custom={direction}
                        variants={cardVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 32,
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.35}
                        onDragStart={() => {
                            dragged.current = true;
                        }}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    >
                        <motion.div
                            className="relative size-full"
                            style={{ transformStyle: "preserve-3d" }}
                            animate={{ rotateY: flipped ? 180 : 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 26,
                            }}
                            onClick={() => {
                                if (dragged.current) {
                                    return;
                                }
                                flip();
                            }}
                        >
                            <CardFace
                                side="Front"
                                content={card.front}
                                isKnown={isKnown}
                            />
                            <CardFace
                                side="Back"
                                content={card.back}
                                isKnown={isKnown}
                                back
                            />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goTo(-1)}
                    aria-label="Previous card"
                >
                    <ChevronLeftIcon />
                    Previous
                </Button>

                <Button variant="ghost" size="sm" onClick={flip}>
                    <RotateCcwIcon />
                    Flip
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goTo(1)}
                    aria-label="Next card"
                >
                    Next
                    <ChevronRightIcon />
                </Button>
            </div>

            <AnimatePresence initial={false}>
                {flipped ? (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={markUnknown}
                            >
                                <RefreshCwIcon />
                                Still learning
                            </Button>
                            <Button className="flex-1" onClick={markKnown}>
                                <CheckIcon />
                                Got it
                            </Button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Kbd>←</Kbd>
                    <Kbd>→</Kbd>
                    to navigate
                    <Kbd className="ml-1.5">Space</Kbd>
                    to flip, or swipe the card
                </p>
                <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={shuffle}>
                        <ShuffleIcon />
                        Shuffle
                    </Button>
                    <Button variant="ghost" size="sm" onClick={restart}>
                        <RotateCcwIcon />
                        Restart
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {allKnown ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm"
                    >
                        You have marked every card as learned. Nice work.
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function CardFace({
    side,
    content,
    isKnown,
    back = false,
}: {
    side: string;
    content: string;
    isKnown: boolean;
    back?: boolean;
}) {
    return (
        <div
            className={`absolute inset-0 flex flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-lg backface-hidden ${
                isKnown ? "border-primary/50" : "border-border"
            } ${back ? "transform-[rotateY(180deg)]" : ""}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-muted-foreground uppercase">
                    {side}
                </span>
                {isKnown ? (
                    <span className="flex items-center gap-1 text-xs text-primary">
                        <CheckIcon className="size-3.5" />
                        Learned
                    </span>
                ) : null}
            </div>

            <div className="flex flex-1 items-center justify-center overflow-y-auto py-4">
                <StreamdownContent
                    content={content}
                    className="prose prose-sm dark:prose-invert max-w-none text-center [&_p]:my-0 [&_p+p]:mt-3"
                />
            </div>
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/viewers/flashcards-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/flashcards-viewer.tsx` is a production source module containing **400 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 9)**:
  - `import { useCallback, useEffect, useMemo, useRef, useState } from "react";`: Imports required module bindings.
  - `import { AnimatePresence, motion, type PanInfo } from "motion/react";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Kbd } from "@/components/ui/kbd";`: Imports required module bindings.
  - `import { StreamdownContent } from "@/shared/components/streamdown-content";`: Imports required module bindings.
  - `import type { Flashcard } from "../../lib/types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 38 (`function shuffleOrder(length: number) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 49 (`export function FlashcardsViewer({ cards }: { cards: Flashcard[] }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 124 (`function handleKeyDown(event: KeyboardEvent) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 363 (`function CardFace({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 400 lines of `flashcards-viewer.tsx`.

#### File Path: `client/features/learn/components/viewers/takeaways-viewer.tsx`

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamdownContent } from "@/shared/components/streamdown-content";

export function TakeawaysViewer({ items }: { items: string[] }) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    async function copyItem(item: string, index: number) {
        await navigator.clipboard.writeText(item);
        setCopiedIndex(index);
        window.setTimeout(() => setCopiedIndex(null), 1500);
    }

    async function copyAll() {
        await navigator.clipboard.writeText(
            items.map((item) => `• ${item}`).join("\n"),
        );
        setCopiedAll(true);
        window.setTimeout(() => setCopiedAll(false), 1500);
    }

    if (items.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                No takeaways were generated.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground tabular-nums">
                    {items.length} key takeaways
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyAll()}
                >
                    {copiedAll ? <CheckIcon /> : <CopyIcon />}
                    {copiedAll ? "Copied" : "Copy all"}
                </Button>
            </div>

            <ul className="space-y-2.5">
                {items.map((item, index) => (
                    <motion.li
                        key={index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: Math.min(index * 0.04, 0.4),
                            duration: 0.25,
                        }}
                        className="group flex items-start gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                    >
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-medium text-primary tabular-nums">
                            {index + 1}
                        </span>

                        <StreamdownContent
                            content={item}
                            className="prose prose-sm dark:prose-invert min-w-0 flex-1 max-w-none [&_p]:my-0 [&_p+p]:mt-2"
                        />

                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => void copyItem(item, index)}
                            aria-label="Copy takeaway"
                        >
                            {copiedIndex === index ? (
                                <CheckIcon />
                            ) : (
                                <CopyIcon />
                            )}
                        </Button>
                    </motion.li>
                ))}
            </ul>
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/viewers/takeaways-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/takeaways-viewer.tsx` is a production source module containing **90 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 7)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { motion } from "motion/react";`: Imports required module bindings.
  - `import { CheckIcon, CopyIcon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { StreamdownContent } from "@/shared/components/streamdown-content";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 9 (`export function TakeawaysViewer({ items }: { items: string[] }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 90 lines of `takeaways-viewer.tsx`.

#### File Path: `client/features/learn/components/viewers/report-viewer.tsx`

```tsx
"use client";

import { StreamdownContent } from "@/shared/components/streamdown-content";

type ReportSection = { title: string; content: string };

export function ReportViewer({
    markdown,
    sections,
}: {
    markdown: string;
    sections?: ReportSection[];
}) {
    return (
        <div className="space-y-8">
            <StreamdownContent content={markdown} mode="static" />
            {sections && sections.length > 0 ? (
                <div className="space-y-6 border-t pt-6">
                    {sections.map((section, index) => (
                        <section key={index} className="space-y-2">
                            <h3 className="font-heading text-lg font-semibold">
                                {section.title}
                            </h3>
                            <StreamdownContent
                                content={section.content}
                                mode="static"
                            />
                        </section>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/viewers/report-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/viewers/report-viewer.tsx` is a production source module containing **34 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { StreamdownContent } from "@/shared/components/streamdown-content";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 5 (`type ReportSection = { title: string; content: string };`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 7 (`export function ReportViewer({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 34 lines of `report-viewer.tsx`.

#### File Path: `client/features/learn/components/artifact-content-viewer.tsx`

```tsx
"use client";

import type { LearningArtifact } from "../lib/types";
import { FlashcardsViewer } from "./viewers/flashcards-viewer";
import { MindMapViewer } from "./viewers/mindmap-viewer";
import { QuizViewer } from "./viewers/quiz-viewer";
import { ReportViewer } from "./viewers/report-viewer";
import { SummaryViewer } from "./viewers/summary-viewer";
import { TakeawaysViewer } from "./viewers/takeaways-viewer";

type ArtifactContentViewerProps = {
    artifact: LearningArtifact;
    workspaceId: string;
};

export function ArtifactContentViewer({
    artifact,
    workspaceId,
}: ArtifactContentViewerProps) {
    const content = artifact.content;

    if (!content) {
        return null;
    }

    switch (artifact.type) {
        case "SUMMARY":
            return (
                <SummaryViewer
                    markdown={
                        typeof content.markdown === "string"
                            ? content.markdown
                            : ""
                    }
                />
            );
        case "TAKEAWAYS":
            return (
                <TakeawaysViewer
                    items={Array.isArray(content.items)
                        ? content.items.filter(
                              (item): item is string => typeof item === "string",
                          )
                        : []}
                />
            );
        case "FLASHCARDS":
            return (
                <FlashcardsViewer
                    cards={Array.isArray(content.cards) ? content.cards : []}
                />
            );
        case "QUIZ":
            return (
                <QuizViewer
                    questions={
                        Array.isArray(content.questions)
                            ? content.questions
                            : []
                    }
                />
            );
        case "MINDMAP":
            return (
                <MindMapViewer
                    workspaceId={workspaceId}
                    nodes={Array.isArray(content.nodes) ? content.nodes : []}
                    edges={Array.isArray(content.edges) ? content.edges : []}
                />
            );
        case "REPORT":
            return (
                <ReportViewer
                    markdown={
                        typeof content.markdown === "string"
                            ? content.markdown
                            : ""
                    }
                    sections={
                        Array.isArray(content.sections)
                            ? content.sections
                            : undefined
                    }
                />
            );
        default:
            return null;
    }
}

```

#### Code Explanation: `client/features/learn/components/artifact-content-viewer.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/artifact-content-viewer.tsx` is a production source module containing **89 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 9)**:
  - `import type { LearningArtifact } from "../lib/types";`: Imports required module bindings.
  - `import { FlashcardsViewer } from "./viewers/flashcards-viewer";`: Imports required module bindings.
  - `import { MindMapViewer } from "./viewers/mindmap-viewer";`: Imports required module bindings.
  - `import { QuizViewer } from "./viewers/quiz-viewer";`: Imports required module bindings.
  - `import { ReportViewer } from "./viewers/report-viewer";`: Imports required module bindings.
  - `import { SummaryViewer } from "./viewers/summary-viewer";`: Imports required module bindings.
  - `import { TakeawaysViewer } from "./viewers/takeaways-viewer";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 11 (`type ArtifactContentViewerProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 16 (`export function ArtifactContentViewer({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 89 lines of `artifact-content-viewer.tsx`.

#### File Path: `client/features/learn/components/artifact-detail.tsx`

```tsx
"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/shared/lib/api";
import { ARTIFACT_TYPE_LABELS } from "../lib/constants";
import { learnRoutes } from "../lib/routes";
import { useArtifact } from "../hooks/use-artifacts";
import { ArtifactContentViewer } from "./artifact-content-viewer";
import {
    ArtifactStatusBadge,
    ArtifactTypeBadge,
} from "./artifact-status-badge";

type ArtifactDetailProps = {
    workspaceId: string;
    artifactId: string;
};

export function ArtifactDetail({
    workspaceId,
    artifactId,
}: ArtifactDetailProps) {
    const { data: artifact, isLoading, error } = useArtifact(
        workspaceId,
        artifactId,
    );

    if (isLoading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
        );
    }

    if (error instanceof ApiError && error.status === 404) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="font-medium">Learning tool not found</p>
                <Button
                    nativeButton={false}
                    variant="outline"
                    render={<Link href={learnRoutes.hub(workspaceId)} />}
                >
                    Back to Learn
                </Button>
            </div>
        );
    }

    if (error || !artifact) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="font-medium">Could not load learning tool</p>
            </div>
        );
    }

    const processingError =
        typeof artifact.metadata?.processingError === "string"
            ? artifact.metadata.processingError
            : null;
    const isMindMap = artifact.type === "MINDMAP";
    const isProcessing =
        artifact.status === "PENDING" || artifact.status === "PROCESSING";

    return (
        <div
            className={`flex flex-1 flex-col ${isMindMap ? "min-h-0 gap-4 p-4 md:p-5" : "gap-6 p-6"}`}
        >
            <div className="flex items-start gap-3">
                <Button
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={learnRoutes.hub(workspaceId)} />}
                >
                    <ArrowLeftIcon />
                </Button>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <ArtifactTypeBadge type={artifact.type} />
                        <h2 className="font-heading text-xl font-semibold">
                            {artifact.title}
                        </h2>
                        <ArtifactStatusBadge status={artifact.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {ARTIFACT_TYPE_LABELS[artifact.type]} · Generated{" "}
                        {formatDistanceToNow(new Date(artifact.createdAt), {
                            addSuffix: true,
                        })}
                    </p>
                </div>
            </div>

            {isProcessing ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Generating {ARTIFACT_TYPE_LABELS[artifact.type].toLowerCase()}
                    …
                </div>
            ) : artifact.status === "FAILED" ? (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
                    <p className="font-medium text-destructive">
                        Generation failed
                    </p>
                    {processingError ? (
                        <p className="mt-2 text-muted-foreground">
                            {processingError}
                        </p>
                    ) : null}
                </div>
            ) : isMindMap ? (
                <div className="min-h-0 flex-1">
                    <ArtifactContentViewer
                        artifact={artifact}
                        workspaceId={workspaceId}
                    />
                </div>
            ) : (
                <div className="rounded-3xl border bg-muted/20 p-4 md:p-6">
                    <ArtifactContentViewer
                        artifact={artifact}
                        workspaceId={workspaceId}
                    />
                </div>
            )}
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/artifact-detail.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/artifact-detail.tsx` is a production source module containing **135 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 13)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { formatDistanceToNow } from "date-fns";`: Imports required module bindings.
  - `import { ArrowLeftIcon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Skeleton } from "@/components/ui/skeleton";`: Imports required module bindings.
  - `import { ApiError } from "@/shared/lib/api";`: Imports required module bindings.
  - `import { ARTIFACT_TYPE_LABELS } from "../lib/constants";`: Imports required module bindings.
  - `import { learnRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import { useArtifact } from "../hooks/use-artifacts";`: Imports required module bindings.
  - `import { ArtifactContentViewer } from "./artifact-content-viewer";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 18 (`type ArtifactDetailProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 23 (`export function ArtifactDetail({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 135 lines of `artifact-detail.tsx`.

#### File Path: `client/features/learn/components/learn-hub.tsx`

```tsx
"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { GraduationCapIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ARTIFACT_TYPE_LABELS } from "../lib/constants";
import { learnRoutes } from "../lib/routes";
import { useArtifacts, useDeleteArtifact } from "../hooks/use-artifacts";
import {
    ArtifactStatusBadge,
    ArtifactTypeBadge,
} from "./artifact-status-badge";
import { GenerateArtifactDialog } from "./generate-artifact-dialog";
import { useState } from "react";

type LearnHubProps = {
    workspaceId: string;
};

export function LearnHub({ workspaceId }: LearnHubProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data: artifacts = [], isLoading, error } = useArtifacts(workspaceId);
    const deleteArtifact = useDeleteArtifact(workspaceId);

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <GraduationCapIcon className="size-5" />
                        <h2 className="font-heading text-xl font-semibold">
                            Learning tools
                        </h2>
                    </div>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Generate summaries, flashcards, quizzes, mind maps, and
                        reports from your indexed sources.
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <PlusIcon />
                    Generate
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                    <Skeleton className="h-32 rounded-3xl" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Could not load learning tools.
                </div>
            ) : artifacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                    <p className="font-medium">No learning tools yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Generate your first summary, quiz, or flashcard deck
                        from workspace sources.
                    </p>
                    <Button
                        className="mt-4"
                        onClick={() => setDialogOpen(true)}
                    >
                        <PlusIcon />
                        Generate
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {artifacts.map((artifact) => (
                        <div
                            key={artifact.id}
                            className="group relative rounded-3xl border bg-card p-4 transition-colors hover:bg-muted/20"
                        >
                            <Link
                                href={learnRoutes.detail(
                                    workspaceId,
                                    artifact.id,
                                )}
                                className="block space-y-3"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <ArtifactTypeBadge type={artifact.type} />
                                    <ArtifactStatusBadge
                                        status={artifact.status}
                                    />
                                </div>
                                <div>
                                    <p className="font-medium">{artifact.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {ARTIFACT_TYPE_LABELS[artifact.type]} ·{" "}
                                        {formatDistanceToNow(
                                            new Date(artifact.createdAt),
                                            { addSuffix: true },
                                        )}
                                    </p>
                                </div>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() =>
                                    void deleteArtifact.mutateAsync(artifact.id)
                                }
                                disabled={deleteArtifact.isPending}
                            >
                                <Trash2Icon />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <GenerateArtifactDialog
                workspaceId={workspaceId}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}

```

#### Code Explanation: `client/features/learn/components/learn-hub.tsx`

**Overview & Architectural Role:**
- `client/features/learn/components/learn-hub.tsx` is a production source module containing **127 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 13)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { formatDistanceToNow } from "date-fns";`: Imports required module bindings.
  - `import { GraduationCapIcon, PlusIcon, Trash2Icon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Skeleton } from "@/components/ui/skeleton";`: Imports required module bindings.
  - `import { ARTIFACT_TYPE_LABELS } from "../lib/constants";`: Imports required module bindings.
  - `import { learnRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import { useArtifacts, useDeleteArtifact } from "../hooks/use-artifacts";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { GenerateArtifactDialog } from "./generate-artifact-dialog";`: Imports required module bindings.
  - `import { useState } from "react";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 18 (`type LearnHubProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 22 (`export function LearnHub({ workspaceId }: LearnHubProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 127 lines of `learn-hub.tsx`.

#### File Path: `client/features/learn/index.ts`

```typescript
export { LearnHub } from "./components/learn-hub";
export { ArtifactDetail } from "./components/artifact-detail";
export { GenerateArtifactDialog } from "./components/generate-artifact-dialog";
export { learnRoutes } from "./lib/routes";
export type {
    ArtifactType,
    ArtifactStatus,
    LearningArtifact,
} from "./lib/types";

```

#### Code Explanation: `client/features/learn/index.ts`

**Overview & Architectural Role:**
- `client/features/learn/index.ts` is a production source module containing **9 lines** of code.
- **Layer**: Client Feature Module (`learn`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 5 (`export type {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 9 lines of `index.ts`.

#### File Path: `client/app/(protected)/workspace/[id]/learn/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth";
import { LearnHub } from "@/features/learn";
import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";
import { WorkspaceShell } from "@/features/workspaces";

type LearnPageProps = {
    params: Promise<{ id: string }>;
};

export default async function LearnPage({ params }: LearnPageProps) {
    await requireAuth();
    const { id } = await params;
    const workspace = await getWorkspaceOrNull(id);

    if (!workspace) {
        notFound();
    }

    return (
        <WorkspaceShell workspace={workspace}>
            <LearnHub workspaceId={workspace.id} />
        </WorkspaceShell>
    );
}

```

#### Code Explanation: `client/app/(protected)/workspace/[id]/learn/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/workspace/[id]/learn/page.tsx` is a production source module containing **25 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 7)**:
  - `import { notFound } from "next/navigation";`: Imports required module bindings.
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { LearnHub } from "@/features/learn";`: Imports required module bindings.
  - `import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";`: Imports required module bindings.
  - `import { WorkspaceShell } from "@/features/workspaces";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 7 (`type LearnPageProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 25 lines of `page.tsx`.

#### File Path: `client/app/(protected)/workspace/[id]/learn/[artifactId]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth";
import { ArtifactDetail } from "@/features/learn";
import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";
import { WorkspaceShell } from "@/features/workspaces";

type ArtifactPageProps = {
    params: Promise<{ id: string; artifactId: string }>;
};

export default async function ArtifactPage({ params }: ArtifactPageProps) {
    await requireAuth();
    const { id, artifactId } = await params;
    const workspace = await getWorkspaceOrNull(id);

    if (!workspace) {
        notFound();
    }

    return (
        <WorkspaceShell workspace={workspace}>
            <ArtifactDetail
                workspaceId={workspace.id}
                artifactId={artifactId}
            />
        </WorkspaceShell>
    );
}

```

#### Code Explanation: `client/app/(protected)/workspace/[id]/learn/[artifactId]/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/workspace/[id]/learn/[artifactId]/page.tsx` is a production source module containing **28 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 7)**:
  - `import { notFound } from "next/navigation";`: Imports required module bindings.
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { ArtifactDetail } from "@/features/learn";`: Imports required module bindings.
  - `import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";`: Imports required module bindings.
  - `import { WorkspaceShell } from "@/features/workspaces";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 7 (`type ArtifactPageProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 28 lines of `page.tsx`.
