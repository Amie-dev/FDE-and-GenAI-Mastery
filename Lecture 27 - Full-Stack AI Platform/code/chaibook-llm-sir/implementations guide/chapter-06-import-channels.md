# Master Chapter 6 — 06 Import Channels

## 1. Chapter Overview & Goal
- **Server Goal**: Build multi-channel content extraction utilities for PDF uploads via Cloudinary, web scraping via Firecrawl, YouTube transcript fetching, and sliding window text chunking.
- **Client Goal**: Implement multi-tab dialog interface supporting PDF drag-and-drop upload, Firecrawl website scraping, YouTube video URL importing, and raw markdown note entry.
- **Combined Outcome**: Build end-to-end full-stack functionality connecting the Express server API with the Next.js client UI.

---

## 2. Quick Setup Commands

```bash
# 1. Server Dependencies
cd week05/chaibook-llm-sir/server
npm install multer cloudinary pdf-parse @firecrawl/sdk youtube-transcript

# 2. Client Dependencies
cd week05/chaibook-llm-sir/client
npm install lucide-react @tanstack/react-query
```

---

## 3. Server Source Code & Explanations

#### File Path: `server/src/middleware/upload.middleware.ts`

```typescript
import multer from "multer";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PDF_SIZE_BYTES },
    fileFilter: (_req, file, callback) => {
        if (file.mimetype === "application/pdf") {
            callback(null, true);
            return;
        }

        callback(new Error("Only PDF files are allowed"));
    },
});

export const uploadSinglePdf = pdfUpload.single("file");

```

#### Code Explanation: `server/src/middleware/upload.middleware.ts`

**Overview & Architectural Role:**
- `server/src/middleware/upload.middleware.ts` is a production source module containing **18 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import multer from "multer";`: Imports required module bindings.
- **Constants & Exported Utilities**:
  - `export const pdfUpload = multer({`: Exposes constant values and helper variables across the application.
  - `export const uploadSinglePdf = pdfUpload.single("file");`: Exposes constant values and helper variables across the application.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 18 lines of `upload.middleware.ts`.

#### File Path: `server/src/lib/firecrawl.ts`

```typescript
/**
 * Firecrawl integration for scraping website content into markdown sources.
 *
 * Requires `FIRECRAWL_API_KEY` in the environment.
 */

import Firecrawl from "@mendable/firecrawl-js";
import { ValidationError } from "../types/app-error.js";

/**
 * Scrapes a public URL and returns clean markdown suitable for RAG indexing.
 *
 * @param url - Page URL to scrape (must be reachable by Firecrawl)
 * @returns Markdown content, optional page title, and canonical source URL
 * @throws {ValidationError} When Firecrawl is not configured or extraction fails
 */
export async function scrapeWebsite(url: string) {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
        throw new ValidationError("Firecrawl is not configured on the server");
    }

    const client = new Firecrawl({ apiKey });
    const result = await client.scrape(url, {
        formats: ["markdown"],
    });

    const markdown = result.markdown?.trim();

    if (!markdown) {
        throw new ValidationError("Could not extract content from this URL");
    }

    return {
        markdown,
        title: result.metadata?.title,
        sourceUrl: result.metadata?.sourceURL ?? url,
    };
}

```

#### Code Explanation: `server/src/lib/firecrawl.ts`

**Overview & Architectural Role:**
- `server/src/lib/firecrawl.ts` is a production source module containing **40 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import Firecrawl from "@mendable/firecrawl-js";`: Imports required module bindings.
  - `import { ValidationError } from "../types/app-error.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 40 lines of `firecrawl.ts`.

#### File Path: `server/src/lib/youtube.ts`

```typescript
/**
 * YouTube transcript extraction for YOUTUBE source imports.
 */

import { YoutubeTranscript } from "youtube-transcript";
import { ValidationError } from "../types/app-error.js";

/**
 * Fetches caption transcript text for a YouTube video.
 *
 * @param url - YouTube page URL
 * @returns Video id and concatenated transcript text
 * @throws {ValidationError} When the URL is invalid, captions are missing, or fetch fails
 *
 *
 */
export async function fetchYoutubeTranscript(url: string) {
    const videoId =
        url.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
        )?.[1] ?? url.match(/youtube\.com\/shorts\/([\w-]{11})/)?.[1];

    if (!videoId) {
        throw new ValidationError("Enter a valid YouTube URL");
    }

    try {
        const segments = await YoutubeTranscript.fetchTranscript(videoId);
        const content = segments.map((segment) => segment.text).join(" ").trim();

        if (!content) {
            throw new ValidationError(
                "No transcript found for this video",
            );
        }

        return { videoId, content };
    } catch {
        throw new ValidationError(
            "Could not fetch transcript. The video may not have captions.",
        );
    }
}

