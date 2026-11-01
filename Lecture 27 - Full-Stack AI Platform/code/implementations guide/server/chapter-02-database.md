# 🗄️ Server Chapter 2 — Database Foundation & Prisma ORM

## 1. Goal & Outcome

### 🎯 Goal

Design and connect the application's relational database using **PostgreSQL + Prisma ORM**.

The database is designed around the core entities of the application:

- Users
- Sessions
- Accounts
- Verification records
- Workspaces
- Sources
- Source chunks
- Conversations
- Messages
- Learning artifacts

The chapter also introduces:

- Prisma schema modeling
- PostgreSQL relations
- Foreign keys
- Cascading deletes
- Unique constraints
- Composite indexes
- Enums
- JSON fields
- Array fields
- Prisma Client
- PostgreSQL driver adapter
- Connection pooling
- Singleton database clients
- Development hot-reload protection

---

## 2. Student Outcome

After completing this chapter, you should understand:

1. How Prisma represents a relational database schema.
2. How Prisma models become PostgreSQL tables.
3. How primary keys and foreign keys work.
4. How one-to-many relationships are represented.
5. Why indexes are necessary.
6. How composite indexes improve common queries.
7. Why enums are useful for controlled values.
8. When JSON fields are useful.
9. How `@default()` and `@updatedAt` work.
10. How cascading deletes protect relational consistency.
11. How Prisma Client communicates with PostgreSQL.
12. Why a singleton Prisma client is useful during development.
13. How PostgreSQL connection pooling works.
14. How the database fits into the larger backend architecture.

---

# 3. Database Architecture

The backend follows this general architecture:

```text
                    Express API
                        │
                        ▼
                   Controllers
                        │
                        ▼
                    Services
                        │
                        ▼
                  Prisma Client
                        │
                        ▼
                PostgreSQL Adapter
                        │
                        ▼
                  PostgreSQL DB
```

Prisma sits between application code and PostgreSQL.

Instead of manually writing SQL everywhere:

```sql
SELECT * FROM workspace WHERE user_id = ...;
```

the application can use Prisma:

```typescript
const workspaces = await prisma.workspace.findMany({
  where: {
    userId,
  },
});
```

Prisma provides:

- type-safe database access
- schema management
- migrations
- generated client APIs
- relationship handling
- query building

---

# 4. Database Installation

From:

```text
week05/chaibook-llm-sir/server
```

run:

```bash
cd week05/chaibook-llm-sir/server
```

Install Prisma Client and PostgreSQL integration:

```bash
npm install @prisma/client @prisma/adapter-pg pg
```

Install Prisma CLI as a development dependency:

```bash
npm install -D prisma
```

---

## 4.1 What Each Package Does

### `@prisma/client`

```text
@prisma/client
```

provides the application-side Prisma Client API.

After Prisma generates the client, application code can perform operations such as:

```typescript
prisma.user.findUnique(...)
prisma.workspace.create(...)
prisma.source.findMany(...)
prisma.message.create(...)
```

---

### `prisma`

```text
prisma
```

is the Prisma CLI/tooling package.

It is commonly used for:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

It handles development-time database workflows.

---

### `@prisma/adapter-pg`

```text
@prisma/adapter-pg
```

provides the PostgreSQL driver adapter used by the Prisma Client configuration in this project.

It connects Prisma's client layer to PostgreSQL through the Node PostgreSQL driver.

---

### `pg`

```text
pg
```

is the PostgreSQL driver for Node.js.

The architecture is:

```text
Application
     │
     ▼
Prisma Client
     │
     ▼
PrismaPg Adapter
     │
     ▼
pg Pool
     │
     ▼
PostgreSQL
```

---

# 5. Prisma Schema

## File Path

```text
server/prisma/schema.prisma
```

The Prisma schema is the central database definition for the project.

It describes:

- database provider
- Prisma Client generation
- tables/models
- columns/fields
- relationships
- constraints
- indexes
- enums
- defaults

The schema acts as a bridge between the application's data model and PostgreSQL.

---

# 6. Prisma Client Generator

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

This block tells Prisma how to generate the Prisma Client.

---

## `generator client`

```prisma
generator client {
```

defines a Prisma generator named:

```text
client
```

The generator is responsible for producing code that the application will use to communicate with the database.

---

## `provider`

```prisma
provider = "prisma-client"
```

specifies the Prisma Client generator being used.

Prisma reads the schema and generates a typed client based on the models defined in the file.

For example, because the schema contains:

```prisma
model User {
  ...
}
```

the generated Prisma Client exposes a corresponding API such as:

```typescript
prisma.user;
```

Likewise:

```text
Workspace → prisma.workspace
Source → prisma.source
Message → prisma.message
LearningArtifact → prisma.learningArtifact
```

---

## `output`

```prisma
output = "../src/generated/prisma"
```

specifies where the generated Prisma Client code should be placed.

The structure becomes approximately:

