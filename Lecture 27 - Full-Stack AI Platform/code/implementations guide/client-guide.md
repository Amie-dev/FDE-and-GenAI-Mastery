# Client Track Guide — Chaibook LLM Sir Frontend App

This guide provides a step-by-step roadmap for building the **Chaibook LLM Sir** frontend application using Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Better Auth Client, TanStack Query, and Vercel AI SDK.

---

## 🛠️ Quick Environment Setup

Before starting Chapter 0, prepare the client directory:

```bash
# 1. Navigate to client directory
cd week05/chaibook-llm-sir/client

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

#### Code Explanation: Client Environment Setup Commands
- **`cd week05/chaibook-llm-sir/client`**: Enters Next.js client application root directory.
- **`npm install`**: Installs React 19, Next.js 15+, Tailwind CSS v4, Lucide icons, TanStack Query, Better Auth client SDK, and Vercel AI SDK dependencies.
- **`npm run dev`**: Launches Next.js local development server on `http://localhost:3000` with hot-module reloading (HMR).

---

## 📁 Client Folder Architecture

```text
client/
├── next.config.ts                   # Next.js config with API proxy rewrites
├── package.json                     # Client NPM dependencies & scripts
├── tsconfig.json                    # TypeScript compiler options
├── components.json                  # Shadcn UI configuration
└── app/                             # Next.js App Router structure
    ├── layout.tsx                   # Root layout with TanStack Query provider
    ├── page.tsx                     # Public landing homepage
    ├── globals.css                  # Global styles & Tailwind CSS v4 imports
    ├── (auth)/                      # Unauthenticated route group
    │   └── login/
    │       └── page.tsx             # Login page with Google OAuth button
    └── (protected)/                 # Authenticated route group
        ├── layout.tsx               # Protected layout wrapper with Auth check
        ├── dashboard/
        │   └── page.tsx             # Workspaces dashboard page
        ├── settings/
        │   └── memory/
        │       └── page.tsx         # Personal memory management settings page
        └── workspace/
            └── [id]/
                ├── page.tsx         # Workspace workspace detail overview
                ├── chat/
                │   └── page.tsx     # RAG streaming AI chat page
                ├── sources/
                │   └── page.tsx     # Knowledge sources management page
                └── learn/
                    └── page.tsx     # Interactive learning artifacts hub
```

---

## 📚 Frontend Implementation Roadmap

Follow these 11 chapters in order to build the frontend application step-by-step:

### Chapter 0 — Client Overview & Layout Architecture
- **Reference Guide**: [chapter-00-overview-setup.md](chapter-00-overview-setup.md)
- **Key Actions**:
  - Understand feature-folder modular layout (`features/workspaces`, `features/sources`, `features/chat`, `features/learn`, `features/memory`).
  - Learn client boundary rules: browser never handles private database connection strings or AI provider keys.

### Chapter 1 — Next.js App Router & API Rewrites Setup
- **Reference Guide**: [chapter-01-bootstrap.md](chapter-01-bootstrap.md)
- **Key Actions**:
  - Configure `client/next.config.ts` with API rewrites proxying `/api/:path*` to `http://localhost:8080/api/:path*`.
  - Build landing page `client/app/page.tsx` with backend status check link.

### Chapter 2 — Shared API Client & Query Client Provider
- **Reference Guide**: [chapter-02-database.md](chapter-02-database.md)
- **Key Actions**:
  - Build `apiFetch` wrapper in `client/shared/lib/api.ts` with credentials, JSON headers, and custom `ApiError` class.
  - Setup TanStack Query client provider in `client/shared/providers/query-provider.tsx` and wrap `client/app/layout.tsx`.

