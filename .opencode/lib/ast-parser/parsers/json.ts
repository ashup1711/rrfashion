import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Parser from 'web-tree-sitter';
import type {
  ASTNode,
  ParsedFile,
  SymbolInfo
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARSER_DIR = resolve(__dirname, '..', '..');
const WASM_DIR = resolve(PARSER_DIR, 'wasm');

let jsonParser: Parser | null = null;
let yamlParser: Parser | null = null;

export async function initialize(): Promise<void> {
  await Parser.init();
  
  const JSONLang = await Parser.Language.load(resolve(WASM_DIR, 'tree-sitter-json.wasm'));
  jsonParser = new Parser();
  jsonParser.setLanguage(JSONLang);
  
  // YAML parser disabled — incompatible WASM with current web-tree-sitter version
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

export function parseJSON(
  content: string,
  filePath: string,
  fileHash: string
): Omit<ParsedFile, 'parsedAt'> {
  let rootNode: ASTNode = {
    type: 'document',
    text: '',
    startPosition: { row: 0, column: 0 },
    endPosition: { row: content.split('\n').length - 1, column: 0 }
  };
  
  let symbols: SymbolInfo[] = [];
  
  if (jsonParser) {
    try {
      const tree = jsonParser.parse(content);
      const root = tree.rootNode;
      const firstChild = root.children.find(c => c.type === 'object');
      
      if (firstChild) {
        for (const pair of firstChild.children.filter(c => c.type === 'pair')) {
          const keyNode = pair.childForFieldName('key');
          if (!keyNode) continue;
          
          const key = keyNode.text.replace(/"/g, '');
          const valueNode = pair.childForFieldName('value');
          if (!valueNode) continue;
          
          if (key === 'dependencies' || key === 'devDependencies' || key === 'peerDependencies') {
            for (const dep of valueNode.children.filter(c => c.type === 'pair')) {
              const depNameNode = dep.childForFieldName('key');
              const versionNode = dep.childForFieldName('value');
              
              if (depNameNode && versionNode) {
                symbols.push({
                  type: 'dependency',
                  name: depNameNode.text.replace(/"/g, ''),
                  span: { start: dep.startIndex, end: dep.endIndex },
                  startPosition: { row: dep.startPosition.row, column: dep.startPosition.column },
                  endPosition: { row: dep.endPosition.row, column: dep.endPosition.column },
                  metadata: {
                    version: versionNode.text.replace(/"/g, ''),
                    dependencyType: key
                  }
                });
              }
            }
          }
          
          if (key === 'scripts') {
            for (const script of valueNode.children.filter(c => c.type === 'pair')) {
              const scriptNameNode = script.childForFieldName('key');
              
              if (scriptNameNode) {
                symbols.push({
                  type: 'constant',
                  name: scriptNameNode.text.replace(/"/g, ''),
                  span: { start: script.startIndex, end: script.endIndex },
                  startPosition: { row: script.startPosition.row, column: script.startPosition.column },
                  endPosition: { row: script.endPosition.row, column: script.endPosition.column },
                  metadata: { script: true }
                });
              }
            }
          }
        }
      }
    } catch {
    }
  }
  
  return {
    filePath,
    fileHash,
    language: 'json',
    rootNode,
    symbols,
    imports: [],
    exports: [],
    classes: [],
    functions: []
  };
}

export function parseYAML(
  content: string,
  filePath: string,
  fileHash: string
): Omit<ParsedFile, 'parsedAt'> {
  let rootNode: ASTNode = {
    type: 'document',
    text: '',
    startPosition: { row: 0, column: 0 },
    endPosition: { row: content.split('\n').length - 1, column: 0 }
  };
  
  const symbols: SymbolInfo[] = [];
  
  if (yamlParser) {
    try {
      const tree = yamlParser.parse(content);
      rootNode = nodeToASTNode(tree.rootNode, false, 5);
    } catch {
    }
  }
  
  return {
    filePath,
    fileHash,
    language: 'yaml',
    rootNode,
    symbols,
    imports: [],
    exports: [],
    classes: [],
    functions: []
  };
}