```text
server/
├── prisma/
│   └── schema.prisma
│
└── src/
    └── generated/
        └── prisma/
```

This project therefore imports the generated client from:

```typescript
import { PrismaClient } from "../generated/prisma/client.js";
```

---

# 7. PostgreSQL Datasource

```prisma
datasource db {
  provider = "postgresql"
}
```

This declares that the database is PostgreSQL.

The important distinction is:

```text
Prisma Schema
     │
     ▼
Database Provider
     │
     ▼
PostgreSQL
```

The schema defines the application's data model while PostgreSQL provides the actual relational database engine.

---

# 8. `User` Model

```prisma
model User {
  id            String      @id
  name          String
  email         String
  emailVerified Boolean     @default(false)
  image         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  sessions      Session[]
  accounts      Account[]
  workspaces    Workspace[]

  @@unique([email])
  @@map("user")
}
```

The `User` model represents an application user.

Conceptually, it becomes a database table:

```text
user
```

with relationships to:

```text
Session
Account
Workspace
```

---

# 9. User Primary Key

```prisma
id String @id
```

`@id` marks the field as the model's primary key.

A primary key uniquely identifies each row.

Conceptually:

```text
user
────────────────────────────
id          name       email
────────────────────────────
user_001    Aminul     ...
user_002    Ali        ...
user_003    Sara       ...
```

The `id` value distinguishes one user from another.

---

# 10. User Basic Fields

```prisma
name String
email String
```

These are required fields.

The absence of `?` means the value cannot be null.

Therefore:

```text
name  → required
email → required
```

while:

```prisma
image String?
```

means:

```text
image → optional
```

---

# 11. Boolean Default

```prisma
emailVerified Boolean @default(false)
```

New users automatically receive:

```text
emailVerified = false
```

unless another value is explicitly provided.

The lifecycle is:

```text
New User
   │
   ▼
emailVerified = false
   │
   ▼
Email verification
   │
   ▼
emailVerified = true
```

---

# 12. Optional Fields

```prisma
image String?
```

The `?` means the database field is nullable.

A user may have:

```text
image = "https://..."
```

or:

```text
image = null
```

This is useful for profile images because an image may not exist when the account is first created.

---

# 13. Timestamps

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### `createdAt`

```prisma
@default(now())
```

automatically stores the creation timestamp.

### `updatedAt`

```prisma
@updatedAt
```

automatically updates when Prisma updates the record.

Conceptually:

```text
Record created
     │
     ├── createdAt = current time
     └── updatedAt = current time

Record modified
     │
     └── updatedAt = new current time
```

These fields are extremely useful for auditing and sorting.

---

# 14. User Relationships

```prisma
sessions Session[]
accounts Account[]
workspaces Workspace[]
```

These fields represent one-to-many relationships.

One user can have:

```text
1 User
 │
 ├── many Sessions
 ├── many Accounts
 └── many Workspaces
```

The `[]` indicates a list/collection.

---

# 15. Unique Email Constraint

```prisma
@@unique([email])
```

This creates a uniqueness constraint on the email field.

Therefore:

```text
user@example.com
```

cannot be registered for multiple users.

Conceptually:

```text
User A → user@example.com ✅
User B → user@example.com ❌
```

The database itself enforces this rule.

This is important because application-level checks alone can suffer from race conditions.

---

# 16. Mapping Prisma Model Names to Database Tables

```prisma
@@map("user")
```

This tells Prisma to map the model:

```text
User
```

to the database table:

```text
user
```

This allows the Prisma model name and physical PostgreSQL table name to be different.

---

# 17. `Session` Model

```prisma
model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ipAddress String?
  userAgent String?

  userId    String
  user      User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([token])
  @@index([userId])
  @@map("session")
}
```

The `Session` model represents an authenticated session belonging to a user.

The key relationship is:

```text
User
 │
 └── Session
```

One user can have multiple sessions.

For example:

```text
Aminul
 ├── Chrome session
 ├── Mobile session
 └── Edge session
```

---

# 18. Session Expiration

```prisma
expiresAt DateTime
```

This stores when the session expires.

The authentication system can use this timestamp to determine whether a session is still valid.

---

# 19. Session Token

```prisma
token String
```

This stores the session token.

The token is additionally protected by:

```prisma
@@unique([token])
```

so two sessions cannot share the same token.

---

# 20. Session → User Foreign Key

```prisma
userId String
```

This stores the ID of the user who owns the session.

The actual relationship is declared with:

```prisma
user User @relation(
  fields: [userId],
  references: [id],
  onDelete: Cascade
)
```

This means:

```text
session.userId
       │
       ▼
user.id
```

`userId` is the foreign-key field.

---

# 21. Understanding `@relation`

The relationship:

```prisma
@relation(
  fields: [userId],
  references: [id]
)
```

means:

> Use `Session.userId` as the foreign key and connect it to `User.id`.

Conceptually:

```text
User
────────────────
id = user_123
        ▲
        │
        │
userId = user_123
────────────────
Session
```

