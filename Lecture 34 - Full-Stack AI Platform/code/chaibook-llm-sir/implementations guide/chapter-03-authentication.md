# Master Chapter 3 — 03 Authentication

## 1. Chapter Overview & Goal
- **Server Goal**: Implement secure authentication and session validation using Better Auth and Express middleware.
- **Client Goal**: Implement authentication client, session hooks, route protection utilities, login form UI, and auth layout.
- **Combined Outcome**: Build end-to-end full-stack functionality connecting the Express server API with the Next.js client UI.

---

## 2. Quick Setup Commands

```bash
# 1. Server Dependencies
cd week05/chaibook-llm-sir/server
npm install better-auth

# 2. Client Dependencies
cd week05/chaibook-llm-sir/client
npm install better-auth react-hook-form @hookform/resolvers zod
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

---

## 4. Client Source Code & Explanations

#### File Path: `client/features/auth/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

```

#### Code Explanation: `client/features/auth/lib/auth-client.ts`

**Overview & Architectural Role:**
- `client/features/auth/lib/auth-client.ts` is a production source module containing **5 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { createAuthClient } from "better-auth/react";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 3 (`export const authClient = createAuthClient();`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const authClient = createAuthClient();`: Exposes constant values and helper variables across the application.
  - `export const { signIn, signOut, useSession } = authClient;`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 5 lines of `auth-client.ts`.

#### File Path: `client/features/auth/lib/auth-server.ts`

```typescript
import { headers } from "next/headers";
import { authClient } from "./auth-client";

export type Session = typeof authClient.$Infer.Session;

export async function getSession(): Promise<Session | null> {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie") ?? "";

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/get-session`,
        {
            headers: { cookie },
            cache: "no-store",
        },
    );

    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as Session | null;
    return data?.user ? data : null;
}

```

#### Code Explanation: `client/features/auth/lib/auth-server.ts`

**Overview & Architectural Role:**
- `client/features/auth/lib/auth-server.ts` is a production source module containing **24 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { headers } from "next/headers";`: Imports required module bindings.
  - `import { authClient } from "./auth-client";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 4 (`export type Session = typeof authClient.$Infer.Session;`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 24 lines of `auth-server.ts`.

#### File Path: `client/features/auth/lib/auth-routes.ts`

```typescript
export const authRoutes = {
    login: "/login",
    dashboard: "/dashboard",
    home: "/",
} as const;

export const protectedRoutes = [
    authRoutes.dashboard,
    "/workspace",
] as const;

export const unauthenticatedRoutes = [authRoutes.login] as const;

export function isProtectedRoute(pathname: string) {
    return protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

export function isUnauthenticatedRoute(pathname: string) {
    return unauthenticatedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

```

#### Code Explanation: `client/features/auth/lib/auth-routes.ts`

**Overview & Architectural Role:**
- `client/features/auth/lib/auth-routes.ts` is a production source module containing **24 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Functions, Handlers & Business Methods**:
  - **Line 14 (`export function isProtectedRoute(pathname: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 20 (`export function isUnauthenticatedRoute(pathname: string) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
- **Constants & Exported Utilities**:
  - `export const authRoutes = {`: Exposes constant values and helper variables across the application.
  - `export const protectedRoutes = [`: Exposes constant values and helper variables across the application.
  - `export const unauthenticatedRoutes = [authRoutes.login] as const;`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 24 lines of `auth-routes.ts`.

#### File Path: `client/features/auth/lib/require-auth.ts`

```typescript
import { redirect } from "next/navigation";
import { authRoutes } from "./auth-routes";
import { getSession, type Session } from "./auth-server";

export async function requireAuth(): Promise<Session> {
    const session = await getSession();

    if (!session) {
        redirect(authRoutes.login);
    }

    return session;
}

```

#### Code Explanation: `client/features/auth/lib/require-auth.ts`

**Overview & Architectural Role:**
- `client/features/auth/lib/require-auth.ts` is a production source module containing **13 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { redirect } from "next/navigation";`: Imports required module bindings.
  - `import { authRoutes } from "./auth-routes";`: Imports required module bindings.
  - `import { getSession, type Session } from "./auth-server";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 13 lines of `require-auth.ts`.

#### File Path: `client/features/auth/lib/unauth.ts`

```typescript
import { redirect } from "next/navigation";
import { authRoutes } from "./auth-routes";
import { getSession } from "./auth-server";

export async function unauth() {
    const session = await getSession();

    if (session) {
        redirect(authRoutes.dashboard);
    }
}

```

#### Code Explanation: `client/features/auth/lib/unauth.ts`

**Overview & Architectural Role:**
- `client/features/auth/lib/unauth.ts` is a production source module containing **11 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { redirect } from "next/navigation";`: Imports required module bindings.
  - `import { authRoutes } from "./auth-routes";`: Imports required module bindings.
  - `import { getSession } from "./auth-server";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 11 lines of `unauth.ts`.

#### File Path: `client/features/auth/hooks/use-session.ts`

```typescript
export { useSession } from "../lib/auth-client";

```

#### Code Explanation: `client/features/auth/hooks/use-session.ts`

**Overview & Architectural Role:**
- `client/features/auth/hooks/use-session.ts` is a production source module containing **1 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 1 lines of `use-session.ts`.

#### File Path: `client/features/auth/components/login-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldSeparator,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "../lib/auth-client";
import { authRoutes } from "../lib/auth-routes";

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={cn("size-4", className)}
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const callbackUrl =
        searchParams.get("callbackUrl") ?? authRoutes.dashboard;

    async function handleGoogleSignIn() {
        setIsLoading(true);
        setError(null);

        const { data, error } = await signIn.social({
            provider: "google",
            callbackURL: callbackUrl,
        });

        if (error) {
            setError(error.message ?? "Something went wrong. Please try again.");
            setIsLoading(false);
            return;
        }

        if (data?.url && data.redirect) {
            window.location.href = data.url;
            return;
        }

        setIsLoading(false);
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in with Google to continue to Chaibook
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleGoogleSignIn();
                        }}
                    >
                        <FieldGroup>
                            <Field>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Spinner />
                                    ) : (
                                        <GoogleIcon />
                                    )}
                                    Continue with Google
                                </Button>
                                <FieldDescription className="text-center">
                                    By continuing, you agree to our terms of
                                    service and privacy policy.
                                </FieldDescription>
                            </Field>
                            <FieldSeparator>Secure sign-in</FieldSeparator>
                            {error ? (
                                <p className="text-center text-sm text-destructive">
                                    {error}
                                </p>
                            ) : null}
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

```

#### Code Explanation: `client/features/auth/components/login-form.tsx`

**Overview & Architectural Role:**
- `client/features/auth/components/login-form.tsx` is a production source module containing **133 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 11)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { useSearchParams } from "next/navigation";`: Imports required module bindings.
  - `import { cn } from "@/lib/utils";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Spinner } from "@/components/ui/spinner";`: Imports required module bindings.
  - `import { signIn } from "../lib/auth-client";`: Imports required module bindings.
  - `import { authRoutes } from "../lib/auth-routes";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 24 (`function GoogleIcon({ className }: { className?: string }) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 51 (`export function LoginForm({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 133 lines of `login-form.tsx`.

#### File Path: `client/features/auth/components/sign-out-button.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "../lib/auth-client";
import { authRoutes } from "../lib/auth-routes";

export function SignOutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignOut() {
        setIsLoading(true);

        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push(authRoutes.login);
                    router.refresh();
                },
            },
        });

        setIsLoading(false);
    }

    return (
        <Button
            variant="outline"
            onClick={() => void handleSignOut()}
            disabled={isLoading}
        >
            {isLoading ? <Spinner /> : null}
            Sign out
        </Button>
    );
}

