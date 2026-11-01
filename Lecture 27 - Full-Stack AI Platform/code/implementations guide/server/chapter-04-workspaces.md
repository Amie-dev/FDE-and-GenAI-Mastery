# Server Chapter 4 — Enterprise 5-Layer Workspaces CRUD

## 1. Goal & Outcome

- **Goal:** Implement Workspace CRUD APIs using a layered backend architecture:

```text
Routes
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Database
```

with **Zod validation** and authenticated-user ownership checks.

- **Student Outcome:** Build a type-safe Workspace API that supports:
  - Creating a workspace
  - Listing the current user's workspaces
  - Retrieving one workspace
  - Updating a workspace
  - Deleting a workspace
  - Preventing users from accessing another user's workspace

### Important Architecture Note

The chapter describes the architecture as:

```text
Routes → Controller → Service → Repository → Validator
```

but the actual implementation does **not** strictly follow that order.

The real dependency flow is:

```text
Route
  │
  ▼
Controller
  ├── Validator
  ├── Service
  │     └── Repository
  └── Repository
```

The **validator is used by the controller**, while the service coordinates business rules and the repository performs database access.

For workspace deletion, the service additionally coordinates Pinecone cleanup.

---

# 2. Architecture Overview

The Workspace feature is divided into responsibilities:

```text
                    HTTP Request
                         │
                         ▼
                ┌─────────────────┐
                │      Route      │
                │ Authentication   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   Controller    │
                │ HTTP + parsing  │
                └───────┬─────────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
       ┌───────────┐        ┌────────────┐
       │ Validator │        │  Service   │
       │   Zod     │        │  Business  │
       └───────────┘        └─────┬──────┘
                                  │
                                  ▼
                           ┌────────────┐
                           │ Repository │
                           │   Prisma   │
                           └─────┬──────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
               PostgreSQL                 Pinecone
```

This separation prevents HTTP handling, validation, business rules, and persistence logic from being mixed together.

---

# 3. Installation

From:

```bash
cd week05/chaibook-llm-sir/server
```

Install Zod:

```bash
npm install zod
```

Zod is used for **runtime validation**.

TypeScript alone cannot validate data arriving over HTTP because request bodies and URL parameters are runtime values.

For example, TypeScript may say:

```typescript
type CreateWorkspaceInput = {
  title: string;
};
```

but an HTTP client can still send:

```json
{
  "title": 123
}
```

Zod validates the actual runtime value before it enters the application logic.

---

# 4. Workspace Validation

## File Path

```text
server/src/validators/workspace.validator.ts
```

```typescript
import { z } from "zod";
import { CHAT_MODELS } from "../lib/ai-config.js";

export const createWorkspaceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(8).optional(),
  defaultModel: z.enum(CHAT_MODELS).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().trim().min(1),
});
```

---

# 5. Importing Zod

```typescript
import { z } from "zod";
```

This imports Zod's schema-building API.

The `z` object provides methods such as:

```typescript
z.object();
z.string();
z.enum();
```

which are used to construct runtime validation schemas.

---

# 6. Importing Allowed Chat Models

```typescript
import { CHAT_MODELS } from "../lib/ai-config.js";
```

The workspace allows the user to select a default AI model.

Instead of duplicating the list of models inside the validator, the code imports the existing `CHAT_MODELS` configuration.

This creates a single source of truth:

```text
ai-config.ts
     │
     ▼
CHAT_MODELS
     │
     ▼
workspace.validator.ts
     │
     ▼
defaultModel validation
```

If the model list changes, the validation schema automatically uses the updated list.

---

# 7. Create Workspace Schema

```typescript
export const createWorkspaceSchema = z.object({
```

This defines the expected request body when creating a workspace.

The schema expects four possible fields:

```text
title
description
icon
defaultModel
```

---

# 8. Validating `title`

```typescript
title: z.string()
  .trim()
  .min(1, "Title is required")
  .max(120),
```

This applies several validations sequentially.

### `z.string()`

The value must be a string.

### `.trim()`

Leading and trailing whitespace is removed.

