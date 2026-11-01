# Chaibook LLM Sir — Step-by-Step Implementation Guides

Welcome to **Chaibook LLM Sir**! This repository is an enterprise-grade AI Notebook and RAG (Retrieval-Augmented Generation) application built with Node.js, Express, PostgreSQL, Prisma ORM, Better Auth, Pinecone Vector DB, Inngest, Next.js 16 (App Router), React 19, and Tailwind CSS v4.

To make building and learning as clear as possible, the step-by-step guides are organized into two dedicated track subdirectories:

---

## 🧭 Choose Your Track

### 🖥️ 1. Server Track (`implementations guide/server/`)
If you are building or studying the backend API, start with the **[Server Track Guide](server/README.md)**.
- **Location**: `week05/chaibook-llm-sir/implementations guide/server/`
- **Contains**: Dedicated chapters 00 to 10 covering Express TS ESM, PostgreSQL pgvector setup, Prisma schema, Better Auth session middleware, 5-layer Workspaces CRUD, Firecrawl web scraper, YouTube transcript extractor, Cloudinary PDF uploads, sliding window text chunker, OpenAI embeddings, Pinecone vector upsert, Inngest background jobs, RAG similarity retrieval, streaming SSE AI chat, Mem0 personal memory, Tavily web search, and structured learning artifact generation.

### 💻 2. Client Track (`implementations guide/client/`)
If you are building or studying the frontend application, start with the **[Client Track Guide](client/README.md)**.
- **Location**: `week05/chaibook-llm-sir/implementations guide/client/`
- **Contains**: Dedicated chapters 00 to 10 covering Next.js 16 App Router, Tailwind CSS v4 setup, API proxy rewrites, shared `apiFetch` client, TanStack Query provider, Better Auth React client, Workspaces Dashboard UI, Source Library UI, Website/YouTube/PDF upload dialogs, source status badges with live polling, streaming AI chat UI with Streamdown renderer, interactive citation tooltips, personal memory settings, and interactive study viewers (Flashcards, Quizzes, Summaries).

---

## 📚 Master Chapter Reference Table

| Chapter | Focus Area | Server Track Guide | Client Track Guide |
| :--- | :--- | :--- | :--- |
| **Ch 0** | **Overview & Setup** | [Server Ch 0](server/chapter-00-overview-setup.md) | [Client Ch 0](client/chapter-00-overview-setup.md) |
| **Ch 1** | **Project Bootstrap** | [Server Ch 1](server/chapter-01-bootstrap.md) | [Client Ch 1](client/chapter-01-bootstrap.md) |
| **Ch 2** | **Database Foundation** | [Server Ch 2](server/chapter-02-database.md) | [Client Ch 2](client/chapter-02-database.md) |
| **Ch 3** | **Authentication** | [Server Ch 3](server/chapter-03-authentication.md) | [Client Ch 3](client/chapter-03-authentication.md) |
| **Ch 4** | **Workspaces CRUD** | [Server Ch 4](server/chapter-04-workspaces.md) | [Client Ch 4](client/chapter-04-workspaces.md) |
| **Ch 5** | **Knowledge Sources CRUD** | [Server Ch 5](server/chapter-05-sources-crud.md) | [Client Ch 5](client/chapter-05-sources-crud.md) |
| **Ch 6** | **Source Import Channels** | [Server Ch 6](server/chapter-06-import-channels.md) | [Client Ch 6](client/chapter-06-import-channels.md) |
| **Ch 7** | **Indexing & Vector Pipeline** | [Server Ch 7](server/chapter-07-indexing-pipeline.md) | [Client Ch 7](client/chapter-07-indexing-pipeline.md) |
| **Ch 8** | **RAG Conversations & Chat** | [Server Ch 8](server/chapter-08-rag-chat.md) | [Client Ch 8](client/chapter-08-rag-chat.md) |
| **Ch 9** | **Memory & Web Search** | [Server Ch 9](server/chapter-09-memory-search.md) | [Client Ch 9](client/chapter-09-memory-search.md) |
| **Ch 10** | **Async Learning Artifacts** | [Server Ch 10](server/chapter-10-learning-artifacts.md) | [Client Ch 10](client/chapter-10-learning-artifacts.md) |

---

## ⚡ Quick Start Sequence

```bash
# 1. Launch PostgreSQL Vector DB Container
cd week05/chaibook-llm-sir
docker compose up -d

# 2. Run Express Server API (Port 8080)
cd week05/chaibook-llm-sir/server
npm install
npx prisma migrate dev
npm run dev

# 3. Run Next.js Client App (Port 3000)
cd week05/chaibook-llm-sir/client
npm install
npm run dev

# 4. Start Inngest Background Worker Engine
npx inngest-cli@latest dev -u http://localhost:8080/api/inngest
```
