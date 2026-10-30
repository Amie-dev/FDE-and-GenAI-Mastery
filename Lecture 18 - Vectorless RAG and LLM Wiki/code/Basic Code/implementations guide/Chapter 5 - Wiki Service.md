# Chapter 5 — Wiki Service (LLM Wiki)

> File: `src/services/wikiService.ts`
>
> Purpose: Implements the **LLM Wiki** architecture — the LLM acts as a background librarian that reads documents, organizes them into folders, writes summaries + tags + links, and persists them as human-readable Markdown files with YAML frontmatter metadata.

## Full Code File

```typescript
import { CatalogEntry } from '../types/index';
import * as fs from 'fs';
import * as path from 'path';

const VAULT_DIR = path.join(process.cwd(), 'vault');
const CATALOG_FILE = path.join(VAULT_DIR, 'catalog.json');
const catalog: CatalogEntry[] = [];

export function ensureVault(): void {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

async function llmAnalyze(content: string) {
  const title = content.split('\n')[0] || 'Untitled';
  return {
    title,
    category: 'general',
    tags: ['document'],
    summary: `Summary: ${content.slice(0, 60)}...`,
  };
}

export async function ingestFile(sourcePath: string): Promise<CatalogEntry> {
  ensureVault();
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const analysis = await llmAnalyze(content);
  const entry: CatalogEntry = {
    filePath: path.join(VAULT_DIR, `${analysis.title.toLowerCase().replace(/\s+/g, '-')}.md`),
    title: analysis.title,
    summary: analysis.summary,
    tags: analysis.tags,
  };
  const frontmatter = `---\ntitle: ${entry.title}\ntags: ${entry.tags.join(', ')}\nsummary: ${entry.summary}\n---\n\n${content}`;
  fs.writeFileSync(entry.filePath, frontmatter, 'utf-8');
  catalog.push(entry);
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');
  return entry;
}

export function listCatalog(): CatalogEntry[] {
  return [...catalog];
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function loadCatalogFromDisk(): void {
  if (fs.existsSync(CATALOG_FILE)) {
    const data = fs.readFileSync(CATALOG_FILE, 'utf-8');
    const parsed: CatalogEntry[] = JSON.parse(data);
    catalog.push(...parsed);
  }
}
```

## Command (if needed)

None — uses only Node.js built-in `fs` and `path` modules.

## Block-by-Block Explanation

### Block 1 — Vault paths and catalog
```typescript
const VAULT_DIR = path.join(process.cwd(), 'vault');
const CATALOG_FILE = path.join(VAULT_DIR, 'catalog.json');
const catalog: CatalogEntry[] = [];
```
**What this does:** Defines the vault directory path, catalog file path, and an in-memory array to hold catalog entries.

**How it works:** All wiki documents live in a `vault/` folder. The catalog is a lightweight JSON index of all entries — this is what Pass 1 of two-pass retrieval scans.

### Block 2 — Ensure vault exists
```typescript
export function ensureVault(): void { ... }
```
**What this does:** Creates the vault directory if it doesn't already exist.

**How it works:** `fs.mkdirSync(..., { recursive: true })` creates the folder (and any parent folders) safely.

### Block 3 — Mock LLM analysis
```typescript
async function llmAnalyze(content: string) { ... }
```
**What this does:** Simulates an LLM analyzing a document and returning title, category, tags, and summary.

**How it works:** Takes the first line as the title, assigns default category/tags, and creates a short summary. In production, this would be a real LLM call.

### Block 4 — Ingest a file into the wiki
```typescript
export async function ingestFile(sourcePath: string): Promise<CatalogEntry> { ... }
```
**What this does:** Reads a source file, analyzes it with the LLM, writes it to the vault as Markdown with YAML frontmatter, and updates the catalog.

**How it works:**
1. Reads the source file content.
2. Calls `llmAnalyze` to get title, category, tags, summary.
3. Builds a `CatalogEntry` with a derived file path.
4. Writes the wiki document as Markdown with YAML frontmatter (`---` block at the top).
5. Adds the entry to the in-memory catalog and persists to `catalog.json`.
6. Returns the entry.

### Block 5 — List catalog (metadata only)
```typescript
export function listCatalog(): CatalogEntry[] { ... }
```
**What this does:** Returns a copy of all catalog entries.

**How it works:** Returns only metadata (title, summary, tags) — no full content. This is cheap and is what **Pass 1** of two-pass retrieval scans.

### Block 6 — Read full file content
```typescript
export function readFileContent(filePath: string): string { ... }
```
**What this does:** Reads the full content of a single wiki file.

**How it works:** Expensive operation — only called in **Pass 2** for files that Pass 1 selected. This is the "selective full-content loading" from the notes.

### Block 7 — Load catalog from disk
```typescript
export function loadCatalogFromDisk(): void { ... }
```
**What this does:** Loads previously persisted catalog entries from `catalog.json` into memory on startup.

**How it works:** Reads the JSON catalog file and populates the in-memory `catalog` array so wiki state persists across server restarts.

## Related Note Feature

**Chapter 04 — LLM Wiki Architecture:**
- "The LLM acts like a background librarian" — reads, organizes, summarizes, tags, links.
- "Markdown files, folders, metadata, and links that both humans and LLMs can understand."
- "Understand → Organize → Summarize → Tag → Link → Wiki"

**Chapter 05 — Two-Pass Retrieval & Lazy Loading:**
- Pass 1 reads "Titles, summaries, tags" (metadata only — exactly what `listCatalog` provides).
- Pass 2 loads "Only the documents/files selected by Pass 1" (exactly what `readFileContent` does selectively).