---

# 22. `onDelete: Cascade`

```prisma
onDelete: Cascade
```

means that when a parent user is deleted, its related sessions are automatically deleted.

For example:

```text
Delete User
    │
    ▼
Delete Sessions
```

Without proper cascading behavior, orphaned records could remain.

This project uses the same principle for other parent-child relationships.

---

# 23. Session Index

```prisma
@@index([userId])
```

This creates an index on `userId`.

It improves queries such as:

```text
Find all sessions belonging to a user
```

Instead of potentially scanning the entire session table, PostgreSQL can use the index to locate relevant records efficiently.

---

# 24. `Account` Model

```prisma
model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String

  user                  User      @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  accessToken           String?
  refreshToken          String?
  idToken               String?

  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?

  scope                 String?
  password              String?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}
```

This model represents an authentication account associated with a user.

A user may have multiple authentication accounts.

Conceptually:

```text
User
 │
 ├── Google Account
 ├── GitHub Account
 └── Other Provider
```

The exact providers depend on the authentication configuration.

---

# 25. Account Tokens

The model supports optional authentication-related tokens:

```prisma
accessToken String?
refreshToken String?
idToken String?
```

The fields are optional because not every authentication mechanism requires every token.

Expiration fields are also optional:

```prisma
accessTokenExpiresAt DateTime?
refreshTokenExpiresAt DateTime?
```

This provides flexibility for different authentication providers.

---

# 26. `Verification` Model

```prisma
model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}
```

This model stores temporary verification information.

The important fields are:

```text
identifier
value
expiresAt
```

For example, verification workflows may require a temporary value associated with an identifier and an expiration time.

The index:

```prisma
@@index([identifier])
```

helps quickly find verification records by identifier.

---

# 27. `Workspace` Model

```prisma
model Workspace {
  id            String         @id @default(cuid())
  userId        String
  title         String
  description   String?
  icon          String?
  defaultModel  String         @default("gpt-4o-mini")

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  sources       Source[]
  conversations Conversation[]
  artifacts     LearningArtifact[]

  @@index([userId])
  @@map("workspace")
}
```

A workspace represents an isolated area belonging to a user.

Conceptually:

```text
User
 │
 ├── Workspace A
 │    ├── Sources
 │    ├── Conversations
 │    └── Artifacts
 │
 └── Workspace B
      ├── Sources
      ├── Conversations
      └── Artifacts
```

This makes the workspace an important organizational boundary in the application.

---

# 28. `cuid()` IDs

```prisma
id String @id @default(cuid())
```

Unlike the `User` model, the workspace ID is generated automatically.

`cuid()` generates a collision-resistant identifier.

Therefore the application does not need to manually provide the workspace ID when creating a workspace.

Conceptually:

```typescript
await prisma.workspace.create({
  data: {
    userId,
    title: "AI Learning",
  },
});
```

Prisma/database generation provides the ID.

---

# 29. Workspace Default Model

```prisma
defaultModel String @default("gpt-4o-mini")
```

Every new workspace receives a default model value:

```text
gpt-4o-mini
```

unless another value is explicitly provided.

This means model selection is persisted at the workspace level.

---

# 30. Workspace Relationships

```prisma
sources Source[]
conversations Conversation[]
artifacts LearningArtifact[]
```

One workspace can contain many:

```text
Sources
Conversations
Learning Artifacts
```

This produces the core hierarchy:

```text
User
 │
 ▼
Workspace
 │
 ├── Sources
 │
 ├── Conversations
 │      └── Messages
 │
 └── Learning Artifacts
```

---

# 31. Source Enums

```prisma
enum SourceType {
  PDF
  WEBSITE
  YOUTUBE
  TEXT
  MARKDOWN
}
```

An enum defines a controlled set of allowed values.

A source can therefore have one of these types:

```text
PDF
WEBSITE
YOUTUBE
TEXT
MARKDOWN
```

Instead of allowing arbitrary strings such as:

```text
"pdf"
"PDF_FILE"
"document"
"something"
```

the schema defines an explicit set.

This improves consistency.

---

# 32. `SourceStatus`

```prisma
enum SourceStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}
```

This represents the source processing lifecycle.

A source can move through states such as:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ├──► READY
   │
   └──► FAILED
