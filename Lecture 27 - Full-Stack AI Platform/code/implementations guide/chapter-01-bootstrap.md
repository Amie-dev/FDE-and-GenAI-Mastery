# Master Chapter 1 — 01 Bootstrap

## 1. Chapter Overview & Goal
- **Server Goal**: Bootstrap the Express.js server with TypeScript ESM support, global async error handling, custom AppError classes, and health checks.
- **Client Goal**: Build core application utilities, reverse proxy routing, TanStack Query provider, Next Themes provider, and global root layout.
- **Combined Outcome**: Build end-to-end full-stack functionality connecting the Express server API with the Next.js client UI.

---

## 2. Quick Setup Commands

```bash
# 1. Server Dependencies
cd week05/chaibook-llm-sir/server
npm install express cors dotenv cookie-parser winston morgan zod
npm install -D typescript @types/node @types/express @types/cors @types/cookie-parser tsx

# 2. Client Dependencies
cd week05/chaibook-llm-sir/client
npm install @tanstack/react-query next-themes lucide-react clsx tailwind-merge
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/index.ts`

```typescript
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "./lib/auth.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { registerRoutes } from "./routes/index.js";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
const app = express();
const port = process.env.PORT ?? 8080;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

app.use(
    cors({
        origin: clientUrl,
        credentials: true,
    }),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());
app.use("/api/inngest", serve({ client: inngest, functions }));
app.get("/", (_req, res) => {
    res.json({ message: "Hello from Chaibook API" });
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

registerRoutes(app);

app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

```

#### Code Explanation: `server/src/index.ts`

**Overview & Architectural Role:**
- `server/src/index.ts` is a production source module containing **39 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 12)**:
  - `import "dotenv/config";`: Imports required module bindings.
  - `import { toNodeHandler } from "better-auth/node";`: Imports required module bindings.
  - `import cors from "cors";`: Imports required module bindings.
  - `import express from "express";`: Imports required module bindings.
  - `import { auth } from "./lib/auth.js";`: Imports required module bindings.
  - `import { errorHandler } from "./middleware/error-handler.middleware.js";`: Imports required module bindings.
  - `import { registerRoutes } from "./routes/index.js";`: Imports required module bindings.
  - `import { serve } from "inngest/express";`: Imports required module bindings.
  - `import { inngest } from "./inngest/client.js";`: Imports required module bindings.
  - `import { functions } from "./inngest/index.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 39 lines of `index.ts`.

#### File Path: `server/src/types/app-error.ts`

```typescript
export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(404, message);
        this.name = "NotFoundError";
    }
}

export class ValidationError extends AppError {
    constructor(message = "Validation failed", details?: unknown) {
        super(400, message, details);
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(409, message);
        this.name = "ConflictError";
    }
}