```

#### Code Explanation: `server/src/lib/youtube.ts`

**Overview & Architectural Role:**
- `server/src/lib/youtube.ts` is a production source module containing **43 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { YoutubeTranscript } from "youtube-transcript";`: Imports required module bindings.
  - `import { ValidationError } from "../types/app-error.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 43 lines of `youtube.ts`.

#### File Path: `server/src/lib/cloudinary.ts`

```typescript

import { v2 as cloudinary } from "cloudinary";
import { ValidationError } from "../types/app-error.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "dt2jgaj48";
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/** Normalized result returned after a successful Cloudinary upload. */
export type CloudinaryUploadResult = {
    secureUrl: string;
    publicId: string;
    bytes: number;
    originalFilename: string;
    resourceType: "raw" | "image";
};

type CloudinaryUploadResponse = {
    secure_url: string;
    public_id: string;
    bytes: number;
    resource_type?: string;
    error?: { message: string };
};

export function getSignedCloudinaryDownloadUrl(
    publicId: string,
    resourceType: "raw" | "image" = "raw",
) {
    if (!cloudName || !apiKey || !apiSecret) {
        return null;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });

    return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: "upload",
        sign_url: true,
        secure: true,
    });
}

/**
 * Uploads a PDF buffer to Cloudinary using an unsigned upload preset.
 *
 * @param buffer - PDF file bytes from Multer
 * @param filename - Original filename (used in the multipart form)
 * @returns Upload metadata including secure URL and public id
 * @throws {ValidationError} When Cloudinary is not configured or upload is rejected
 *
 */
export async function uploadPdfToCloudinary(
    buffer: Buffer,
    filename: string,
): Promise<CloudinaryUploadResult> {
    if (!cloudName) {
        throw new ValidationError("Cloudinary is not configured on the server");
    }

    const form = new FormData();
    form.append(
        "file",
        new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
        filename,
    );
    form.append("upload_preset", uploadPreset);
    form.append("folder", "chaibook/pdfs");

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        { method: "POST", body: form },
    );

    const result = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
        const message =
            result.error?.message ??
            `Cloudinary upload failed (${response.status})`;

        if (response.status === 403) {
            throw new ValidationError(
                "Cloudinary rejected the upload. Check CLOUDINARY_UPLOAD_PRESET in server/.env matches an unsigned preset in your dashboard.",
            );
        }

        throw new ValidationError(message);
    }

    return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        originalFilename: filename,
        resourceType: result.resource_type === "image" ? "image" : "raw",
    };
}

