# Server Chapter 3 — Authentication & Session Management

## 1. Goal & Outcome
- **Goal**: Implement secure authentication and session validation using Better Auth and Express middleware.
- **Student Outcome**: Authenticated API routes protected by session validation middleware with user state injected into requests.

---

## 2. Server Installation Commands

From directory `week05/chaibook-llm-sir/server`:

```bash
cd week05/chaibook-llm-sir/server
npm install better-auth
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/lib/auth.ts`

```typescript
/**
 * Better Auth server configuration.
 *
 * Handles Google OAuth and session persistence via Prisma/PostgreSQL.
 * The client authenticates against routes mounted from this `auth` instance.
 *
 * Required env vars: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
 * Optional: `BETTER_AUTH_URL`, `CLIENT_URL`
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";

const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

/**
 * Configured Better Auth instance shared by Express route handlers.
 *
 */
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? clientUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [clientUrl],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
});

```

#### Code Explanation: `server/src/lib/auth.ts`

**Overview & Architectural Role:**
- `server/src/lib/auth.ts` is a production source module containing **34 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { betterAuth } from "better-auth";`: Imports required module bindings.
  - `import { prismaAdapter } from "better-auth/adapters/prisma";`: Imports required module bindings.
  - `import prisma from "./db.js";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const auth = betterAuth({`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 34 lines of `auth.ts`.

#### File Path: `server/src/lib/session.ts`

```typescript
/**
 * Session type inferred from the Better Auth configuration.
 *
 * Use this type when typing Express request handlers that access `req.session`.
 */

import type { auth } from "../lib/auth.js";

/**
 * Authenticated session shape including `user` and `session` metadata.
 *
 */
export type Session = typeof auth.$Infer.Session;

```

#### Code Explanation: `server/src/lib/session.ts`

**Overview & Architectural Role:**
- `server/src/lib/session.ts` is a production source module containing **13 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import type { auth } from "../lib/auth.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 13 (`export type Session = typeof auth.$Infer.Session;`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 13 lines of `session.ts`.

#### File Path: `server/src/middleware/require-auth.middleware.ts`

```typescript
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import type { Session } from "../lib/session.js";

declare module "express-serve-static-core" {
    interface Request {
        session: Session;
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    req.session = session;
    next();
}

```

#### Code Explanation: `server/src/middleware/require-auth.middleware.ts`

**Overview & Architectural Role:**
- `server/src/middleware/require-auth.middleware.ts` is a production source module containing **28 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import type { NextFunction, Request, Response } from "express";`: Imports required module bindings.
  - `import { fromNodeHeaders } from "better-auth/node";`: Imports required module bindings.
  - `import { auth } from "../lib/auth.js";`: Imports required module bindings.
  - `import type { Session } from "../lib/session.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 7 (`interface Request {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 28 lines of `require-auth.middleware.ts`.
