
# Server Chapter 3 — Authentication & Session Management

## 1. Goal & Outcome

* **Goal:** Implement secure authentication and session validation using **Better Auth**, **Prisma/PostgreSQL**, and **Express middleware**.

* **Student Outcome:** Protected Express API routes can validate the authenticated user's Better Auth session and make the validated session available through `req.session`.

### What this chapter establishes

The authentication architecture has four main layers:

```text
Client
  │
  │ Authentication request / session cookie
  ▼
Better Auth
  │
  ├── Google OAuth
  ├── Session management
  └── Authentication APIs
  │
  ▼
Prisma Adapter
  │
  ▼
PostgreSQL
  │
  └── User / Session / Account / Verification
       
Express API
  │
  ▼
requireAuth Middleware
  │
  ├── Read request headers
  ├── Ask Better Auth for session
  ├── Reject unauthenticated requests
  └── Attach session to req.session
  │
  ▼
Protected Route
```

The important architectural idea is that **Express does not implement authentication itself**. Better Auth owns authentication and session logic, while Express middleware acts as the security boundary for protected API routes.

---

# 2. Server Installation Commands

From:

```bash
cd week05/chaibook-llm-sir/server
```

Install Better Auth:

```bash
npm install better-auth
```

### What this package provides

`better-auth` provides the server-side authentication framework used by this application.

In this chapter it is responsible for:

* Authentication configuration
* Session management
* Google OAuth integration
* Authentication API endpoints
* Database persistence through an adapter
* Session lookup

The application then integrates Better Auth with:

```text
Better Auth
    ↓
Prisma Adapter
    ↓
Prisma Client
    ↓
PostgreSQL
```

---

# 3. Authentication Configuration

## File Path

```text
server/src/lib/auth.ts
```

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

const clientUrl =
  process.env.CLIENT_URL ?? "http://localhost:3000";

