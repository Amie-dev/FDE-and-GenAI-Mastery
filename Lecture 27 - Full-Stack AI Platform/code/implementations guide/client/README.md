# Client Track Master Index — Chaibook LLM Sir Frontend App

Welcome to the **Client Track** for **Chaibook LLM Sir**! This guide takes frontend developers step-by-step through building the Next.js 16 App Router client, React 19 UI, Tailwind CSS v4 components, Better Auth React client, TanStack Query hooks, streaming AI chat UI, and interactive learning viewers.

---

## 📁 Client Folder Architecture Map

All client code should be created inside `week05/chaibook-llm-sir/client/`:

```text
client/
├── next.config.ts                   # Next.js config with API proxy rewrites
├── package.json                     # Client NPM dependencies
├── tsconfig.json                    # TypeScript compiler options
├── components.json                  # Shadcn UI configuration
└── app/                             # Next.js App Router structure
    ├── layout.tsx                   # Root layout with TanStack Query provider
    ├── page.tsx                     # Landing homepage
    ├── globals.css                  # Tailwind CSS v4 styling
    ├── (auth)/
    │   └── login/page.tsx           # OAuth Login page
    └── (protected)/
        ├── layout.tsx               # Protected route guard layout
        ├── dashboard/page.tsx       # Workspaces dashboard page
        ├── settings/memory/page.tsx # Memory settings page
        └── workspace/[id]/
            ├── chat/page.tsx        # Streaming RAG AI chat page
            ├── sources/page.tsx     # Knowledge sources page
            └── learn/page.tsx       # Interactive learning hub
```

---

## 📚 Client Track Chapters

| Chapter | Title | Focus & Core Components | Guide File |
| :--- | :--- | :--- | :--- |
| **Ch 0** | **Overview & Setup** | Frontend architecture, client boundary rules, project setup | [Chapter 00](chapter-00-overview-setup.md) |
| **Ch 1** | **App Router Bootstrap** | Next.js setup, Tailwind CSS, `next.config.ts` API proxy rewrites, `app/page.tsx` | [Chapter 01](chapter-01-bootstrap.md) |
| **Ch 2** | **API Fetch & Providers** | Shared `apiFetch` helper (`shared/lib/api.ts`), TanStack Query Client Provider | [Chapter 02](chapter-02-database.md) |
| **Ch 3** | **OAuth & Protected Guard** | Better Auth React Client (`auth-client.ts`), `<LoginForm />`, Protected Layout guard | [Chapter 03](chapter-03-authentication.md) |
| **Ch 4** | **Workspaces Dashboard** | `useWorkspaces` TanStack Query hook, `<WorkspaceCard />`, `<CreateWorkspaceModal />` | [Chapter 04](chapter-04-workspaces.md) |
| **Ch 5** | **Sources Library UI** | `useSources` hook, `<SourceLibrary />`, `<AddNoteDialog />`, Sources Page | [Chapter 05](chapter-05-sources-crud.md) |
| **Ch 6** | **Import Channel Dialogs** | `<ImportWebsiteDialog />`, `<ImportYoutubeDialog />`, `<UploadPdfDialog />` (FormData) | [Chapter 06](chapter-06-import-channels.md) |
| **Ch 7** | **Source Status Polling** | `<SourceStatusBadge />`, live status auto-polling with TanStack Query (`refetchInterval`) | [Chapter 07](chapter-07-indexing-pipeline.md) |
| **Ch 8** | **Streaming Chat & Citations**| Streaming AI Chat Page (`/workspace/[id]/chat`), `<ChatMessageList />`, Citations renderer | [Chapter 08](chapter-08-rag-chat.md) |
| **Ch 9** | **Memory UI & Web Search** | Memory Settings page (`/settings/memory`), `<MemoryList />`, Web Search toggle | [Chapter 09](chapter-09-memory-search.md) |
| **Ch 10** | **Interactive Study Hub** | Learning Hub page (`/workspace/[id]/learn`), `<FlashcardViewer />`, `<QuizViewer />` | [Chapter 10](chapter-10-learning-artifacts.md) |

---

## ⚡ Client Quick Start

```bash
# 1. Enter client directory
cd week05/chaibook-llm-sir/client

# 2. Install dependencies
npm install

# 3. Start dev server (Port 3000)
npm run dev
```
