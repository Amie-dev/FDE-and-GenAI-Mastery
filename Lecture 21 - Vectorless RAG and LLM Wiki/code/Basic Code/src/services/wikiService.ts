import { CatalogEntry } from '../types/index';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// services/wikiService.ts — LLM Wiki: Knowledge Vault Management
// ============================================================================
//
// The LLM acts as a background librarian: it reads incoming documents,
// organizes them into folders, writes summaries + tags + links, and persists
// them as human-readable Markdown files with YAML frontmatter metadata.
// ============================================================================

const VAULT_DIR = path.join(process.cwd(), 'vault');
const CATALOG_FILE = path.join(VAULT_DIR, 'catalog.json');

// In-memory catalog of lightweight metadata entries (Pass 1 scans this).
const catalog: CatalogEntry[] = [];

// Ensure the vault directory exists.
export function ensureVault(): void {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

// Mock: LLM analyzes content and returns metadata + summary.
async function llmAnalyze(content: string) {
  const title = content.split('\n')[0] || 'Untitled';
  return {
    title,
    category: 'general',
    tags: ['document'],
    summary: `Summary: ${content.slice(0, 60)}...`,
  };
}

// Ingest a new file into the LLM Wiki vault.
export async function ingestFile(sourcePath: string): Promise<CatalogEntry> {
  ensureVault();

  // 1. Read the source content
  const content = fs.readFileSync(sourcePath, 'utf-8');

  // 2. LLM analyzes content → title, category, tags, summary
  const analysis = await llmAnalyze(content);

  const entry: CatalogEntry = {
    filePath: path.join(VAULT_DIR, `${analysis.title.toLowerCase().replace(/\s+/g, '-')}.md`),
    title: analysis.title,
    summary: analysis.summary,
    tags: analysis.tags,
  };

  // 3. Write the wiki document (Markdown + YAML frontmatter metadata)
  const frontmatter = `---\ntitle: ${entry.title}\ntags: ${entry.tags.join(', ')}\nsummary: ${entry.summary}\n---\n\n${content}`;
  fs.writeFileSync(entry.filePath, frontmatter, 'utf-8');

  // 4. Update the lightweight catalog
  catalog.push(entry);
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');

  return entry;
}

// List all catalog entries (metadata only — cheap, no full content loaded).
export function listCatalog(): CatalogEntry[] {
  return [...catalog];
}

// Read the full content of a single wiki file (expensive — only for selected files).
export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// Load catalog from disk if it exists.
export function loadCatalogFromDisk(): void {
  if (fs.existsSync(CATALOG_FILE)) {
    const data = fs.readFileSync(CATALOG_FILE, 'utf-8');
    const parsed: CatalogEntry[] = JSON.parse(data);
    catalog.push(...parsed);
  }
}