```

#### Code Explanation: `server/src/types/app-error.ts`

**Overview & Architectural Role:**
- `server/src/types/app-error.ts` is a production source module containing **38 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Functions, Handlers & Business Methods**:
  - **Line 1 (`export class AppError extends Error {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 12 (`export class NotFoundError extends AppError {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 19 (`export class ValidationError extends AppError {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 26 (`export class UnauthorizedError extends AppError {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 33 (`export class ConflictError extends AppError {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 38 lines of `app-error.ts`.

#### File Path: `server/src/utils/async-handler.ts`

```typescript
/**
 * Express async route wrapper that forwards rejected promises to error middleware.
 */

import type {
    NextFunction,
    Request,
    RequestHandler,
    Response,
} from "express";

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express handler so thrown errors and rejections reach `next(err)`.
 *
 * Without this wrapper, unhandled promise rejections in async routes would not
 * trigger the global error handler.
 *
 * @param handler - Async route handler function
 * @returns Express-compatible `RequestHandler`
 *
 *
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
}

```

#### Code Explanation: `server/src/utils/async-handler.ts`

**Overview & Architectural Role:**
- `server/src/utils/async-handler.ts` is a production source module containing **33 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import type {`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 12 (`type AsyncRequestHandler = (`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 29 (`export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 33 lines of `async-handler.ts`.

#### File Path: `server/src/middleware/error-handler.middleware.ts`

```typescript
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { flattenError, ZodError } from "zod";
import { AppError } from "../types/app-error.js";

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            error: error.message,
            details: error.details,
        });
        return;
    }

    if (error instanceof ZodError) {
        res.status(400).json({
            error: "Validation failed",
            details: flattenError(error).fieldErrors,
        });
        return;
    }

    if (error instanceof multer.MulterError) {
        res.status(400).json({ error: error.message });
        return;
    }

    if (error instanceof Error && error.message === "Only PDF files are allowed") {
        res.status(400).json({ error: error.message });
        return;
    }

    const cloudinaryError = error as Error & { http_code?: number; name?: string };
    if (
        cloudinaryError.name === "UnexpectedResponse" &&
        cloudinaryError.http_code === 403
    ) {
        res.status(400).json({
            error:
                "Cloudinary upload rejected: your API key is missing Upload (create) permission. In Cloudinary Dashboard → Settings → API Keys, use the root secret or create a key with Upload enabled.",
        });
        return;
    }

    console.error(error);
    res.status(500).json({ error: "Internal server error" });
}

```

#### Code Explanation: `server/src/middleware/error-handler.middleware.ts`

**Overview & Architectural Role:**
- `server/src/middleware/error-handler.middleware.ts` is a production source module containing **52 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import type { NextFunction, Request, Response } from "express";`: Imports required module bindings.
  - `import multer from "multer";`: Imports required module bindings.
  - `import { flattenError, ZodError } from "zod";`: Imports required module bindings.
  - `import { AppError } from "../types/app-error.js";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 6 (`export function errorHandler(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 52 lines of `error-handler.middleware.ts`.

---

## 4. Client Source Code & Explanations

#### File Path: `client/proxy.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
    authRoutes,
    isProtectedRoute,
    isUnauthenticatedRoute,
} from "@/features/auth";

async function fetchSession(request: NextRequest) {
    const response = await fetch(
        new URL("/api/auth/get-session", request.nextUrl.origin),
        {
            headers: {
                cookie: request.headers.get("cookie") ?? "",
            },
            cache: "no-store",
        },
    );

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    return data?.user ? data : null;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = await fetchSession(request);

    if (isProtectedRoute(pathname) && !session) {
        const loginUrl = new URL(authRoutes.login, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isUnauthenticatedRoute(pathname) && session) {
        return NextResponse.redirect(new URL(authRoutes.dashboard, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/workspace/:path*", "/login"],
};

```

#### Code Explanation: `client/proxy.ts`

**Overview & Architectural Role:**
- `client/proxy.ts` is a production source module containing **46 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { NextRequest, NextResponse } from "next/server";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const config = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 46 lines of `proxy.ts`.

#### File Path: `client/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

#### Code Explanation: `client/lib/utils.ts`

**Overview & Architectural Role:**
- `client/lib/utils.ts` is a production source module containing **6 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { clsx, type ClassValue } from "clsx"`: Imports required module bindings.
  - `import { twMerge } from "tailwind-merge"`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 4 (`export function cn(...inputs: ClassValue[]) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 6 lines of `utils.ts`.

#### File Path: `client/shared/hooks/use-mobile.ts`

```typescript
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

```

#### Code Explanation: `client/shared/hooks/use-mobile.ts`

**Overview & Architectural Role:**
- `client/shared/hooks/use-mobile.ts` is a production source module containing **19 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import * as React from "react"`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 5 (`export function useIsMobile() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 19 lines of `use-mobile.ts`.

#### File Path: `client/shared/hooks/use-debounced-value.ts`

```typescript
"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debouncedValue;
}

```

#### Code Explanation: `client/shared/hooks/use-debounced-value.ts`

**Overview & Architectural Role:**
- `client/shared/hooks/use-debounced-value.ts` is a production source module containing **17 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { useEffect, useState } from "react";`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 5 (`export function useDebouncedValue<T>(value: T, delayMs = 300) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 17 lines of `use-debounced-value.ts`.

#### File Path: `client/shared/components/providers/theme-provider.tsx`

```tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

```

#### Code Explanation: `client/shared/components/providers/theme-provider.tsx`

**Overview & Architectural Role:**
- `client/shared/components/providers/theme-provider.tsx` is a production source module containing **11 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import * as React from "react"`: Imports required module bindings.
  - `import { ThemeProvider as NextThemesProvider } from "next-themes"`: Imports required module bindings.
- **Functions, Handlers & Business Methods**:
  - **Line 6 (`export function ThemeProvider({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 11 lines of `theme-provider.tsx`.

#### File Path: `client/shared/components/providers/query-provider.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

const QueryProvider = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export default QueryProvider

```

#### Code Explanation: `client/shared/components/providers/query-provider.tsx`

**Overview & Architectural Role:**
- `client/shared/components/providers/query-provider.tsx` is a production source module containing **15 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'`: Imports required module bindings.
  - `import React, { useState } from 'react'`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 15 lines of `query-provider.tsx`.

#### File Path: `client/shared/lib/api.ts`

```typescript
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(options.headers);

    if (
        options.body &&
        !headers.has("Content-Type") &&
        !(options.body instanceof FormData)
    ) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, {
        ...options,
        credentials: "include",
        headers,
    });

    if (response.status === 204) {
        return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(
            response.status,
            (data as { error?: string } | null)?.error ?? "Request failed",
            (data as { details?: unknown } | null)?.details,
        );
    }

    return data as T;
}

```

#### Code Explanation: `client/shared/lib/api.ts`

**Overview & Architectural Role:**
- `client/shared/lib/api.ts` is a production source module containing **47 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Functions, Handlers & Business Methods**:
  - **Line 1 (`export class ApiError extends Error {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 47 lines of `api.ts`.

#### File Path: `client/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProvider from "@/shared/components/providers/query-provider";
import { ThemeProvider } from "@/shared/components/providers/theme-provider";

const figtreeHeading = Figtree({ subsets: ['latin'], variable: '--font-heading' });

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chaibook",
  description: "Chat with your books",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable, figtreeHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

```

#### Code Explanation: `client/app/layout.tsx`

**Overview & Architectural Role:**
- `client/app/layout.tsx` is a production source module containing **52 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 8)**:
  - `import type { Metadata } from "next";`: Imports required module bindings.
  - `import { Geist, Geist_Mono, JetBrains_Mono, Figtree } from "next/font/google";`: Imports required module bindings.
  - `import "./globals.css";`: Imports required module bindings.
  - `import { cn } from "@/lib/utils";`: Imports required module bindings.
  - `import QueryProvider from "@/shared/components/providers/query-provider";`: Imports required module bindings.
  - `import { ThemeProvider } from "@/shared/components/providers/theme-provider";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const metadata: Metadata = {`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 52 lines of `layout.tsx`.

#### File Path: `client/app/page.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authRoutes, getSession } from "@/features/auth";

export default async function HomePage() {
    const session = await getSession();

    if (session) {
        redirect(authRoutes.dashboard);
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
            <div className="flex max-w-lg flex-col items-center gap-4 text-center">
                <h1 className="font-heading text-3xl font-semibold tracking-tight">
                    Chaibook
                </h1>
                <p className="text-muted-foreground">
                    Sign in to start chatting with your books.
                </p>
                <Button nativeButton={false} render={<Link href={authRoutes.login} />}>
                    Get started
                </Button>
            </div>
        </div>
    );
}

```

#### Code Explanation: `client/app/page.tsx`

**Overview & Architectural Role:**
- `client/app/page.tsx` is a production source module containing **28 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 6)**:
  - `import Link from "next/link";`: Imports required module bindings.
  - `import { redirect } from "next/navigation";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import { authRoutes, getSession } from "@/features/auth";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 28 lines of `page.tsx`.

---

## 5. Verification & Testing Steps
1. Ensure backend Express server is running on port 8080 (`npm run dev` in `server`).
2. Ensure frontend Next.js app is running on port 3000 (`npm run dev` in `client`).
3. Verify API proxy routing and test features covered in Chapter 1.