For example:

```text
"   My Workspace   "
```

becomes:

```text
"My Workspace"
```

### `.min(1, "Title is required")`

After trimming, at least one character must remain.

Therefore:

```text
""
"   "
```

are rejected.

### `.max(120)`

Prevents excessively long workspace titles.

The resulting validation rule is effectively:

```text
title
 ├── must be string
 ├── trim whitespace
 ├── at least 1 character
 └── maximum 120 characters
```

---

# 9. Validating `description`

```typescript
description: z.string()
  .trim()
  .max(500)
  .optional(),
```

The description:

- Must be a string when provided
- Is trimmed
- Can contain at most 500 characters
- May be omitted

Because `.optional()` is present:

```json
{}
```

is valid with respect to `description`.

---

# 10. Validating `icon`

```typescript
icon: z.string()
  .trim()
  .max(8)
  .optional(),
```

The workspace icon is optional and limited to eight characters.

This is useful for values such as emoji or short icon identifiers.

The validator therefore prevents arbitrarily large strings from being stored in this field.

---

# 11. Validating `defaultModel`

```typescript
defaultModel: z.enum(CHAT_MODELS).optional(),
```

This is more restrictive than simply using:

```typescript
z.string();
```

The value must be one of the configured `CHAT_MODELS`.

Conceptually:

```text
CHAT_MODELS
    │
    ├── model A
    ├── model B
    └── model C
         │
         ▼
defaultModel must match one of them
```

This prevents clients from sending an arbitrary model name that the backend does not support.

---

# 12. Update Schema

```typescript
export const updateWorkspaceSchema = createWorkspaceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
```

This schema is specifically designed for `PATCH` requests.

The important part is:

```typescript
createWorkspaceSchema.partial();
```

`partial()` makes all fields optional.

The create schema:

```text
title        required
description  optional
icon         optional
defaultModel optional
```

becomes an update schema where every field can be omitted individually:

```text
title        optional
description  optional
icon         optional
defaultModel optional
```

That is appropriate for partial updates.

---

# 13. Preventing Empty PATCH Requests

Making every field optional creates another problem.

This would technically become valid:

```json
{}
```

But a PATCH request containing no fields has nothing to update.

The code prevents that with:

```typescript
.refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
)
```

`Object.keys(data)` returns the supplied property names.

For:

```json
{
  "title": "New Name"
}
```

the result contains one key.

For:

```json
{}
```

the result contains zero keys.

Therefore:

```text
Object.keys(data).length > 0
```

ensures that at least one update field was supplied.

---

# 14. Inferring Create Input Types

```typescript
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
```

Zod is being used for both:

1. Runtime validation
2. TypeScript type inference

`z.infer` extracts the TypeScript type represented by the schema.

Conceptually:

```text
createWorkspaceSchema
        │
        ├── Runtime validation
        │
        └── z.infer
              │
              ▼
      CreateWorkspaceInput
```

This avoids maintaining a separate interface that could become inconsistent with the validation schema.

---

# 15. Inferring Update Input Types

```typescript
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
```

This creates the TypeScript type corresponding to the update schema.

The repository and service can then use:

```typescript
UpdateWorkspaceInput;
```

instead of manually describing the update object.

---

# 16. Workspace ID Parameter Validation

```typescript
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().trim().min(1),
});
```

This validates route parameters such as:

```text
/workspaces/:workspaceId
```

The expected parameter shape is:

```json
{
  "workspaceId": "abc123"
}
```

It must be:

- A string
- Trimmed
- At least one character long

This prevents an empty workspace ID from reaching the service layer.

---

# 17. Repository Layer

## File Path

```text
server/src/repositories/workspace.repository.ts
```

The repository owns direct Prisma database operations.

```typescript
import prisma from "../lib/db.js";

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../validators/workspace.validator.js";
```

---

# 18. Prisma Client Import

```typescript
import prisma from "../lib/db.js";
```

The repository uses the shared Prisma Client created in the database layer.

The repository should be the layer responsible for database persistence.