```

This is particularly useful for asynchronous ingestion.

---

# 33. `Source` Model

```prisma
model Source {
  id          String       @id @default(cuid())
  workspaceId String

  type        SourceType
  title       String
  content     String?
  url         String?

  status      SourceStatus @default(PENDING)
  metadata    Json?

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  workspace   Workspace    @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  chunks      SourceChunk[]

  @@index([workspaceId])
  @@index([workspaceId, type])
  @@index([workspaceId, status])

  @@map("source")
}
```

A `Source` represents content imported into a workspace.

Examples:

```text
PDF
Website
YouTube video
Plain text
Markdown
```

---

# 34. Source Content and URL

```prisma
content String?
url String?
```

Different source types need different fields.

For example:

```text
PDF       → content / extracted data
WEBSITE   → url
YOUTUBE   → url
TEXT      → content
MARKDOWN  → content
```

Because not every source has both, these fields are optional.

---

# 35. Source Metadata

```prisma
metadata Json?
```

JSON is useful when the metadata structure can vary between source types.

For example:

```json
{
  "author": "Example",
  "pageCount": 42,
  "language": "en"
}
```

Another source could have:

```json
{
  "channel": "Example Channel",
  "duration": 1250
}
```

A JSON field provides flexibility without creating a large number of specialized columns.

---

# 36. Source Status Default

```prisma
status SourceStatus @default(PENDING)
```

Every newly created source begins in:

```text
PENDING
```

The ingestion pipeline can then update it:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ▼
READY
```

or:

```text
PROCESSING
   │
   ▼
FAILED
```

This is especially useful for background processing systems.

---

# 37. Source → Workspace Relationship

```prisma
workspace Workspace @relation(
  fields: [workspaceId],
  references: [id],
  onDelete: Cascade
)
```

Every source belongs to one workspace.

The foreign key is:

```text
Source.workspaceId
```

which references:

```text
Workspace.id
```

Therefore:

```text
Workspace
    │
    ├── Source 1
    ├── Source 2
    └── Source 3
```

---

# 38. Source Indexes

The model contains three indexes:

```prisma
@@index([workspaceId])
@@index([workspaceId, type])
@@index([workspaceId, status])
```

These are designed around likely application queries.

### Index 1

```prisma
@@index([workspaceId])
```

Useful for:

```text
Get all sources belonging to a workspace
```

### Index 2

```prisma
@@index([workspaceId, type])
```

Useful for queries such as:

```text
Get all PDF sources in this workspace
```

### Index 3

```prisma
@@index([workspaceId, status])
```

Useful for queries such as:

```text
Get all PROCESSING sources in this workspace
```

This is an example of **query-aware schema design**.

---

# 39. `SourceChunk` Model

```prisma
model SourceChunk {
  id         String   @id @default(cuid())
  sourceId   String
  index      Int
  content    String
  tokenCount Int?
  metadata   Json?

  createdAt  DateTime @default(now())

  source     Source @relation(
    fields: [sourceId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([sourceId, index])
  @@index([sourceId])

  @@map("source_chunk")
}
```

This model represents chunks created from a source.

For example:

```text
PDF
 │
 ▼
Extracted Text
 │
 ▼
Chunking
 │
 ├── Chunk 0
 ├── Chunk 1
 ├── Chunk 2
 └── Chunk 3
```

Each chunk belongs to one source.

---

# 40. Chunk Ordering

```prisma
index Int
```

The `index` represents the chunk's position within the source.

For example:

```text
source_id = source_123

index 0 → Introduction
index 1 → Chapter 1
index 2 → Chapter 2
index 3 → Conclusion
```

This preserves the original chunk ordering.

---

# 41. Composite Unique Constraint

```prisma
@@unique([sourceId, index])
```

This is an important constraint.

It means the combination of:

```text
sourceId + index
```

must be unique.

Therefore:

```text
source_123 + index 0 ✅
source_123 + index 1 ✅
source_123 + index 0 ❌
```

But another source can also have index `0`:

```text
source_123 + 0 ✅
source_456 + 0 ✅
```

This is exactly what we want because chunk indexes only need to be unique **within a source**.

---

# 42. Chunk Token Count

```prisma
tokenCount Int?
```

This optionally stores the number of tokens in a chunk.

This can be useful for:

- LLM context management
- embedding limits
- cost estimation
- chunk analysis
- retrieval constraints

---

# 43. `MessageRole` Enum

```prisma
enum MessageRole {
  USER
  ASSISTANT
}
```

This defines who created a message.

Allowed values are:

```text
USER
ASSISTANT
```

This provides a structured representation of conversation messages.

---

# 44. `Conversation` Model

```prisma
model Conversation {
  id                  String    @id @default(cuid())
  workspaceId         String

  title               String?
  summary             String?
  summaryMessageCount Int       @default(0)
  summarizedAt        DateTime?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  workspace           Workspace @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  messages            Message[]

  @@index([workspaceId])
  @@index([workspaceId, updatedAt])

  @@map("conversation")
}
```

A conversation represents a chat thread inside a workspace.

The relationship is:

```text
Workspace
   │
   ├── Conversation 1
   │      ├── Message
   │      ├── Message
   │      └── Message
   │
   └── Conversation 2
          ├── Message
          └── Message
```

---

# 45. Conversation Summary Fields

```prisma
summary String?
summaryMessageCount Int @default(0)
summarizedAt DateTime?
```

These fields support conversation summarization.

For long conversations, the application can periodically summarize older messages.

The fields track:

```text
summary
   ↓
Current stored summary

summaryMessageCount
   ↓
How many messages were included

summarizedAt
   ↓
When summarization occurred
```

