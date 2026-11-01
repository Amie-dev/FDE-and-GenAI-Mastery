# Client Chapter 9 — Personal Memory Management Settings UI

## 1. Goal & Outcome
- **Goal**: Implement long-term personal memory settings view allowing users to inspect, manually add, edit, search, and delete stored Mem0 user memories.
- **Student Outcome**: Dedicated memory settings page with modal creation, search filtering, and deletion controls.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install @tanstack/react-query lucide-react
```

---

## 3. Client Source Code & Explanations

#### File Path: `client/features/memory/lib/types.ts`

```typescript
export type UserMemory = {
    id: string;
    memory: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown> | null;
    categories?: string[];
    source: "manual" | "learned";
};

export type CreateMemoryInput = {
    memory: string;
};

export type UpdateMemoryInput = {
    memory: string;
};

```

#### Code Explanation: `client/features/memory/lib/types.ts`

**Overview & Architectural Role:**
- `client/features/memory/lib/types.ts` is a production source module containing **17 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 1 (`export type UserMemory = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 11 (`export type CreateMemoryInput = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 15 (`export type UpdateMemoryInput = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 17 lines of `types.ts`.

#### File Path: `client/features/memory/lib/routes.ts`

```typescript
export const memoryRoutes = {
    settings: "/settings/memory",
} as const;

```

#### Code Explanation: `client/features/memory/lib/routes.ts`

**Overview & Architectural Role:**
- `client/features/memory/lib/routes.ts` is a production source module containing **3 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Constants & Exported Utilities**:
  - `export const memoryRoutes = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 3 lines of `routes.ts`.

#### File Path: `client/features/memory/lib/api.ts`

```typescript
import { apiFetch } from "@/shared/lib/api";
import type {
    CreateMemoryInput,
    UpdateMemoryInput,
    UserMemory,
} from "./types";

export function listMemories() {
    return apiFetch<UserMemory[]>("/api/memory");
}

export function createMemory(input: CreateMemoryInput) {
    return apiFetch<UserMemory>("/api/memory", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export function updateMemory(memoryId: string, input: UpdateMemoryInput) {
    return apiFetch<UserMemory>(`/api/memory/${memoryId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export function deleteMemory(memoryId: string) {
    return apiFetch<void>(`/api/memory/${memoryId}`, {
        method: "DELETE",
    });
}

```

#### Code Explanation: `client/features/memory/lib/api.ts`

**Overview & Architectural Role:**
- `client/features/memory/lib/api.ts` is a production source module containing **30 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { apiFetch } from "@/shared/lib/api";`: Imports required module bindings.
  - `import type {`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 8 (`export function listMemories() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 12 (`export function createMemory(input: CreateMemoryInput) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 19 (`export function updateMemory(memoryId: string, input: UpdateMemoryInput) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 26 (`export function deleteMemory(memoryId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 30 lines of `api.ts`.

#### File Path: `client/features/memory/hooks/use-memories.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createMemory,
    deleteMemory,
    listMemories,
    updateMemory,
} from "../lib/api";
import type { CreateMemoryInput, UpdateMemoryInput } from "../lib/types";

export const memoryKeys = {
    all: ["memory"] as const,
    list: () => ["memory", "list"] as const,
};

export function useMemories() {
    return useQuery({
        queryKey: memoryKeys.list(),
        queryFn: listMemories,
    });
}

export function useCreateMemory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateMemoryInput) => createMemory(input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: memoryKeys.all });
        },
    });
}

export function useUpdateMemory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memoryId,
            input,
        }: {
            memoryId: string;
            input: UpdateMemoryInput;
        }) => updateMemory(memoryId, input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: memoryKeys.all });
        },
    });
}

export function useDeleteMemory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memoryId: string) => deleteMemory(memoryId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: memoryKeys.all });
        },
    });
}

```

#### Code Explanation: `client/features/memory/hooks/use-memories.ts`

**Overview & Architectural Role:**
- `client/features/memory/hooks/use-memories.ts` is a production source module containing **61 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import type { CreateMemoryInput, UpdateMemoryInput } from "../lib/types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 17 (`export function useMemories() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 24 (`export function useCreateMemory() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 35 (`export function useUpdateMemory() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 52 (`export function useDeleteMemory() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const memoryKeys = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 61 lines of `use-memories.ts`.

#### File Path: `client/features/memory/components/memory-form-dialog.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserMemory } from "../lib/types";

type MemoryFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memory?: UserMemory | null;
    onSubmit: (values: { memory: string }) => Promise<void>;
    isPending?: boolean;
};