Therefore:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
PostgreSQL
```

The controller does not directly execute Prisma queries.

---

# 19. Importing Repository Input Types

```typescript
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../validators/workspace.validator.js";
```

The repository uses the same types generated from the Zod schemas.

This creates a useful connection between:

```text
HTTP validation
       ↓
TypeScript type
       ↓
Repository input
```

The repository therefore expects the already-validated shape rather than arbitrary request data.

---

# 20. Workspace Select Object

```typescript
export const workspaceSelect = {
  id: true,
  title: true,
  description: true,
  icon: true,
  defaultModel: true,
  createdAt: true,
  updatedAt: true,
} as const;
```

This defines the fields returned from workspace queries.

Instead of repeatedly writing:

```typescript
select: {
  id: true,
  title: true,
  ...
}
```

the application can reuse:

```typescript
workspaceSelect;
```

across repository methods.

---

# 21. Why `select` Is Useful

The Prisma model may contain fields that should not necessarily be returned from every workspace query.

Using:

```typescript
select: workspaceSelect;
```

makes the returned shape explicit.

It also avoids accidentally returning unrelated database fields when the model evolves.

---

# 22. `as const`

```typescript
} as const;
```

This tells TypeScript to preserve the object properties as literal values rather than widening them.

For example:

```typescript
true;
```

remains the literal type:

```text
true
```

instead of becoming a general boolean.

This helps Prisma infer the selected result shape accurately.

---

# 23. WorkspaceRecord

```typescript
export type WorkspaceRecord = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: string;
  createdAt: Date;
  updatedAt: Date;
};
```

This type describes the workspace shape returned by the repository.

Nullable database columns are represented explicitly:

```typescript
description: string | null;
icon: string | null;
```

This matches the Prisma schema where those fields are optional.

The type therefore communicates an important distinction:

```text
undefined
    ≠
null
```

A workspace record returned from PostgreSQL can contain `null` for those optional database columns.

---

# 24. Listing a User's Workspaces

```typescript
export function findWorkspacesByUserId(userId: string) {
  return prisma.workspace.findMany({
    where: { userId },
    select: workspaceSelect,
    orderBy: { updatedAt: "desc" },
  });
}
```

This method retrieves all workspaces belonging to a particular user.

The critical condition is:

```typescript
where: {
  userId;
}
```

This is an ownership filter.

It means the query does not simply ask:

```text
Give me all workspaces
```

It asks:

```text
Give me workspaces where userId equals the authenticated user's ID.
```

---

# 25. Ordering Workspaces

```typescript
orderBy: { updatedAt: "desc" },
```

Workspaces are returned from most recently updated to least recently updated.

Conceptually:

```text
Latest updated
      ↓
Workspace A
Workspace B
Workspace C
      ↓
Oldest updated
```

This is useful for a workspace dashboard where recently used workspaces should appear first.

---

# 26. Finding a Workspace With Ownership

```typescript
export function findWorkspaceByIdAndUserId(
  workspaceId: string,
  userId: string,
) {
  return prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      userId,
    },
    select: workspaceSelect,
  });
}
```

This is one of the most important security-related queries in the chapter.

It does **not** search only by:

```typescript
id: workspaceId;
```

It searches by both:

```typescript
id: workspaceId;
userId: userId;
```

Therefore the query answers:

> Does this workspace exist **and** belong to this authenticated user?

This prevents a user from simply supplying another user's workspace ID and accessing it.

---

# 27. Why Ownership Must Be Checked in the Database Query

Consider:

```text
User A
 └── Workspace X

User B
 └── Workspace Y
```

If User A sends:

```text
GET /workspaces/Y
```

the repository query becomes:

```text
id = Y
AND
userId = User A
```

No matching record exists.

The result is:

```text
null
```

The service then converts that into:

```text
404 Workspace not found
```

This is preferable to fetching the workspace first and performing an ownership check separately in application code.

---

# 28. Creating a Workspace

```typescript
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
```

The repository receives:

```text
userId
+
validated workspace data
```

and constructs the Prisma create operation.

---

# 29. Injecting the User ID

```typescript
data: {
  userId,
  ...data,
},
```

The authenticated user's ID is explicitly inserted into the new workspace.

This is important because the client should not decide which user owns the workspace.

The server derives ownership from:

```typescript
req.session.user.id;
```

and passes that value into the repository.

The trust boundary is therefore:

```text
Authenticated session
        │
        ▼