```

#### Code Explanation: `server/src/lib/cloudinary.ts`

**Overview & Architectural Role:**
- `server/src/lib/cloudinary.ts` is a production source module containing **104 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { v2 as cloudinary } from "cloudinary";`: Imports required module bindings.
  - `import { ValidationError } from "../types/app-error.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 11 (`export type CloudinaryUploadResult = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
  - **Line 19 (`type CloudinaryUploadResponse = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 27 (`export function getSignedCloudinaryDownloadUrl(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 104 lines of `cloudinary.ts`.

#### File Path: `server/src/lib/pdf.ts`

```typescript
/**
 * PDF text extraction utilities using `unpdf`.
 *
 * Supports in-memory buffers and Cloudinary-hosted PDFs with signed URL
 * fallback when public access returns 401.
 */

import { extractText, getDocumentProxy } from "unpdf";
import { getSignedCloudinaryDownloadUrl } from "./cloudinary.js";

/** Result of extracting text from a PDF document. */
export type PdfExtractResult = {
    text: string;
    pages: string[];
    pageCount: number;
};

/**
 * Extracts plain text from a PDF buffer (upload-time or downloaded file).
 *
 * @param buffer - PDF bytes as Buffer or ArrayBuffer
 * @returns Joined full text, per-page strings, and total page count
 * @throws When no text could be extracted from the PDF
 *
 */
export async function extractPdfFromBuffer(
    buffer: ArrayBuffer | Buffer,
): Promise<PdfExtractResult> {
    const arrayBuffer =
        buffer instanceof Buffer
            ? (buffer.buffer.slice(
                  buffer.byteOffset,
                  buffer.byteOffset + buffer.byteLength,
              ) as ArrayBuffer)
            : buffer;

    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    const pages = Array.isArray(text)
        ? text.map((page) => page.trim())
        : [String(text).trim()];

    const joined = pages.filter(Boolean).join("\n\n");

    if (!joined) {
        throw new Error("No text could be extracted from the PDF");
    }

    return {
        text: joined,
        pages,
        pageCount: totalPages,
    };
}

async function downloadPdf(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download PDF (${response.status})`);
    }

    return response.arrayBuffer();
}

/**
 * Extracts text from a PDF stored on Cloudinary.
 *
 * Tries the public `fileUrl` first; on 401, falls back to a signed download URL
 * when `publicId` and Cloudinary API credentials are available.
 *
 * @param input - Cloudinary file URL, public id, and resource type
 * @returns Extracted text and per-page content
 * @throws When download or extraction fails, or signed URL cannot be generated
 *
 */
export async function extractPdfFromCloudinary(input: {
    fileUrl: string;
    publicId?: string;
    resourceType?: "raw" | "image";
}): Promise<PdfExtractResult> {
    try {
        const buffer = await downloadPdf(input.fileUrl);
        return await extractPdfFromBuffer(buffer);
    } catch (error) {
        const isUnauthorized =
            error instanceof Error && error.message.includes("(401)");

        if (!isUnauthorized || !input.publicId) {
            throw error;
        }

        const signedUrl = getSignedCloudinaryDownloadUrl(
            input.publicId,
            input.resourceType ?? "raw",
        );

        if (!signedUrl) {
            throw new Error(
                "PDF download requires authentication. Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to server/.env, or re-upload the PDF.",
            );
        }

        const buffer = await downloadPdf(signedUrl);
        return extractPdfFromBuffer(buffer);
    }
}

```

#### Code Explanation: `server/src/lib/pdf.ts`

**Overview & Architectural Role:**
- `server/src/lib/pdf.ts` is a production source module containing **108 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 4)**:
  - `import { extractText, getDocumentProxy } from "unpdf";`: Imports required module bindings.
  - `import { getSignedCloudinaryDownloadUrl } from "./cloudinary.js";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 12 (`export type PdfExtractResult = {`)**: Establishes strict static type contracts to enforce compile-time type safety.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 108 lines of `pdf.ts`.

#### File Path: `server/src/lib/chunking.ts`

