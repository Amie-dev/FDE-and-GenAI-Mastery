
#  Server Chapter 1 — Project Bootstrap & Core Architecture

## 1. Goal & Outcome

### 🎯 Goal

Bootstrap the Express.js backend with:

* TypeScript + ESM support
* Environment variable loading
* CORS configuration
* Better Auth integration
* Inngest integration
* Centralized route registration
* Custom application errors
* Async error forwarding
* Global error-handling middleware
* Health-check endpoints
* Server startup

The main objective is to create a **clean request-processing pipeline** before implementing the application's business logic.

### 🎓 Student Outcome

After completing this chapter, you should understand:

1. How an Express server starts.
2. How middleware is registered.
3. Why middleware order matters.
4. How authentication handlers are mounted.
5. How routes are registered separately from `index.ts`.
6. How asynchronous errors reach a global error handler.
7. Why custom error classes are useful.
8. How different error types are converted into HTTP responses.
9. How the server exposes health-check endpoints.

---

# 2. Server Installation Commands

From:

```text
week05/chaibook-llm-sir/server
```

run:

```bash
cd week05/chaibook-llm-sir/server
```

Install runtime dependencies:

```bash
npm install express cors dotenv cookie-parser winston morgan zod
```

Install development dependencies:

```bash
npm install -D typescript @types/node @types/express @types/cors @types/cookie-parser tsx
```

---

## 2.1 Runtime vs Development Dependencies

There are two different installation groups.

### Runtime dependencies

```bash
npm install express cors dotenv cookie-parser winston morgan zod
```

These packages provide functionality required by the application.

For example:

```text
Express     → HTTP server
CORS        → Cross-origin requests
dotenv      → Environment variables
cookie-parser → Cookies
winston     → Logging
morgan      → HTTP request logging
zod         → Input validation
```

### Development dependencies

```bash
npm install -D typescript @types/node @types/express @types/cors @types/cookie-parser tsx
```

These packages mainly support development and TypeScript.

For example:

```text
TypeScript → Type checking / compilation
tsx        → Run TypeScript during development
@types/*   → Type definitions
```

The distinction is:

```text
                Dependencies
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
       Runtime               Development
          │                     │
          ▼                     ▼
     Express, Zod          TypeScript, tsx
     CORS, dotenv          @types/*
```

---

# 3. Core Server Architecture

Before looking at individual files, understand the overall architecture.

The server starts from:

```text
src/index.ts
```

and connects the major server components:

```text
                    HTTP Request
                         │
                         ▼
                 ┌──────────────┐
                 │   Express    │
                 │     App      │
                 └──────┬───────┘
                        │
                        ▼
                 CORS Middleware
                        │
                        ▼
                Authentication
                        │
                        ▼
                JSON Body Parser
                        │
                        ▼
               Inngest Endpoints
                        │
                        ▼
                  Basic Routes
                        │
                        ▼
                Application Routes
                        │
                        ▼
                Error Middleware
                        │
                        ▼
                    Response
```

The most important concept is that **Express processes middleware and routes in registration order**.

Therefore, this:

```typescript
app.use(cors(...));
app.use(express.json());
registerRoutes(app);
app.use(errorHandler);
```

is not arbitrary.

The order determines how requests travel through the application.

---

# 4. `server/src/index.ts`

## Complete Source Code

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

const clientUrl =
  process.env.CLIENT_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);

app.all("/api/auth/*any", toNodeHandler(auth));

app.use(express.json());

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  }),
);