req.session.user.id
        │
        ▼
Service / Repository
        │
        ▼
workspace.userId
```

---

# 30. Spreading Validated Data

```typescript
...data,
```

The validated workspace fields are added to the create object.

For example:

```json
{
  "title": "RAG Research",
  "description": "Learning RAG",
  "defaultModel": "gpt-4o-mini"
}
```

becomes conceptually:

```typescript
{
  userId: "...",
  title: "RAG Research",
  description: "Learning RAG",
  defaultModel: "gpt-4o-mini"
}
```

The validation layer has already ensured that these fields have the expected shape.

---

# 31. Updating a Workspace

```typescript
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
```

The repository performs the actual update by workspace ID.

Notice an important architectural detail:

```typescript
where: {
  id: workspaceId;
}
```

does **not** include `userId`.

That is intentional because the service has already performed the ownership check through:

```typescript
getWorkspaceByIdForUser();
```

before calling this method.

The responsibility is divided as:

```text
Service
 └── verify ownership

Repository
 └── perform update
```

---

# 32. Deleting a Workspace

```typescript
export async function deleteWorkspaceRecord(workspaceId: string) {
  await prisma.workspace.delete({
    where: { id: workspaceId },
  });
}
```

This performs the actual PostgreSQL deletion through Prisma.

The method receives only the workspace ID because ownership validation is handled earlier by the service.

---

# 33. Service Layer

## File Path

```text
server/src/services/workspace.service.ts
```

The service layer contains **business rules and orchestration**.

Unlike the repository, it is not primarily concerned with Prisma syntax.

It answers questions such as:

- Does the workspace belong to the user?
- Should a missing workspace become a `NotFoundError`?
- Should Pinecone vectors also be deleted?
- In what order should external cleanup and database deletion happen?

---

# 34. Service Imports

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
```

The service depends on:

```text
Repository
Pinecone
Application errors
Validation types
```

This is a good example of the service acting as an orchestration layer.

---

# 35. Loading a User-Owned Workspace

```typescript
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
```

This function centralizes the ownership check.

It calls:

```typescript
findWorkspaceByIdAndUserId(workspaceId, userId);
```

so the repository checks both identifiers.

---

# 36. Converting `null` Into a Domain Error

```typescript
if (!workspace) {
  throw new NotFoundError("Workspace not found");
}
```

The repository returns `null` when there is no matching workspace.

The service converts that persistence result into an application-level error:

```text
Database result
      │
      ▼
null
      │
      ▼
NotFoundError
      │
      ▼
Global error handler
      │
      ▼
HTTP response
```

This keeps HTTP error semantics out of the repository.

The repository knows:

> No row matched.

The service knows:

> The requested workspace is not available to this user.

---

# 37. Why This Function Is Reused

The service exposes:

```typescript
getWorkspaceByIdForUser();
```

as a reusable ownership-checking operation.

The update and delete operations both call it.

That means ownership logic is not duplicated.

```text
                 getWorkspaceByIdForUser
                    /              \
                   /                \
              Update               Delete
```

This reduces the risk of accidentally implementing different ownership rules in different operations.

---

# 38. Updating a Workspace Through the Service

```typescript
export async function updateWorkspaceForUser(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
) {
  await getWorkspaceByIdForUser(workspaceId, userId);

  return updateWorkspaceRecord(workspaceId, input);
}
```

The sequence is deliberate:

```text
1. Verify ownership
       ↓
2. Perform update
```

The service does not trust the workspace ID alone.

---

# 39. Deleting a Workspace and Its Vectors

