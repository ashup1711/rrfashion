import { readFileSync, existsSync, statSync } from 'fs';
import { extname, basename } from 'path';
import { computeFileHash, getCachedAST, setCachedAST, DEFAULT_CACHE_DIR } from './cache.js';
import { initialize as initTypeScript, parseTypeScript } from './parsers/typescript.js';
import { initialize as initSQL, parseSQL } from './parsers/sql.js';
import { initialize as initJSON, parseJSON, parseYAML } from './parsers/json.js';
import type { ParsedFile, Language, ParserOptions, SymbolInfo, ImportInfo, ExportInfo, ClassInfo } from './types.js';

export type { ParsedFile, Language, ParserOptions } from './types.js';
export type {
  ASTNode,
  SymbolInfo,
  ClassInfo,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
  NestJSInfo,
  RouteInfo,
  ComponentInfo,
  PrismaModelInfo
} from './types.js';

let initialized = false;

export async function initialize(): Promise<void> {
  if (initialized) return;
  
  await initTypeScript();
  await initSQL();
  await initJSON();
  
  initialized = true;
}

function detectLanguage(filePath: string): Language {
  const ext = extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.js':
      return 'javascript';
    case '.jsx':
      return 'jsx';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.sql':
      return 'sql';
    case '.prisma':
      return 'prisma';
    default:
      if (basename(filePath) === 'package.json' || 
          basename(filePath).startsWith('tsconfig')) {
        return 'json';
      }
      return 'typescript';
  }
}

export async function parseFile(
  filePath: string,
  options: ParserOptions = {}
): Promise<ParsedFile> {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const fileHash = computeFileHash(content);
  
  if (!options.forceReparse) {
    const cached = getCachedAST(cacheDir, filePath, content);
    if (cached) {
      return {
        ...cached,
        parsedAt: new Date().toISOString()
      };
    }
  }
  
  const language = detectLanguage(filePath);
  
  let result: Omit<ParsedFile, 'parsedAt'>;
  
  switch (language) {
    case 'typescript':
    case 'tsx':
      result = parseTypeScript(content, filePath, fileHash, language === 'tsx');
      break;
    
    case 'javascript':
    case 'jsx':
      result = parseTypeScript(content, filePath, fileHash, language === 'jsx');
      break;
    
    case 'sql':
    case 'prisma':
      result = parseSQL(content, filePath, fileHash);
      break;
    
    case 'json':
      result = parseJSON(content, filePath, fileHash);
      break;
    
    case 'yaml':
      result = parseYAML(content, filePath, fileHash);
      break;
    
    default:
      throw new Error(`Unsupported language: ${language} for file: ${filePath}`);
  }
  
  const parsedFile: ParsedFile = {
    ...result,
    parsedAt: new Date().toISOString()
  };
  
  setCachedAST(cacheDir, parsedFile);
  
  return parsedFile;
}

export async function parseFiles(
  filePaths: string[],
  options: ParserOptions = {}
): Promise<Map<string, ParsedFile>> {
  const results = new Map<string, ParsedFile>();
  
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const parsed = await parseFile(filePath, options);
        results.set(filePath, parsed);
      } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
      }
    })
  );
  
  return results;
}

export function getSymbolsByType(parsedFile: ParsedFile, type: SymbolInfo['type']): SymbolInfo[] {
  return parsedFile.symbols.filter(s => s.type === type);
}

export function findNestJSControllers(parsedFile: ParsedFile) {
  return parsedFile.nestjs?.controllers || [];
}

export function findNestJSServices(parsedFile: ParsedFile) {
  return parsedFile.nestjs?.services || [];
}

export function findNestJSModules(parsedFile: ParsedFile) {
  return parsedFile.nestjs?.modules || [];
}

export function findRoutes(parsedFile: ParsedFile) {
  return parsedFile.routes || [];
}

export function findReactComponents(parsedFile: ParsedFile) {
  return parsedFile.react?.components || [];
}

export function findPrismaModels(parsedFile: ParsedFile) {
  return parsedFile.prismaModels || [];
}

export function extractImports(parsedFile: ParsedFile): ImportInfo[] {
  return parsedFile.imports;
}

export function extractExports(parsedFile: ParsedFile): ExportInfo[] {
  return parsedFile.exports;
}

export function extractClassMethods(parsedFile: ParsedFile, className: string): SymbolInfo[] {
  const cls = parsedFile.classes.find(c => c.name === className);
  if (!cls?.methods) return [];
  return cls.methods.map(m => ({
    type: 'method' as const,
    name: m.name,
    span: m.span,
    startPosition: m.startPosition,
    endPosition: m.endPosition,
    modifiers: m.modifiers,
    metadata: {
      returnType: m.returnType,
      isAsync: m.isAsync,
      isStatic: m.isStatic,
      parameters: m.parameters.map(p => ({ name: p.name, type: p.type }))
    }
  }));
}

export function findDecoratedClasses(parsedFile: ParsedFile, decoratorName: string): ClassInfo[] {
  return parsedFile.classes.filter(cls =>
    cls.decorators.some(d => d.name === decoratorName)
  );
}

export function generateSymbolIndex(parsedFiles: Map<string, ParsedFile>): Record<string, { file: string; symbol: SymbolInfo }[]> {
  const index: Record<string, { file: string; symbol: SymbolInfo }[]> = {};
  
  for (const [filePath, parsed] of parsedFiles) {
    for (const symbol of parsed.symbols) {
      if (!index[symbol.name]) {
        index[symbol.name] = [];
      }
      index[symbol.name].push({ file: filePath, symbol });
    }
  }
  
  return index;
}

export { computeFileHash, getCachedAST, setCachedAST, clearAllCache, pruneOldEntries, getCacheStats } from './cache.js';