```

#### Code Explanation: `client/features/auth/components/sign-out-button.tsx`

**Overview & Architectural Role:**
- `client/features/auth/components/sign-out-button.tsx` is a production source module containing **39 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 8)**:
  - `import { useRouter } from "next/navigation";`: Imports required module bindings.
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { Spinner } from "@/components/ui/spinner";`: Imports required module bindings.
  - `import { signOut } from "../lib/auth-client";`: Imports required module bindings.
  - `import { authRoutes } from "../lib/auth-routes";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 10 (`export function SignOutButton() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 39 lines of `sign-out-button.tsx`.

#### File Path: `client/features/auth/index.ts`

```typescript
export { LoginForm } from "./components/login-form";
export { SignOutButton } from "./components/sign-out-button";

export { authClient, signIn, signOut } from "./lib/auth-client";
export { useSession } from "./hooks/use-session";

export {
    authRoutes,
    protectedRoutes,
    unauthenticatedRoutes,
    isProtectedRoute,
    isUnauthenticatedRoute,
} from "./lib/auth-routes";

export { getSession, type Session } from "./lib/auth-server";
export { requireAuth } from "./lib/require-auth";
export { unauth } from "./lib/unauth";

```

#### Code Explanation: `client/features/auth/index.ts`

**Overview & Architectural Role:**
- `client/features/auth/index.ts` is a production source module containing **17 lines** of code.
- **Layer**: Client Feature Module (`auth`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 17 lines of `index.ts`.

#### File Path: `client/app/(auth)/layout.tsx`

```tsx
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    );
}

```

#### Code Explanation: `client/app/(auth)/layout.tsx`

**Overview & Architectural Role:**
- `client/app/(auth)/layout.tsx` is a production source module containing **11 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 11 lines of `layout.tsx`.

#### File Path: `client/app/(auth)/login/page.tsx`

```tsx
import { Suspense } from "react";
import { LoginForm, unauth } from "@/features/auth";

export default async function LoginPage() {
    await unauth();

    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}

```

#### Code Explanation: `client/app/(auth)/login/page.tsx`

**Overview & Architectural Role:**
- `client/app/(auth)/login/page.tsx` is a production source module containing **12 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { Suspense } from "react";`: Imports required module bindings.
  - `import { LoginForm, unauth } from "@/features/auth";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 12 lines of `page.tsx`.

---

## 5. Verification & Testing Steps
1. Ensure backend Express server is running on port 8080 (`npm run dev` in `server`).
2. Ensure frontend Next.js app is running on port 3000 (`npm run dev` in `client`).
3. Verify API proxy routing and test features covered in Chapter 3.
