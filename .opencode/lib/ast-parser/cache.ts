import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import type { ASTCacheManifest, ParsedFile, ParserOptions } from './types.js';

const DEFAULT_CACHE_DIR = '.opencode/state/ast-cache';
const MANIFEST_FILE = 'ast-cache-manifest.json';
const CURRENT_VERSION = '1.0.0';

function computeFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function loadManifest(cacheDir: string): ASTCacheManifest {
  const manifestPath = join(cacheDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return {
      version: CURRENT_VERSION,
      lastUpdated: new Date().toISOString(),
      files: {}
    };
  }
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      version: CURRENT_VERSION,
      lastUpdated: new Date().toISOString(),
      files: {}
    };
  }
}

function saveManifest(cacheDir: string, manifest: ASTCacheManifest): void {
  const manifestPath = join(cacheDir, MANIFEST_FILE);
  manifest.lastUpdated = new Date().toISOString();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function getCacheFilePath(cacheDir: string, fileHash: string): string {
  return join(cacheDir, `${fileHash}.ast.json`);
}

export function getCachedAST(cacheDir: string, filePath: string, content: string): ParsedFile | null {
  const hash = computeFileHash(content);
  const manifest = loadManifest(cacheDir);
  const cachedEntry = manifest.files[filePath];
  
  if (!cachedEntry || cachedEntry.hash !== hash) {
    return null;
  }
  
  const cachePath = getCacheFilePath(cacheDir, hash);
  if (!existsSync(cachePath)) {
    return null;
  }
  
  try {
    const cachedContent = readFileSync(cachePath, 'utf-8');
    return JSON.parse(cachedContent) as ParsedFile;
  } catch {
    return null;
  }
}

export function setCachedAST(cacheDir: string, parsedFile: ParsedFile): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  
  const manifest = loadManifest(cacheDir);
  
  manifest.files[parsedFile.filePath] = {
    hash: parsedFile.fileHash,
    parsedAt: parsedFile.parsedAt,
    language: parsedFile.language
  };
  
  const cachePath = getCacheFilePath(cacheDir, parsedFile.fileHash);
  writeFileSync(cachePath, JSON.stringify(parsedFile, null, 2));
  
  saveManifest(cacheDir, manifest);
}

export function invalidateCache(cacheDir: string, filePath: string): void {
  const manifest = loadManifest(cacheDir);
  const entry = manifest.files[filePath];
  
  if (entry) {
    const cachePath = getCacheFilePath(cacheDir, entry.hash);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
    delete manifest.files[filePath];
    saveManifest(cacheDir, manifest);
  }
}

export function clearAllCache(cacheDir: string): void {
  const manifest = loadManifest(cacheDir);
  
  for (const filePath of Object.keys(manifest.files)) {
    const entry = manifest.files[filePath];
    const cachePath = getCacheFilePath(cacheDir, entry.hash);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
  }
  
  const manifestPath = join(cacheDir, MANIFEST_FILE);
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
}

export function getCacheStats(cacheDir: string): { totalFiles: number; totalSize: number; oldestEntry: string | null } {
  const manifest = loadManifest(cacheDir);
  let totalSize = 0;
  let oldestDate: Date | null = null;
  let oldestEntry: string | null = null;
  
  for (const filePath of Object.keys(manifest.files)) {
    const entry = manifest.files[filePath];
    const cachePath = getCacheFilePath(cacheDir, entry.hash);
    
    if (existsSync(cachePath)) {
      const stats = statSync(cachePath);
      totalSize += stats.size;
      
      const parsedDate = new Date(entry.parsedAt);
      if (!oldestDate || parsedDate < oldestDate) {
        oldestDate = parsedDate;
        oldestEntry = filePath;
      }
    }
  }
  
  return {
    totalFiles: Object.keys(manifest.files).length,
    totalSize,
    oldestEntry
  };
}

export function pruneOldEntries(cacheDir: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  const manifest = loadManifest(cacheDir);
  const now = Date.now();
  let pruned = 0;
  
  for (const filePath of Object.keys(manifest.files)) {
    const entry = manifest.files[filePath];
    const entryDate = new Date(entry.parsedAt).getTime();
    
    if (now - entryDate > maxAge) {
      const cachePath = getCacheFilePath(cacheDir, entry.hash);
      if (existsSync(cachePath)) {
        unlinkSync(cachePath);
      }
      delete manifest.files[filePath];
      pruned++;
    }
  }
  
  if (pruned > 0) {
    saveManifest(cacheDir, manifest);
  }
  
  return pruned;
}

export { computeFileHash, DEFAULT_CACHE_DIR };