/**
 * Configured Better Auth instance shared by Express route handlers.
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

---

# 4. Understanding `auth.ts`

## 4.1 Import Better Auth

```typescript
import { betterAuth } from "better-auth";
```

This imports the `betterAuth` factory function.

The function is used to create the application's configured Better Auth instance:

```typescript
const auth = betterAuth({...});
```

The returned object exposes authentication functionality that the rest of the server can use.

For example, the middleware later calls:

```typescript
auth.api.getSession(...)
```

to validate a session.

So this import is not simply a utility import — it is the entry point for creating the application's authentication system.

---

## 4.2 Import the Prisma Adapter

```typescript
import { prismaAdapter } from "better-auth/adapters/prisma";
```

Better Auth needs a way to persist authentication data.

This adapter connects Better Auth to the existing Prisma Client.

The resulting architecture is:

```text
Better Auth
     │
     ▼
prismaAdapter()
     │
     ▼
Prisma Client
     │
     ▼
PostgreSQL
```

This allows Better Auth to persist entities such as:

* Users
* Sessions
* Accounts
* Verification records

which correspond to the authentication models defined in the Prisma schema.

---

## 4.3 Import the Prisma Singleton

```typescript
import prisma from "./db.js";
```

This imports the application's shared Prisma Client instance.

The important point is that `auth.ts` does **not** create a second database client.

Instead:

```text
db.ts
  │
  └── Prisma Client
          │
          ▼
       auth.ts
          │
          ▼
   Better Auth Prisma Adapter
```

This keeps database access centralized.

---

# 5. Client URL Configuration

```typescript
const clientUrl =
  process.env.CLIENT_URL ?? "http://localhost:3000";
```

This reads the frontend application's URL from the environment.

For example:

```env
CLIENT_URL=https://app.example.com
```

If `CLIENT_URL` is not defined, the code falls back to:

```text
http://localhost:3000
```

The `??` operator is the **nullish coalescing operator**.

Conceptually:

```text
CLIENT_URL exists?
      │
   ┌──┴──┐
  Yes    No
   │      │
   ▼      ▼
 use it  localhost:3000
```

The value is later used for authentication origin configuration.

---

# 6. Creating the Better Auth Instance

```typescript
export const auth = betterAuth({
```

This creates the central Better Auth configuration.

The `export` is important because other server modules need access to the same configured instance.

For example:

```typescript
import { auth } from "../lib/auth.js";
```

The middleware can then call:

```typescript
auth.api.getSession(...)
```

Therefore, `auth` becomes the application's shared authentication service object.

---

# 7. Better Auth Base URL

```typescript
baseURL: process.env.BETTER_AUTH_URL ?? clientUrl,
```

This establishes the base URL Better Auth should use.

The code first checks:

```text
BETTER_AUTH_URL
```

and falls back to:

```text
CLIENT_URL
```

This allows different environments to use different authentication URLs.

For example:

```text
Development
BETTER_AUTH_URL → http://localhost:5000

Production
BETTER_AUTH_URL → https://api.example.com
```

The important distinction is that `BETTER_AUTH_URL` represents the authentication server's base URL, while `CLIENT_URL` represents the frontend origin.

---

# 8. Authentication Secret

```typescript
secret: process.env.BETTER_AUTH_SECRET,
```

Better Auth receives its server-side secret from the environment.

Example:

```env
BETTER_AUTH_SECRET=...
```

This secret is security-sensitive and should never be committed to source control.

It should be supplied through the deployment environment or secret manager.

---

# 9. Trusted Origins

```typescript
trustedOrigins: [clientUrl],
```

This tells Better Auth which frontend origin is trusted to interact with the authentication system.

For example:

```text
CLIENT_URL=https://app.example.com
```

results conceptually in:

```text
Trusted Origin
      │
      ▼
https://app.example.com
```

This is particularly important for browser-based authentication flows where the server needs to distinguish legitimate application origins from unexpected origins.

---

# 10. Connecting Better Auth to Prisma

```typescript
database: prismaAdapter(prisma, {
  provider: "postgresql",
}),
```

This is one of the most important integration points in the file.

The adapter receives the application's Prisma Client:

```typescript
prisma
```

and is configured for:

```text
PostgreSQL
```

The complete path becomes:

```text
Better Auth
     │
     ▼
prismaAdapter()
     │
     ▼
Prisma Client
     │
     ▼
PostgreSQL
```

This means authentication persistence is handled through the same database foundation established in Chapter 2.

---

# 11. Google OAuth Configuration

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
},
```

This enables Google as a social authentication provider.

The configuration requires two Google OAuth credentials:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

These values are supplied through environment variables.

---

## 11.1 Google Client ID

```typescript
clientId: process.env.GOOGLE_CLIENT_ID!,
```

The client ID identifies the application to Google's OAuth system.

The `!` is a TypeScript **non-null assertion operator**.

It tells TypeScript:

> Treat this value as non-null/non-undefined here.

It does **not** validate the environment variable at runtime.

Therefore:

```typescript
process.env.GOOGLE_CLIENT_ID!
```

does not magically create the value if the environment variable is missing.

For production systems, environment validation at application startup is preferable so configuration errors fail early and clearly.

---

## 11.2 Google Client Secret

```typescript
clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
```

This provides the OAuth client secret required for the server-side Google authentication flow.

Like the client ID, this value should remain server-side and must not be exposed to the browser.

---

# 12. `auth.ts` Execution Flow

When the module is loaded:

```text
auth.ts
  │
  ├── Import Better Auth
  │
  ├── Import Prisma adapter
  │
  ├── Import Prisma singleton
  │
  ├── Resolve CLIENT_URL
  │
  └── Create Better Auth instance
          │
          ├── Base URL
          ├── Secret
          ├── Trusted origins
          ├── Prisma/PostgreSQL database
          └── Google OAuth
```

The resulting `auth` object is then reused by Express authentication routes and middleware.

---

# 13. Session Type Definition

## File Path

```text
server/src/lib/session.ts
```

```typescript
/**
 * Session type inferred from the Better Auth configuration.
 *
 * Use this type when typing Express request handlers that access `req.session`.
 */

import type { auth } from "../lib/auth.js";

/**
 * Authenticated session shape including `user` and `session` metadata.
 */
export type Session = typeof auth.$Infer.Session;
```

---

# 14. Understanding `session.ts`

## 14.1 Type-only Import

```typescript
import type { auth } from "../lib/auth.js";
```

The `type` keyword tells TypeScript that this import is needed only for type information.

This is important because `session.ts` does not need to execute the `auth` object at runtime.

It only needs its TypeScript type.

Conceptually:

```text
auth configuration
       │
       ▼
TypeScript inference
       │
       ▼