export function MemoryFormDialog({
    open,
    onOpenChange,
    memory,
    onSubmit,
    isPending = false,
}: MemoryFormDialogProps) {
    const isEditing = Boolean(memory);
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setValue(memory?.memory ?? "");
            setError(null);
        }
    }, [open, memory]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const trimmedValue = value.trim();

        if (!trimmedValue) {
            setError("Memory text is required.");
            return;
        }

        try {
            await onSubmit({ memory: trimmedValue });
            onOpenChange(false);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Could not save memory.",
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <form onSubmit={(event) => void handleSubmit(event)}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? "Edit memory" : "Add memory"}
                        </DialogTitle>
                        <DialogDescription>
                            Memories are stored in Mem0 and injected into chat
                            when relevant.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="memory-value">Memory</Label>
                            <Textarea
                                id="memory-value"
                                value={value}
                                onChange={(event) =>
                                    setValue(event.target.value)
                                }
                                placeholder="Prefers concise explanations with examples"
                                rows={5}
                            />
                        </div>
                        {error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isEditing ? "Save" : "Add"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

```

#### Code Explanation: `client/features/memory/components/memory-form-dialog.tsx`

**Overview & Architectural Role:**
- `client/features/memory/components/memory-form-dialog.tsx` is a production source module containing **114 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 8)**:
  - `import { useEffect, useState } from "react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Label } from "@/components/ui/label";`: Imports required module bindings.
  - `import { Textarea } from "@/components/ui/textarea";`: Imports required module bindings.
  - `import type { UserMemory } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 17 (`type MemoryFormDialogProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 25 (`export function MemoryFormDialog({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 114 lines of `memory-form-dialog.tsx`.

#### File Path: `client/features/memory/components/memory-settings.tsx`

```tsx
"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowLeftIcon,
    BrainIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { workspaceRoutes } from "@/features/workspaces/lib/routes";
import {
    useCreateMemory,
    useDeleteMemory,
    useMemories,
    useUpdateMemory,
} from "../hooks/use-memories";
import type { UserMemory } from "../lib/types";
import { MemoryFormDialog } from "./memory-form-dialog";

export function MemorySettings() {
    const { data: memories = [], isLoading, error } = useMemories();
    const createMemory = useCreateMemory();
    const updateMemory = useUpdateMemory();
    const deleteMemory = useDeleteMemory();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMemory, setEditingMemory] = useState<UserMemory | null>(
        null,
    );

    function openCreateDialog() {
        setEditingMemory(null);
        setDialogOpen(true);
    }

    function openEditDialog(memory: UserMemory) {
        setEditingMemory(memory);
        setDialogOpen(true);
    }

    async function handleSubmit(values: { memory: string }) {
        if (editingMemory) {
            await updateMemory.mutateAsync({
                memoryId: editingMemory.id,
                input: values,
            });
            return;
        }

        await createMemory.mutateAsync(values);
    }

    return (
        <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <Button
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        render={<Link href={workspaceRoutes.list} />}
                    >
                        <ArrowLeftIcon />
                        Dashboard
                    </Button>
                    <div className="flex items-center gap-2">
                        <BrainIcon className="size-5" />
                        <h1 className="font-heading text-2xl font-semibold">
                            Memory
                        </h1>
                    </div>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Powered by Mem0. Chaibook learns stable facts from your
                        chats and uses semantic search to recall them in future
                        conversations.
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <PlusIcon />
                    Add memory
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Could not load memories from Mem0.
                </div>
            ) : memories.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                    <p className="font-medium">No memories yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Chat for a while and Mem0 will extract preferences and
                        context, or add a memory manually.
                    </p>
                    <Button className="mt-4" onClick={openCreateDialog}>
                        <PlusIcon />
                        Add memory
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {memories.map((memory) => (
                        <div
                            key={memory.id}
                            className="rounded-3xl border bg-card p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">
                                            {memory.source === "manual"
                                                ? "Manual"
                                                : "Learned"}
                                        </Badge>
                                        {memory.categories?.map((category) => (
                                            <Badge
                                                key={category}
                                                variant="outline"
                                            >
                                                {category}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-sm">{memory.memory}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Updated{" "}
                                        {formatDistanceToNow(
                                            new Date(memory.updatedAt),
                                            { addSuffix: true },
                                        )}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => openEditDialog(memory)}
                                    >
                                        <PencilIcon />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() =>
                                            void deleteMemory.mutateAsync(
                                                memory.id,
                                            )
                                        }
                                        disabled={deleteMemory.isPending}
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <MemoryFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                memory={editingMemory}
                onSubmit={handleSubmit}
                isPending={
                    createMemory.isPending || updateMemory.isPending
                }
            />
        </div>
    );
}

```

#### Code Explanation: `client/features/memory/components/memory-settings.tsx`

**Overview & Architectural Role:**
- `client/features/memory/components/memory-settings.tsx` is a production source module containing **183 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 13)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { formatDistanceToNow } from "date-fns";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Badge } from "@/components/ui/badge";`: Imports required module bindings.
  - `import { Skeleton } from "@/components/ui/skeleton";`: Imports required module bindings.
  - `import { workspaceRoutes } from "@/features/workspaces/lib/routes";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import type { UserMemory } from "../lib/types";`: Imports required module bindings.
  - `import { MemoryFormDialog } from "./memory-form-dialog";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 26 (`export function MemorySettings() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 37 (`function openCreateDialog() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 42 (`function openEditDialog(memory: UserMemory) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 183 lines of `memory-settings.tsx`.

#### File Path: `client/features/memory/index.ts`

```typescript
export { MemorySettings } from "./components/memory-settings";
export { MemoryFormDialog } from "./components/memory-form-dialog";
export { memoryRoutes } from "./lib/routes";
export type { UserMemory } from "./lib/types";

```

#### Code Explanation: `client/features/memory/index.ts`

**Overview & Architectural Role:**
- `client/features/memory/index.ts` is a production source module containing **4 lines** of code.
- **Layer**: Client Feature Module (`memory`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 4 (`export type { UserMemory } from "./lib/types";`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 4 lines of `index.ts`.

#### File Path: `client/app/(protected)/settings/memory/page.tsx`

```tsx
import { requireAuth } from "@/features/auth";
import { MemorySettings } from "@/features/memory";

export default async function MemorySettingsPage() {
    await requireAuth();

    return <MemorySettings />;
}

```

#### Code Explanation: `client/app/(protected)/settings/memory/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/settings/memory/page.tsx` is a production source module containing **8 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { MemorySettings } from "@/features/memory";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 8 lines of `page.tsx`.