### Chapter 3 — Google OAuth Authentication & Protected Layout
- **Reference Guide**: [chapter-03-authentication.md](chapter-03-authentication.md)
- **Key Actions**:
  - Instantiate Better Auth client in `client/features/auth/lib/auth-client.ts`.
  - Create `<LoginForm />` component in `client/features/auth/components/login-form.tsx`.
  - Build `client/app/(protected)/layout.tsx` to redirect unauthenticated users to `/login`.

### Chapter 4 — Workspaces Dashboard & CRUD UI
- **Reference Guide**: [chapter-04-workspaces.md](chapter-04-workspaces.md)
- **Key Actions**:
  - Build `useWorkspaces` hook in `client/features/workspaces/hooks/use-workspaces.ts`.
  - Create `<WorkspaceCard />` and `<CreateWorkspaceModal />` components.
  - Assemble workspace dashboard in `client/app/(protected)/dashboard/page.tsx`.

### Chapter 5 — Knowledge Sources CRUD UI (Text & Markdown Notes)
- **Reference Guide**: [chapter-05-sources-crud.md](chapter-05-sources-crud.md)
- **Key Actions**:
  - Build `useSources` hook in `client/features/sources/hooks/use-sources.ts`.
  - Create `<SourceLibrary />` and `<AddNoteDialog />` components.
  - Assemble source library page in `client/app/(protected)/workspace/[id]/sources/page.tsx`.

### Chapter 6 — Source Import Dialogs (Web, YouTube & PDF Upload)
- **Reference Guide**: [chapter-06-import-channels.md](chapter-06-import-channels.md)
- **Key Actions**:
  - Build `<ImportWebsiteDialog />` for website URLs.
  - Build `<ImportYoutubeDialog />` for YouTube video links.
  - Build `<UploadPdfDialog />` handling `FormData` multipart file uploads.

### Chapter 7 — Live Source Status Badge & Status Polling
- **Reference Guide**: [chapter-07-indexing-pipeline.md](chapter-07-indexing-pipeline.md)
- **Key Actions**:
  - Build `<SourceStatusBadge />` in `client/features/sources/components/source-status-badge.tsx`.
  - Implement polling strategy in TanStack Query (`refetchInterval`) to auto-refresh source status while status is `PENDING` or `PROCESSING`.

### Chapter 8 — Streaming RAG AI Chat UI & Citations Renderer
- **Reference Guide**: [chapter-08-rag-chat.md](chapter-08-rag-chat.md)
- **Key Actions**:
  - Build `<ChatMessageList />` and `<ChatInput />` components.
  - Implement streaming response handler using Vercel AI SDK `@ai-sdk/react`.
  - Render Markdown content with `<StreamdownContent />` and render citation tags (`[1]`, `[2]`) as interactive hover tooltips.

### Chapter 9 — Personal Memory Management UI & Live Web Search Toggle
- **Reference Guide**: [chapter-09-memory-search.md](chapter-09-memory-search.md)
- **Key Actions**:
  - Build memory settings page in `client/app/(protected)/settings/memory/page.tsx`.
  - Create `<MemoryList />` component allowing users to inspect and delete saved memory facts.
  - Add web search toggle switch in chat input toolbar.

### Chapter 10 — Interactive Learning Artifacts Hub & Viewers
- **Reference Guide**: [chapter-10-learning-artifacts.md](chapter-10-learning-artifacts.md)
- **Key Actions**:
  - Build Learning Hub in `client/app/(protected)/workspace/[id]/learn/page.tsx`.
  - Create `<FlashcardViewer />` with 3D flip animations using Framer Motion.
  - Create `<QuizViewer />` with score calculation and answer feedback.
  - Create `<SummaryViewer />` with formatted markdown rendering.

---

## 🧪 Client Build Verification

Run linting and production build verification:

```bash
cd week05/chaibook-llm-sir/client
npm run lint
npm run build
```

#### Code Explanation: Verification Commands
- **`npm run lint`**: Scans React JSX, hooks dependencies, and imports against ESLint configuration.
- **`npm run build`**: Compiles Next.js React components into optimized production assets.
