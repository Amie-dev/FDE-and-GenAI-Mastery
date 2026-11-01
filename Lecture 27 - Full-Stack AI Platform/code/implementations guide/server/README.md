# Server Track Master Index — Chaibook LLM Sir Backend API

Welcome to the **Server Track** for **Chaibook LLM Sir**! This guide takes backend developers step-by-step through building the Node.js/Express ESM API server, PostgreSQL database with Prisma ORM, Better Auth session middleware, vector embeddings pipeline with Pinecone and OpenAI, background queues with Inngest, and AI integrations (Mem0, Tavily).

---

## 📁 Server Folder Structure Map

All server code should be created inside `week05/chaibook-llm-sir/server/`:

```text
server/
├── prisma/
│   └── schema.prisma                # Prisma ORM database models
├── prisma.config.ts                 # Prisma CLI config
├── package.json                     # NPM dependencies ("type": "module")
├── tsconfig.json                    # NodeNext ESM TypeScript resolution
├── .env                             # Server environment variables
└── src/
    ├── index.ts                     # Express server entry point
    ├── routes/                      # API router modules
    ├── controllers/                 # Request & HTTP status controllers
    ├── services/                    # Business rules & AI logic
    ├── repositories/                # Prisma database queries
    ├── validators/                  # Zod schema validation
    ├── middleware/                  # Auth & error handling middlewares
    ├── inngest/                     # Inngest background event jobs
    ├── lib/                         # External SDK clients (OpenAI, Pinecone, Better Auth)
    └── utils/                       # Chunking & helper utilities
```

---

## 🏗 System Architecture & Service Ecosystem

The server operates as a modular, event-driven Node.js ESM backend connecting multiple data storage engines, asynchronous job runners, and external AI models.

```mermaid
graph TD
    subgraph Client["Client Tier"]
        UI["Web App / Frontend Client"]
    end

    subgraph ServerApp["Node.js / Express Server (ESM API)"]
        Routes["Express Routes & Router"]
        AuthMid["Better Auth Middleware (requireAuth)"]
        Controllers["Controllers & Zod Validators"]
        Services["Business Logic & AI Services"]
        Repos["Prisma Repositories"]
    end

    subgraph DatabaseTier["Data & Storage Tier"]
        PG[("PostgreSQL\n(pgvector)")]
        Pinecone[("Pinecone Vector DB")]
        Cloudinary[("Cloudinary Media Storage")]
    end

    subgraph BackgroundTier["Background Engine"]
        Inngest["Inngest Queue Worker"]
    end

    subgraph ExternalServices["AI & External Integrations"]
        OpenAI["OpenAI API\n(Embeddings & LLM)"]
        Mem0["Mem0 AI\n(User Memory)"]
        Tavily["Tavily API\n(Live Web Search)"]
        Firecrawl["Firecrawl API\n(Web Scraper)"]
        YT["YouTube Transcript API"]
    end

    UI -->|"HTTP REST / SSE Stream"| Routes
    Routes --> AuthMid
    AuthMid --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos -->|"Prisma ORM"| PG

    Services -->|"Dispatch Events"| Inngest
    Inngest -->|"Async Execution"| Services

    Services -->|"Embeddings & LLM Stream"| OpenAI
    Services -->|"Vector Search"| Pinecone
    Services -->|"User Memory"| Mem0
    Services -->|"Live Web Search"| Tavily
    Services -->|"Scrape Pages"| Firecrawl
    Services -->|"Fetch Transcripts"| YT
    Services -->|"PDF Storage"| Cloudinary

    Inngest -->|"Generate Vectors"| OpenAI
    Inngest -->|"Upsert Vectors"| Pinecone
```

---

## 🔄 5-Layer Backend Architecture & Request Flow

All API endpoints follow a strict, decoupled **5-Layer Architecture** (`Route` → `Validator` → `Controller` → `Service` → `Repository`).

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Middleware as Auth Middleware
    participant Route as Express Router
    participant Validator as Zod Validator
    participant Controller as Controller Layer
    participant Service as Service Layer
    participant Repo as Repository Layer
    participant DB as PostgreSQL (Prisma)
    participant Inngest as Inngest Event Queue

    Client->>Route: HTTP Request (e.g. POST /api/sources)
    Route->>Middleware: requireAuth() Validate Session Token
    alt Invalid Session
        Middleware-->>Client: 401 Unauthorized Response
    else Valid Session
        Middleware->>Validator: Pass Request Body & Params
        Validator->>Validator: Validate Schema (Zod)
        alt Validation Fails
            Validator-->>Client: 400 Bad Request (Zod Error Format)
        else Validation Passes
            Validator->>Controller: Invokes Controller Handler
            Controller->>Service: Call Business Logic Method
            Service->>Repo: Perform DB Query
            Repo->>DB: Execute SQL via Prisma Client
            DB-->>Repo: Return Database Record
            Repo-->>Service: Return Prisma Model Object
            opt Event Trigger Needed
                Service->>Inngest: Send Inngest Event (e.g. source.created)
            end
            Service-->>Controller: Return Business Result
            Controller-->>Client: HTTP 200/201 JSON Response
        end
    end
