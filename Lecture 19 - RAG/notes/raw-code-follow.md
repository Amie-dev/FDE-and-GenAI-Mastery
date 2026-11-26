

# 📘 Day 04 — Complete RAG Master Notes

### Retrieval-Augmented Generation • Embeddings • Vector Databases • Qdrant • LangChain • RAG Pipelines • Multimodal Ingestion • Advanced RAG

> **Goal:** Understand RAG from first principles and build a working document-question-answering system using **JavaScript + LangChain + OpenAI/Gemini + Qdrant + Docker**.

---

# 📑 Table of Contents

1. [What is RAG?](#1-what-is-rag)
2. [Why Do We Need RAG?](#2-why-do-we-need-rag)
3. [Standalone LLM vs RAG](#3-standalone-llm-vs-rag)
4. [Why Fine-Tuning Isn't the Same as RAG](#4-why-fine-tuning-isnt-the-same-as-rag)
5. [The Human Brain & Library Analogy](#5-the-human-brain--library-analogy)
6. [What is an Embedding?](#6-what-is-an-embedding)
7. [Semantic Search](#7-semantic-search)
8. [Vector Similarity & Distance](#8-vector-similarity--distance)
9. [What is a Vector Database?](#9-what-is-a-vector-database)
10. [Popular Vector Databases](#10-popular-vector-databases)
11. [The Two RAG Pipelines](#11-the-two-rag-pipelines)
12. [Indexing Pipeline](#12-indexing-pipeline)
13. [Document Loading](#13-document-loading)
14. [Chunking](#14-chunking)
15. [Chunk Size & Overlap](#15-chunk-size--overlap)
16. [Metadata](#16-metadata)
17. [Embedding & Indexing](#17-embedding--indexing)
18. [Query Pipeline](#18-query-pipeline)
19. [Top-K Retrieval](#19-top-k-retrieval)
20. [Prompt Augmentation](#20-prompt-augmentation)
21. [Grounding & Hallucination Control](#21-grounding--hallucination-control)
22. [Complete RAG Architecture](#22-complete-rag-architecture)
23. [Qdrant with Docker](#23-qdrant-with-docker)
24. [LangChain Setup](#24-langchain-setup)
25. [Complete PDF RAG Example](#25-complete-pdf-rag-example)
26. [Multimodal Data Ingestion](#26-multimodal-data-ingestion)
27. [Where Naive RAG Fails](#27-where-naive-rag-fails)
28. [Advanced RAG](#28-advanced-rag)
29. [Query Rewriting](#29-query-rewriting)
30. [HyDE](#30-hyde)
31. [Hybrid Search](#31-hybrid-search)
32. [Re-ranking](#32-re-ranking)
33. [Production RAG Checklist](#33-production-rag-checklist)
34. [Important Interview Questions](#34-important-interview-questions)
35. [Final Mental Model](#35-final-mental-model)

---

# 1. What is RAG?

**RAG = Retrieval-Augmented Generation**

RAG is an architecture where an application:

1. receives a user's question,
2. retrieves relevant information from an external knowledge source,
3. gives that information to an LLM,
4. generates an answer based on the retrieved context.

### Simple definition

> **RAG allows an LLM to search external knowledge before generating an answer.**

Instead of asking:

```text
User
 ↓
LLM
 ↓
Answer
```

we build:

```text
User Question
      ↓
   Retrieval
      ↓
Relevant Documents
      ↓
   LLM + Context
      ↓
    Answer
```

---

# 2. Why Do We Need RAG?

LLMs are powerful, but an LLM by itself is **not your application's database**.

Consider a company with:

```text
Company Documents
├── HR Policies
├── Employee Handbook
├── Customer Contracts
├── Product Documentation
├── Internal APIs
├── Invoices
└── Engineering Documentation
```

A general-purpose LLM doesn't automatically know these documents.

Suppose the user asks:

> "What is our company's work-from-home policy?"

A general LLM may know general WFH practices, but it doesn't necessarily know **your company's policy**.

RAG solves this:

```text
Company Documents
       ↓
     Index
       ↓
   Vector DB
       ↑
       │
User Question
       ↓
Retrieve relevant policy
       ↓
LLM
       ↓
Company-specific answer
```

---

# 3. Standalone LLM vs RAG

## Standalone LLM

```text
User
 ↓
LLM
 ↓
Answer
```

The model mainly relies on information encoded in its parameters plus whatever context you provide.

### Problems

### 1. Private knowledge

Example:

```text
"What is the refund policy in our internal document?"
```

The model cannot magically know your internal document.

### 2. Frequently changing information

Examples:

```text
Today's inventory
Latest company policy
Current internal API documentation
New product specifications
Recent support tickets
```

### 3. Grounding

A model can generate plausible information that isn't supported by your source.

---

# 4. Why Fine-Tuning Isn't the Same as RAG

A common misconception is:

> "Why not fine-tune the model with all our documents?"

Fine-tuning and RAG solve different problems.

| Fine-tuning                                             | RAG                                        |
| ------------------------------------------------------- | ------------------------------------------ |
| Changes model behavior/weights                          | Retrieves external information             |
| Good for style/behavior/task adaptation                 | Good for dynamic knowledge                 |
| Updating knowledge can require another training process | Update documents/index                     |
| Knowledge isn't naturally returned with source metadata | Can preserve document/page/source metadata |
| Can be expensive depending on setup                     | Retrieval can be updated independently     |

### Example

Suppose your company has:

```text
100,000 documents
```

A policy changes:

```text
Old policy → New policy
```

With RAG:

```text
Delete/update old document
        ↓
Index new document
        ↓
Future queries retrieve new information
```

You don't need to retrain the foundation model simply because a document changed.

### Important

Fine-tuning **can still be useful** alongside RAG.

For example:

```text
RAG
+
Fine-tuned model
```

can be useful when you want both:

* company knowledge
* specialized behavior/style

---

# 5. The Human Brain & Library Analogy

Imagine you have:

```text
1,000 books
```

Someone asks:

> "How does TCP congestion control work?"

You don't memorize all 1,000 books.

You:

```text
Question
  ↓
Find relevant book
  ↓
Find relevant chapter
  ↓
Read relevant pages
  ↓
Understand information
  ↓
Answer
```

RAG works similarly:

```text
User Question
      ↓
Semantic Search
      ↓
Relevant Documents
      ↓
Relevant Chunks
      ↓
LLM
      ↓
Answer
```

### Mental model

> **Vector DB = Library index**

> **Retriever = Librarian**

> **LLM = Reader + Reasoner**

> **Retrieved chunks = Pages handed to the reader**

---

# 6. What is an Embedding?

An **embedding** converts information into a numerical vector that represents semantic characteristics.

Example:

```text
"How can I reset my password?"
```

might become:

```text
[
  0.012,
 -0.421,
  0.183,
  ...
]
```

The actual vector may contain hundreds or thousands of dimensions depending on the embedding model.

Conceptually:

```text
Text
 ↓
Embedding Model
 ↓
Vector
```

For example:

```text
"dog"
 ↓
[0.12, 0.84, -0.22, ...]
```

and:

```text
"puppy"
 ↓
[0.15, 0.81, -0.20, ...]
```

Their vectors may be close because their meanings are related.

---

# 7. Semantic Search

Traditional keyword search asks:

> "Do these exact words match?"

Semantic search asks:

> "Do these pieces of text have similar meaning?"

### Keyword search

Query:

```text
"How do I repair my laptop screen?"
```

Document:

```text
"Notebook display replacement instructions"
```

Exact keyword matching may perform poorly.

### Semantic search

Embeddings represent meaning:

```text
"repair laptop screen"
          ≈
"replace notebook display"
```

Therefore:

```text
Query
 ↓
Embedding
 ↓
Vector Search
 ↓
Semantically similar documents
```

---

# 8. Vector Similarity & Distance

Once text becomes vectors, we need a way to determine:

> How similar are these vectors?

Three common metrics are:

---

## 8.1 Cosine Similarity

Cosine similarity measures the **angle/direction** between vectors.

Formula:

[
cos(\theta)=\frac{A\cdot B}{||A||||B||}
]

Conceptually:

```text
A
 \ 
  \ θ
   \
    B
```

A smaller angle generally means greater semantic similarity.

For normalized vectors:

```text
Cosine similarity
≈
Dot product
```

---

## 8.2 Dot Product

[
A\cdot B = \sum_i A_iB_i
]

Example:

```javascript
function dotProduct(a, b) {
  return a.reduce((sum, value, i) => {
    return sum + value * b[i];
  }, 0);
}

console.log(dotProduct(
  [1, 2, 3],
  [4, 5, 6]
));
```

Result:

```text
1×4 + 2×5 + 3×6
= 32
```

---

## 8.3 Euclidean Distance

Euclidean distance measures straight-line distance.

[
d(A,B)=\sqrt{\sum_i(A_i-B_i)^2}
]

Smaller distance generally means vectors are closer.

---

# 9. What is a Vector Database?

A **vector database** stores vectors and allows efficient similarity search.

A stored record may look conceptually like:

```json
{
  "id": "doc-123",
  "vector": [0.12, -0.23, 0.55],
  "payload": {
    "text": "Black box testing...",
    "source": "dsa.pdf",
    "page": 14
  }
}
```

The database stores:

```text
Vector
+
Original content
+
Metadata
```

Then we can ask:

```text
Query vector
      ↓
Vector DB
      ↓
Nearest vectors
      ↓
Relevant documents
```

---

# 10. Popular Vector Databases

| Database                  | Main Strength                           |
| ------------------------- | --------------------------------------- |
| **Qdrant**                | Fast, filtering, easy Docker deployment |
| **Pinecone**              | Managed cloud experience                |
| **Weaviate**              | Open-source + vector search ecosystem   |
| **pgvector**              | Vector search inside PostgreSQL         |
| **Chroma**                | Simple development/prototyping          |
| **MongoDB Vector Search** | Vector search alongside MongoDB data    |
| **Milvus**                | Large-scale distributed workloads       |

### Why Qdrant?

For learning and local development:

```text
Docker
+
Qdrant
+
LangChain
```

is a very convenient combination.

---

# 11. The Two RAG Pipelines

A RAG system has two major flows.

```text
              RAG SYSTEM
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
   INDEXING              QUERY
   PIPELINE              PIPELINE
        ↓                   ↓
   Documents             Question
        ↓                   ↓
    Chunking            Embedding
        ↓                   ↓
   Embeddings          Vector Search
        ↓                   ↓
    Vector DB           Top-K Chunks
                            ↓
                         Prompt
                            ↓
                           LLM
                            ↓
                         Answer
```

---

# 12. Indexing Pipeline

Indexing happens before users ask questions.

```text
PDF
 ↓
Extract text
 ↓
Chunk
 ↓
Generate embeddings
 ↓
Store in Qdrant
```

Detailed:

```text
Raw Document
     ↓
Document Loader
     ↓
Text Extraction
     ↓
Text Cleaning
     ↓
Chunking
     ↓
Embedding Model
     ↓
Vector
     ↓
Qdrant
```

---

# 13. Document Loading

LangChain provides loaders for different formats.

Example PDF:

```javascript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const loader = new PDFLoader("./dsa.pdf");

const documents = await loader.load();

console.log(documents.length);
console.log(documents[0].pageContent);
console.log(documents[0].metadata);
```

A document might contain:

```javascript
{
  pageContent: "Black box testing is...",
  metadata: {
    source: "./dsa.pdf",
    pdf: {
      version: "1.7"
    },
    loc: {
      pageNumber: 14
    }
  }
}
```

Metadata is extremely important.

---

# 14. Chunking

A large document should not normally be embedded as one giant piece.

Example:

```text
500-page PDF
       ↓
     Chunk
       ↓
 ┌─────┬─────┬─────┬─────┐
 │ C1  │ C2  │ C3  │ C4  │ ...
 └─────┴─────┴─────┴─────┘
```

Each chunk gets its own embedding.

---

## Why?

Suppose a document contains:

```text
Chapter 1: JavaScript
Chapter 2: React
Chapter 3: Node.js
Chapter 4: Testing
```

If the entire book has one vector, its semantic representation becomes too broad.

Instead:

```text
JavaScript chunk → Vector A
React chunk      → Vector B
Node chunk       → Vector C
Testing chunk    → Vector D
```

Now a testing query can retrieve the testing chunk.

---

# 15. Chunk Size & Overlap

Two important parameters:

```text
chunkSize
chunkOverlap
```

Example:

```javascript
import { RecursiveCharacterTextSplitter } 
  from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chunks = await splitter.splitDocuments(documents);
```

Conceptually:

```text
Chunk 1
████████████████████

            Chunk 2
            ████████████████████

                        Chunk 3
                        ████████████████████
```

The overlapping region helps preserve context around boundaries.

### Important

There is **no universally correct chunk size**.

It depends on:

* document structure
* language
* query type
* embedding model
* downstream LLM
* retrieval quality

Start with a reasonable value and evaluate.

---

# 16. Metadata

Never think of a vector as only:

```text
vector
```

A production record should carry useful metadata.

Example:

```javascript
{
  pageContent: "Black box testing...",
  metadata: {
    source: "dsa.pdf",
    page: 14,
    section: "Software Testing",
    documentId: "dsa-001"
  }
}
```

Metadata allows:

### Filtering

```text
Only search documents where:

department = "engineering"
```

or:

```text
documentType = "policy"
```

### Citations

```text
Source: dsa.pdf
Page: 14
```

### Access control

For example:

```text
User A
 ↓
Only retrieve documents
they are allowed to access
```

This is extremely important in enterprise RAG.

---

# 17. Embedding & Indexing

After chunking:

```text
Chunk
 ↓
Embedding Model
 ↓
Vector
 ↓
Qdrant
```

Example:

```javascript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});
```

Then:

```javascript
const vector = await embeddings.embedQuery(
  "What is black box testing?"
);

console.log(vector.length);
```

### Critical rule

Use a compatible **same embedding model/configuration** for:

```text
Indexing
    +
Query
```

For example:

```text
Index:
text-embedding-3-small

Query:
text-embedding-3-small
```

Don't randomly switch embedding spaces.

---

# 18. Query Pipeline

Now the user asks:

```text
"What is black box testing?"
```

The runtime pipeline becomes:

```text
User Query
    ↓
Embedding
    ↓
Query Vector
    ↓
Qdrant
    ↓
Similarity Search
    ↓
Top-K Chunks
    ↓
Prompt
    ↓
LLM
    ↓
Answer
```

---

# 19. Top-K Retrieval

Suppose Qdrant finds:

```text
Chunk 14 → similarity 0.92
Chunk 8  → similarity 0.88
Chunk 32 → similarity 0.84
Chunk 4  → similarity 0.79
Chunk 17 → similarity 0.76
```

If:

```javascript
k = 5
```

we retrieve:

```text
14
8
32
4
17
```

### Why not retrieve 1,000 chunks?

Because the LLM would receive:

```text
Too much context
       ↓
Higher token cost
       ↓
Higher latency
       ↓
More noise
       ↓
Potentially worse answer
```

---

# 20. Prompt Augmentation

Retrieved chunks are inserted into the LLM context.

Example:

```javascript
const context = results
  .map((doc) => {
    return `
Source: ${doc.metadata.source}
Page: ${doc.metadata.loc?.pageNumber}

Content:
${doc.pageContent}
`;
  })
  .join("\n\n");
```

Then:

```javascript
const prompt = `
Answer the question using the provided context.

If the answer is not present in the context,
say that you cannot find the information.

Context:
${context}

Question:
${userQuery}
`;
```

This is the **Augmentation** part of RAG.

---

# 21. Grounding & Hallucination Control

A common RAG instruction:

```text
Answer using the provided context.

If the answer is not supported by the context,
say that the information is unavailable.

Do not invent facts.
```

Example:

### Context

```text
Black box testing examines software
without requiring knowledge of its internal implementation.
```

### User

```text
What is black box testing?
```

Good answer:

```text
Black box testing evaluates software based on
inputs and outputs without requiring knowledge
of its internal implementation.

Source: dsa.pdf, Page 14
```

---

## Important distinction

RAG does **not mathematically eliminate hallucinations**.

Even if you retrieve correct information, the LLM can still:

* misunderstand context
* combine unrelated chunks
* make unsupported claims
* follow malicious instructions inside retrieved content

Therefore, production systems need:

```text
Retrieval quality
+
Prompt constraints
+
Access control
+
Validation
+
Evaluation
```

---

# 22. Complete RAG Architecture

The entire architecture can be visualized as:

```text
                  ┌───────────────────┐
                  │   RAW DOCUMENTS   │
                  │ PDF / DOC / WEB   │
                  │ AUDIO / VIDEO     │
                  │ IMAGE             │
                  └─────────┬─────────┘
                            ↓
                    ┌───────────────┐
                    │   INGESTION   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │   CHUNKING    │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │   EMBEDDING   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │    QDRANT     │
                    │  VECTOR DB    │
                    └───────┬───────┘
                            ↑
                            │
                       User Query
                            │
                            ↓
                    ┌───────────────┐
                    │ Query Embed   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │ Vector Search │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │   Top-K Docs  │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │ Prompt + Docs │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │      LLM      │
                    └───────┬───────┘
                            ↓
                         Answer
```

---

# 23. Qdrant with Docker

Create:

```text
docker-compose.yml
```

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest

    ports:
      - "6333:6333"
      - "6334:6334"

    volumes:
      - qdrant_storage:/qdrant/storage

volumes:
  qdrant_storage:
```

Start:

```bash
docker compose up -d
```

Check:

```bash
docker ps
```

Qdrant's dashboard is commonly available at:

```text
http://localhost:6333/dashboard
```

Architecture:

```text
Node.js App
     │
     │ HTTP / gRPC
     ↓
┌──────────────┐
│    Qdrant    │
│   Container  │
└──────────────┘
     │
     ↓
Persistent Volume
```

---

# 24. LangChain Setup

Install the required packages:

```bash
npm install \
  @langchain/core \
  @langchain/community \
  @langchain/textsplitters \
  @langchain/qdrant \
  @langchain/openai \
  @langchain/google-genai \
  pdf-parse
```

Depending on the exact LangChain/provider versions you use, additional provider SDK packages may be needed.

---

## `package.json`

For ES modules:

```json
{
  "type": "module"
}
```

---

## Environment variables

Create:

```text
.env
```

Example:

```env
OPENAI_API_KEY=your_key_here
QDRANT_URL=http://localhost:6333
```

Never commit:

```text
.env
```

to Git.

Add:

```text
.env
```

to `.gitignore`.

---

# 25. Complete PDF RAG Example

Let's build a simple system:

```text
PDF
 ↓
PDFLoader
 ↓
Chunking
 ↓
OpenAI Embeddings
 ↓
Qdrant
 ↓
Query
 ↓
Retrieve
 ↓
OpenAI
 ↓
Answer
```

---

## Project structure

```text
rag-app/
│
├── .env
├── docker-compose.yml
├── package.json
│
├── data/
│   └── dsa.pdf
│
└── src/
    ├── index.js
    ├── ingest.js
    └── query.js
```

---

## `ingest.js`

```javascript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } 
  from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

async function ingest() {
  // 1. Load PDF
  const loader = new PDFLoader("./data/dsa.pdf");

  const documents = await loader.load();

  console.log(`Loaded ${documents.length} pages`);

  // 2. Split documents
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(documents);

  console.log(`Created ${chunks.length} chunks`);

  // 3. Embedding model
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  // 4. Create/store vectors
  await QdrantVectorStore.fromDocuments(
    chunks,
    embeddings,
    {
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "chaicode-docs",
    }
  );

  console.log("Documents indexed successfully.");
}

ingest().catch(console.error);
```

Run:

```bash
node --env-file=.env src/ingest.js
```

---

# Querying the RAG System

## `query.js`

```javascript
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function query(userQuery) {
  // 1. Same embedding model
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  // 2. Connect to existing collection
  const vectorStore =
    await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: "chaicode-docs",
      }
    );

  // 3. Retrieve relevant chunks
  const retriever = vectorStore.asRetriever({
    k: 5,
  });

  const results = await retriever.invoke(userQuery);

  // 4. Build context
  const context = results
    .map((doc, index) => {
      return `
--- Document ${index + 1} ---

Source:
${doc.metadata.source}

Page:
${doc.metadata.loc?.pageNumber ?? "Unknown"}

Content:
${doc.pageContent}
`;
    })
    .join("\n");

  // 5. Grounded prompt
  const systemPrompt = `
You are a document question-answering assistant.

Answer the user's question using ONLY the
provided context.

Rules:
- Do not invent information.
- If the answer is not in the context,
  say that you cannot find it.
- Mention the source and page when available.

Context:
${context}
`;

  // 6. Generate answer
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userQuery,
      },
    ],
  });

  console.log(
    response.choices[0].message.content
  );
}

query("What is black box testing?")
  .catch(console.error);
```

---

# 26. Multimodal Data Ingestion

RAG isn't limited to PDFs.

You may have:

```text
PDF
DOCX
HTML
Websites
Audio
Video
Images
SRT/VTT
```

The general architecture becomes:

```text
               RAW DATA
                  │
       ┌──────────┼───────────┐
       ↓          ↓           ↓
      PDF       Audio       Video
       ↓          ↓           ↓
     Parser      STT       Extract Audio
       │          │           ↓
       │          │          STT
       │          │           │
       └──────────┼───────────┘
                  ↓
            Normalization
                  ↓
               Chunking
                  ↓
              Embeddings
                  ↓
             Vector DB
```

---

## PDF

```text
PDF
 ↓
PDF parser
 ↓
Text
```

For scanned PDFs:

```text
PDF
 ↓
OCR
 ↓
Text
```

---

## Audio

```text
audio.mp3
    ↓
Speech-to-Text
    ↓
Transcript
    ↓
Chunks
```

Metadata:

```json
{
  "source": "meeting.mp3",
  "speaker": "speaker_2",
  "startTime": 83,
  "endTime": 105
}
```

---

## Video

```text
video.mp4
    ↓
Extract audio
    ↓
Speech-to-Text
    ↓
Transcript
    ↓
Chunks
```

Metadata could contain:

```json
{
  "video": "lecture.mp4",
  "startTime": 120,
  "endTime": 145
}
```

Then the answer can potentially point users toward the relevant timestamp.

---

## Images

Images require a slightly different strategy.

Possible pipeline:

```text
Image
 ↓
OCR / Vision Model
 ↓
Description
 ↓
Text
 ↓
Embedding
 ↓
Vector DB
```

Example:

```text
Image:
"Screenshot showing React Native navigation configuration"

Vision model:
"React Navigation stack configuration..."

Embedding
 ↓
Vector DB
```

---

## Web pages

```text
Website
 ↓
HTML
 ↓
Remove navigation/ads
 ↓
Clean content
 ↓
Markdown/text
 ↓
Chunk
 ↓
Embedding
```

Metadata:

```json
{
  "url": "...",
  "title": "React Navigation Guide"
}
```

---

# 27. Where Naive RAG Fails

The simplest architecture:

```text
Query
 ↓
Embedding
 ↓
Top-K
 ↓
LLM
```

is called **Naive RAG**.

It works, but production systems encounter problems.

---

## Problem 1: Vague Queries

User:

```text
"How do I fix it?"
```

What does:

```text
"it"
```

mean?

The retriever doesn't have enough information.

---

## Problem 2: Chunk Boundary

Original:

```text
The API requires authentication.
The token must be included in the
Authorization header.
```

Bad chunking:

```text
Chunk 1:
"The API requires authentication."

Chunk 2:
"The token must be included..."
```

The relationship can become weaker.

---

## Problem 3: Missing Global Context

Suppose the chunk says:

```text
"It increased by 20%."
```

Without context:

```text
What increased?
```

Metadata or contextual chunking can help.

---

## Problem 4: Exact Keyword Retrieval

Suppose the query contains:

```text
ERR_NODE_9942
```

Dense semantic retrieval isn't always the best tool for exact identifiers.

This is why hybrid retrieval can help.

---

## Problem 5: Similarity ≠ Relevance

A vector can be mathematically similar without being the best answer.

Therefore:

```text
Top-K retrieval
```

doesn't automatically mean:

```text
Top-K best answers
```

---

# 28. Advanced RAG

Advanced RAG improves retrieval before the LLM receives context.

A common architecture:

```text
User Query
    ↓
Query Rewriting
    ↓
Hybrid Search
    ↓
Retrieve 20 chunks
    ↓
Re-ranker
    ↓
Top 3 chunks
    ↓
LLM
    ↓
Answer
```

---

# 29. Query Rewriting

User asks:

```text
"Why isn't my login working?"
```

The system can transform this into a better retrieval query:

```text
"authentication login failure troubleshooting"
```

or multiple queries:

```text
1. authentication failure causes
2. login troubleshooting
3. authentication error handling
```

Then search each query.

This is useful when user queries are:

* vague
* conversational
* incomplete

---

# 30. HyDE

**HyDE = Hypothetical Document Embeddings**

Normal RAG:

```text
Question
 ↓
Embedding
 ↓
Search
```

HyDE:

```text
Question
 ↓
LLM generates hypothetical answer/document
 ↓
Embed hypothetical document
 ↓
Search
```

Example:

```text
Question:
"What is black box testing?"
```

Hypothetical response:

```text
"Black box testing is a software testing
method that evaluates functionality without
examining internal implementation..."
```

Then:

```text
Hypothetical Answer
       ↓
    Embedding
       ↓
    Vector Search
```

The idea is that a hypothetical answer may resemble the actual documents more closely than the short user question.

---

# 31. Hybrid Search

Instead of choosing:

```text
Vector Search
```

or:

```text
Keyword Search
```

combine both.

```text
             Query
               │
       ┌───────┴────────┐
       ↓                ↓
 Dense Search       Sparse Search
 Vector             BM25/Keyword
       ↓                ↓
       └───────┬────────┘
               ↓
        Combine Results
               ↓
            Reranker
               ↓
             LLM
```

### Dense search

Good for:

```text
meaning
intent
semantic similarity
```

### Sparse/keyword search

Good for:

```text
exact names
error codes
product IDs
function names
technical symbols
```

### Hybrid

Gets advantages from both.

---

# 32. Re-ranking

Suppose retrieval returns:

```text
20 chunks
```

Instead of sending all 20 to the LLM:

```text
20 chunks
   ↓
Reranker
   ↓
Top 3
   ↓
LLM
```

A reranker examines:

```text
Query + Candidate Document
```

and produces a relevance score.

Conceptually:

```text
Query
  +
Chunk A → 0.93
Chunk B → 0.42
Chunk C → 0.88
Chunk D → 0.31
```

Then:

```text
A
C
```

may be selected.

This is often more accurate than relying solely on vector similarity.

---

# 33. Production RAG Checklist

A production RAG system should consider:

### Data

```text
✓ Document parsing
✓ OCR
✓ Audio transcription
✓ Web extraction
✓ Data cleaning
```

### Chunking

```text
✓ Appropriate chunk size
✓ Appropriate overlap
✓ Semantic boundaries
✓ Document structure
```

### Embeddings

```text
✓ Appropriate embedding model
✓ Consistent indexing/query configuration
✓ Embedding version tracking
```

### Vector DB

```text
✓ Metadata
✓ Filtering
✓ Index configuration
✓ Backups
✓ Persistence
```

### Retrieval

```text
✓ Top-K tuning
✓ Hybrid search
✓ Query rewriting
✓ Reranking
```

### Security

```text
✓ Authentication
✓ Authorization
✓ Document-level permissions
✓ Tenant isolation
✓ Sensitive data handling
```

### Generation

```text
✓ Grounded prompts
✓ Citation generation
✓ Refusal when evidence is missing
✓ Output validation
```

### Evaluation

Measure:

```text
Retrieval quality
Answer correctness
Faithfulness
Latency
Token usage
Cost
```

---

# 34. Important Interview Questions

## Q1. What is RAG?

**Answer:**

RAG is an architecture that retrieves relevant external information and provides it to an LLM as context before generating an answer.

---

## Q2. Why use RAG instead of putting everything in the prompt?

Because huge prompts cause:

* high token cost
* high latency
* context limitations
* irrelevant information
* potentially weaker retrieval from long contexts

---

## Q3. What is an embedding?

A numerical vector representation of information that captures useful semantic relationships.

---

## Q4. What is a vector database?

A database optimized for storing and searching vector representations using similarity search.

---

## Q5. Why do we chunk documents?

To create smaller, semantically focused units that can be independently embedded and retrieved.

---

## Q6. What is chunk overlap?

Text shared between neighboring chunks to reduce context loss at chunk boundaries.

---

## Q7. Why is metadata important?

Metadata enables:

* source citations
* filtering
* access control
* debugging
* document tracking

---

## Q8. What is Top-K?

The number of highest-ranked retrieval results returned for a query.

Example:

```javascript
asRetriever({
  k: 5
});
```

means retrieve approximately the top 5 candidates.

---

## Q9. What is hybrid search?

Combining semantic/dense vector search with lexical/sparse search such as BM25.

---

## Q10. What is reranking?

A second relevance-ranking stage that evaluates retrieved candidates more deeply and selects the best results for the LLM.

---

# 35. Final Mental Model

If you remember only **one diagram from Day 04**, remember this:

```text
                    ┌─────────────────────┐
                    │     YOUR DATA       │
                    │ PDF • Web • Audio   │
                    │ Video • Images      │
                    └──────────┬──────────┘
                               ↓
                         INGEST / PARSE
                               ↓
                           CHUNKING
                               ↓
                         EMBEDDINGS
                               ↓
                    ┌─────────────────────┐
                    │      QDRANT         │
                    │    VECTOR DB        │
                    └──────────┬──────────┘
                               ↑
                               │
                         USER QUESTION
                               │
                               ↓
                         QUERY EMBEDDING
                               ↓
                         VECTOR SEARCH
                               ↓
                           TOP-K DOCS
                               ↓
                       ┌───────────────┐
                       │   OPTIONAL    │
                       │ RERANK / HYBRID│
                       └───────┬───────┘
                               ↓
                     CONTEXT + QUESTION
                               ↓
                             LLM
                               ↓
                    GROUNDED ANSWER
                               ↓
                       SOURCE / CITATION
```

## 🧠 The 3 most important things to remember

### 1. RAG

```text
Retrieve → Augment → Generate
```

### 2. Two pipelines

```text
INDEXING:
Data → Chunk → Embed → Store

QUERY:
Question → Embed → Search → Context → LLM
```

### 3. Advanced RAG

```text
Query
 ↓
Rewrite / HyDE
 ↓
Hybrid Retrieval
 ↓
Rerank
 ↓
LLM
```

---

## 🚀 Day 04 in one sentence

> **RAG does not teach the LLM everything; it gives the LLM the right information at the right time.**

And the core engineering problem is therefore not simply **"How do I call an LLM?"**, but:

> **"How do I reliably find the right information, preserve its context and permissions, and give only that information to the model?"**

That mindset is the foundation for building production-grade RAG systems.
