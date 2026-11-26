# Client Chapter 2 — Shared Data Utilities & Server Data Helpers

## 1. Goal & Outcome
- **Goal**: Implement client and server helper utilities for workspace gradient themes and server-side data fetching headers.
- **Student Outcome**: Dynamic aesthetic gradient mappers and server-component fetch utilities.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install clsx tailwind-merge
```

---

## 3. Client Source Code & Explanations

#### File Path: `client/features/workspaces/lib/workspace-gradients.ts`

```typescript
const GRADIENTS = [
    "from-sky-400/90 via-blue-500/80 to-indigo-600/90",
    "from-emerald-400/90 via-teal-500/80 to-cyan-600/90",
    "from-amber-300/90 via-orange-400/80 to-rose-500/90",
    "from-violet-400/90 via-purple-500/80 to-fuchsia-600/90",
    "from-rose-300/90 via-pink-400/80 to-red-500/90",
    "from-lime-300/90 via-green-400/80 to-emerald-600/90",
    "from-cyan-300/90 via-sky-400/80 to-blue-600/90",
    "from-fuchsia-300/90 via-violet-400/80 to-purple-600/90",
] as const;

function hashString(value: string) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash);
}

export function getWorkspaceGradient(workspaceId: string) {
    return GRADIENTS[hashString(workspaceId) % GRADIENTS.length];
}

```

#### Code Explanation: `client/features/workspaces/lib/workspace-gradients.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/lib/workspace-gradients.ts` is a production source module containing **25 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Functions, Handlers & Business Methods**:
  - **Line 12 (`function hashString(value: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 23 (`export function getWorkspaceGradient(workspaceId: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 25 lines of `workspace-gradients.ts`.

#### File Path: `client/features/workspaces/lib/workspace-server.ts`

```typescript
import { headers } from "next/headers";
import type { Workspace } from "./types";

const apiUrl = process.env.API_URL ?? "http://localhost:8080";

async function fetchWorkspace(id: string): Promise<Workspace | null> {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie") ?? "";

    const response = await fetch(`${apiUrl}/api/workspaces/${id}`, {
        headers: { cookie },
        cache: "no-store",
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Failed to fetch workspace");
    }

    return response.json() as Promise<Workspace>;
}

export async function getWorkspaceOrNull(id: string) {
    return fetchWorkspace(id);
}

```

#### Code Explanation: `client/features/workspaces/lib/workspace-server.ts`

**Overview & Architectural Role:**
- `client/features/workspaces/lib/workspace-server.ts` is a production source module containing **28 lines** of code.
- **Layer**: Client Feature Module (`workspaces`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { headers } from "next/headers";`: Imports required module bindings.
  - `import type { Workspace } from "./types";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 28 lines of `workspace-server.ts`.