Session type
```

---

# 15. Inferring the Better Auth Session Type

```typescript
export type Session = typeof auth.$Infer.Session;
```

This line avoids manually recreating the Better Auth session interface.

Instead, the type is derived directly from the configured `auth` object.

Breaking it down:

### `typeof auth`

Gets the TypeScript type of the `auth` object.

### `$Infer`

Better Auth exposes inferred types based on the configured authentication system.

### `.Session`

Selects the session type.

Therefore:

```typescript
typeof auth.$Infer.Session
```

means:

> Use the session shape inferred from this application's actual Better Auth configuration.

Then:

```typescript
export type Session = ...
```

gives that inferred type a reusable name.

---

# 16. Why Inferred Session Types Matter

Without this approach, developers might manually write something like:

```typescript
type Session = {
  user: ...;
  session: ...;
};
```

That creates a second source of truth.

The current approach instead uses:

```text
Better Auth Configuration
          │
          ▼
     Type Inference
          │
          ▼
      Session Type
          │
          ▼
 Express Request
```

If the authentication library's session shape changes, the application type can remain aligned with the configured Better Auth type.

---

# 17. Authentication Middleware

## File Path

```text
server/src/middleware/require-auth.middleware.ts
```

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

This middleware is the actual **authentication gate** for protected Express routes.

---

# 18. Express Type Imports

```typescript
import type { NextFunction, Request, Response } from "express";
```

These are Express types used to describe the middleware function.

### `Request`

Represents the incoming HTTP request.

### `Response`

Represents the outgoing HTTP response.

### `NextFunction`

Represents Express's function for continuing to the next middleware or route handler.

The `type` keyword indicates that these imports are used only by TypeScript.

---

# 19. Converting Node Headers for Better Auth

```typescript
import { fromNodeHeaders } from "better-auth/node";
```

Better Auth provides Node-specific helpers for integrating with Node/Express request objects.

The middleware receives headers through:

```typescript
req.headers
```

The helper converts those Node headers into the header representation expected by Better Auth.

The flow is:

```text
Express Request
      │
      ▼
req.headers
      │
      ▼
fromNodeHeaders()
      │
      ▼
Better Auth Headers
```

This is especially important because session authentication information is commonly carried through request headers/cookies.

---

# 20. Import the Auth Instance

```typescript
import { auth } from "../lib/auth.js";
```

The middleware uses the same Better Auth instance configured in `auth.ts`.

This is important because authentication configuration should remain centralized.

The middleware does not create a new authentication system.

It reuses:

```text
auth.ts
   │
   ▼
Configured Better Auth
   │
   ▼
requireAuth middleware
```

---

# 21. Import the Session Type

```typescript
import type { Session } from "../lib/session.js";
```

This provides the TypeScript type used when extending Express's `Request`.

It does not perform authentication itself.

It only tells TypeScript what shape `req.session` will have after authentication succeeds.

---

# 22. Extending Express's Request Type

```typescript
declare module "express-serve-static-core" {
  interface Request {
    session: Session;
  }
}
```

This is **TypeScript module augmentation**.

Express's default `Request` type does not know about the application's custom:

```typescript
req.session
```

property.

Without augmentation, TypeScript would complain when code tries to access:

```typescript
req.session
```

The augmentation adds:

```typescript
session: Session;
```

to Express's `Request` interface.

Therefore route handlers can safely use:

```typescript
req.session.user
```

after the authentication middleware has run.

---

# 23. Important Runtime vs TypeScript Distinction

The following code:

```typescript
declare module "express-serve-static-core" {
  interface Request {
    session: Session;
  }
}
```

changes **TypeScript's understanding** of the request.

It does not actually create the property at runtime.

The runtime assignment happens later:

```typescript
req.session = session;
```

This distinction is important:

```text
Module augmentation
        │
        ▼
Compile-time type information

req.session = session
        │
        ▼
Runtime property assignment
```

Both pieces are required for a clean TypeScript Express implementation.

---

# 24. Defining the Authentication Middleware

```typescript
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
```

The middleware is exported so it can be attached to protected routes.

It follows the normal Express middleware signature:

```text
req
res
next
```

The function is `async` because it needs to call Better Auth asynchronously:

```typescript
await auth.api.getSession(...)
```

The return type:

```typescript
Promise<void>
```

indicates that the asynchronous middleware does not return a meaningful value to Express.

Instead, it either:

1. Sends an HTTP response for an unauthenticated request, or
2. Calls `next()` to continue processing.

---

# 25. Retrieving the Current Session

```typescript
const session = await auth.api.getSession({
  headers: fromNodeHeaders(req.headers),
});
```

This is the central authentication operation.

The middleware asks Better Auth:

> Based on the credentials/session information contained in this request, is there a valid authenticated session?

The process is:

```text
Incoming Request
      │
      ▼
