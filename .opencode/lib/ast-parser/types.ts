export interface ASTNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: ASTNode[];
}

export type AccessModifier = 'public' | 'private' | 'protected' | 'readonly';

export interface SymbolInfo {
  type: 'class' | 'function' | 'method' | 'interface' | 'type' | 'enum' | 'variable' | 'constant' | 'decorator' | 'import' | 'export' | 'field' | 'parameter' | 'dependency';
  name: string;
  span: { start: number; end: number };
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  modifiers?: AccessModifier[];
  metadata?: Record<string, unknown>;
}

export interface ImportInfo {
  source: string;
  specifiers: Array<{
    name: string;
    alias?: string;
    isDefault?: boolean;
    isNamespace?: boolean;
  }>;
  span: { start: number; end: number };
}

export interface ExportInfo {
  name: string;
  alias?: string;
  isDefault: boolean;
  span: { start: number; end: number };
}

export interface DecoratorInfo {
  name: string;
  arguments?: string[];
  span: { start: number; end: number };
}

export interface ClassInfo {
  name: string;
  decorators: DecoratorInfo[];
  methods: FunctionInfo[];
  properties: SymbolInfo[];
  constructor?: FunctionInfo;
  implements?: string[];
  extends?: string;
  span: { start: number; end: number };
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export interface FunctionInfo {
  name: string;
  parameters: Array<{ name: string; type?: string; optional?: boolean; decorators?: DecoratorInfo[] }>;
  returnType?: string;
  decorators: DecoratorInfo[];
  modifiers?: AccessModifier[];
  isAsync: boolean;
  isStatic: boolean;
  span: { start: number; end: number };
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export interface ComponentInfo {
  name: string;
  type: 'function' | 'class';
  props?: string[];
  hooks?: string[];
  stateVariables?: string[];
  span: { start: number; end: number };
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export interface NestJSInfo {
  controllers: ClassInfo[];
  services: ClassInfo[];
  modules: ClassInfo[];
  guards: ClassInfo[];
  interceptors: ClassInfo[];
  pipes: ClassInfo[];
  filters: ClassInfo[];
  dtos: ClassInfo[];
  entities: ClassInfo[];
}

export interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handlerName: string;
  decorators: DecoratorInfo[];
  parameters: Array<{ name: string; type: string; decorator?: string }>;
  returnType?: string;
  response?: string;
  guards?: DecoratorInfo[];
  span: { start: number; end: number };
}

export interface PrismaModelInfo {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    isOptional: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    defaultValue?: string;
    relation?: { name: string; fields: string[]; references: string[] };
  }>;
  enums?: Array<{ name: string; values: string[] }>;
  indexes?: Array<{ fields: string[]; unique?: boolean }>;
  span: { start: number; end: number };
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export interface ParsedFile {
  filePath: string;
  fileHash: string;
  language: 'typescript' | 'tsx' | 'javascript' | 'jsx' | 'json' | 'yaml' | 'sql' | 'prisma';
  parsedAt: string;
  rootNode: ASTNode;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  nestjs?: NestJSInfo;
  routes?: RouteInfo[];
  prismaModels?: PrismaModelInfo[];
  react?: {
    components: ComponentInfo[];
  };
}

export interface ASTCacheManifest {
  version: string;
  lastUpdated: string;
  files: Record<string, {
    hash: string;
    parsedAt: string;
    language: string;
  }>;
}

export interface ParserOptions {
  cacheDir?: string;
  forceReparse?: boolean;
  includeNodeText?: boolean;
  maxDepth?: number;
}

export type Language = 'typescript' | 'tsx' | 'javascript' | 'jsx' | 'json' | 'yaml' | 'sql' | 'prisma';