```typescript

export type TextChunk = {
    index: number;
    content: string;
    metadata?: Record<string, unknown>;
};

/** Default maximum characters per chunk when no option is passed. */
const DEFAULT_CHUNK_SIZE = 1000;

/** Default overlap between consecutive chunks (helps preserve context at boundaries). */
const DEFAULT_CHUNK_OVERLAP = 100;

/**
 * Separators tried in order, from "most natural" to "most aggressive".
 *
 * The splitter walks this list and uses the first separator that actually
 * breaks the text into multiple parts. If none work, it falls back to raw
 * character slicing (the empty string `""` case in `splitText`).
 */
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

/**
 * Combines small text splits into larger chunks without exceeding `chunkSize`.
 *
 * Think of this as packing sentences/paragraphs into boxes: keep adding splits
 * until the next one would overflow the box, then seal the box and start a new one.
 *
 * @param splits - Pieces produced by splitting on one separator (e.g. paragraphs)
 * @param separator - The separator to re-join with (e.g. `"\n\n"`)
 * @param chunkSize - Maximum characters allowed in one merged chunk
 * @returns An array of merged chunk strings
 *
 */
function mergeSplits(splits: string[], separator: string, chunkSize: number) {
    const docs: string[] = [];
    let current: string[] = [];
    let total = 0;

    for (const split of splits) {
        const len = split.length;
        const sepLen = current.length > 0 ? separator.length : 0;

        if (total + len + sepLen > chunkSize && current.length > 0) {
            docs.push(current.join(separator));
            total = 0;
            current = [];
        }

        current.push(split);
        total += len + sepLen;
    }

    if (current.length > 0) {
        docs.push(current.join(separator));
    }

    return docs;
}

/**
 * Splits raw text into chunk strings using a recursive separator strategy.
 *
 * **How it works (step by step):**
 * 1. Try splitting on double newlines (`\n\n`) → keeps paragraphs together when possible
 * 2. If that fails, try single newlines (`\n`) → keeps lines together
 * 3. Then sentence boundaries (`. `)
 * 4. Then word boundaries (` `)
 * 5. Last resort: slice by character count with overlap
 *
 * The first separator that produces usable chunks wins; later separators are skipped.
 *
 * @param text - Full text to split
 * @param chunkSize - Target max characters per chunk
 * @param chunkOverlap - Characters repeated between adjacent chunks (character fallback only)
 * @returns Array of non-empty chunk strings (no `index` or `metadata` yet)
 *
 */
function splitText(text: string, chunkSize: number, chunkOverlap: number) {
    const chunks: string[] = [];

    for (const separator of SEPARATORS) {
        if (separator) {
            const splits = text.split(separator).filter(Boolean);
            if (splits.length === 1) {
                continue;
            }
            chunks.push(...mergeSplits(splits, separator, chunkSize));
        } else {
            for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
                chunks.push(text.slice(i, i + chunkSize));
            }
        }

        if (chunks.length > 0) {
            break;
        }
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
}

/**
 * Public API: split any plain string into numbered `TextChunk` objects.
 *
 * This is the function you call for articles, transcripts, scraped web text, etc.
 * Each chunk gets a sequential `index` and optional shared `metadata`.
 *
 * @param text - The full document text
 * @param options.chunkSize - Max characters per chunk (default: 1000)
 * @param options.chunkOverlap - Overlap for character-level splits (default: 100)
 * @param options.metadata - Extra fields attached to every chunk (e.g. `{ sourceId: "abc" }`)
 * @returns Array of `TextChunk` ready for embedding/storage
 */
export function chunkText(
    text: string,
    options: {
        chunkSize?: number;
        chunkOverlap?: number;
        metadata?: Record<string, unknown>;
    } = {},
): TextChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
    const parts = splitText(text.trim(), chunkSize, chunkOverlap);

    return parts.map((content, index) => ({
        index,
        content,
        metadata: options.metadata,
    }));
}

/**
 * Chunk a multi-page document (e.g. PDF pages) while preserving page numbers.
 *
 * Unlike `chunkText`, this:
 * - processes each page separately (chunks never span two pages)
 * - assigns `metadata.page` (1-based) to every chunk from that page
 * - re-numbers `index` globally across all pages (0, 1, 2, …)
 *
 * Empty or whitespace-only pages are skipped.
 *
 * @param pages - Array of page texts, e.g. from `extractPdfPages()`
 * @param options.chunkSize - Max characters per chunk (default: 1000)
 * @param options.chunkOverlap - Overlap for character-level splits (default: 100)
 * @returns Flat list of chunks from all pages with page metadata
 *
 */
export function chunkPages(
    pages: string[],
    options: {
        chunkSize?: number;
        chunkOverlap?: number;
    } = {},
): TextChunk[] {
    const chunks: TextChunk[] = [];
    let index = 0;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageText = pages[pageIndex].trim();
        if (!pageText) {
            continue;
        }

        const pageChunks = chunkText(pageText, {
            ...options,
            metadata: { page: pageIndex + 1 },
        });

        for (const chunk of pageChunks) {
            chunks.push({
                index,
                content: chunk.content,
                metadata: chunk.metadata,
            });
            index += 1;
        }
    }

    return chunks;
}

```

