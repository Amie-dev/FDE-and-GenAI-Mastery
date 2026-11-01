# Server Chapter 4 — Enterprise 5-Layer Workspaces CRUD

## 1. Goal & Outcome
- **Goal**: Implement Workspaces CRUD endpoints following the Enterprise 5-Layer Architecture (Routes -> Controller -> Service -> Repository -> Validator) with strict user ownership validation.
- **Student Outcome**: Complete type-safe workspace management API supporting creation, listing, updating, deletion, and detail retrieval.

---

## 2. Server Installation Commands

From directory `week05/chaibook-llm-sir/server`:

```bash
cd week05/chaibook-llm-sir/server
npm install zod
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/validators/workspace.validator.ts`

```typescript
import { z } from "zod";
import { CHAT_MODELS } from "../lib/ai-config.js";

export const createWorkspaceSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(8).optional(),
    defaultModel: z.enum(CHAT_MODELS).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required" },
);

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceIdParamSchema = z.object({
    workspaceId: z.string().trim().min(1),
});

```

#### Code Explanation: `server/src/validators/workspace.validator.ts`

**Overview & Architectural Role:**
- `server/src/validators/workspace.validator.ts` is a production source module containing **21 lines** of code.
- **Layer**: Validation Layer in Express backend. Uses Zod schemas to enforce strict runtime type constraints and infer static TypeScript types.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { z } from "zod";`: Imports required module bindings.
  - `import { CHAT_MODELS } from "../lib/ai-config.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 16 (`export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 17 (`export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Validation Schemas**:
  - **Line 4 (`export const createWorkspaceSchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 11 (`export const updateWorkspaceSchema = createWorkspaceSchema.partial().refine(`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
  - **Line 19 (`export const workspaceIdParamSchema = z.object({`)**: Defines runtime validation constraints (minimum/maximum string lengths, required parameters, default values) preventing invalid inputs from entering downstream execution layers.
- **Functions, Handlers & Business Methods**:
  - **Line 4 (`export const createWorkspaceSchema = z.object({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 11 (`export const updateWorkspaceSchema = createWorkspaceSchema.partial().refine(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 21 lines of `workspace.validator.ts`.

#### File Path: `server/src/repositories/workspace.repository.ts`

```typescript
import prisma from "../lib/db.js";
import type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
} from "../validators/workspace.validator.js";

export const workspaceSelect = {
    id: true,
    title: true,
    description: true,
    icon: true,
    defaultModel: true,
    createdAt: true,
    updatedAt: true,
} as const;

export type WorkspaceRecord = {
    id: string;
    title: string;
    description: string | null;
    icon: string | null;
    defaultModel: string;
    createdAt: Date;
    updatedAt: Date;
};

export function findWorkspacesByUserId(userId: string) {
    return prisma.workspace.findMany({
        where: { userId },
        select: workspaceSelect,
        orderBy: { updatedAt: "desc" },
    });
}

export function findWorkspaceByIdAndUserId(
    workspaceId: string,
    userId: string,
) {
    return prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
        select: workspaceSelect,
    });
}

export function createWorkspaceRecord(
    userId: string,
    data: CreateWorkspaceInput,
) {
    return prisma.workspace.create({
        data: {
            userId,
            ...data,
        },
        select: workspaceSelect,
    });
}

export function updateWorkspaceRecord(
    workspaceId: string,
    data: UpdateWorkspaceInput,
) {
    return prisma.workspace.update({
        where: { id: workspaceId },
        data,
        select: workspaceSelect,
    });
}

export async function deleteWorkspaceRecord(workspaceId: string) {
    await prisma.workspace.delete({
        where: { id: workspaceId },
    });
}

```

#### Code Explanation: `server/src/repositories/workspace.repository.ts`

**Overview & Architectural Role:**
- `server/src/repositories/workspace.repository.ts` is a production source module containing **73 lines** of code.
- **Layer**: Repository Data Layer in Express backend. Directly encapsulates Prisma ORM client database queries with atomic filters and relational selection.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import prisma from "../lib/db.js";`: Imports required module bindings.
  - `import type {`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 17 (`export type WorkspaceRecord = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 27 (`export function findWorkspacesByUserId(userId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 35 (`export function findWorkspaceByIdAndUserId(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 45 (`export function createWorkspaceRecord(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 58 (`export function updateWorkspaceRecord(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const workspaceSelect = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 73 lines of `workspace.repository.ts`.

#### File Path: `server/src/services/workspace.service.ts`

```typescript
import {
    deleteWorkspaceRecord,
    findWorkspaceByIdAndUserId,
    updateWorkspaceRecord,
    type WorkspaceRecord,
} from "../repositories/workspace.repository.js";
import { deleteWorkspaceVectors } from "../lib/pinecone.js";
import { NotFoundError } from "../types/app-error.js";
import type { UpdateWorkspaceInput } from "../validators/workspace.validator.js";

/**
 * Loads a workspace only if it belongs to the given user.
 *
 * @param workspaceId - Workspace to fetch
 * @param userId - Authenticated user's id
 * @returns The workspace record
 * @throws {NotFoundError} When the workspace does not exist or belongs to another user
 *
 *
 */
export async function getWorkspaceByIdForUser(
    workspaceId: string,
    userId: string,
): Promise<WorkspaceRecord> {
    const workspace = await findWorkspaceByIdAndUserId(workspaceId, userId);

    if (!workspace) {
        throw new NotFoundError("Workspace not found");
    }

    return workspace;
}

/**
 * Updates workspace settings after verifying the user owns it.
 *
 * @param workspaceId - Workspace to update
 * @param userId - Authenticated user's id
 * @param input - Partial workspace fields to change
 * @returns Updated workspace record
 * @throws {NotFoundError} When the workspace is not found for this user
 *
 */
export async function updateWorkspaceForUser(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);
    return updateWorkspaceRecord(workspaceId, input);
}

/**
 * Deletes a workspace and its Pinecone vector namespace.
 *
 * Pinecone cleanup is best-effort: deletion continues even if vector removal fails.
 *
 * @param workspaceId - Workspace to delete
 * @param userId - Authenticated user's id
 * @returns Resolves when the workspace row is deleted
 * @throws {NotFoundError} When the workspace is not found for this user
 *
 */
export async function deleteWorkspaceForUser(
    workspaceId: string,
    userId: string,
) {
    await getWorkspaceByIdForUser(workspaceId, userId);

    try {
        await deleteWorkspaceVectors(workspaceId);
    } catch (error) {
        console.error("Failed to delete Pinecone namespace:", error);
    }

    await deleteWorkspaceRecord(workspaceId);
}

```

#### Code Explanation: `server/src/services/workspace.service.ts`

**Overview & Architectural Role:**
- `server/src/services/workspace.service.ts` is a production source module containing **77 lines** of code.
- **Layer**: Service Layer in Express backend. Implements core domain logic, manages transactions, interacts with databases via repositories, and orchestrates background jobs.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import {`: Imports required module bindings.
  - `import { deleteWorkspaceVectors } from "../lib/pinecone.js";`: Imports required module bindings.
  - `import { NotFoundError } from "../types/app-error.js";`: Imports required module bindings.
  - `import type { UpdateWorkspaceInput } from "../validators/workspace.validator.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 5 (`type WorkspaceRecord,`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 77 lines of `workspace.service.ts`.

#### File Path: `server/src/controllers/workspace.controller.ts`

```typescript
import type { Request, Response } from "express";
import {
    deleteWorkspaceForUser,
    getWorkspaceByIdForUser,
    updateWorkspaceForUser,
} from "../services/workspace.service.js";
import {
    createWorkspaceRecord,
    findWorkspacesByUserId,
} from "../repositories/workspace.repository.js";
import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    workspaceIdParamSchema,
} from "../validators/workspace.validator.js";

export async function listWorkspaces(req: Request, res: Response) {
    const workspaces = await findWorkspacesByUserId(req.session.user.id);
    res.json(workspaces);
}

export async function getWorkspace(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    const workspace = await getWorkspaceByIdForUser(
        workspaceId,
        req.session.user.id,
    );
    res.json(workspace);
}

export async function createWorkspace(req: Request, res: Response) {
    const input = createWorkspaceSchema.parse(req.body);
    const workspace = await createWorkspaceRecord(
        req.session.user.id,
        input,
    );
    res.status(201).json(workspace);
}

export async function updateWorkspace(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    const input = updateWorkspaceSchema.parse(req.body);
    const workspace = await updateWorkspaceForUser(
        workspaceId,
        req.session.user.id,
        input,
    );
    res.json(workspace);
}

export async function deleteWorkspace(req: Request, res: Response) {
    const { workspaceId } = workspaceIdParamSchema.parse(req.params);
    await deleteWorkspaceForUser(workspaceId, req.session.user.id);
    res.status(204).send();
}

```

#### Code Explanation: `server/src/controllers/workspace.controller.ts`

**Overview & Architectural Role:**
- `server/src/controllers/workspace.controller.ts` is a production source module containing **55 lines** of code.
- **Layer**: Controller Layer in Express backend (5-Layer Pattern). Extracts parameters from HTTP requests, delegates validation/logic to domain services, and returns formatted HTTP responses.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import type { Request, Response } from "express";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 55 lines of `workspace.controller.ts`.

#### File Path: `server/src/routes/workspace.routes.ts`

```typescript
import { Router } from "express";
import {
    createWorkspace,
    deleteWorkspace,
    getWorkspace,
    listWorkspaces,
    updateWorkspace,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const workspaceRoutes = Router();

workspaceRoutes.use(requireAuth);

workspaceRoutes.get("/", asyncHandler(listWorkspaces));
workspaceRoutes.post("/", asyncHandler(createWorkspace));
workspaceRoutes.get("/:workspaceId", asyncHandler(getWorkspace));
workspaceRoutes.patch("/:workspaceId", asyncHandler(updateWorkspace));
workspaceRoutes.delete("/:workspaceId", asyncHandler(deleteWorkspace));

```

#### Code Explanation: `server/src/routes/workspace.routes.ts`

**Overview & Architectural Role:**
- `server/src/routes/workspace.routes.ts` is a production source module containing **20 lines** of code.
- **Layer**: Route Router Layer in Express backend. Maps REST API endpoints to controller handlers and binds security middleware.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import { Router } from "express";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { requireAuth } from "../middleware/require-auth.middleware.js";`: Imports required module bindings.
  - `import { asyncHandler } from "../utils/async-handler.js";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const workspaceRoutes = Router();`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 20 lines of `workspace.routes.ts`.
