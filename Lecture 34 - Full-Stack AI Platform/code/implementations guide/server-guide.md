# Server Track Guide — Chaibook LLM Sir Backend API

This guide provides a step-by-step roadmap for building the **Chaibook LLM Sir** backend server using Node.js, Express, TypeScript (ESM), PostgreSQL, Prisma ORM, Better Auth, Pinecone Vector DB, OpenAI, and Inngest.

---

## 🛠️ Quick Environment Setup

Before starting Chapter 0, prepare the server directory:

```bash
# 1. Navigate to main project directory
cd week05/chaibook-llm-sir

# 2. Launch PostgreSQL container with pgvector
docker compose up -d

# 3. Enter server directory and setup environment
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

#### Code Explanation: Environment Setup Commands
- **`docker compose up -d`**: Launches PostgreSQL 16 container with `pgvector` extension running in background mode (`-d`).
- **`cp .env.example .env`**: Copies sample environment variables template to active `.env` config file.
- **`npm install`**: Installs all production dependencies (`express`, `better-auth`, `@prisma/client`, `openai`, `pinecone`, `inngest`) and dev dependencies (`tsx`, `typescript`).
- **`npx prisma migrate dev`**: Runs database migrations against PostgreSQL and auto-generates the TypeScript Prisma Client.
- **`npm run dev`**: Starts `tsx watch src/index.ts` to run the Express API server with hot reloading on `http://localhost:8080`.

---

## 📁 Server Folder Architecture

```text
server/
├── prisma/
│   └── schema.prisma                # Prisma ORM models & database schema
├── prisma.config.ts                 # Prisma CLI configuration
├── package.json                     # NPM dependencies & scripts ("type": "module")
├── tsconfig.json                    # TypeScript ESM compiler options
├── .env                             # Server environment variables
└── src/
    ├── index.ts                     # Main Express server entry point
    ├── routes/                      # API Express router modules
    ├── controllers/                 # Request extraction & HTTP status handling
    ├── services/                    # Core business logic & AI orchestrations
    ├── repositories/                # Database queries using Prisma Client
    ├── validators/                  # Request payload validation schemas (Zod)
    ├── middleware/                  # Express middleware (auth, error handling)
    ├── inngest/                     # Inngest background event handlers & functions
    ├── lib/                         # External SDK clients (OpenAI, Pinecone, Better Auth, Mem0)
    └── utils/                       # Shared helper utilities (chunking, logger)
```

---

## 📚 Backend Implementation Roadmap

Follow these 11 chapters in order to build the backend server step-by-step:

### Chapter 0 — Overview & Infrastructure Setup
- **Reference Guide**: [chapter-00-overview-setup.md](chapter-00-overview-setup.md)
- **Key Actions**:
  - Understand system architecture and database schema design.
  - Setup Docker Compose with `pgvector/pgvector:pg16` image.
  - Prepare `.env` variables for PostgreSQL, Google OAuth, OpenAI, Pinecone, and Inngest.

### Chapter 1 — Express Server Bootstrap & ESM Configuration
- **Reference Guide**: [chapter-01-bootstrap.md](chapter-01-bootstrap.md)
- **Key Actions**:
  - Configure `server/package.json` with `"type": "module"` for strict ESM imports.
  - Setup `server/tsconfig.json` with `"module": "NodeNext"`.
  - Build `server/src/index.ts` with CORS credentials, `express.json()`, and `/health` route.

### Chapter 2 — PostgreSQL Database & Prisma ORM Schema
- **Reference Guide**: [chapter-02-database.md](chapter-02-database.md)
- **Key Actions**:
  - Create database schema in `server/prisma/schema.prisma`.
  - Instantiate singleton Prisma Client with PG adapter in `server/src/lib/db.ts`.
  - Execute database migration with `npx prisma migrate dev`.

### Chapter 3 — Authentication with Better Auth & Google OAuth
- **Reference Guide**: [chapter-03-authentication.md](chapter-03-authentication.md)
- **Key Actions**:
  - Configure Better Auth with Prisma adapter in `server/src/lib/auth.ts`.
  - Create session type definitions in `server/src/lib/session.ts`.
  - Build `requireAuth` middleware in `server/src/middleware/require-auth.middleware.ts`.
  - Mount global error handler `errorHandler` in `server/src/middleware/error-handler.middleware.ts`.