```typescript
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

Deletion is more complicated than update because workspace data exists in two systems:

```text
PostgreSQL
+
Pinecone
```

The service coordinates both.

---

# 40. Delete Flow

The current implementation performs:

```text
Verify ownership
       ↓
Delete Pinecone vectors
       ↓
Delete PostgreSQL workspace
```

The Pinecone operation is wrapped in:

```typescript
try {
  ...
} catch {
  ...
}
```

so a Pinecone deletion failure does not prevent the PostgreSQL workspace deletion.

---

# 41. Best-Effort Pinecone Cleanup

```typescript
try {
  await deleteWorkspaceVectors(workspaceId);
} catch (error) {
  console.error("Failed to delete Pinecone namespace:", error);
}
```

This is explicitly **best-effort cleanup**.

If Pinecone deletion succeeds:

```text
Pinecone cleanup
      ↓
PostgreSQL deletion
```

If Pinecone deletion fails:

```text
Pinecone failure
      ↓
log error
      ↓
continue
      ↓
PostgreSQL deletion
```

This means the current implementation prioritizes removing the workspace from PostgreSQL even if the external vector cleanup fails.

### Production implication

This creates a possible consistency gap:

```text
PostgreSQL
   Workspace → deleted

Pinecone
   Vectors → still exist
```

Therefore, a production system may eventually need a retry mechanism, cleanup queue, or reconciliation job for failed vector deletion.

The current code does not implement that retry mechanism; it only logs the failure.

---

# 42. Controller Layer

## File Path

```text
server/src/controllers/workspace.controller.ts
```

The controller is responsible for translating HTTP requests into application operations and converting results back into HTTP responses.

It handles:

```text
Request
 ├── params
 ├── body
 └── authenticated user
        │
        ▼
Application logic
        │
        ▼
HTTP Response
```

The controller should not contain the actual database queries.

---

# 43. Listing Workspaces

```typescript
export async function listWorkspaces(req: Request, res: Response) {
  const workspaces = await findWorkspacesByUserId(req.session.user.id);

  res.json(workspaces);
}
```

The authenticated user's ID comes from:

```typescript
req.session.user.id;
```

This is important because the client does not provide the user ID.

The server obtains it from the previously validated authentication session.

Then:

```typescript
findWorkspacesByUserId(...)
```

retrieves only that user's workspaces.

---

# 44. Getting One Workspace

```typescript
export async function getWorkspace(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);

  const workspace = await getWorkspaceByIdForUser(
    workspaceId,
    req.session.user.id,
  );

  res.json(workspace);
}
```

This controller performs two important operations.

### Step 1 — Validate the route parameter

```typescript
workspaceIdParamSchema.parse(req.params);
```

### Step 2 — Apply ownership validation

```typescript
getWorkspaceByIdForUser(workspaceId, req.session.user.id);
```

The controller therefore connects:

```text
HTTP parameter
      ↓
Zod validation
      ↓
Authenticated user ID
      ↓