This is useful for memory/context management in an AI application.

---

# 46. Conversation Index by Workspace

```prisma
@@index([workspaceId])
```

This helps retrieve conversations belonging to a workspace.

For example:

```text
Find all conversations for workspace X
```

---

# 47. Composite Conversation Index

```prisma
@@index([workspaceId, updatedAt])
```

This index is particularly useful for queries such as:

```text
Get conversations for a workspace
ordered by most recently updated
```

The index is aligned with a common UI requirement:

```text
Recent Conversations
────────────────────
Conversation C
Conversation A
Conversation B
```

---

# 48. `Message` Model

```prisma
model Message {
  id             String       @id @default(cuid())
  conversationId String

  role           MessageRole
  content        String
  citations      Json?

  createdAt      DateTime     @default(now())

  conversation   Conversation @relation(
    fields: [conversationId],
    references: [id],
    onDelete: Cascade
  )

  @@index([conversationId])
  @@index([conversationId, createdAt])

  @@map("message")
}
```

A message belongs to a conversation.

It stores:

```text
role
content
citations
createdAt
```

---

# 49. Message Role

```prisma
role MessageRole
```

The message must use one of the values from:

```prisma
enum MessageRole {
  USER
  ASSISTANT
}
```

Therefore the database can distinguish:

```text
USER      → question/input
ASSISTANT  → AI response
```

---

# 50. Message Content

```prisma
content String
```

This contains the actual message text.

Unlike optional fields, there is no `?`, meaning every message must have content.

---

# 51. Message Citations

```prisma
citations Json?
```

AI responses may contain citations generated from retrieved sources.

A flexible JSON structure can represent information such as:

```json
{
  "sources": [
    {
      "sourceId": "source_123",
      "chunkIndex": 4
    }
  ]
}
```

The exact citation structure can evolve without requiring multiple relational columns.

---

# 52. Message Ordering

```prisma
@@index([conversationId, createdAt])
```

This index is useful for retrieving messages in chronological order.

For example:

```text
Conversation
     │
     ▼
Messages
     │
     ├── 10:00
     ├── 10:01
     ├── 10:02
     └── 10:04
```

A common query is:

```text
Get messages belonging to conversation X ordered by createdAt
```

The composite index is designed for that access pattern.

---

# 53. Artifact Types

```prisma
enum ArtifactType {
  SUMMARY
  TAKEAWAYS
  FLASHCARDS
  QUIZ
  MINDMAP
  REPORT
}
```

This defines the different learning artifacts that the application can generate.

Examples:

```text
SUMMARY
TAKEAWAYS
FLASHCARDS
QUIZ
MINDMAP
REPORT
```

This makes the artifact system extensible while keeping its types controlled.

---

# 54. Artifact Processing Status

```prisma
enum ArtifactStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}
```

This is similar to `SourceStatus`.

An artifact may be generated asynchronously:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ├──► READY
   │
   └──► FAILED
```

This is useful when generating artifacts requires LLM calls or other background processing.

---

# 55. `LearningArtifact` Model

```prisma
model LearningArtifact {
  id          String         @id @default(cuid())
  workspaceId String

  type        ArtifactType
  title       String
  content     Json?
  sourceIds   String[]

  status      ArtifactStatus @default(PENDING)
  metadata    Json?

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  workspace   Workspace      @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  @@index([workspaceId])
  @@index([workspaceId, type])
  @@index([workspaceId, status])

  @@map("learning_artifact")
}
```

A learning artifact is generated learning material associated with a workspace.

Examples include:

```text
Summary
Takeaways
Flashcards
Quiz
Mindmap
Report
```

---

# 56. Artifact Content as JSON

```prisma
content Json?
```

Different artifact types can have completely different structures.

For example, a summary might look like:

```json
{
  "summary": "..."
}
```

A quiz could look like:

```json
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C"],
      "answer": "B"
    }
  ]
}
```

A flashcard could look like:

```json
{
  "cards": [
    {
      "front": "...",
      "back": "..."
    }
  ]
}
```

Using JSON allows one model to support multiple artifact structures.

---

# 57. `sourceIds String[]`

```prisma
sourceIds String[]
```

This stores an array of source IDs associated with the artifact.

Conceptually:

```text
Learning Artifact
       │
       ├── source_123
       ├── source_456
       └── source_789
```

The field records which sources contributed to the generated artifact.

This design is different from Prisma's explicit relational `@relation` because the schema stores the IDs as an array rather than defining a separate many-to-many relation table.

---

# 58. Artifact Indexes

```prisma
@@index([workspaceId])
@@index([workspaceId, type])
@@index([workspaceId, status])
```

These indexes support common workspace-level queries.

### Workspace

```text
Get all artifacts in a workspace
```

### Workspace + type

```text
Get all quizzes in a workspace
```

### Workspace + status

```text
Get all artifacts currently processing
```

Again, the indexes are based on expected query patterns.

---

# 59. Database Relationship Map

The complete relational structure can be represented as:

```text
                           User
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          Session        Account       Workspace
                                            │
                       ┌────────────────────┼────────────────────┐
                       │                    │                    │
                       ▼                    ▼                    ▼
                    Source             Conversation        LearningArtifact
                       │                    │
                       ▼                    ▼
                  SourceChunk            Message