app.get("/", (_req, res) => {
  res.json({
    message: "Hello from Chaibook API",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

registerRoutes(app);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

---

# 5. Importing Environment Variables

```typescript
import "dotenv/config";
```

This import loads environment variables from the `.env` file.

For example, the project may have:

```env
PORT=8080
CLIENT_URL=http://localhost:3000
DATABASE_URL=...
```

After loading dotenv, these values become accessible through:

```typescript
process.env.PORT
process.env.CLIENT_URL
process.env.DATABASE_URL
```

### Why is this important?

Configuration such as:

* database URLs
* API keys
* ports
* frontend URLs
* authentication secrets

should not be hard-coded into application source code.

The architecture becomes:

```text
.env
 │
 ▼
dotenv
 │
 ▼
process.env
 │
 ├── PORT
 ├── CLIENT_URL
 ├── DATABASE_URL
 └── other configuration
```

This allows different environments to use different configuration values.

For example:

```text
Development → localhost
Production  → production domain
```

without changing the application source code.

---

# 6. Better Auth Node Handler

```typescript
import { toNodeHandler } from "better-auth/node";
```

`toNodeHandler` adapts the Better Auth system so that it can work with a Node.js HTTP framework such as Express.

The actual authentication configuration is imported separately:

```typescript
import { auth } from "./lib/auth.js";
```

So there are two responsibilities:

```text
auth
 │
 └── Authentication configuration


toNodeHandler
 │
 └── Adapts authentication to Node.js HTTP handling
```

This separation keeps authentication configuration away from the main server bootstrap file.

---

# 7. Importing CORS

```typescript
import cors from "cors";
```

CORS middleware controls which browser origins are allowed to communicate with the API.

For example:

```text
Frontend
http://localhost:3000
        │
        │ API Request
        ▼
Backend
http://localhost:8080
```

These are different origins because their ports differ.

CORS allows the backend to explicitly control whether such requests are accepted.

---

# 8. Importing Express

```typescript
import express from "express";
```

Express is the HTTP application framework.

It provides the core APIs used in this file:

```typescript
express()
app.use()
app.get()
app.all()
app.listen()
```

The application therefore uses Express as the central HTTP request-processing layer.

---

# 9. Importing the Application Error Handler

```typescript
import { errorHandler } from "./middleware/error-handler.middleware.js";
```

This imports the global error-handling middleware.

It will eventually handle errors generated by:

* application routes
* validation
* file uploads
* custom application errors
* other unexpected failures

The important architectural principle is:

```text
Routes
   │
   │ error
   ▼
Global Error Handler
   │
   ▼
HTTP Error Response
```

Instead of every controller having to manually format errors, the application centralizes that responsibility.

---

# 10. Importing Routes

```typescript
import { registerRoutes } from "./routes/index.js";
```

This function is responsible for registering application-specific routes.

Instead of putting every route directly inside `index.ts`, the project separates them.

For example, conceptually:

```text
src/routes/
├── auth.routes.ts
├── book.routes.ts
├── chat.routes.ts
└── index.ts
```

Then:

```typescript
registerRoutes(app);
```

connects those routes to the Express application.

This keeps `index.ts` focused on **server composition and startup** rather than business logic.

---

# 11. Inngest Imports

```typescript
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
```

These three imports work together.

### `serve`

```typescript
serve
```

provides the Express integration for Inngest.

### `inngest`

```typescript
inngest
```

represents the Inngest client/configuration.

### `functions`

```typescript
functions
```

contains the background functions registered with Inngest.

The architecture is:

```text
Express
   │
   ▼
Inngest Express Adapter
   │
   ▼
Inngest Client
   │
   ▼
Background Functions
```

This allows the backend to expose Inngest functionality through an HTTP endpoint.

---

# 12. Creating the Express Application

```typescript
const app = express();
```

This creates the Express application instance.

Think of `app` as the central server object.

Almost everything in the bootstrap process attaches to this object:

```typescript
app.use(...)
app.get(...)
app.all(...)
app.listen(...)
```

The structure is:

```text
app
 │
 ├── Middleware
 ├── Authentication
 ├── Inngest
 ├── Routes
 ├── Error Handler
 └── Server Listener
```

---

# 13. Configuring the Server Port

```typescript
const port = process.env.PORT ?? 8080;
```

This determines which TCP port the server will listen on.

The code first checks:

```typescript
process.env.PORT
```

If `PORT` exists, that value is used.

Otherwise:

```text
8080
```

is used as the default.

The `??` operator is the **nullish coalescing operator**.

Conceptually:

```text
PORT exists?
   │
   ├── Yes → use PORT
   │
   └── No → use 8080
```

This allows production environments to provide their own port while still allowing the application to run locally without explicitly defining one.

---

# 14. Configuring the Client URL

```typescript
const clientUrl =
  process.env.CLIENT_URL ?? "http://localhost:3000";
```

This stores the frontend application's URL.

For local development, the fallback is:

```text
http://localhost:3000
```

The value is later used by CORS:

```typescript
origin: clientUrl
```

So the frontend origin is configurable through an environment variable.

---

# 15. CORS Middleware

```typescript
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
```

This registers CORS middleware globally.

Every applicable request passes through this middleware before reaching later middleware/routes.

---

## `origin`

```typescript
origin: clientUrl
```

This tells CORS which frontend origin is allowed.

For example:

```text
CLIENT_URL=http://localhost:3000
```

means the backend allows requests from that origin.

---

## `credentials`

```typescript
credentials: true
```

This enables credential-aware cross-origin requests.

This is particularly important when authentication uses cookies.

The conceptual flow becomes:

```text
Browser
   │
   │ Request + authentication cookie
   ▼
Express API
   │
   ▼
CORS allows credentials
```

The exact browser behavior also depends on the frontend request configuration and cookie attributes.

---

# 16. Better Auth Route

```typescript
app.all("/api/auth/*any", toNodeHandler(auth));
```

This mounts Better Auth under:

```text
/api/auth/
```

`app.all()` means the handler can respond to different HTTP methods rather than being limited to one method such as `GET` or `POST`.

The wildcard:

```text
*any
```

allows authentication-related subpaths under `/api/auth/`.

Conceptually:

```text
/api/auth/...
       │
       ▼
toNodeHandler(auth)
       │
       ▼
Better Auth
```

This means authentication requests are handled by Better Auth rather than manually implementing every authentication endpoint in Express.

---

# 17. JSON Body Parser

```typescript
app.use(express.json());
```

This middleware parses incoming JSON request bodies.

For example, a frontend may send:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Without JSON parsing middleware, the route may not have convenient access to the parsed body.

After:

```typescript
app.use(express.json());
```

a route can access:

```typescript
req.body
```

The request flow becomes:

```text
HTTP Request
     │
     ▼
express.json()
     │
     ▼
req.body
     │
     ▼
Route Handler
```

### Why is placement important?

This middleware is registered before `registerRoutes(app)`.

Therefore, application routes registered afterward can receive parsed JSON request bodies.

---

# 18. Inngest Endpoint

```typescript
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  }),
);
```

This mounts Inngest under:

```text
/api/inngest
```

The `serve()` adapter receives:

```typescript
{
  client: inngest,
  functions,
}
```

### `client`

```typescript
client: inngest
```

provides the configured Inngest client.

### `functions`

```typescript
functions
```

provides the background functions that Inngest should expose/manage.

Conceptually:

```text
/api/inngest
      │
      ▼
Inngest Adapter
      │
      ├── Client
      │
      └── Functions
```

This allows the application's asynchronous/background workflows to integrate with the Express server.

---

# 19. Root Endpoint

```typescript
app.get("/", (_req, res) => {
  res.json({
    message: "Hello from Chaibook API",
  });
});
```

This creates a `GET` endpoint at:

```text
/
```

When a client requests:

```text
GET /
```

Express executes this handler.

The `_req` parameter represents the request object.

The underscore indicates that this parameter is intentionally unused.

The `res` parameter represents the HTTP response.

---

## Sending JSON

```typescript
res.json({
  message: "Hello from Chaibook API",
});
```

This sends a JSON response.

The client receives approximately:

```json
{
  "message": "Hello from Chaibook API"
}
```

This endpoint is useful as a simple way to confirm that the server is responding.

---

# 20. Health Check Endpoint

```typescript
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});
```

This creates:

```text
GET /health
```

A successful request returns:

```json
{
  "status": "ok"
}
```

A health endpoint is commonly used by:

* deployment platforms
* monitoring systems
* load balancers
* uptime checks
* developers

The basic idea is:

```text
Monitoring System
       │
       │ GET /health
       ▼
    Server
       │
       ▼
  {"status":"ok"}
```

A more sophisticated production health system may check dependencies such as databases or external services, but this endpoint currently performs a simple application-level response.

---

# 21. Registering Application Routes

```typescript
registerRoutes(app);
```

This is where the application's modular routes are attached to the Express application.

The benefit is separation of concerns.

Instead of:

```text
index.ts
 ├── auth routes
 ├── user routes
 ├── book routes
 ├── chat routes
 ├── document routes
 └── upload routes
```

the bootstrap file delegates route registration:

```text
index.ts
   │
   ▼
registerRoutes(app)
   │
   ├── User routes
   ├── Book routes
   ├── Chat routes
   ├── Document routes
   └── Other API routes
```

As the application grows, this becomes significantly easier to maintain.

---

# 22. Global Error Middleware

```typescript
app.use(errorHandler);
```

This is one of the most important lines in the architecture.

It registers the centralized Express error handler.

Its position is intentional:

```text
Middleware
   ↓
Authentication
   ↓
JSON Parser
   ↓
Inngest
   ↓
Basic Routes
   ↓
Application Routes
   ↓
Error Handler
```

The error handler is placed **after the routes** so that errors generated by those routes can flow into it.

The handler itself is responsible for converting different error objects into appropriate HTTP responses.

---

# 23. Starting the HTTP Server

```typescript
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

`app.listen()` starts the HTTP server.

The server begins listening on the configured port.

For example, if:

```text
PORT=8080
```

then the server listens on:

```text
http://localhost:8080
```

The callback:

```typescript
() => {
  console.log(...)
}
```

runs after the server has started listening.

---

# 24. Complete `index.ts` Execution Flow

When the application starts, the execution can be understood as:

```text
Node.js starts src/index.ts
          │
          ▼
Load .env configuration
          │
          ▼
Import application modules
          │
          ▼
Create Express app
          │
          ▼
Determine PORT
          │
          ▼
Determine CLIENT_URL
          │
          ▼
Register CORS
          │
          ▼
Register Better Auth
          │
          ▼
Register JSON parser
          │
          ▼
Register Inngest
          │
          ▼
Register "/" route
          │
          ▼
Register "/health" route
          │
          ▼
Register application routes
          │
          ▼
Register global error handler
          │
          ▼
Start HTTP server
```

---

# 25. `server/src/types/app-error.ts`

## Complete Source Code

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
  constructor(
    message = "Validation failed",
    details?: unknown,
  ) {
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

---

# 26. Why Create Custom Error Classes?

Normally JavaScript provides:

```typescript
throw new Error("Something went wrong");
```

But an ordinary `Error` does not automatically tell the API which HTTP status code should be returned.

For example:

```text
User not found      → 404
Invalid input       → 400
Not authenticated   → 401
Duplicate resource  → 409
```

Custom errors allow the application to attach this information to the error itself.

Instead of:

```typescript
throw new Error("User not found");
```

we can use:

```typescript
throw new NotFoundError("User not found");
```

Now the global error handler knows:

```text
Error type → NotFoundError
Status     → 404
Message    → User not found
```

---

# 27. Base `AppError` Class

```typescript
export class AppError extends Error {
```

`AppError` extends JavaScript's built-in:

```text
Error
```

This creates an inheritance hierarchy:

```text
Error
  │
  ▼
AppError
  │
  ├── NotFoundError
  ├── ValidationError
  ├── UnauthorizedError
  └── ConflictError
```

This is powerful because the global error handler can check:

```typescript
error instanceof AppError
```

and recognize all custom application errors.

---

# 28. `statusCode`

```typescript
public readonly statusCode: number
```

This property stores the HTTP status associated with the error.

Examples:

```text
400 → Validation
401 → Unauthorized
404 → Not Found
409 → Conflict
```

`readonly` means application code should not modify the value after construction.

For example:

```typescript
new NotFoundError()
```

creates an error whose status is:

```text
404
```

---

# 29. `message`

```typescript
message: string
```

This is the human-readable description of the error.

For example:

```typescript
new NotFoundError("Book not found")
```

produces:

```text
message = "Book not found"
statusCode = 404
```

---

# 30. Optional `details`

```typescript
public readonly details?: unknown
```

This property allows additional error information.

The `?` means it is optional.

The type:

```typescript
unknown
```

is intentionally broad.

It allows different types of structured information while still requiring the developer to handle the value safely.

For example, a validation error could contain field-specific details.

Conceptually:

```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email"]
  }
}
```

---

# 31. Calling `super(message)`

```typescript
super(message);
```

Because `AppError` extends the built-in `Error` class, its constructor must initialize the parent `Error`.

`super(message)` passes the message to the parent class.

Conceptually:

```text
AppError
   │
   ▼
Error
   │
   └── message
```

Without correctly initializing the parent class, the custom error would not behave as a normal JavaScript `Error`.

---

# 32. Setting the Error Name

```typescript
this.name = "AppError";
```

JavaScript errors have a `name` property.

Setting it makes logs and debugging more descriptive.

Instead of simply seeing:

```text
Error
```

the application can identify:

```text
AppError
```

Subclasses override this value with their own names.

---

# 33. `NotFoundError`

```typescript
export class NotFoundError extends AppError {
```

This represents a missing resource.

Its constructor:

```typescript
constructor(message = "Resource not found") {
```

provides a default message.

So:

```typescript
new NotFoundError()
```

automatically means:

```text
404
Resource not found
```

while:

```typescript
new NotFoundError("Book not found")
```

provides a custom message.

---

## HTTP Status

```typescript
super(404, message);
```

The class automatically associates this error with HTTP:

```text
404 Not Found
```

This means route/service code doesn't need to repeatedly write:

```typescript
status = 404
```

The error type already carries that information.

---

# 34. `ValidationError`

```typescript
export class ValidationError extends AppError {
```

This represents invalid input.

Its default message is:

```typescript
"Validation failed"
```

and it uses:

```typescript
super(400, message, details);
```

Therefore:

```text
statusCode → 400
message    → Validation failed
details    → optional validation information
```

This is particularly useful when a request body fails validation.

---

# 35. `UnauthorizedError`

```typescript
export class UnauthorizedError extends AppError {
```

This represents a request where authentication is missing or invalid.

It uses:

```typescript
super(401, message);
```

which corresponds to:

```text
401 Unauthorized
```

Example:

```typescript
throw new UnauthorizedError();
```

---

# 36. `ConflictError`

```typescript
export class ConflictError extends AppError {
```

This represents a conflict with the current state of the resource.

It uses:

```typescript
super(409, message);
```

which corresponds to:

```text
409 Conflict
```

For example, an application might use it when attempting to create a resource that violates a uniqueness rule.

---

# 37. Error Class Hierarchy

The complete structure is:

```text
                       Error
                         │
                         ▼
                     AppError
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
 NotFoundError    ValidationError   UnauthorizedError
     404                400                401
        │
        └───────────────┐
                        ▼
                 ConflictError
                      409
```

The major architectural advantage is that all application-specific errors share a common structure.

---

# 38. `server/src/utils/async-handler.ts`

## Complete Source Code

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
 */
export function asyncHandler(
  handler: AsyncRequestHandler,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
```

---

# 39. Why Do We Need `asyncHandler`?

Express routes frequently perform asynchronous operations.

For example:

```typescript
async function getBook(req, res) {
  const book = await database.book.findUnique(...);

  res.json(book);
}
```

The database operation returns a Promise.

If the Promise rejects, the application needs to make sure the error reaches the global error middleware.

The purpose of `asyncHandler` is therefore:

```text
Async Route
    │
    ▼
Promise
    │
    ├── Success → Response
    │
    └── Rejection
           │
           ▼
       next(error)
           │
           ▼
    Global Error Handler
```

---

# 40. Express Type Imports

```typescript
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
```

These are TypeScript types from Express.

The `import type` syntax tells TypeScript that these imports are needed only for type checking.

They are not required as runtime JavaScript values.

The imported types describe:

### `Request`

The incoming HTTP request.

### `Response`

The outgoing HTTP response.

### `NextFunction`

The function used to move control to the next middleware, including forwarding errors.

### `RequestHandler`

The standard Express request-handler type.

---

# 41. `AsyncRequestHandler` Type

```typescript
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
```

This defines exactly what type of function `asyncHandler` expects.

The handler must receive:

```text
req
res
next
```

and return:

```text
Promise<void>
```

This matches asynchronous Express handlers.

For example:

```typescript
const getUser = async (req, res, next) => {
  ...
};
```

can conceptually fit this type.

---

# 42. `asyncHandler()` Function

```typescript
export function asyncHandler(
  handler: AsyncRequestHandler,
): RequestHandler {
```

The function accepts an asynchronous route handler.

It returns a normal Express-compatible `RequestHandler`.

So it acts as an adapter:

```text
AsyncRequestHandler
        │
        ▼
   asyncHandler()
        │
        ▼
Express RequestHandler
```

This allows asynchronous application logic to integrate with Express middleware.

---

# 43. Returning the Wrapper Function

```typescript
return (req, res, next) => {
```

Instead of immediately executing the handler, `asyncHandler` returns a new function.

Express later calls this returned function when a request arrives.

The flow is:

```text
Route Registration
       │
       ▼
asyncHandler(handler)
       │
       ▼
returns wrapper
       │
       ▼
Express stores wrapper
       │
       ▼
Request arrives
       │
       ▼
wrapper(req, res, next)
```

---

# 44. Executing the Async Handler

```typescript
handler(req, res, next)
```

This executes the original asynchronous handler.

Because the handler returns:

```text
Promise<void>
```

we can attach:

```typescript
.catch(...)
```

to it.

---

# 45. Forwarding Errors with `.catch(next)`

```typescript
void handler(req, res, next).catch(next);
```

This is the key line of the utility.

If the async handler succeeds:

```text
Promise resolves
      │
      ▼
Request continues normally
```

If it fails:

```text
Promise rejects
      │
      ▼
.catch(next)
      │
      ▼
next(error)
      │
      ▼
Express error middleware
```

The important part is:

```typescript
.catch(next)
```

It effectively means:

> If this asynchronous operation fails, pass the error to Express's `next()` function.

That is how the error reaches:

```typescript
app.use(errorHandler);
```

---

# 46. Why `void`?

```typescript
void handler(req, res, next).catch(next);
```

The `void` operator explicitly indicates that the returned Promise is intentionally not awaited by the wrapper.

The wrapper itself is designed to initiate the asynchronous operation and attach error forwarding.

The important behavior is not the return value; it is the attached:

```typescript
.catch(next)
```

---

# 47. `server/src/middleware/error-handler.middleware.ts`

## Complete Source Code

```typescript
import type {
  NextFunction,
  Request,
  Response,
} from "express";

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
    res.status(400).json({
      error: error.message,
    });

    return;
  }

  if (
    error instanceof Error &&
    error.message === "Only PDF files are allowed"
  ) {
    res.status(400).json({
      error: error.message,
    });

    return;
  }

  const cloudinaryError = error as Error & {
    http_code?: number;
    name?: string;
  };

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

  res.status(500).json({
    error: "Internal server error",
  });
}
```

---

# 48. Purpose of the Global Error Handler

This middleware is the central location where application errors are converted into HTTP responses.

Instead of individual routes returning errors in different formats:

```text
Route A → { message: ... }
Route B → { error: ... }
Route C → { status: ... }
```

the application can centralize error formatting.

The architecture becomes:

```text
Controller
    │
    ▼
Service
    │
    ├── success → response
    │
    └── error
         │
         ▼
    errorHandler
         │
         ├── AppError → specific status
         ├── ZodError → 400
         ├── MulterError → 400
         ├── PDF error → 400
         ├── Cloudinary error → 400
         └── Unknown → 500
```

---

# 49. Why `error` Is Typed as `unknown`

```typescript
error: unknown
```

This is an important TypeScript safety choice.

An error thrown in JavaScript is not guaranteed to be an instance of `Error`.

For example, JavaScript technically allows:

```typescript
throw "something went wrong";
```

or:

```typescript
throw { message: "failed" };
```

Therefore, treating an incoming error as `unknown` forces the code to check what it actually is before accessing properties.

For example:

```typescript
error instanceof Error
```

safely establishes that the value is an Error object.

---

# 50. Express Error Middleware Signature

```typescript
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
```

Express identifies error-handling middleware by its four parameters:

```text
(error, req, res, next)
```

The first parameter is the error.

The other parameters are:

* `_req` → request
* `res` → response
* `_next` → next middleware function

The underscore indicates that `_req` and `_next` are intentionally unused in this implementation.

---

# 51. Handling `AppError`

```typescript
if (error instanceof AppError) {
```

This checks whether the thrown value belongs to the custom application error hierarchy.

Because:

```text
NotFoundError
ValidationError
UnauthorizedError
ConflictError
```

all extend `AppError`, this condition handles all of them.

For example:

```typescript
throw new NotFoundError("Book not found");
```

reaches this branch.

---

# 52. Returning the Custom Error Response

```typescript
res.status(error.statusCode).json({
  error: error.message,
  details: error.details,
});
```

The status code comes directly from the custom error.

For:

```typescript
new NotFoundError("Book not found")
```

the response becomes conceptually:

```http
HTTP/1.1 404
```

with:

```json
{
  "error": "Book not found"
}
```

For a validation error, `details` may also contain structured information.

This is the main benefit of `AppError`:

```text
Throw Error
    │
    ▼
Error carries status
    │
    ▼
Global Handler reads status
    │
    ▼
Correct HTTP response
```

---

# 53. Why `return` After Sending the Response?

```typescript
return;
```

After:

```typescript
res.status(...).json(...);
```

the response has been sent.

Returning immediately prevents the function from continuing into the remaining error checks.

Without the return, the handler could potentially continue executing and attempt to send another response.

The pattern is:

```text
Match error
   │
   ▼
Send response
   │
   ▼
return
```

---

# 54. Handling Zod Errors

```typescript
if (error instanceof ZodError) {
```

Zod is used for input validation.

If validation fails, Zod throws a `ZodError`.

The error handler recognizes that specific error type.

---

## Returning Validation Error

```typescript
res.status(400).json({
  error: "Validation failed",
  details: flattenError(error).fieldErrors,
});
```

HTTP status:

```text
400 Bad Request
```

The response contains:

```text
error
details
```

The important part is:

```typescript
flattenError(error).fieldErrors
```

This converts Zod's validation error structure into field-oriented errors that are easier for an API client to consume.

Conceptually:

```text
Invalid Request
      │
      ▼
   ZodError
      │
      ▼
flattenError()
      │
      ▼
fieldErrors
      │
      ▼
HTTP 400
```

---

# 55. Handling Multer Errors

```typescript
if (error instanceof multer.MulterError) {
```

Multer is used for handling multipart file uploads.

Errors can occur during upload processing.

This branch detects errors specifically generated by Multer.

The response is:

```typescript
res.status(400).json({
  error: error.message,
});
```

So upload-related client errors are returned as:

```text
400 Bad Request
```

instead of becoming generic 500 errors.

---

# 56. PDF File Validation Error

```typescript
if (
  error instanceof Error &&
  error.message === "Only PDF files are allowed"
)
```

This checks two things.

First:

```typescript
error instanceof Error
```

ensures the thrown value is actually an `Error`.

Second:

```typescript
error.message === "Only PDF files are allowed"
```

checks for the specific application error message.

If matched:

```typescript
res.status(400).json({
  error: error.message,
});
```

the client receives a `400` response.

This represents an invalid client upload rather than an unexpected server failure.

---

# 57. Cloudinary Error Type Assertion

```typescript
const cloudinaryError = error as Error & {
  http_code?: number;
  name?: string;
};
```

Cloudinary errors may contain additional properties beyond the standard JavaScript `Error`.

The code expects possible properties:

```text
name
http_code
```

The type assertion tells TypeScript:

> Treat this value as an Error that may additionally contain these properties.

It does **not** change the runtime object.

It only gives TypeScript more information about how the code intends to access it.

---

# 58. Detecting the Cloudinary Permission Error

```typescript
if (
  cloudinaryError.name === "UnexpectedResponse" &&
  cloudinaryError.http_code === 403
)
```

The condition checks for a specific Cloudinary failure:

```text
name      → UnexpectedResponse
http_code → 403
```

The handler converts this into a client-facing `400` response containing an explanation of the configuration problem.

This is useful during development because the raw Cloudinary error may not be as helpful to the API consumer as a clear explanation of the required upload permission.

---

# 59. Fallback Error Logging

```typescript
console.error(error);
```

If the error didn't match any of the known categories, it is logged.

This is important because the server should not silently swallow unexpected failures.

The developer can inspect server logs to investigate the original error.

---

# 60. Generic 500 Response

```typescript
res.status(500).json({
  error: "Internal server error",
});
```

Any unrecognized error reaches this fallback.

HTTP status:

```text
500 Internal Server Error
```

The client receives a generic message rather than the raw internal error.

This is an important API security practice because internal exception details may reveal:

* database information
* filesystem paths
* API internals
* credentials/configuration
* implementation details

The server logs the actual error while the client receives a generic response.

---

# 61. Error Handling Decision Tree

The entire middleware can be visualized as:

```text
                    Error
                      │
                      ▼
              Is AppError?
                │        │
              Yes        No
                │         │
                ▼         ▼
            statusCode   ZodError?
            + message     │    │
                          Yes   No
                           │     │
                           ▼     ▼
                         400   MulterError?
                                 │    │
                                Yes   No
                                 │     │
                                 ▼     ▼
                               400   PDF Error?
                                        │    │
                                       Yes   No
                                        │     │
                                        ▼     ▼
                                      400   Cloudinary?
                                                │    │
                                               Yes   No
                                                │     │
                                                ▼     ▼
                                              400   500
```

This is the central error-normalization mechanism of the server.

---

# 62. Complete Request + Error Flow

Consider a request:

```text
POST /api/books
```

The overall flow is:

```text
Client
  │
  │ POST /api/books
  ▼
Express
  │
  ▼
CORS
  │
  ▼
JSON Parser
  │
  ▼
Application Route
  │
  ▼
Controller
  │
  ▼
Service
  │
  ├────────────── Success
  │                  │
  │                  ▼
  │               Response
  │
  └────────────── Error
                     │
                     ▼
               asyncHandler
                     │
                     ▼
                  next(error)
                     │
                     ▼
               errorHandler
                     │
          ┌──────────┼───────────┐
          ▼          ▼           ▼
       AppError   ZodError    Unknown
          │          │           │
          ▼          ▼           ▼
        4xx        400         500
```

---

# 63. How the Four Files Work Together

The four files introduced in this chapter each have a specific responsibility.

```text
src/index.ts
     │
     │ Creates application
     │ Registers middleware/routes
     │ Starts server
     ▼
Express App
     │
     ├──────────────────────────────┐
     │                              │
     ▼                              ▼
asyncHandler                  errorHandler
     │                              │
     │ forwards errors              │ formats errors
     ▼                              ▼
AppError classes ───────────────► HTTP Response
```

### Responsibility Table

| File                                         | Responsibility                              |
| -------------------------------------------- | ------------------------------------------- |
| `src/index.ts`                               | Server bootstrap and middleware composition |
| `src/types/app-error.ts`                     | Defines structured application errors       |
| `src/utils/async-handler.ts`                 | Forwards async Promise failures to Express  |
| `src/middleware/error-handler.middleware.ts` | Converts errors into HTTP responses         |

---

# 64. Why This Architecture Is Better Than Putting Everything in `index.ts`

A beginner implementation might place everything into one file:

```text
index.ts
 ├── Express
 ├── routes
 ├── database
 ├── authentication
 ├── validation
 ├── error handling
 ├── business logic
 └── startup
```

As the application grows, that becomes difficult to maintain.

This architecture separates responsibilities:

```text
                  Server
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
     Routes      Middleware    Errors
        │           │            │
        ▼           ▼            ▼
   Controllers    Auth/CORS    AppError
        │                        │
        ▼                        ▼
    Services               Error Handler
```

This makes individual pieces easier to:

* understand
* test
* modify
* reuse
* debug

---

# 65. Chapter Summary

This chapter establishes the **core HTTP architecture** of the Chaibook backend.

The server now has:

```text
✅ Express application
✅ TypeScript + ESM
✅ Environment configuration
✅ CORS
✅ Better Auth integration
✅ JSON body parsing
✅ Inngest integration
✅ Modular route registration
✅ Root endpoint
✅ Health endpoint
✅ Custom application errors
✅ Async error forwarding
✅ Centralized error handling
✅ Server startup
```

The most important architecture to remember is:

```text
                       Client
                         │
                         ▼
                    Express App
                         │
                         ▼
                       CORS
                         │
                         ▼
                    Better Auth
                         │
                         ▼
                   JSON Parser
                         │
                         ▼
                     Inngest
                         │
                         ▼
                  Application Routes
                         │
                         ▼
                    Controllers
                         │
                         ▼
                     Services
                         │
                  ┌──────┴──────┐
                  │             │
               Success        Error
                  │             │
                  ▼             ▼
              Response     asyncHandler
                                │
                                ▼
                             next(error)
                                │
                                ▼
                         errorHandler
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
          AppError           ZodError           Unknown
             │                  │                  │
             ▼                  ▼                  ▼
         4xx response        400 response       500 response
```

### 🧠 Core Learning

The key idea of this chapter is **separation of responsibilities**.

`index.ts` should primarily answer:

> **How is my server assembled and started?**

`AppError` should answer:

> **What kind of application error occurred?**

`asyncHandler` should answer:

> **How do asynchronous route failures reach Express?**

`errorHandler` should answer:

> **How should this error become an HTTP response?**

Once these responsibilities are separated, the rest of the backend can be built on top of a predictable and maintainable foundation.

