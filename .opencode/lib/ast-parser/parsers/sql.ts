import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Parser from 'web-tree-sitter';
import type {
  ASTNode,
  ParsedFile,
  PrismaModelInfo
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARSER_DIR = resolve(__dirname, '..', '..');
const WASM_DIR = resolve(PARSER_DIR, 'wasm');

let sqlParser: Parser | null = null;

export async function initialize(): Promise<void> {
  await Parser.init();
  const SQLLang = await Parser.Language.load(resolve(WASM_DIR, 'tree-sitter-sql.wasm'));
  sqlParser = new Parser();
  sqlParser.setLanguage(SQLLang);
}

function nodeToASTNode(node: Parser.SyntaxNode, includeText: boolean = false, maxDepth: number = 10, currentDepth: number = 0): ASTNode {
  const result: ASTNode = {
    type: node.type,
    text: includeText ? node.text : '',
    startPosition: { row: node.startPosition.row, column: node.startPosition.column },
    endPosition: { row: node.endPosition.row, column: node.endPosition.column }
  };
  
  if (currentDepth < maxDepth && node.childCount > 0) {
    result.children = node.children.map(child => 
      nodeToASTNode(child, includeText, maxDepth, currentDepth + 1)
    );
  }
  
  return result;
}

function extractPrismaModelName(line: string): string | null {
  const match = line.match(/^model\s+(\w+)/);
  return match ? match[1] : null;
}

function extractPrismaEnumName(line: string): string | null {
  const match = line.match(/^enum\s+(\w+)/);
  return match ? match[1] : null;
}

export function parsePrismaSchema(content: string): PrismaModelInfo[] {
  const models: PrismaModelInfo[] = [];
  const lines = content.split('\n');
  
  let currentModel: string | null = null;
  let currentEnum: string | null = null;
  let currentFields: PrismaModelInfo['fields'] = [];
  let currentIndexes: PrismaModelInfo['indexes'] = [];
  let currentEnums: PrismaModelInfo['enums'] = [];
  let braceDepth = 0;
  let modelStartLine = 0;
  let pendingEnumValues: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    
    if (trimmed.startsWith('}') && braceDepth > 0) {
      braceDepth--;
      if (braceDepth === 0 && currentModel) {
        models.push({
          name: currentModel,
          fields: currentFields,
          enums: currentEnums.length > 0 ? currentEnums : undefined,
          indexes: currentIndexes.length > 0 ? currentIndexes : undefined,
          span: { start: modelStartLine, end: i },
          startPosition: { row: modelStartLine, column: 0 },
          endPosition: { row: i, column: 0 }
        });
        currentModel = null;
        currentFields = [];
        currentIndexes = [];
        currentEnums = [];
      }
      if (braceDepth === 0 && currentEnum) {
        currentEnums.push({ name: currentEnum, values: pendingEnumValues });
        pendingEnumValues = [];
        currentEnum = null;
      }
      continue;
    }
    
    if (trimmed.includes('{') && (extractPrismaModelName(trimmed) || extractPrismaEnumName(trimmed))) {
      const modelName = extractPrismaModelName(trimmed);
      if (modelName) {
        currentModel = modelName;
        modelStartLine = i;
        braceDepth = 1;
        currentFields = [];
        currentIndexes = [];
        currentEnums = [];
        continue;
      }
      
      const enumName = extractPrismaEnumName(trimmed);
      if (enumName) {
        currentEnum = enumName;
        braceDepth = 1;
        pendingEnumValues = [];
        continue;
      }
    }
    
    if (currentModel && braceDepth >= 1) {
      if (trimmed.startsWith('@@')) {
        const indexMatch = trimmed.match(/@@index\(\[([^\]]+)\](?:,\s*name:\s*"([^"]+)")?\)/);
        if (indexMatch) {
          const fields = indexMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
          currentIndexes.push({ fields, unique: trimmed.includes('unique') });
        }
        
        const uniqueMatch = trimmed.match(/@@unique\(\[([^\]]+)\]/);
        if (uniqueMatch) {
          const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
          currentIndexes.push({ fields, unique: true });
        }
        continue;
      }
      
      if (trimmed.startsWith('@@id')) continue;
      
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && !parts[0].startsWith('@') && !parts[0].startsWith('@@')) {
        const name = parts[0];
        let type = parts[1];
        
        const isOptional = type.includes('?');
        const isList = type.includes('[]');
        type = type.replace(/[?\[\]]/g, '');
        
        const isId = parts.includes('@id');
        const isUnique = parts.includes('@unique');
        
        let defaultValue: string | undefined;
        const defaultMatch = trimmed.match(/@default\(([^)]+)\)/);
        if (defaultMatch) defaultValue = defaultMatch[1];
        
        let relation: PrismaModelInfo['fields'][0]['relation'] | undefined;
        const relationMatch = trimmed.match(/@relation\(([^)]+)\)/);
        if (relationMatch) {
          const relStr = relationMatch[1];
          const nameMatch = relStr.match(/name:\s*"?([^",]+)"?/);
          const fieldsMatch = relStr.match(/fields:\s*\[([^\]]+)\]/);
          const refsMatch = relStr.match(/references:\s*\[([^\]]+)\]/);
          
          relation = {
            name: nameMatch?.[1]?.trim() || '',
            fields: fieldsMatch?.[1]?.split(',').map(f => f.trim().replace(/"/g, '')) || [],
            references: refsMatch?.[1]?.split(',').map(f => f.trim().replace(/"/g, '')) || []
          };
        }
        
        currentFields.push({
          name, type, isOptional, isList, isId, isUnique,
          defaultValue, relation
        });
      }
    }
    
    if (currentEnum && braceDepth >= 1 && !trimmed.includes('{')) {
      pendingEnumValues.push(trimmed.replace(',', '').trim());
    }
    
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    if (openBraces > closeBraces && !currentModel && !currentEnum) {
      const mn = extractPrismaModelName(trimmed);
      if (mn) { currentModel = mn; modelStartLine = i; currentFields = []; currentIndexes = []; currentEnums = []; }
      const en = extractPrismaEnumName(trimmed);
      if (en) { currentEnum = en; pendingEnumValues = []; }
      braceDepth += openBraces - closeBraces;
    }
  }
  
  const enumRegex = /enum\s+(\w+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    const enumName = match[1];
    const body = match[2];
    const values = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    
    if (!models.some(m => m.name === enumName)) {
      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;
      models.push({
        name: enumName,
        fields: [],
        enums: [{ name: enumName, values }],
        span: { start: startIndex, end: endIndex },
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 0 }
      });
    }
  }
  
  return models;
}

export function parseSQL(
  content: string,
  filePath: string,
  fileHash: string
): Omit<ParsedFile, 'parsedAt'> {
  const prismaModels = parsePrismaSchema(content);
  
  let rootNode: ASTNode = {
    type: 'program',
    text: '',
    startPosition: { row: 0, column: 0 },
    endPosition: { row: content.split('\n').length - 1, column: 0 }
  };
  
  if (sqlParser) {
    try {
      const tree = sqlParser.parse(content);
      rootNode = nodeToASTNode(tree.rootNode, false, 5);
    } catch {
    }
  }
  
  const symbols = prismaModels.map(m => ({
    type: 'class' as const,
    name: m.name,
    span: m.span,
    startPosition: m.startPosition,
    endPosition: m.endPosition
  }));
  
  return {
    filePath,
    fileHash,
    language: filePath.endsWith('.prisma') ? 'prisma' : 'sql',
    rootNode,
    symbols,
    imports: [],
    exports: [],
    classes: [],
    functions: [],
    prismaModels
  };
}