```

---

## ⚙️ Async Background Vector Indexing Pipeline

When a user imports content (PDF, Web URL, YouTube video, or text note), processing occurs asynchronously using **Inngest** to maintain zero request blocking.

```mermaid
flowchart TD
    Start(["Source Created (PDF / Web / YouTube / Text)"]) --> Event["Dispatch Event: source/created"]
    Event --> InngestQueue["Inngest Background Job Received"]
    
    InngestQueue --> Step1["Step 1: Extract Content"]
    Step1 --> Branch{Source Type?}
    
    Branch -->|PDF Document| PDFProc["Parse PDF via unpdf"]
    Branch -->|Web Page URL| FirecrawlProc["Scrape Page via Firecrawl API"]
    Branch -->|YouTube URL| YTProc["Fetch Transcript via youtube-transcript"]
    Branch -->|Raw Note/Text| TextProc["Clean Text Content"]
    
    PDFProc --> Step2["Step 2: Text Chunking"]
    FirecrawlProc --> Step2
    YTProc --> Step2
    TextProc --> Step2
    
    Step2 --> Chunking["Sliding Window Chunker\n(Chunk Size: 500-1000 tokens)"]
    Chunking --> Step3["Step 3: Generate Vector Embeddings"]
    Step3 --> OpenAIEmbed["Call OpenAI text-embedding-3-small"]
    OpenAIEmbed --> EmbedVectors["Receive Vector Array (1536 dimensions)"]
    
    EmbedVectors --> Step4["Step 4: Vector DB Storage"]
    Step4 --> PineconeUpsert["Upsert Vectors to Pinecone Index\n(Metadata: sourceId, workspaceId, text)"]
    
    PineconeUpsert --> Step5["Step 5: Status Update"]
    Step5 --> DBUpdate["Update Prisma Source Record:\nStatus -> READY\nChunk Count -> N"]
    DBUpdate --> Done(["Indexing Complete & Source Ready"])
```

---

## 💬 RAG Chat Stream & User Memory Pipeline

When a student queries the assistant, the server coordinates **Mem0** (long-term memory retrieval), **Pinecone** (workspace semantic context search), and **OpenAI** (LLM streaming with Server-Sent Events).

```mermaid
sequenceDiagram
    autonumber
    actor User as Student UI Client
    participant Server as Express RAG Controller
    participant Mem0 as Mem0 Memory SDK
    participant OpenAI as OpenAI API (Embeddings)
    participant Pinecone as Pinecone Vector DB
    participant LLM as Vercel AI SDK / OpenAI GPT-4o

    User->>Server: Send Chat Message (POST /api/workspaces/:id/chat)
    
    par Fetch User Memories & Generate Embeddings
        Server->>Mem0: Query User Memories (mem0.search)
        Mem0-->>Server: Stored Preferences & Past Insights
    and Embedding Generation
        Server->>OpenAI: Embed Query (text-embedding-3-small)
        OpenAI-->>Server: Query Vector (1536-dim)
    end
    
    Server->>Pinecone: Similarity Search (Top-K Chunks with workspaceId filter)
    Pinecone-->>Server: Relevant Grounding Chunks with Citations
    
    Server->>Server: Assemble Augmented System Prompt\n(System Persona + User Memories + Retrieved Chunks)
    
    Server->>LLM: Stream LLM Completion (streamText)
    LLM-->>Server: Server-Sent Events (SSE Stream)
    Server-->>User: Stream Response Tokens & Citations [1][2] to UI
    
    opt Async Background Memory Update
        Server-)Mem0: Extract & Store New Insights (mem0.add)
    end
```

---

## 📚 Server Track Chapters

| Chapter | Title | Focus & Core Components | Guide File |
| :--- | :--- | :--- | :--- |
| **Ch 0** | **Overview & Setup** | System architecture, PostgreSQL `pgvector:pg16` container, environment setup | [Chapter 00](chapter-00-overview-setup.md) |
| **Ch 1** | **Express Bootstrap** | Express ESM server, `package.json`, `tsconfig.json`, CORS & `/health` endpoint | [Chapter 01](chapter-01-bootstrap.md) |
| **Ch 2** | **Database & Prisma** | PostgreSQL schema, Prisma ORM models, migrations & singleton `db.ts` client | [Chapter 02](chapter-02-database.md) |
| **Ch 3** | **Authentication** | Better Auth server setup, Google OAuth 2.0 & `requireAuth` Express middleware | [Chapter 03](chapter-03-authentication.md) |
| **Ch 4** | **Workspaces CRUD** | 5-Layer Pattern (`routes` → `controller` → `service` → `repository` → `validator`) | [Chapter 04](chapter-04-workspaces.md) |
| **Ch 5** | **Sources CRUD** | Text & Markdown notes CRUD, Zod validator, status lifecycle (`PENDING` → `READY`) | [Chapter 05](chapter-05-sources-crud.md) |
| **Ch 6** | **Import Channels** | Firecrawl web scraper, YouTube transcript extractor, Multer + Cloudinary PDF upload | [Chapter 06](chapter-06-import-channels.md) |
| **Ch 7** | **Vector Indexing** | Sliding window chunker, OpenAI `text-embedding-3-small`, Pinecone DB & Inngest jobs | [Chapter 07](chapter-07-indexing-pipeline.md) |
| **Ch 8** | **RAG Chat Stream** | Pinecone similarity retrieval, grounded prompts with citations `[1]`, AI SDK SSE stream | [Chapter 08](chapter-08-rag-chat.md) |
| **Ch 9** | **Memory & Search** | Mem0 personal user memory SDK, Tavily live web search API & memory routes | [Chapter 09](chapter-09-memory-search.md) |
| **Ch 10** | **Async Artifacts** | OpenAI structured outputs (`generateObject`), Flashcards, Quizzes & Inngest workers | [Chapter 10](chapter-10-learning-artifacts.md) |

---

## ⚡ Server Quick Start

```bash
# 1. Launch PostgreSQL Container
cd week05/chaibook-llm-sir
docker compose up -d

# 2. Setup Server
cd week05/chaibook-llm-sir/server
npm install
npx prisma migrate dev
npm run dev

# 3. Start Inngest Worker Engine (in separate terminal)
npx inngest-cli@latest dev -u http://localhost:8080/api/inngest
```