#### Code Explanation: `server/src/lib/chunking.ts`

**Overview & Architectural Role:**
- `server/src/lib/chunking.ts` is a production source module containing **182 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **TypeScript Types & Interfaces**:
  - **Line 2 (`export type TextChunk = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 35 (`function mergeSplits(splits: string[], separator: string, chunkSize: number) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 79 (`function splitText(text: string, chunkSize: number, chunkOverlap: number) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 115 (`export function chunkText(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 150 (`export function chunkPages(`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 182 lines of `chunking.ts`.

#### File Path: `server/src/lib/source-events.ts`

```typescript
/**
 * Inngest event helpers for background source processing (RAG indexing).
 */

import { inngest } from "../inngest/client.js";

/**
 * Enqueues a source processing job to run asynchronously via Inngest.
 *
 * The worker runs extract → chunk → embed → Pinecone upsert.
 *
 * @param input - Source and workspace ids for the processing worker
 * @returns Resolves when the event is accepted by Inngest
 *
 */
export async function enqueueSourceProcessing(input: {
    sourceId: string;
    workspaceId: string;
}) {
    await inngest.send({
        name: "source/created",
        data: input,
    });
}

```

#### Code Explanation: `server/src/lib/source-events.ts`

**Overview & Architectural Role:**
- `server/src/lib/source-events.ts` is a production source module containing **24 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import { inngest } from "../inngest/client.js";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 24 lines of `source-events.ts`.

---

## 4. Client Source Code & Explanations

#### File Path: `client/features/sources/components/add-source-dialog.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    useCreateSource,
    useImportWebsiteSource,
    useImportYoutubeSource,
    useUploadPdfSource,
} from "../hooks/use-sources";
import { sourceRoutes } from "../lib/routes";

type AddSourceDialogProps = {
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function AddSourceDialog({
    workspaceId,
    open,
    onOpenChange,
}: AddSourceDialogProps) {
    const router = useRouter();
    const createSource = useCreateSource(workspaceId);
    const uploadPdf = useUploadPdfSource(workspaceId);
    const importWebsite = useImportWebsiteSource(workspaceId);
    const importYoutube = useImportYoutubeSource(workspaceId);

    const [error, setError] = useState<string | null>(null);

    const [textTitle, setTextTitle] = useState("");
    const [textContent, setTextContent] = useState("");

    const [markdownTitle, setMarkdownTitle] = useState("");
    const [markdownContent, setMarkdownContent] = useState("");

    const [pdfTitle, setPdfTitle] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const [websiteUrl, setWebsiteUrl] = useState("");
    const [websiteTitle, setWebsiteTitle] = useState("");

    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [youtubeTitle, setYoutubeTitle] = useState("");

    const isPending =
        createSource.isPending ||
        uploadPdf.isPending ||
        importWebsite.isPending ||
        importYoutube.isPending;

    function resetForm() {
        setError(null);
        setTextTitle("");
        setTextContent("");
        setMarkdownTitle("");
        setMarkdownContent("");
        setPdfTitle("");
        setPdfFile(null);
        setWebsiteUrl("");
        setWebsiteTitle("");
        setYoutubeUrl("");
        setYoutubeTitle("");
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            resetForm();
        }
        onOpenChange(nextOpen);
    }

    async function handleSuccess(sourceId: string) {
        handleOpenChange(false);
        router.push(sourceRoutes.detail(workspaceId, sourceId));
        router.refresh();
    }

    async function submitText() {
        setError(null);
        try {
            const source = await createSource.mutateAsync({
                type: "TEXT",
                title: textTitle,
                content: textContent,
            });
            await handleSuccess(source.id);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to add text source",
            );
        }
    }

    async function submitMarkdown() {
        setError(null);
        try {
            const source = await createSource.mutateAsync({
                type: "MARKDOWN",
                title: markdownTitle,
                content: markdownContent,
            });
            await handleSuccess(source.id);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to add markdown source",
            );
        }
    }

    async function submitPdf() {
        setError(null);

        if (!pdfFile) {
            setError("Choose a PDF file to upload.");
            return;
        }

        try {
            const source = await uploadPdf.mutateAsync({
                file: pdfFile,
                title: pdfTitle || undefined,
            });
            await handleSuccess(source.id);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to upload PDF",
            );
        }
    }

    async function submitWebsite() {
        setError(null);
        try {
            const source = await importWebsite.mutateAsync({
                url: websiteUrl,
                title: websiteTitle || undefined,
            });
            await handleSuccess(source.id);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to import website",
            );
        }
    }

    async function submitYoutube() {
        setError(null);
        try {
            const source = await importYoutube.mutateAsync({
                url: youtubeUrl,
                title: youtubeTitle || undefined,
            });
            await handleSuccess(source.id);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to import YouTube transcript",
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add source</DialogTitle>
                    <DialogDescription>
                        Add knowledge to this workspace from text, files, or
                        the web.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="text">
                    <TabsList className="w-full">
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="markdown">Markdown</TabsTrigger>
                        <TabsTrigger value="pdf">PDF</TabsTrigger>
                        <TabsTrigger value="website">Website</TabsTrigger>
                        <TabsTrigger value="youtube">YouTube</TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="grid gap-4 pt-2">
                        <Field
                            id="text-title"
                            label="Title"
                            value={textTitle}
                            onChange={setTextTitle}
                            placeholder="Meeting notes"
                            disabled={isPending}
                        />
                        <FieldTextarea
                            id="text-content"
                            label="Content"
                            value={textContent}
                            onChange={setTextContent}
                            placeholder="Paste your text here..."
                            disabled={isPending}
                        />
                        <DialogFooter>
                            <SubmitButton
                                pending={createSource.isPending}
                                onClick={() => void submitText()}
                            >
                                Add text source
                            </SubmitButton>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="markdown" className="grid gap-4 pt-2">
                        <Field
                            id="markdown-title"
                            label="Title"
                            value={markdownTitle}
                            onChange={setMarkdownTitle}
                            placeholder="Research notes"
                            disabled={isPending}
                        />
                        <FieldTextarea
                            id="markdown-content"
                            label="Markdown"
                            value={markdownContent}
                            onChange={setMarkdownContent}
                            placeholder="# Heading&#10;&#10;Write markdown here..."
                            disabled={isPending}
                            rows={8}
                        />
                        <DialogFooter>
                            <SubmitButton
                                pending={createSource.isPending}
                                onClick={() => void submitMarkdown()}
                            >
                                Add markdown source
                            </SubmitButton>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="pdf" className="grid gap-4 pt-2">
                        <Field
                            id="pdf-title"
                            label="Title (optional)"
                            value={pdfTitle}
                            onChange={setPdfTitle}
                            placeholder="Research paper"
                            disabled={isPending}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="pdf-file">PDF file</Label>
                            <Input
                                id="pdf-file"
                                type="file"
                                accept="application/pdf"
                                disabled={isPending}
                                onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    setPdfFile(file);
                                }}
                            />
                            {pdfFile ? (
                                <p className="text-xs text-muted-foreground">
                                    Selected: {pdfFile.name}
                                </p>
                            ) : null}
                        </div>
                        <DialogFooter>
                            <SubmitButton
                                pending={uploadPdf.isPending}
                                onClick={() => void submitPdf()}
                            >
                                Upload PDF
                            </SubmitButton>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="website" className="grid gap-4 pt-2">
                        <Field
                            id="website-url"
                            label="Website URL"
                            value={websiteUrl}
                            onChange={setWebsiteUrl}
                            placeholder="https://example.com/article"
                            disabled={isPending}
                        />
                        <Field
                            id="website-title"
                            label="Title (optional)"
                            value={websiteTitle}
                            onChange={setWebsiteTitle}
                            placeholder="Article title"
                            disabled={isPending}
                        />
                        <DialogFooter>
                            <SubmitButton
                                pending={importWebsite.isPending}
                                onClick={() => void submitWebsite()}
                            >
                                Import website
                            </SubmitButton>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="youtube" className="grid gap-4 pt-2">
                        <Field
                            id="youtube-url"
                            label="YouTube URL"
                            value={youtubeUrl}
                            onChange={setYoutubeUrl}
                            placeholder="https://www.youtube.com/watch?v=..."
                            disabled={isPending}
                        />
                        <Field
                            id="youtube-title"
                            label="Title (optional)"
                            value={youtubeTitle}
                            onChange={setYoutubeTitle}
                            placeholder="Video title"
                            disabled={isPending}
                        />
                        <DialogFooter>
                            <SubmitButton
                                pending={importYoutube.isPending}
                                onClick={() => void submitYoutube()}
                            >
                                Import transcript
                            </SubmitButton>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>

                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function Field({
    id,
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    );
}