```

This is the core relational hierarchy.

---

# 60. Cascade Delete Architecture

The schema uses:

```prisma
onDelete: Cascade
```

through several parent-child relationships.

The conceptual behavior is:

```text
Delete User
   │
   ├── Delete Sessions
   ├── Delete Accounts
   └── Delete Workspaces
          │
          ├── Delete Sources
          │      └── Delete SourceChunks
          │
          ├── Delete Conversations
          │      └── Delete Messages
          │
          └── Delete LearningArtifacts
```

This ensures dependent records do not remain after their parent records are removed.

---

# 61. Indexing Strategy

The schema contains indexes such as:

```prisma
@@index([userId])
@@index([workspaceId])
@@index([workspaceId, type])
@@index([workspaceId, status])
@@index([conversationId])
@@index([conversationId, createdAt])
```

Indexes should not be added randomly.

They should correspond to common query patterns.

For example:

```text
Query:
Find messages for conversation X
        │
        ▼
Index:
(conversationId, createdAt)
```

or:

```text
Query:
Find processing sources for workspace X
        │
        ▼
Index:
(workspaceId, status)
```

This is an important database-design principle:

> **Design indexes around how the application actually queries the database.**

---

# 62. `@id` vs `@unique` vs `@@index`

These three concepts are easy to confuse.

### `@id`

Identifies the primary key.

```prisma
id String @id
```

Meaning:

```text
This uniquely identifies the row.
```

### `@unique`

Creates a unique constraint on one field.

```prisma
email String

@@unique([email])
```

Meaning:

```text
Two users cannot have the same email.
```

### `@@index`

Creates an index for faster lookup.

```prisma
@@index([userId])
```

Meaning:

```text
Optimize queries involving userId.
```

A unique constraint also creates uniqueness enforcement; an ordinary index does not.

---

# 63. Optional Fields vs Required Fields

Prisma uses:

```text
String
```

for required values.

And:

```text
String?
```

for nullable/optional values.

Examples:

```prisma
title       String
description String?
image       String?
url         String?
```

Therefore:

```text
title       → required
description → optional
image       → optional
url         → optional
```

This distinction becomes part of the database design.

---

# 64. Generated Client and Database Access

After the Prisma Client is generated, application code can use APIs based on the schema.

For example:

```typescript
const workspace = await prisma.workspace.findUnique({
  where: {
    id: workspaceId,
  },
});
```

Because the schema contains:

```prisma
model Workspace
```

Prisma generates:

```text
prisma.workspace
```

The same applies to:

```text
prisma.user
prisma.session
prisma.account
prisma.source
prisma.sourceChunk
prisma.conversation
prisma.message
prisma.learningArtifact
```

This is one of Prisma's major advantages: the database schema drives the generated TypeScript API.

---

# 65. Prisma Client Singleton

## File Path

```text
server/src/lib/db.ts
```

## Complete Source Code

```typescript
/**
 * Prisma Client singleton with PostgreSQL driver adapter.
 *
 * Reuses one client in development (via `globalThis`)
 * to survive hot reloads.
 *
 * Requires `DATABASE_URL` in the environment.
 */

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    ),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

---

# 66. Why Do We Need a Singleton?

Database clients often maintain connections or connection pools.

If development hot reload repeatedly creates new Prisma clients, the application can accidentally create many database connections.

The problem can look like:

```text
Hot Reload
    │
    ▼
New Prisma Client
    │
    ▼
New Pool
    │
    ▼
More DB connections
```

Repeated many times:

```text
Client 1 → Pool
Client 2 → Pool
Client 3 → Pool
Client 4 → Pool
...
```

This can exhaust database connections.

The singleton approach tries to reuse the same client during development.

---

# 67. Importing `PrismaClient`

```typescript
import { PrismaClient } from "../generated/prisma/client.js";
```

This imports the generated Prisma Client.

It provides the TypeScript API used by the application.

For example:

```typescript
prisma.user.findMany();
```

or:

```typescript
prisma.workspace.create();
```

---

# 68. Importing `PrismaPg`

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
```

`PrismaPg` connects Prisma's client layer to the PostgreSQL driver.

The architecture is:

```text
Prisma Client
     │
     ▼
PrismaPg
     │
     ▼
PostgreSQL Driver
```

---

# 69. Importing PostgreSQL `Pool`

```typescript
import { Pool } from "pg";
```

`Pool` manages a collection of PostgreSQL connections.

Instead of opening and closing a new database connection for every query, a connection pool can reuse existing connections.

Conceptually:

```text
Application
     │
     ▼
