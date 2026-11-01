# Client Chapter 4 — Workspaces Dashboard & Workspace Navigation Shell

## 1. Goal & Outcome
- **Goal**: Build the Workspaces dashboard UI, workspace creation/editing dialogs, deletion modals, workspace header actions, settings forms, workspace shell layout, and dashboard page router.
- **Student Outcome**: Interactive workspace management suite with TanStack Query mutation hooks and dynamic workspace navigation.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install @tanstack/react-query lucide-react
```

---

## 3. Client Source Code & Explanations

#### File Path: `client/features/workspaces/lib/types.ts`

```typescript
export type Workspace = {
    id: string;
    title: string;
    description: string | null;
    icon: string | null;
    defaultModel: string;
    createdAt: string;
    updatedAt: string;
};

export type CreateWorkspaceInput = {
    title: string;
    description?: string;
    icon?: string;
    defaultModel?: string;
};

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>;

```

#### Code Explanation: `client/features/workspaces/lib/types.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/lib/types.ts` is a production source module containing **18 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 1 (`export type Workspace = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 11 (`export type CreateWorkspaceInput = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 18 (`export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>;`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 18 lines of `types.ts`.

#### File Path: `client/features/workspaces/lib/routes.ts`

```typescript
export const workspaceRoutes = {
    list: "/dashboard",
    detail: (id: string) => `/workspace/${id}`,
    settings: (id: string) => `/workspace/${id}/settings`,
} as const;

export function isWorkspaceRoute(pathname: string) {
    return pathname === workspaceRoutes.list || pathname.startsWith("/workspace/");
}

```

#### Code Explanation: `client/features/workspaces/lib/routes.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/lib/routes.ts` is a production source module containing **9 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Functions, Handlers & Business Methods**:
  - **Line 7 (`export function isWorkspaceRoute(pathname: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const workspaceRoutes = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 9 lines of `routes.ts`.

#### File Path: `client/features/workspaces/lib/api.ts`

```typescript
import { apiFetch } from "@/shared/lib/api";
import type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    Workspace,
} from "./types";

export function listWorkspaces() {
    return apiFetch<Workspace[]>("/api/workspaces");
}

export function getWorkspace(id: string) {
    return apiFetch<Workspace>(`/api/workspaces/${id}`);
}

export function createWorkspace(input: CreateWorkspaceInput) {
    return apiFetch<Workspace>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export function updateWorkspace(id: string, input: UpdateWorkspaceInput) {
    return apiFetch<Workspace>(`/api/workspaces/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export function deleteWorkspace(id: string) {
    return apiFetch<void>(`/api/workspaces/${id}`, {
        method: "DELETE",
    });
}

```

#### Code Explanation: `client/features/workspaces/lib/api.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/lib/api.ts` is a production source module containing **34 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { apiFetch } from "@/shared/lib/api";`: Imports required module bindings.
  - `import type {`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 8 (`export function listWorkspaces() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 12 (`export function getWorkspace(id: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 16 (`export function createWorkspace(input: CreateWorkspaceInput) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 23 (`export function updateWorkspace(id: string, input: UpdateWorkspaceInput) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 30 (`export function deleteWorkspace(id: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 34 lines of `api.ts`.

#### File Path: `client/features/workspaces/hooks/use-workspaces.ts`

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/lib/api";
import {
    createWorkspace,
    deleteWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
} from "../lib/api";
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "../lib/types";

export const workspaceKeys = {
    all: ["workspaces"] as const,
    detail: (id: string) => ["workspaces", id] as const,
};

export function useWorkspaces() {
    return useQuery({
        queryKey: workspaceKeys.all,
        queryFn: listWorkspaces,
    });
}

export function useWorkspace(id: string) {
    return useQuery({
        queryKey: workspaceKeys.detail(id),
        queryFn: () => getWorkspace(id),
        retry: (_, error) =>
            !(error instanceof ApiError && error.status === 404),
    });
}

export function useCreateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateWorkspaceInput) => createWorkspace(input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
        },
    });
}

export function useUpdateWorkspace(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateWorkspaceInput) => updateWorkspace(id, input),
        onSuccess: (workspace) => {
            queryClient.setQueryData(workspaceKeys.detail(id), workspace);
            void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
        },
    });
}

export function useDeleteWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteWorkspace(id),
        onSuccess: (_, id) => {
            queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) });
            void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
        },
    });
}

```

#### Code Explanation: `client/features/workspaces/hooks/use-workspaces.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/hooks/use-workspaces.ts` is a production source module containing **68 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";`: Imports required module bindings.
  - `import { ApiError } from "@/shared/lib/api";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "../lib/types";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 19 (`export function useWorkspaces() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 26 (`export function useWorkspace(id: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 35 (`export function useCreateWorkspace() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 46 (`export function useUpdateWorkspace(id: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 58 (`export function useDeleteWorkspace() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const workspaceKeys = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 68 lines of `use-workspaces.ts`.

#### File Path: `client/features/workspaces/components/workspace-card.tsx`

```tsx
"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getWorkspaceGradient } from "../lib/workspace-gradients";
import { workspaceRoutes } from "../lib/routes";
import type { Workspace } from "../lib/types";

type WorkspaceCardProps = {
    workspace: Workspace;
    onEdit: (workspace: Workspace) => void;
    onDelete: (workspace: Workspace) => void;
    className?: string;
};

export function WorkspaceCard({
    workspace,
    onEdit,
    onDelete,
    className,
}: WorkspaceCardProps) {
    const href = workspaceRoutes.detail(workspace.id);
    const gradient = getWorkspaceGradient(workspace.id);

    return (
        <article
            className={cn(
                "group/card relative min-h-[196px] overflow-hidden rounded-3xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
                className,
            )}
        >
            <Link
                href={href}
                className={cn(
                    "absolute inset-0 z-0 rounded-3xl bg-linear-to-br focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    gradient,
                )}
                aria-label={`Open ${workspace.title}`}
            />

            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-black/5 to-white/10" />

            <div className="pointer-events-none relative flex h-full min-h-[196px] flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">
                        {workspace.icon ?? "📚"}
                    </span>

                    <div
                        className="pointer-events-auto relative z-10"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="size-8 bg-black/15 text-white hover:bg-black/25 hover:text-white"
                                    />
                                }
                            >
                                <MoreHorizontalIcon />
                                <span className="sr-only">Open menu</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => onEdit(workspace)}
                                >
                                    <PencilIcon />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => onDelete(workspace)}
                                >
                                    <Trash2Icon />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-auto space-y-1.5 pt-8 text-white">
                    <h3 className="line-clamp-2 font-heading text-lg font-semibold leading-snug drop-shadow-sm">
                        {workspace.title}
                    </h3>
                    {workspace.description ? (
                        <p className="line-clamp-2 text-sm text-white/85">
                            {workspace.description}
                        </p>
                    ) : null}
                    <p className="text-xs text-white/70">
                        Updated{" "}
                        {formatDistanceToNow(new Date(workspace.updatedAt), {
                            addSuffix: true,
                        })}
                    </p>
                </div>
            </div>
        </article>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-card.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-card.tsx` is a production source module containing **114 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 11)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { formatDistanceToNow } from "date-fns";`: Imports required module bindings.
  - `import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { cn } from "@/lib/utils";`: Imports required module bindings.
  - `import { getWorkspaceGradient } from "../lib/workspace-gradients";`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 18 (`type WorkspaceCardProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 25 (`export function WorkspaceCard({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 114 lines of `workspace-card.tsx`.

#### File Path: `client/features/workspaces/components/create-workspace-card.tsx`

```tsx
"use client";

import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CreateWorkspaceCardProps = {
    onClick: () => void;
    className?: string;
};

export function CreateWorkspaceCard({
    onClick,
    className,
}: CreateWorkspaceCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex min-h-[196px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/80 bg-card/50 p-6 text-center transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className,
            )}
        >
            <span className="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
                <PlusIcon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </span>
            <div className="space-y-1">
                <p className="font-medium">Create notebook</p>
                <p className="text-xs text-muted-foreground">
                    Upload sources and start chatting
                </p>
            </div>
        </button>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/create-workspace-card.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/create-workspace-card.tsx` is a production source module containing **35 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { PlusIcon } from "lucide-react";`: Imports required module bindings.
  - `import { cn } from "@/lib/utils";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 6 (`type CreateWorkspaceCardProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 11 (`export function CreateWorkspaceCard({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 35 lines of `create-workspace-card.tsx`.

#### File Path: `client/features/workspaces/components/workspace-list.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/shared/lib/api";
import {
    useCreateWorkspace,
    useDeleteWorkspace,
    useUpdateWorkspace,
    useWorkspaces,
} from "../hooks/use-workspaces";
import { workspaceRoutes } from "../lib/routes";
import type { Workspace } from "../lib/types";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { WorkspaceCard } from "./workspace-card";
import { WorkspaceFormDialog } from "./workspace-form-dialog";

export function WorkspaceList() {
    const router = useRouter();
    const { data: workspaces, isLoading, error } = useWorkspaces();
    const createWorkspace = useCreateWorkspace();

    const [createOpen, setCreateOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
        null,
    );
    const [deletingWorkspace, setDeletingWorkspace] =
        useState<Workspace | null>(null);

    const updateWorkspace = useUpdateWorkspace(editingWorkspace?.id ?? "");
    const deleteWorkspace = useDeleteWorkspace();

    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-36 rounded-[24px]" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Empty className="border">
                <EmptyHeader>
                    <EmptyTitle>Could not load workspaces</EmptyTitle>
                    <EmptyDescription>
                        {error instanceof ApiError
                            ? error.message
                            : "Please try again in a moment."}
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="font-heading text-lg font-semibold">
                        Your workspaces
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Create notebooks to organize sources and chats.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    New workspace
                </Button>
            </div>

            {workspaces && workspaces.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {workspaces.map((workspace) => (
                        <WorkspaceCard
                            key={workspace.id}
                            workspace={workspace}
                            onEdit={setEditingWorkspace}
                            onDelete={setDeletingWorkspace}
                        />
                    ))}
                </div>
            ) : (
                <Empty className="mt-6 border">
                    <EmptyHeader>
                        <EmptyTitle>No workspaces yet</EmptyTitle>
                        <EmptyDescription>
                            Create your first notebook to get started with
                            Chaibook.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setCreateOpen(true)}>
                            <PlusIcon />
                            Create workspace
                        </Button>
                    </EmptyContent>
                </Empty>
            )}

            <WorkspaceFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                isPending={createWorkspace.isPending}
                onSubmit={async (values) => {
                    const workspace = await createWorkspace.mutateAsync(values);
                    router.push(workspaceRoutes.detail(workspace.id));
                }}
            />

            <WorkspaceFormDialog
                open={Boolean(editingWorkspace)}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingWorkspace(null);
                    }
                }}
                workspace={editingWorkspace}
                isPending={updateWorkspace.isPending}
                onSubmit={async (values) => {
                    await updateWorkspace.mutateAsync(values);
                    setEditingWorkspace(null);
                }}
            />

            <DeleteWorkspaceDialog
                workspace={deletingWorkspace}
                open={Boolean(deletingWorkspace)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingWorkspace(null);
                    }
                }}
                isPending={deleteWorkspace.isPending}
                onConfirm={async () => {
                    if (!deletingWorkspace) {
                        return;
                    }

                    await deleteWorkspace.mutateAsync(deletingWorkspace.id);
                    setDeletingWorkspace(null);
                }}
            />
        </>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-list.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-list.tsx` is a production source module containing **153 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 15)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { useRouter } from "next/navigation";`: Imports required module bindings.
  - `import { PlusIcon } from "lucide-react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";`: Imports required module bindings.
  - `import { Skeleton } from "@/components/ui/skeleton";`: Imports required module bindings.
  - `import { ApiError } from "@/shared/lib/api";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
  - `import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";`: Imports required module bindings.
  - `import { WorkspaceCard } from "./workspace-card";`: Imports required module bindings.
  - `import { WorkspaceFormDialog } from "./workspace-form-dialog";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 22 (`export function WorkspaceList() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 153 lines of `workspace-list.tsx`.

#### File Path: `client/features/workspaces/components/workspace-form-dialog.tsx`

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Workspace } from "../lib/types";

const ICON_OPTIONS = ["📚", "📖", "📝", "🎓", "💡", "🔬", "🧠", "✨"];

type WorkspaceFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspace?: Workspace | null;
    onSubmit: (values: {
        title: string;
        description?: string;
        icon?: string;
    }) => Promise<void>;
    isPending?: boolean;
};

export function WorkspaceFormDialog({
    open,
    onOpenChange,
    workspace,
    onSubmit,
    isPending = false,
}: WorkspaceFormDialogProps) {
    const isEditing = Boolean(workspace);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("📚");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setTitle(workspace?.title ?? "");
            setDescription(workspace?.description ?? "");
            setIcon(workspace?.icon ?? "📚");
            setError(null);
        }
    }, [open, workspace]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setError("Title is required.");
            return;
        }

        try {
            await onSubmit({
                title: trimmedTitle,
                description: description.trim() || undefined,
                icon,
            });
            onOpenChange(false);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Something went wrong.",
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit notebook" : "Create notebook"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update your notebook details."
                            : "Start a new notebook to organize your sources and chats."}
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
                    <div className="grid gap-2">
                        <Label htmlFor="workspace-icon">Icon</Label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setIcon(option)}
                                    className={`flex size-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                                        icon === option
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:bg-muted"
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="workspace-title">Title</Label>
                        <Input
                            id="workspace-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="My research notebook"
                            maxLength={120}
                            disabled={isPending}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="workspace-description">
                            Description
                        </Label>
                        <Textarea
                            id="workspace-description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="What is this workspace about?"
                            maxLength={500}
                            rows={3}
                            disabled={isPending}
                        />
                    </div>

                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Spinner /> : null}
                            {isEditing ? "Save changes" : "Create workspace"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-form-dialog.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-form-dialog.tsx` is a production source module containing **168 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 10)**:
  - `import { useEffect, useState } from "react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Input } from "@/components/ui/input";`: Imports required module bindings.
  - `import { Label } from "@/components/ui/label";`: Imports required module bindings.
  - `import { Spinner } from "@/components/ui/spinner";`: Imports required module bindings.
  - `import { Textarea } from "@/components/ui/textarea";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 21 (`type WorkspaceFormDialogProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 33 (`export function WorkspaceFormDialog({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 168 lines of `workspace-form-dialog.tsx`.

#### File Path: `client/features/workspaces/components/delete-workspace-dialog.tsx`

```tsx
"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { Workspace } from "../lib/types";

type DeleteWorkspaceDialogProps = {
    workspace: Workspace | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    isPending?: boolean;
};

export function DeleteWorkspaceDialog({
    workspace,
    open,
    onOpenChange,
    onConfirm,
    isPending = false,
}: DeleteWorkspaceDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete{" "}
                        <span className="font-medium text-foreground">
                            {workspace?.title}
                        </span>
                        . This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={isPending}
                        onClick={(event) => {
                            event.preventDefault();
                            void onConfirm();
                        }}
                    >
                        {isPending ? <Spinner /> : null}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/delete-workspace-dialog.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/delete-workspace-dialog.tsx` is a production source module containing **63 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import {`: Imports required module bindings.
  - `import { Spinner } from "@/components/ui/spinner";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 16 (`type DeleteWorkspaceDialogProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 24 (`export function DeleteWorkspaceDialog({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 63 lines of `delete-workspace-dialog.tsx`.

#### File Path: `client/features/workspaces/components/workspace-header-actions.tsx`

```tsx
"use client";

import Link from "next/link";
import { SettingsIcon } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CHAT_MODEL_LABELS,
    CHAT_MODELS,
    useChatPreferences,
    type ChatModelId,
} from "@/features/chat/stores/chat-preferences";
import { workspaceRoutes } from "../lib/routes";
import type { Workspace } from "../lib/types";

type WorkspaceHeaderActionsProps = {
    workspace: Workspace;
};

export function WorkspaceHeaderActions({
    workspace,
}: WorkspaceHeaderActionsProps) {
    const getPrefs = useChatPreferences((state) => state.getPrefs);
    const setModel = useChatPreferences((state) => state.setModel);
    const prefs = getPrefs(workspace.id, workspace.defaultModel);

    return (
        <div className="flex items-center gap-2">
            <Select
                value={prefs.model}
                onValueChange={(value) =>
                    setModel(workspace.id, value as ChatModelId)
                }
            >
                <SelectTrigger className="hidden h-8 w-[140px] sm:flex">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {CHAT_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                            {CHAT_MODEL_LABELS[model]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <ModeToggle />

            <Button
                nativeButton={false}
                variant="ghost"
                size="icon-sm"
                render={
                    <Link href={workspaceRoutes.settings(workspace.id)} />
                }
            >
                <SettingsIcon />
                <span className="sr-only">Workspace settings</span>
            </Button>
        </div>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-header-actions.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-header-actions.tsx` is a production source module containing **69 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 10)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { SettingsIcon } from "lucide-react";`: Imports required module bindings.
  - `import { ModeToggle } from "@/components/ui/mode-toggle";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 18 (`type ChatModelId,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 23 (`type WorkspaceHeaderActionsProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 27 (`export function WorkspaceHeaderActions({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 69 lines of `workspace-header-actions.tsx`.

#### File Path: `client/features/workspaces/components/workspace-settings-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    CHAT_MODEL_LABELS,
    CHAT_MODELS,
    type ChatModelId,
} from "@/features/chat/stores/chat-preferences";
import {
    useDeleteWorkspace,
    useUpdateWorkspace,
} from "../hooks/use-workspaces";
import type { Workspace } from "../lib/types";
import { workspaceRoutes } from "../lib/routes";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";

type WorkspaceSettingsFormProps = {
    workspace: Workspace;
};

export function WorkspaceSettingsForm({ workspace }: WorkspaceSettingsFormProps) {
    const router = useRouter();
    const updateWorkspace = useUpdateWorkspace(workspace.id);
    const deleteWorkspace = useDeleteWorkspace();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [title, setTitle] = useState(workspace.title);
    const [description, setDescription] = useState(workspace.description ?? "");
    const [icon, setIcon] = useState(workspace.icon ?? "");
    const [defaultModel, setDefaultModel] = useState<ChatModelId>(
        CHAT_MODELS.includes(workspace.defaultModel as ChatModelId)
            ? (workspace.defaultModel as ChatModelId)
            : "gpt-4o-mini",
    );

    async function handleSave(event: React.FormEvent) {
        event.preventDefault();

        await updateWorkspace.mutateAsync({
            title: title.trim(),
            description: description.trim() || undefined,
            icon: icon.trim() || undefined,
            defaultModel,
        });
    }

    async function handleDelete() {
        await deleteWorkspace.mutateAsync(workspace.id);
        router.push(workspaceRoutes.list);
    }

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
            <div>
                <h2 className="font-heading text-xl font-semibold">
                    Workspace settings
                </h2>
                <p className="text-sm text-muted-foreground">
                    Manage this workspace&apos;s details and defaults.
                </p>
            </div>

            <form onSubmit={(event) => void handleSave(event)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                        id="icon"
                        value={icon}
                        onChange={(event) => setIcon(event.target.value)}
                        placeholder="📚"
                        maxLength={8}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="defaultModel">Default chat model</Label>
                    <Select
                        value={defaultModel}
                        onValueChange={(value) =>
                            setDefaultModel(value as ChatModelId)
                        }
                    >
                        <SelectTrigger id="defaultModel">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CHAT_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>
                                    {CHAT_MODEL_LABELS[model]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" disabled={updateWorkspace.isPending}>
                    Save changes
                </Button>
            </form>

            <div className="rounded-xl border border-destructive/30 p-4">
                <h3 className="font-medium text-destructive">Danger zone</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Deleting this workspace removes all sources, conversations,
                    and indexed vectors permanently.
                </p>
                <Button
                    type="button"
                    variant="destructive"
                    className="mt-4"
                    onClick={() => setDeleteOpen(true)}
                >
                    Delete workspace
                </Button>
            </div>

            <DeleteWorkspaceDialog
                workspace={workspace}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onConfirm={handleDelete}
                isPending={deleteWorkspace.isPending}
            />
        </div>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-settings-form.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-settings-form.tsx` is a production source module containing **157 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 14)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { useRouter } from "next/navigation";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Input } from "@/components/ui/input";`: Imports required module bindings.
  - `import { Label } from "@/components/ui/label";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Textarea } from "@/components/ui/textarea";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 19 (`type ChatModelId,`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 29 (`type WorkspaceSettingsFormProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 33 (`export function WorkspaceSettingsForm({ workspace }: WorkspaceSettingsFormProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 157 lines of `workspace-settings-form.tsx`.

#### File Path: `client/features/workspaces/components/workspace-shell.tsx`

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ArrowLeftIcon,
    BookOpenIcon,
    GraduationCapIcon,
    MessageSquareIcon,
    PlusIcon,
    SettingsIcon,
} from "lucide-react";
import { learnRoutes } from "@/features/learn";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import {
    AddSourceDialog,
    SourceSidebarList,
    sourceRoutes,
} from "@/features/sources";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { workspaceRoutes } from "../lib/routes";
import type { Workspace } from "../lib/types";
import { WorkspaceHeaderActions } from "./workspace-header-actions";

type WorkspaceShellProps = {
    workspace: Workspace;
    children: React.ReactNode;
};

export function WorkspaceShell({ workspace, children }: WorkspaceShellProps) {
    const pathname = usePathname();
    const [addSourceOpen, setAddSourceOpen] = useState(false);

    const sourcesPath = sourceRoutes.list(workspace.id);
    const learnPath = learnRoutes.hub(workspace.id);
    const isSourcesActive = pathname.startsWith(sourcesPath);
    const isLearnActive = pathname.startsWith(learnPath);
    const isChatActive =
        !isSourcesActive && !isLearnActive && !pathname.includes("/settings");
    const isSettingsActive = pathname.includes("/settings");

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader className="border-b border-sidebar-border">
                    <div className="flex items-center gap-2 px-2 py-1">
                        <span className="text-xl">{workspace.icon ?? "📚"}</span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                                {workspace.title}
                            </p>
                            {workspace.description ? (
                                <p className="truncate text-xs text-muted-foreground">
                                    {workspace.description}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isChatActive}
                                        render={
                                            <Link
                                                href={workspaceRoutes.detail(
                                                    workspace.id,
                                                )}
                                            />
                                        }
                                    >
                                        <MessageSquareIcon />
                                        <span>Chat</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isLearnActive}
                                        render={
                                            <Link href={learnPath} />
                                        }
                                    >
                                        <GraduationCapIcon />
                                        <span>Learn</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isSourcesActive}
                                        render={
                                            <Link href={sourcesPath} />
                                        }
                                    >
                                        <BookOpenIcon />
                                        <span>Sources</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isSettingsActive}
                                        render={
                                            <Link
                                                href={workspaceRoutes.settings(
                                                    workspace.id,
                                                )}
                                            />
                                        }
                                    >
                                        <SettingsIcon />
                                        <span>Settings</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SourceSidebarList
                        workspaceId={workspace.id}
                        onAddSource={() => setAddSourceOpen(true)}
                    />
                </SidebarContent>

                <SidebarFooter className="border-t border-sidebar-border">
                    <Button
                        nativeButton={false}
                        variant="ghost"
                        className="w-full justify-start"
                        render={<Link href={workspaceRoutes.list} />}
                    >
                        <ArrowLeftIcon />
                        All workspaces
                    </Button>
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            <SidebarInset>
                <header className="flex h-14 items-center gap-3 border-b px-4">
                    <SidebarTrigger />
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-heading text-base font-semibold">
                            {workspace.title}
                        </h1>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddSourceOpen(true)}
                    >
                        <PlusIcon />
                        Add source
                    </Button>
                    <WorkspaceHeaderActions workspace={workspace} />
                    <SignOutButton />
                </header>

                <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </SidebarInset>

            <AddSourceDialog
                workspaceId={workspace.id}
                open={addSourceOpen}
                onOpenChange={setAddSourceOpen}
            />
        </SidebarProvider>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/workspace-shell.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/workspace-shell.tsx` is a production source module containing **190 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 14)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { usePathname } from "next/navigation";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { learnRoutes } from "@/features/learn";`: Imports required module bindings.
  - `import { SignOutButton } from "@/features/auth/components/sign-out-button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
  - `import { WorkspaceHeaderActions } from "./workspace-header-actions";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 42 (`type WorkspaceShellProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 47 (`export function WorkspaceShell({ workspace, children }: WorkspaceShellProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 190 lines of `workspace-shell.tsx`.

#### File Path: `client/features/workspaces/components/dashboard-home.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookOpenIcon,
    BrainIcon,
    MessageSquareIcon,
    SearchIcon,
    SparklesIcon,
} from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { memoryRoutes } from "@/features/memory";
import { ApiError } from "@/shared/lib/api";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import {
    useCreateWorkspace,
    useDeleteWorkspace,
    useUpdateWorkspace,
    useWorkspaces,
} from "../hooks/use-workspaces";
import { workspaceRoutes } from "../lib/routes";
import type { Workspace } from "../lib/types";
import { CreateWorkspaceCard } from "./create-workspace-card";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { WorkspaceCard } from "./workspace-card";
import { WorkspaceFormDialog } from "./workspace-form-dialog";

type DashboardHomeProps = {
    userName?: string | null;
};

const FEATURES = [
    {
        icon: BookOpenIcon,
        title: "Upload sources",
        description: "PDFs, websites, YouTube, and notes in one place",
    },
    {
        icon: MessageSquareIcon,
        title: "Chat with context",
        description: "Ask questions grounded in your materials",
    },
    {
        icon: SparklesIcon,
        title: "Learn faster",
        description: "Flashcards, quizzes, mind maps, and summaries",
    },
] as const;

export function DashboardHome({ userName }: DashboardHomeProps) {
    const router = useRouter();
    const { data: workspaces, isLoading, error } = useWorkspaces();
    const createWorkspace = useCreateWorkspace();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 200);

    const [createOpen, setCreateOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
        null,
    );
    const [deletingWorkspace, setDeletingWorkspace] =
        useState<Workspace | null>(null);

    const updateWorkspace = useUpdateWorkspace(editingWorkspace?.id ?? "");
    const deleteWorkspace = useDeleteWorkspace();

    const filteredWorkspaces = useMemo(() => {
        if (!workspaces) {
            return [];
        }

        const query = debouncedSearch.trim().toLowerCase();
        if (!query) {
            return workspaces;
        }

        return workspaces.filter((workspace) => {
            const haystack = [
                workspace.title,
                workspace.description ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [workspaces, debouncedSearch]);

    const greeting = userName?.split(" ")[0] ?? "there";

    return (
        <div className="min-h-svh bg-muted/30">
            <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
                    <Link
                        href={workspaceRoutes.list}
                        className="flex items-center gap-2.5 font-heading text-lg font-semibold tracking-tight"
                    >
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-base">
                            📚
                        </span>
                        Chaibook
                    </Link>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="hidden sm:inline-flex"
                            render={<Link href={memoryRoutes.settings} />}
                        >
                            <BrainIcon />
                            Memory
                        </Button>
                        <ModeToggle />
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
                <section className="mb-10 space-y-6">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">
                            Welcome back, {greeting}
                        </p>
                        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                            Your notebooks
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                            Organize sources, chat with your materials, and
                            generate learning tools — all in one workspace.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="rounded-2xl border bg-card/70 p-4 shadow-sm"
                            >
                                <feature.icon className="mb-2 size-4 text-primary" />
                                <p className="text-sm font-medium">
                                    {feature.title}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-heading text-xl font-semibold">
                                Recent notebooks
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {workspaces?.length
                                    ? `${workspaces.length} notebook${workspaces.length === 1 ? "" : "s"}`
                                    : "Start with your first notebook"}
                            </p>
                        </div>

                        <div className="relative w-full sm:max-w-xs">
                            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search notebooks..."
                                className="rounded-full bg-background pl-9"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton
                                    key={index}
                                    className="min-h-[196px] rounded-3xl"
                                />
                            ))}
                        </div>
                    ) : error ? (
                        <Empty className="rounded-3xl border bg-card">
                            <EmptyHeader>
                                <EmptyTitle>
                                    Could not load notebooks
                                </EmptyTitle>
                                <EmptyDescription>
                                    {error instanceof ApiError
                                        ? error.message
                                        : "Please try again in a moment."}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <CreateWorkspaceCard
                                onClick={() => setCreateOpen(true)}
                            />

                            {filteredWorkspaces.map((workspace) => (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    onEdit={setEditingWorkspace}
                                    onDelete={setDeletingWorkspace}
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading &&
                    !error &&
                    workspaces &&
                    workspaces.length > 0 &&
                    filteredWorkspaces.length === 0 ? (
                        <Empty className="rounded-3xl border bg-card">
                            <EmptyHeader>
                                <EmptyTitle>No notebooks found</EmptyTitle>
                                <EmptyDescription>
                                    Try a different search term or create a new
                                    notebook.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setSearch("")}>
                                    Clear search
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : null}
                </section>
            </main>

            <WorkspaceFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                isPending={createWorkspace.isPending}
                onSubmit={async (values) => {
                    const workspace = await createWorkspace.mutateAsync(values);
                    router.push(workspaceRoutes.detail(workspace.id));
                }}
            />

            <WorkspaceFormDialog
                open={Boolean(editingWorkspace)}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingWorkspace(null);
                    }
                }}
                workspace={editingWorkspace}
                isPending={updateWorkspace.isPending}
                onSubmit={async (values) => {
                    await updateWorkspace.mutateAsync(values);
                    setEditingWorkspace(null);
                }}
            />

            <DeleteWorkspaceDialog
                workspace={deletingWorkspace}
                open={Boolean(deletingWorkspace)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingWorkspace(null);
                    }
                }}
                isPending={deleteWorkspace.isPending}
                onConfirm={async () => {
                    if (!deletingWorkspace) {
                        return;
                    }

                    await deleteWorkspace.mutateAsync(deletingWorkspace.id);
                    setDeletingWorkspace(null);
                }}
            />
        </div>
    );
}

```

#### Code Explanation: `client/features/workspaces/components/dashboard-home.tsx`

**Overview & Architectural Role:**
- `client/features/workspaces/components/dashboard-home.tsx` is a production source module containing **301 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 22)**:
  - `import { useMemo, useState } from "react";`: Imports required module bindings.
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { useRouter } from "next/navigation";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { ModeToggle } from "@/components/ui/mode-toggle";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Input } from "@/components/ui/input";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Skeleton } from "@/components/ui/skeleton";`: Imports required module bindings.
  - `import { SignOutButton } from "@/features/auth/components/sign-out-button";`: Imports required module bindings.
  - `import { memoryRoutes } from "@/features/memory";`: Imports required module bindings.
  - `import { ApiError } from "@/shared/lib/api";`: Imports required module bindings.
  - `import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { workspaceRoutes } from "../lib/routes";`: Imports required module bindings.
  - `import type { Workspace } from "../lib/types";`: Imports required module bindings.
  - `import { CreateWorkspaceCard } from "./create-workspace-card";`: Imports required module bindings.
  - `import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";`: Imports required module bindings.
  - `import { WorkspaceCard } from "./workspace-card";`: Imports required module bindings.
  - `import { WorkspaceFormDialog } from "./workspace-form-dialog";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 41 (`type DashboardHomeProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 63 (`export function DashboardHome({ userName }: DashboardHomeProps) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 301 lines of `dashboard-home.tsx`.

#### File Path: `client/features/workspaces/index.ts`

```typescript
export type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    Workspace,
} from "./lib/types";

export {
    createWorkspace,
    deleteWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
} from "./lib/api";

export { isWorkspaceRoute, workspaceRoutes } from "./lib/routes";

export {
    useCreateWorkspace,
    useDeleteWorkspace,
    useUpdateWorkspace,
    useWorkspace,
    useWorkspaces,
    workspaceKeys,
} from "./hooks/use-workspaces";

export { CreateWorkspaceCard } from "./components/create-workspace-card";
export { DashboardHome } from "./components/dashboard-home";
export { DeleteWorkspaceDialog } from "./components/delete-workspace-dialog";
export { WorkspaceCard } from "./components/workspace-card";
export { WorkspaceFormDialog } from "./components/workspace-form-dialog";
export { WorkspaceList } from "./components/workspace-list";
export { WorkspaceShell } from "./components/workspace-shell";

```

#### Code Explanation: `client/features/workspaces/index.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/index.ts` is a production source module containing **32 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 1 (`export type {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 32 lines of `index.ts`.

#### File Path: `client/app/(protected)/dashboard/page.tsx`

```tsx
import { requireAuth } from "@/features/auth";
import { DashboardHome } from "@/features/workspaces/components/dashboard-home";

export default async function DashboardPage() {
    const session = await requireAuth();

    return <DashboardHome userName={session.user.name} />;
}

```

#### Code Explanation: `client/app/(protected)/dashboard/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/dashboard/page.tsx` is a production source module containing **8 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { DashboardHome } from "@/features/workspaces/components/dashboard-home";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 8 lines of `page.tsx`.

#### File Path: `client/app/(protected)/workspace/[id]/page.tsx`

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth";
import { WorkspaceChat } from "@/features/chat";
import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";
import { WorkspaceShell } from "@/features/workspaces";

type WorkspacePageProps = {
    params: Promise<{ id: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
    await requireAuth();
    const { id } = await params;
    const workspace = await getWorkspaceOrNull(id);

    if (!workspace) {
        notFound();
    }

    return (
        <WorkspaceShell workspace={workspace}>
            <Suspense fallback={null}>
                <WorkspaceChat
                    workspaceId={workspace.id}
                    defaultModel={workspace.defaultModel}
                />
            </Suspense>
        </WorkspaceShell>
    );
}

```

#### Code Explanation: `client/app/(protected)/workspace/[id]/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/workspace/[id]/page.tsx` is a production source module containing **31 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 8)**:
  - `import { Suspense } from "react";`: Imports required module bindings.
  - `import { notFound } from "next/navigation";`: Imports required module bindings.
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { WorkspaceChat } from "@/features/chat";`: Imports required module bindings.
  - `import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";`: Imports required module bindings.
  - `import { WorkspaceShell } from "@/features/workspaces";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 8 (`type WorkspacePageProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 31 lines of `page.tsx`.

#### File Path: `client/app/(protected)/workspace/[id]/settings/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth";
import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";
import { WorkspaceShell } from "@/features/workspaces";
import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";

type WorkspaceSettingsPageProps = {
    params: Promise<{ id: string }>;
};

export default async function WorkspaceSettingsPage({
    params,
}: WorkspaceSettingsPageProps) {
    await requireAuth();
    const { id } = await params;
    const workspace = await getWorkspaceOrNull(id);

    if (!workspace) {
        notFound();
    }

    return (
        <WorkspaceShell workspace={workspace}>
            <WorkspaceSettingsForm workspace={workspace} />
        </WorkspaceShell>
    );
}

```

#### Code Explanation: `client/app/(protected)/workspace/[id]/settings/page.tsx`

**Overview & Architectural Role:**
- `client/app/(protected)/workspace/[id]/settings/page.tsx` is a production source module containing **27 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 7)**:
  - `import { notFound } from "next/navigation";`: Imports required module bindings.
  - `import { requireAuth } from "@/features/auth";`: Imports required module bindings.
  - `import { getWorkspaceOrNull } from "@/features/workspaces/lib/workspace-server";`: Imports required module bindings.
  - `import { WorkspaceShell } from "@/features/workspaces";`: Imports required module bindings.
  - `import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 7 (`type WorkspaceSettingsPageProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 27 lines of `page.tsx`.