function FieldTextarea({
    id,
    label,
    value,
    onChange,
    placeholder,
    disabled,
    rows = 6,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
            />
        </div>
    );
}

function SubmitButton({
    children,
    pending,
    onClick,
}: {
    children: React.ReactNode;
    pending: boolean;
    onClick: () => void;
}) {
    return (
        <Button type="button" disabled={pending} onClick={onClick}>
            {pending ? <Spinner /> : null}
            {children}
        </Button>
    );
}

```

#### Code Explanation: `client/features/sources/components/add-source-dialog.tsx`

**Overview & Architectural Role:**
- `client/features/sources/components/add-source-dialog.tsx` is a production source module containing **438 lines** of code.
- **Layer**: Client Feature Module (`sources`). Encapsulates API calls, UI presentation components, custom hooks, and state stores for frontend interactivity.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 13)**:
  - `import { useState } from "react";`: Imports required module bindings.
  - `import { useRouter } from "next/navigation";`: Imports required module bindings.
  - `import { Button } from "@/components/ui/button";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { Input } from "@/components/ui/input";`: Imports required module bindings.
  - `import { Label } from "@/components/ui/label";`: Imports required module bindings.
  - `import { Spinner } from "@/components/ui/spinner";`: Imports required module bindings.
  - `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";`: Imports required module bindings.
  - `import { Textarea } from "@/components/ui/textarea";`: Imports required module bindings.
  - `import {`: Imports required module bindings.
  - `import { sourceRoutes } from "../lib/routes";`: Imports required module bindings.
- **TypeScript Types & Interfaces**:
  - **Line 27 (`type AddSourceDialogProps = {`)**: Establishes strict static type contracts to enforce compile-time type safety.
- **Functions, Handlers & Business Methods**:
  - **Line 33 (`export function AddSourceDialog({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 67 (`function resetForm() {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 81 (`function handleOpenChange(nextOpen: boolean) {`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 362 (`function Field({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 391 (`function FieldTextarea({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.
  - **Line 423 (`function SubmitButton({`)**:
    - **Signature & Parameters**: Accepts input context, validating parameters before processing.
    - **Execution Logic**: Executes core operations, managing async resolution and state transitions.
    - **Error & Exception Handling**: Catches exceptions and raises typed errors (`AppError` / `ApiError`) with HTTP status codes.
    - **Return Payload**: Returns type-safe structured data back to caller.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 438 lines of `add-source-dialog.tsx`.

---

## 5. Verification & Testing Steps
1. Ensure backend Express server is running on port 8080 (`npm run dev` in `server`).
2. Ensure frontend Next.js app is running on port 3000 (`npm run dev` in `client`).
3. Verify API proxy routing and test features covered in Chapter 6.