Connection Pool
 ┌───┼───┬───┐
 ▼   ▼   ▼   ▼
 DB  DB  DB  DB
```

The pool manages these connections according to the driver's configuration.

---

# 70. `globalThis` Singleton Storage

```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
```

This creates a typed reference to a property stored on the global JavaScript runtime object.

The important idea is:

```text
globalThis
   │
   └── prisma
```

The application uses this location to preserve the Prisma client across development reloads.

---

# 71. Why the Type Assertion?

```typescript
globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
```

TypeScript does not automatically know that:

```text
globalThis.prisma
```

should exist.

The assertion tells TypeScript that the application expects a global object containing:

```typescript
{
  prisma: PrismaClient | undefined;
}
```

This is a compile-time type assertion.

It does not create the property by itself.

---

# 72. Reusing or Creating Prisma

```typescript
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    ),
  });
```

This is the core singleton logic.

The nullish coalescing operator:

```typescript
??
```

means:

```text
Existing Prisma client?
       │
   ┌───┴───┐
  Yes      No
   │        │
   ▼        ▼
Reuse    Create new
```

So if:

```typescript
globalForPrisma.prisma;
```

already exists, it is reused.

Otherwise, a new Prisma Client is created.

---

# 73. Creating the PostgreSQL Pool

```typescript
new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

The PostgreSQL pool receives the database connection string from:

```text
DATABASE_URL
```

For example, the environment might contain a PostgreSQL connection string.

The important principle is:

> Database credentials belong in environment configuration, not directly in source code.

---

# 74. Creating the Prisma PostgreSQL Adapter

```typescript
new PrismaPg(
  new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
);
```

This wraps the PostgreSQL pool in the Prisma PostgreSQL adapter.

The flow is:

```text
DATABASE_URL
     │
     ▼
pg Pool
     │
     ▼
PrismaPg
     │
     ▼
PrismaClient
```

Each layer has a specific responsibility.

---

# 75. Creating Prisma Client

```typescript
new PrismaClient({
  adapter: new PrismaPg(...),
})
```

The Prisma Client is configured with the PostgreSQL adapter.

After this object is created, application code can use:

```typescript
prisma.user;
prisma.workspace;
prisma.source;
prisma.message;
```

and other generated model APIs.

---

# 76. Development Global Assignment

```typescript
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This is the development hot-reload protection.

In development:

```text
NODE_ENV !== production
```

so the client is stored globally:

```text
globalThis.prisma = prisma
```

When the development environment reloads modules, the global reference can remain available for reuse.

---

# 77. Why Not Store It Globally in Production?

The pattern intentionally stores the client globally only when:

```text
NODE_ENV !== production
```

Production environments normally have a more stable module lifecycle than development hot reloads.

The goal here is specifically to protect development from repeatedly creating clients during module reloads.

---

# 78. Exporting the Prisma Client

```typescript
export default prisma;
```

This makes the configured client available throughout the application.

Other files can simply import:

```typescript
import prisma from "../lib/db.js";
```

and then use:

```typescript
await prisma.user.findMany();
```

This avoids recreating the database client in every service.

---

# 79. Database Access Architecture

The complete flow is:

```text
Route
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
import prisma from "../lib/db.js"
  │
  ▼
Prisma Client
  │
  ▼
PrismaPg Adapter
  │
  ▼
pg Pool
  │
  ▼
PostgreSQL
```

This creates a clean separation between:

```text
HTTP Layer
     │
     ▼
Business Logic
     │
     ▼
Data Access
     │
     ▼
Database
```

---

# 80. Database Lifecycle Example

Consider creating a new source.

The application might conceptually execute:

```text
User uploads PDF
       │
       ▼
API Route
       │
       ▼
Controller
       │
       ▼
Source Service
       │
       ▼
Prisma Client
       │
       ▼
PostgreSQL
       │
       ▼
Source row created
       │
       ▼
status = PENDING
```

Then a background process can update it:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ▼
Create SourceChunks
   │
   ▼
READY
```

This database design therefore supports the application's asynchronous ingestion architecture.

---

# 81. RAG Data Relationship

The schema also establishes the foundation for retrieval-augmented generation.

The data hierarchy is:

```text
Workspace
    │
    ▼
Source
    │
    ▼
SourceChunk
    │
    ▼
Embedding / Vector Layer
```

The relational database stores:

```text
Source metadata
Source content
Chunk content
Chunk ordering
Token counts
Processing status
```

A separate vector database can later store embeddings for retrieval.

Conceptually:

```text
                 Source
                   │
                   ▼
               SourceChunk
                /        \
               /          \
              ▼            ▼
        PostgreSQL       Vector DB
        metadata         embeddings
```

The exact vector-storage implementation is outside this schema, but the relational structure provides the source/chunk identity needed to connect those systems.

---

# 82. Conversation + Memory Foundation

The conversation structure is:

```text
Workspace
   │
   ▼
Conversation
   │
   ▼
Message
```