Ownership-aware service
```

---

# 45. Creating a Workspace

```typescript
export async function createWorkspace(req: Request, res: Response) {
  const input = createWorkspaceSchema.parse(req.body);

  const workspace = await createWorkspaceRecord(req.session.user.id, input);

  res.status(201).json(workspace);
}
```

The request body is validated using:

```typescript
createWorkspaceSchema.parse(req.body);
```

Then the authenticated user ID is supplied by the server.

The response uses:

```typescript
201 Created
```

because a new resource was successfully created.

---

# 46. Updating a Workspace

```typescript
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
```

The controller validates both:

```text
URL parameter
+
request body
```

before passing them to the service.

The service then verifies ownership before performing the update.

---

# 47. Deleting a Workspace

```typescript
export async function deleteWorkspace(req: Request, res: Response) {
  const { workspaceId } = workspaceIdParamSchema.parse(req.params);

  await deleteWorkspaceForUser(workspaceId, req.session.user.id);

  res.status(204).send();
}
```

The delete controller:

1. Validates `workspaceId`
2. Gets the authenticated user's ID
3. Calls the service
4. Returns HTTP `204`

---

# 48. Why HTTP 204 Is Used

```typescript
res.status(204).send();
```

`204 No Content` means the deletion succeeded and there is no response body to return.

The response is therefore:

```text
HTTP 204
```

with no JSON payload.

---

# 49. Routes Layer

## File Path

```text
server/src/routes/workspace.routes.ts
```

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

This is the HTTP routing layer.

---

# 50. Creating the Router

```typescript
export const workspaceRoutes = Router();
```

This creates an isolated Express router for workspace-related endpoints.

The main application can mount it under a prefix such as:

```text
/workspaces
```

The individual routes then become:

```text
GET    /workspaces
POST   /workspaces
GET    /workspaces/:workspaceId
PATCH  /workspaces/:workspaceId
DELETE /workspaces/:workspaceId
```

---

# 51. Protecting Every Workspace Route

```typescript
workspaceRoutes.use(requireAuth);
```

This is an important design choice.

Instead of adding:

```typescript
requireAuth;
```

to every individual route, the router applies it to all routes defined after it.

Therefore:

```text
/workspaces
    │
    ├── GET
    ├── POST
    ├── GET /:workspaceId
    ├── PATCH /:workspaceId
    └── DELETE /:workspaceId
            │
            ▼
        requireAuth
```

Every workspace endpoint requires an authenticated session.

---

# 52. GET Workspaces

```typescript
workspaceRoutes.get("/", asyncHandler(listWorkspaces));
```

Maps:

```text
GET /workspaces
```

to:

```typescript
listWorkspaces;
```

The handler is wrapped in `asyncHandler`.

---

# 53. POST Workspaces

```typescript
workspaceRoutes.post("/", asyncHandler(createWorkspace));
```

Maps:

```text
POST /workspaces
```

to the workspace creation controller.

---

# 54. GET Single Workspace

```typescript
workspaceRoutes.get("/:workspaceId", asyncHandler(getWorkspace));
```

Maps:

```text
GET /workspaces/:workspaceId
```

to the detail controller.

The dynamic parameter:

```text
:workspaceId
```

is available through:

```typescript
req.params.workspaceId;
```

---

# 55. PATCH Workspace

```typescript
workspaceRoutes.patch("/:workspaceId", asyncHandler(updateWorkspace));
```

Maps:

```text
PATCH /workspaces/:workspaceId
```

to the update controller.

PATCH is appropriate here because the update schema allows partial fields.

---

# 56. DELETE Workspace

```typescript
workspaceRoutes.delete("/:workspaceId", asyncHandler(deleteWorkspace));
```

Maps:

```text
DELETE /workspaces/:workspaceId
```

to the deletion controller.

---

# 57. Why `asyncHandler` Is Used

The controllers are asynchronous:

```typescript
async function ...
```

so errors can be rejected through promises.

The existing `asyncHandler` utility from the earlier server chapter provides a consistent way to forward asynchronous failures to Express's error middleware.

Therefore the route pipeline becomes:

```text
Route
  ↓
asyncHandler
  ↓
Controller
  ↓
Service / Repository
  ↓
Error
  ↓
Global error handler
```

This keeps individual controllers from needing repetitive `try/catch` blocks for errors that should be handled centrally.

---

# 58. Complete CRUD Request Flow

## Create

```text
POST /workspaces
       │
       ▼
requireAuth
       │
       ▼
createWorkspace controller
       │
       ▼
createWorkspaceSchema.parse()
       │
       ▼
createWorkspaceRecord()
       │
       ▼
Prisma
       │
       ▼
PostgreSQL
       │
       ▼
201 Created
```

---

## List

```text
GET /workspaces
       │
       ▼
requireAuth
       │
       ▼
listWorkspaces
       │
       ▼
req.session.user.id
       │
       ▼
findWorkspacesByUserId()
       │
       ▼
Prisma
       │
       ▼
PostgreSQL
       │
       ▼
JSON workspace list
```

---

## Get One

```text
GET /workspaces/:workspaceId
       │
       ▼
requireAuth
       │
       ▼
Validate workspaceId
       │
       ▼