### Chapter 4 — Enterprise 5-Layer Workspaces CRUD
- **Reference Guide**: [chapter-04-workspaces.md](chapter-04-workspaces.md)
- **Key Actions**:
  - Implement 5-layer pattern: `workspace.routes.ts` → `workspace.controller.ts` → `workspace.service.ts` → `workspace.repository.ts` → `workspace.validator.ts`.
  - Enforce user ownership validation on all workspace operations (`req.session.user.id`).

### Chapter 5 — Knowledge Sources CRUD (Text & Markdown Notes)
- **Reference Guide**: [chapter-05-sources-crud.md](chapter-05-sources-crud.md)
- **Key Actions**:
  - Build source routes under `/api/workspaces/:workspaceId/sources`.
  - Validate note payloads (`TEXT` / `MARKDOWN`) with Zod validator.
  - Set default status to `PENDING` upon insertion.

### Chapter 6 — Source Import Channels (Web, YouTube & PDFs)
- **Reference Guide**: [chapter-06-import-channels.md](chapter-06-import-channels.md)
- **Key Actions**:
  - Implement website scraper using Firecrawl SDK (`server/src/lib/firecrawl.ts`).
  - Extract YouTube captions using `youtube-transcript` library.
  - Handle PDF file uploads using Multer memory storage and Cloudinary SDK (`server/src/lib/cloudinary.ts`).

### Chapter 7 — Background Indexing & Vector Embedding Pipeline
- **Reference Guide**: [chapter-07-indexing-pipeline.md](chapter-07-indexing-pipeline.md)
- **Key Actions**:
  - Build text chunker utility in `server/src/utils/chunker.ts`.
  - Generate embeddings using OpenAI `text-embedding-3-small` in `server/src/lib/openai.ts`.
  - Store vector embeddings in Pinecone Index (`server/src/lib/pinecone.ts`).
  - Create Inngest background event handler function `source-indexing.job.ts` to update source status from `PROCESSING` to `READY`.

### Chapter 8 — RAG Retrieval & Streaming AI Chat Engine
- **Reference Guide**: [chapter-08-rag-chat.md](chapter-08-rag-chat.md)
- **Key Actions**:
  - Build Pinecone similarity search engine in `server/src/services/rag-retrieval.service.ts`.
  - Construct grounded system prompt with retrieved context and citations (`[1]`, `[2]`).
  - Stream LLM responses using Vercel AI SDK (`streamText`) over Express SSE response headers.

### Chapter 9 — Personal Memory (Mem0) & Live Web Search (Tavily)
- **Reference Guide**: [chapter-09-memory-search.md](chapter-09-memory-search.md)
- **Key Actions**:
  - Integrate Mem0 SDK (`server/src/lib/mem0.ts`) for storing user preferences and facts.
  - Integrate Tavily SDK (`server/src/lib/tavily.ts`) for web search augmentation.
  - Create `/api/memory` management endpoints for listing and deleting memories.

### Chapter 10 — Async Learning Artifacts Generator
- **Reference Guide**: [chapter-10-learning-artifacts.md](chapter-10-learning-artifacts.md)
- **Key Actions**:
  - Build artifact creation endpoints for `FLASHCARDS`, `QUIZ`, `SUMMARY`, and `MINDMAP`.
  - Create Inngest background worker (`server/src/inngest/functions/artifact-generation.job.ts`) to produce structured JSON outputs using OpenAI structured outputs (`generateObject`).

---

## 🧪 Server Build Verification

Run a final verification build to confirm TypeScript compilation:

```bash
cd week05/chaibook-llm-sir/server
npm run build
```

#### Code Explanation: Verification Commands
- **`npm run build`**: Runs `tsc` compiler to verify that all TypeScript files, imports, parameters, interfaces, and routes compile cleanly without type errors into production JS binaries.