The schema also includes summary-related fields:

```text
summary
summaryMessageCount
summarizedAt
```

This provides a database foundation for maintaining summarized conversation context.

Conceptually:

```text
Long Conversation
       │
       ▼
Messages
       │
       ▼
Summarization
       │
       ▼
Conversation.summary
```

---

# 83. Learning Artifact Architecture

Learning artifacts connect generated educational content to a workspace:

```text
Workspace
    │
    ▼
LearningArtifact
    │
    ├── type
    ├── content
    ├── sourceIds
    ├── status
    └── metadata
```

Different artifact types can share the same database model because their detailed content is stored in JSON.

This provides a flexible foundation for AI-generated learning features.

---

# 84. Important Prisma Concepts Introduced

| Prisma Feature         | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `model`                | Defines a database entity/table              |
| `enum`                 | Restricts a field to known values            |
| `@id`                  | Defines primary key                          |
| `@default()`           | Provides automatic default values            |
| `@updatedAt`           | Automatically updates modification timestamp |
| `?`                    | Makes a field optional/nullable              |
| `@relation()`          | Defines a relationship between models        |
| `onDelete: Cascade`    | Deletes dependent records with parent        |
| `@unique` / `@@unique` | Enforces uniqueness                          |
| `@@index`              | Creates database indexes                     |
| `@map` / `@@map`       | Maps Prisma names to database names          |
| `Json`                 | Stores flexible JSON data                    |
| `String[]`             | Stores an array of strings                   |

---

# 85. Complete Database Architecture

The final database foundation can be visualized as:

```text
                              PostgreSQL
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
           User              Verification          Account
             │
       ┌─────┼─────┐
       │     │     │
       ▼     ▼     ▼
   Session   │   Workspace
             │       │
             │   ┌───┼───────────────┐
             │   │   │               │
             │   ▼   ▼               ▼
             │ Source Conversation LearningArtifact
             │   │       │
             │   ▼       ▼
             │ SourceChunk Message
             │
             └── Authentication
```

---

# 86. Development Workflow

A typical Prisma development workflow is:

```text
Modify schema.prisma
        │
        ▼
Create migration
        │
        ▼
PostgreSQL schema updated
        │
        ▼
Generate Prisma Client
        │
        ▼
TypeScript application
        │
        ▼
Use prisma.* APIs
```

Common commands include:

```bash
npx prisma generate
```

to generate the client.

For development migrations:

```bash
npx prisma migrate dev
```

And Prisma Studio can be used to inspect database records:

```bash
npx prisma studio
```

---

# 87. Chapter Summary

Chapter 2 establishes the **database foundation of the backend**.

The project now has a relational model covering:

```text
Authentication
     │
     ├── User
     ├── Session
     ├── Account
     └── Verification

Application
     │
     └── Workspace
           │
           ├── Sources
           │     └── SourceChunks
           │
           ├── Conversations
           │     └── Messages
           │
           └── LearningArtifacts
```

The schema provides:

```text
✅ PostgreSQL
✅ Prisma ORM
✅ Strong relational modeling
✅ Primary keys
✅ Foreign keys
✅ Cascading deletes
✅ Unique constraints
✅ Composite indexes
✅ Controlled enums
✅ Nullable fields
✅ JSON metadata
✅ JSON artifact content
✅ Source chunk ordering
✅ Conversation summaries
✅ Artifact processing states
✅ Workspace-level organization
```

The Prisma client adds:

```text
✅ Type-safe database queries
✅ PostgreSQL driver adapter
✅ Connection pooling
✅ Development singleton pattern
✅ Centralized database access
```

---

# 🧠 Core Learning

The most important idea from this chapter is that **database design should reflect how the application works**.

The application is fundamentally organized around:

```text
User
 │
 ▼
Workspace
 │
 ├── Sources
 │      └── SourceChunks
 │
 ├── Conversations
 │      └── Messages
 │
 └── LearningArtifacts
```

Those relationships are then optimized using:

```text
Primary Keys
     +
Foreign Keys
     +
Indexes
     +
Unique Constraints
     +
Enums
     +
Cascade Rules
```

Prisma provides the programming interface:

```text
TypeScript
    │
    ▼
Prisma Client
    │
    ▼
PostgreSQL Adapter
    │
    ▼
pg Connection Pool
    │
    ▼
PostgreSQL
```

So the complete database foundation is:

```text
                 Express Backend
                       │
                       ▼
                    Service
                       │
                       ▼
                 Prisma Client
                       │
                       ▼
              PostgreSQL Adapter
                       │
                       ▼
                  pg Pool
                       │
                       ▼
                  PostgreSQL
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 Authentication    RAG Data        AI Learning
       │               │                │
       ▼               ▼                ▼
 User/Session      Source/Chunk    Artifact/Message
 Workspace         Metadata        Conversation
```

This chapter therefore establishes the **persistent data layer** on which the remaining backend features can be built.