getWorkspaceByIdForUser()
       │
       ▼
WHERE id = workspaceId
AND userId = authenticatedUser
       │
       ├── Not found → 404
       │
       └── Found
             │
             ▼
          Workspace
```

---

## Update

```text
PATCH /workspaces/:workspaceId
       │
       ▼
requireAuth
       │
       ▼
Validate params
       │
       ▼
Validate body
       │
       ▼
getWorkspaceByIdForUser()
       │
       ├── Not found → 404
       │
       └── Owner verified
              │
              ▼
       updateWorkspaceRecord()
              │
              ▼
          PostgreSQL
```

---

## Delete

```text
DELETE /workspaces/:workspaceId
       │
       ▼
requireAuth
       │
       ▼
Validate workspaceId
       │
       ▼
getWorkspaceByIdForUser()
       │
       ├── Not found → 404
       │
       └── Owner verified
              │
              ▼
      deleteWorkspaceVectors()
              │
              ├── success
              │
              └── failure → log + continue
              │
              ▼
      deleteWorkspaceRecord()
              │
              ▼
           204 No Content
```

---

# 59. The Five-Layer Responsibility Model

Although the implementation has a validator called from the controller, the architectural responsibilities are clearly separated.

| Layer          | Responsibility                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| **Route**      | Maps HTTP methods/paths and applies authentication                                  |
| **Controller** | Reads HTTP input, invokes validation, calls application logic, sends HTTP responses |
| **Validator**  | Performs runtime input validation and generates TypeScript input types              |
| **Service**    | Enforces ownership rules and coordinates business operations                        |
| **Repository** | Performs Prisma/database operations                                                 |

The dependency direction is primarily:

```text
Routes
   ↓
Controllers
   ↓
Services
   ↓
Repositories
   ↓
Database
```

with validation supporting the controller boundary.

---

# 60. Ownership Security Model

The most important security property in this chapter is that workspace access is scoped to the authenticated user.

The server derives:

```typescript
req.session.user.id;
```

from the authenticated session.

It does not trust a client-provided:

```text
userId
```

The ownership check becomes:

```text
Authenticated User
        │
        ▼
req.session.user.id
        │
        ▼
workspace.userId
```

For individual workspace access:

```text
workspace.id = requested workspaceId
AND
workspace.userId = authenticated userId
```

This pattern should be reused for other user-owned resources such as:

- Sources
- Conversations
- Learning artifacts
- Memories

---

# 61. Cascading Database Deletion

The Prisma schema defines Workspace relationships with:

```text
onDelete: Cascade
```

for related resources.

Therefore deleting a workspace can also remove dependent PostgreSQL records such as:

```text
Workspace
   ├── Sources
   │     └── SourceChunks
   │
   ├── Conversations
   │     └── Messages
   │
   └── LearningArtifacts
```

The database handles those relational cascades.

However, PostgreSQL cannot automatically cascade into Pinecone.

That is why the service explicitly calls:

```typescript
deleteWorkspaceVectors(workspaceId);
```

before deleting the database record.

---

# 62. Database vs Vector Store Consistency

The workspace exists across two persistence systems:

```text
                 Workspace
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     PostgreSQL            Pinecone
     metadata              embeddings
     relations             vectors
```

Deleting the workspace therefore requires coordination across both systems.

The current strategy is:

```text
1. Validate ownership
2. Attempt Pinecone cleanup
3. Log Pinecone failure
4. Delete PostgreSQL workspace
```

This is simple and practical, but it is **not an atomic transaction across PostgreSQL and Pinecone**.

A PostgreSQL transaction cannot roll back a successful Pinecone operation, and Pinecone cannot participate in Prisma's database transaction.

For a more resilient production architecture, failed external cleanup could be retried asynchronously.

---

# 63. Error Propagation

There are several possible failure points:

```text
Zod validation
       │
       ▼
ZodError

Authentication
       │
       ▼
401 Unauthorized

Workspace ownership
       │
       ▼
NotFoundError

Prisma
       │
       ▼
Database error