req.headers
      │
      ▼
fromNodeHeaders()
      │
      ▼
auth.api.getSession()
      │
      ├── Valid session
      │       │
      │       ▼
      │    session object
      │
      └── No valid session
              │
              ▼
           null/undefined
```

The middleware does not manually query the `Session` table.

Better Auth handles the session lookup and authentication logic.

---

# 26. Why `await` Is Required

```typescript
const session = await auth.api.getSession(...)
```

Session validation involves asynchronous work.

Depending on the authentication configuration, Better Auth may need to inspect persisted session information through the configured database layer.

Therefore the middleware waits for the result before deciding whether the request is authenticated.

---

# 27. Checking Authentication

```typescript
if (!session?.user) {
```

This verifies that the session contains an authenticated user.

The optional chaining operator:

```typescript
?.
```

allows the code to safely access `user` even when `session` is `null` or `undefined`.

Conceptually:

```text
session exists?
     │
  ┌──┴──┐
 Yes    No
  │      │
  ▼      ▼
user?   Unauthorized
```

If there is no valid authenticated user, the request must not reach the protected route.

---

# 28. Returning HTTP 401

```typescript
res.status(401).json({
  error: "Unauthorized",
});
```

The server returns:

```text
HTTP 401 Unauthorized
```

This is the appropriate response when the request does not have a valid authenticated session.

The response body is:

```json
{
  "error": "Unauthorized"
}
```

The middleware stops the request before the protected route executes.

---

# 29. Why `return` Matters

```typescript
return;
```

After sending the 401 response, the middleware must stop execution.

Without returning, execution could continue to:

```typescript
req.session = session;
next();
```

which would be incorrect.

The control flow is therefore:

```text
Session invalid
     │
     ▼
Send 401
     │
     ▼
return
     │
     X
Protected route never executes
```

---

# 30. Injecting the Session into the Request

```typescript
req.session = session;
```

At this point the middleware has verified that an authenticated session exists.

It stores the validated session on the Express request.

This creates the bridge between authentication and application business logic.

```text
Better Auth
     │
     │ validated session
     ▼
requireAuth
     │
     ▼
req.session
     │
     ▼
Protected Controller
```

A protected route can then access the authenticated user's information without performing the authentication lookup again.

---

# 31. Calling `next()`

```typescript
next();
```

Calling `next()` tells Express:

> Authentication succeeded; continue processing this request.

For example:

```typescript
router.get(
  "/profile",
  requireAuth,
  getProfile,
);
```

The execution order becomes:

```text
GET /profile
     │
     ▼
requireAuth
     │
     ├── Unauthorized → 401
     │
     └── Authenticated
             │
             ▼
        req.session set
             │
             ▼
        getProfile()
```

This is the key reason middleware is useful as an authentication boundary.

---

# 32. Complete Authentication Flow

The complete request lifecycle is:

```text
                    ┌──────────────────────┐
                    │        Client        │
                    └──────────┬───────────┘
                               │
                               │ Request
                               │ + auth/session data
                               ▼
                    ┌──────────────────────┐
                    │   Express Router     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     requireAuth      │
                    │      middleware      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ auth.api.getSession  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Better Auth      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Prisma PostgreSQL   │
                    │ User / Session data  │
                    └──────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                  Invalid              Valid
                     │                   │
                     ▼                   ▼
                  HTTP 401          req.session
                                         │
                                         ▼
                                   next()
                                         │
                                         ▼
                                  Protected Route
```

---

# 33. Authentication Responsibilities by File

| File                                        | Responsibility                                             |
| ------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/auth.ts`                           | Creates and configures Better Auth                         |
| `src/lib/db.ts`                             | Provides shared Prisma Client                              |
| `src/lib/session.ts`                        | Derives reusable session TypeScript type                   |
| `src/middleware/require-auth.middleware.ts` | Validates sessions and protects routes                     |
| `prisma/schema.prisma`                      | Defines persisted authentication entities                  |
| PostgreSQL                                  | Stores users, sessions, accounts, and verification records |

This separation keeps authentication configuration, database access, type definitions, and request authorization from becoming one large module.

---

# 34. Authentication Data Flow

The database relationship from Chapter 2 supports the authentication layer:

```text
User
 ├── Session[]
 └── Account[]
```

Conceptually:

```text
User
 │
 ├──────────────► Session
 │
 └──────────────► Account
```

A typical Google authentication flow can therefore result in:

```text
Google OAuth
     │
     ▼
Better Auth
     │
     ├── User
     ├── Account
     └── Session
             │
             ▼
       PostgreSQL
```

Later API requests can use the session to identify the authenticated user.

---

# 35. Protecting Express Routes

The middleware is designed to be placed before protected handlers.

Example:

```typescript
router.get(
  "/workspaces",
  requireAuth,
  listWorkspaces,
);
```

The route pipeline becomes:

```text
Request
   │
   ▼
requireAuth
   │
   ├── 401 → stop
   │
   └── authenticated
          │
          ▼
    listWorkspaces
```

Inside the protected handler:

```typescript
req.session.user
```

can be used to identify the authenticated user.

---

# 36. Security Boundary

`requireAuth` should be treated as an **authorization boundary**, not merely a convenience helper.

Any endpoint containing user-specific or private data should ensure that authentication is enforced before executing business logic.

For example:

```text
Public Route
    │
    └── No authentication required

Protected Route
    │
    └── requireAuth
           │
           └── Business logic
```

Authentication should happen before querying or modifying user-owned resources.

---

# 37. Important Production Considerations

## 37.1 Validate Required Environment Variables

The current configuration uses:

```typescript
process.env.BETTER_AUTH_SECRET
process.env.GOOGLE_CLIENT_ID
process.env.GOOGLE_CLIENT_SECRET
```

The Google values use:

```typescript
!
```

which is only a TypeScript assertion.

It is better for production startup configuration to be validated explicitly so missing credentials result in a clear startup error rather than a later authentication failure.

---

## 37.2 Keep OAuth Secrets Server-Side

The following values must remain server-side:

```text
BETTER_AUTH_SECRET
GOOGLE_CLIENT_SECRET
```

They should never be exposed to frontend JavaScript or committed to Git.

---

## 37.3 Do Not Confuse Authentication With Authorization

`requireAuth` establishes:

> Who is this user?

It does not automatically establish:

> Is this user allowed to access this particular workspace/resource?

For example:

```text
Authentication
     │
     ▼
User = abc123
     │
     ▼
Authorization
     │
     ▼
Does abc123 own workspace XYZ?
```

The second check belongs to resource-level authorization/business logic.

---

## 37.4 Session Validation Happens Before Protected Logic

The intended order is:

```text
Request
  ↓
Authentication
  ↓
Authorization
  ↓
Business Logic
  ↓
Database / AI / RAG operations
```

Not:

```text
Request
  ↓
Database operation
  ↓
Check authentication
```

Authentication should happen before sensitive operations.

---

# 38. Chapter Summary

Chapter 3 establishes the application's authentication boundary using Better Auth and Express middleware.

The architecture is:

```text
                 Better Auth
                      │
          ┌───────────┴───────────┐
          │                       │
      Google OAuth           Session API
          │                       │
          └───────────┬───────────┘
                      │
                Prisma Adapter
                      │
                      ▼
                 PostgreSQL
                      │
              User / Account /
             Session / Verification
                      
Express Request
       │
       ▼
 requireAuth
       │
       ▼
getSession()
       │
 ┌─────┴─────┐
 │           │
Invalid     Valid
 │           │
 ▼           ▼
401       req.session
             │
             ▼
           next()
             │
             ▼
      Protected API Route
```

### Key concepts learned

* **Better Auth** centralizes authentication and session management.
* **Prisma Adapter** connects Better Auth to the existing PostgreSQL/Prisma layer.
* **Google OAuth** provides social authentication.
* **`auth.api.getSession()`** validates the incoming session.
* **`fromNodeHeaders()`** adapts Express/Node request headers for Better Auth.
* **Module augmentation** adds `session` to Express's TypeScript `Request`.
* **`auth.$Infer.Session`** derives the session type from the Better Auth configuration.
* **`requireAuth`** acts as the reusable authentication middleware.
* **`req.session`** makes the validated session available to downstream handlers.
* **HTTP 401** stops unauthenticated requests before protected business logic executes.

The most important mental model is:

```text
Authenticate
     ↓
Identify User
     ↓
Authorize Resource
     ↓
Execute Business Logic
```

Authentication answers **“Who are you?”** while authorization answers **“Are you allowed to do this?”**