Pinecone
       │
       ▼
Logged cleanup failure
```

The important difference is that Pinecone deletion is intentionally caught inside the service, while most other asynchronous failures can propagate through `asyncHandler` into the global error middleware.

---

# 64. Production Improvements to Consider

The current implementation is already cleanly separated, but several production refinements could be considered.

### 64.1 Move Create Operations Into the Service

Currently creation directly uses:

```text
Controller → Repository
```

while update/delete use:

```text
Controller → Service → Repository
```

For a stricter architecture, creation could also go through:

```text
Controller
    ↓
Service
    ↓
Repository
```

This gives the service layer a single place for future creation business rules.

---

### 64.2 Avoid Cross-Layer Validator Dependency if Desired

The repository imports:

```typescript
CreateWorkspaceInput;
UpdateWorkspaceInput;
```

from the validator module.

This works, but a stricter architecture could define domain/application input types separately and let Zod schemas implement those shapes.

That would reduce the repository's conceptual dependency on HTTP validation.

The current implementation is not inherently wrong; it is simply a coupling decision.

---

### 64.3 Handle Pinecone Cleanup Reliably

Current behavior:

```text
Pinecone fails
     ↓
console.error()
     ↓
workspace deleted
```

A stronger production architecture could use:

```text
Workspace deletion
      ↓
Database deletion
      ↓
Cleanup job
      ↓
Pinecone deletion
      ↓
Retry on failure
```

This would avoid permanently orphaned vectors caused by transient Pinecone failures.

---

### 64.4 Consider More Precise Workspace ID Validation

Currently:

```typescript
z.string().trim().min(1);
```

only verifies that a non-empty string exists.

If the project establishes a specific ID format, such as CUID, the validator could enforce that format as well.

The current schema does not do that, so it should not be described as validating CUID format.

---

# 65. Final Architecture

The complete Workspace feature can be understood as:

```text
                         Client
                           │
                           ▼
                    HTTP /workspaces
                           │
                           ▼
                 ┌──────────────────┐
                 │      Routes      │
                 │  requireAuth()   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    Controller    │
                 │ HTTP translation │
                 └───────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       ┌─────────────┐       ┌─────────────┐
       │    Zod      │       │   Service   │
       │ Validation  │       │ Domain rules│
       └─────────────┘       └──────┬──────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │  Repository  │
                            │    Prisma    │
                            └──────┬───────┘
                                   │
                                   ▼
                              PostgreSQL
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    Workspace            Relations
                         │
                         ▼
                     Pinecone
```

---

# 66. Key Concepts Learned

By completing this chapter, the important concepts are:

- **Zod schemas** provide runtime validation for untrusted HTTP input.
- **`z.infer`** derives TypeScript types from Zod schemas.
- **`partial()`** makes fields optional for PATCH-style updates.
- **`refine()`** enforces cross-field/object-level rules such as preventing `{}`.
- **Prisma repositories** isolate database queries from HTTP code.
- **`select`** controls which database fields are returned.
- **`as const`** preserves literal values for stronger TypeScript/Prisma inference.
- **Services** contain ownership checks and cross-system business orchestration.
- **Controllers** translate HTTP requests and responses.
- **Routes** define API endpoints and apply authentication middleware.
- **`req.session.user.id`** provides trusted user identity after authentication.
- **Ownership-aware queries** prevent cross-user workspace access.
- **Pinecone cleanup** must be coordinated separately because it is outside PostgreSQL transactions.
- **`asyncHandler`** allows asynchronous controller errors to reach centralized error handling.

The core pattern to remember is:

```text
HTTP Request
     ↓
Authenticate
     ↓
Validate Input
     ↓
Controller
     ↓
Service
     ↓
Verify Ownership
     ↓
Repository
     ↓
Database
     ↓
Response
```

For user-owned resources, the most important security rule is:

```text
Never trust the resource ID alone.

resourceId + authenticatedUserId
              ↓
        ownership check
```

That pattern becomes the foundation for the upcoming **Sources, Conversations, RAG, and Learning Artifact APIs**.
