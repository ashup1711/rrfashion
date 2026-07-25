import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Parser from 'web-tree-sitter';
import type {
  ASTNode,
  ParsedFile,
  ClassInfo,
  FunctionInfo,
  SymbolInfo,
  ImportInfo,
  ExportInfo,
  DecoratorInfo,
  NestJSInfo,
  RouteInfo,
  ComponentInfo,
  AccessModifier
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARSER_DIR = resolve(__dirname, '..', '..');
const WASM_DIR = resolve(PARSER_DIR, 'wasm');

let tsParser: Parser | null = null;
let tsxParser: Parser | null = null;

export async function initialize(): Promise<void> {
  await Parser.init();
  
  const TypeScriptLang = await Parser.Language.load(resolve(WASM_DIR, 'tree-sitter-typescript.wasm'));
  tsParser = new Parser();
  tsParser.setLanguage(TypeScriptLang);
  
  const TSXLang = await Parser.Language.load(resolve(WASM_DIR, 'tree-sitter-tsx.wasm'));
  tsxParser = new Parser();
  tsxParser.setLanguage(TSXLang);
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

function extractDecorators(node: Parser.SyntaxNode): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];
  
  for (const child of node.children) {
    if (child.type === 'decorator') {
      const decoratorNode = child;
      const nameNode = decoratorNode.childForFieldName('name') || decoratorNode.descendantsOfType('identifier')[0];
      
      if (nameNode) {
        const argsNode = decoratorNode.descendantsOfType('arguments')[0];
        const args: string[] = [];
        
        if (argsNode) {
          const identifiers = argsNode.descendantsOfType('identifier');
          const strings = argsNode.descendantsOfType('string');
          const numbers = argsNode.descendantsOfType('number');
          for (const arg of [...identifiers, ...strings, ...numbers]) {
            args.push(arg.text.replace(/['"]/g, ''));
          }
        }
        
        decorators.push({
          name: nameNode.text,
          arguments: args.length > 0 ? args : undefined,
          span: { start: decoratorNode.startIndex, end: decoratorNode.endIndex }
        });
      }
    }
  }
  
  return decorators;
}

function extractParameters(node: Parser.SyntaxNode): Array<{ name: string; type?: string; optional?: boolean }> {
  const params: Array<{ name: string; type?: string; optional?: boolean }> = [];
  
  const paramList = node.childForFieldName('parameters');
  if (!paramList) return params;
  
  for (const param of paramList.children) {
    if (param.type === 'required_parameter' || param.type === 'optional_parameter' || param.type === 'parameter') {
      const nameNode = param.childForFieldName('name') || param.descendantsOfType('identifier')[0];
      const typeNode = param.childForFieldName('type');
      
      if (nameNode) {
        params.push({
          name: nameNode.text,
          type: typeNode ? typeNode.text : undefined,
          optional: param.type === 'optional_parameter' || param.text.includes('?')
        });
      }
    }
  }
  
  return params;
}

function extractMethods(classNode: Parser.SyntaxNode): SymbolInfo[] {
  const methods: SymbolInfo[] = [];
  const body = classNode.childForFieldName('body');
  if (!body) return methods;
  
  for (const child of body.children) {
    if (child.type === 'method_definition' || child.type === 'public_field_definition') {
      const nameNode = child.childForFieldName('name');
      if (nameNode) {
        methods.push({
          type: child.type === 'method_definition' ? 'method' : 'field',
          name: nameNode.text,
          span: { start: child.startIndex, end: child.endIndex },
          startPosition: { row: child.startPosition.row, column: child.startPosition.column },
          endPosition: { row: child.endPosition.row, column: child.endPosition.column }
        });
      }
    }
  }
  
  return methods;
}

function extractModifiers(node: Parser.SyntaxNode): AccessModifier[] {
  const modifiers: AccessModifier[] = [];
  for (const child of node.children) {
    if (child.type === 'accessibility_modifier') {
      modifiers.push(child.text as AccessModifier);
    }
  }
  return modifiers;
}

function extractClassInfo(node: Parser.SyntaxNode): ClassInfo | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  let decorators = extractDecorators(node);
  if (decorators.length === 0 && node.parent?.type === 'export_statement') {
    decorators = extractDecorators(node.parent);
  }
  const methods: FunctionInfo[] = [];
  const properties: SymbolInfo[] = [];
  let constructor: FunctionInfo | undefined;

  const body = node.childForFieldName('body');
  if (body) {
    let pendingDecorators: DecoratorInfo[] = [];
    for (const child of body.children) {
      if (child.type === 'decorator') {
        const decoName = child.descendantsOfType('identifier')[0];
        const argsNode = child.descendantsOfType('arguments')[0];
        const args: string[] = [];
        if (argsNode) {
          for (const arg of [...argsNode.descendantsOfType('string'), ...argsNode.descendantsOfType('identifier')]) {
            args.push(arg.text.replace(/['"]/g, ''));
          }
        }
        if (decoName) {
          pendingDecorators.push({
            name: decoName.text,
            arguments: args.length > 0 ? args : undefined,
            span: { start: child.startIndex, end: child.endIndex }
          });
        }
      } else if (child.type === 'method_definition') {
        const methodInfo = extractFunctionInfo(child);
        if (methodInfo) {
          if (pendingDecorators.length > 0) {
            methodInfo.decorators = pendingDecorators;
            pendingDecorators = [];
          }
          if (methodInfo.name === 'constructor') {
            constructor = methodInfo;
          } else {
            methods.push(methodInfo);
          }
        }
      } else if (child.type === 'public_field_definition') {
        pendingDecorators = [];
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          properties.push({
            type: 'field',
            name: nameNode.text,
            span: { start: child.startIndex, end: child.endIndex },
            startPosition: { row: child.startPosition.row, column: child.startPosition.column },
            endPosition: { row: child.endPosition.row, column: child.endPosition.column },
            modifiers: extractModifiers(child),
          });
        }
      }
    }
  }

  const implementsNode = node.childForFieldName('implements');
  const implementsList: string[] = [];
  if (implementsNode) {
    for (const impl of implementsNode.descendantsOfType('type_identifier')) {
      implementsList.push(impl.text);
    }
  }

  const extendsNode = node.childForFieldName('extends');
  const extendsName = extendsNode?.descendantsOfType('type_identifier')[0]?.text;

  return {
    name: nameNode.text,
    decorators,
    methods,
    properties,
    constructor,
    implements: implementsList.length > 0 ? implementsList : undefined,
    extends: extendsName,
    span: { start: node.startIndex, end: node.endIndex },
    startPosition: { row: node.startPosition.row, column: node.startPosition.column },
    endPosition: { row: node.endPosition.row, column: node.endPosition.column }
  };
}

function extractFunctionInfo(node: Parser.SyntaxNode): FunctionInfo | null {
  let nameNode = node.childForFieldName('name');
  if (!nameNode && (node.type === 'arrow_function' || node.type === 'function_expression')) {
    const parent = node.parent;
    if (parent?.type === 'variable_declarator') {
      const idNode = parent.childForFieldName('name');
      if (idNode) nameNode = idNode;
    }
  }
  if (!nameNode) return null;

  const params = extractParameters(node);
  const returnTypeNode = node.childForFieldName('return_type');
  const decorators = extractDecorators(node);
  const modifiers = extractModifiers(node);

  const isAsync = node.descendantsOfType('async').length > 0;
  const isStatic = node.parent?.type === 'class_body' &&
    node.previousSibling?.type === 'static_modifier';

  return {
    name: nameNode.text,
    parameters: params,
    returnType: returnTypeNode ? returnTypeNode.text : undefined,
    decorators,
    modifiers,
    isAsync,
    isStatic: !!isStatic,
    span: { start: node.startIndex, end: node.endIndex },
    startPosition: { row: node.startPosition.row, column: node.startPosition.column },
    endPosition: { row: node.endPosition.row, column: node.endPosition.column }
  };
}


function extractImports(root: Parser.SyntaxNode): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  for (const node of root.descendantsOfType('import_statement')) {
    const sourceNode = node.childForFieldName('source');
    if (!sourceNode) continue;
    
    const source = sourceNode.text.replace(/['"]/g, '');
    const specifiers: ImportInfo['specifiers'] = [];
    
    const importClause = node.childForFieldName('import_clause');
    if (importClause) {
      for (const namedImport of importClause.descendantsOfType('import_specifier')) {
        const nameNode = namedImport.descendantsOfType('identifier')[0];
        const aliasNode = namedImport.descendantsOfType('identifier')[1];
        
        if (nameNode) {
          specifiers.push({
            name: nameNode.text,
            alias: aliasNode?.text
          });
        }
      }
      
      const defaultImport = importClause.descendantsOfType('identifier')[0];
      if (defaultImport && !importClause.descendantsOfType('import_specifier').length) {
        specifiers.push({
          name: defaultImport.text,
          isDefault: true
        });
      }
      
      const namespaceImport = importClause.descendantsOfType('namespace_import')[0];
      if (namespaceImport) {
        const nameNode = namespaceImport.descendantsOfType('identifier')[0];
        if (nameNode) {
          specifiers.push({
            name: nameNode.text,
            isNamespace: true
          });
        }
      }
    }
    
    imports.push({
      source,
      specifiers,
      span: { start: node.startIndex, end: node.endIndex }
    });
  }
  
  return imports;
}

function extractExports(root: Parser.SyntaxNode): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  for (const node of root.descendantsOfType('export_statement')) {
    const isDefault = node.text.includes('export default');
    
    const declaration = node.childForFieldName('declaration');
    if (declaration) {
      const nameNode = declaration.childForFieldName('name') || 
        declaration.descendantsOfType('identifier')[0];
      
      if (nameNode) {
        exports.push({
          name: nameNode.text,
          isDefault,
          span: { start: node.startIndex, end: node.endIndex }
        });
      }
    }
  }
  
  return exports;
}

function extractNestJSInfo(classes: ClassInfo[]): NestJSInfo {
  const nestjsInfo: NestJSInfo = {
    controllers: [],
    services: [],
    modules: [],
    guards: [],
    interceptors: [],
    pipes: [],
    filters: [],
    dtos: [],
    entities: []
  };
  
  for (const cls of classes) {
    const decoratorNames = cls.decorators.map(d => d.name);
    
    if (decoratorNames.includes('Controller')) {
      nestjsInfo.controllers.push(cls);
    } else if (decoratorNames.includes('Injectable')) {
      if (cls.name.endsWith('Service')) {
        nestjsInfo.services.push(cls);
      } else if (cls.name.endsWith('Guard')) {
        nestjsInfo.guards.push(cls);
      } else if (cls.name.endsWith('Interceptor')) {
        nestjsInfo.interceptors.push(cls);
      } else if (cls.name.endsWith('Pipe')) {
        nestjsInfo.pipes.push(cls);
      } else if (cls.name.endsWith('Filter')) {
        nestjsInfo.filters.push(cls);
      } else {
        nestjsInfo.services.push(cls);
      }
    } else if (decoratorNames.includes('Module')) {
      nestjsInfo.modules.push(cls);
    }
    
    if (cls.name.endsWith('Dto')) {
      nestjsInfo.dtos.push(cls);
    }
    
    if (decoratorNames.includes('Entity') || cls.name.endsWith('Entity')) {
      nestjsInfo.entities.push(cls);
    }
  }
  
  return nestjsInfo;
}

function extractRoutes(controllers: ClassInfo[], root: Parser.SyntaxNode): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const methodDecoratorNames = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

  for (const controller of controllers) {
    const controllerPath = controller.decorators.find(d => d.name === 'Controller')?.arguments?.[0] || '';

    for (const method of controller.methods) {
      const routeDeco = method.decorators.find(d => methodDecoratorNames.includes(d.name));
      if (!routeDeco) continue;

      const path = (routeDeco.arguments?.[0] || '').replace(/['"]/g, '');
      const guards = method.decorators.filter(d => d.name === 'UseGuards');
      const responseDecorator = method.decorators.find(d => d.name === 'ApiResponse');
      const response = responseDecorator?.arguments?.[0];

      routes.push({
        method: routeDeco.name.toUpperCase() as RouteInfo['method'],
        path: `${controllerPath}${path}`.replace(/\/\//g, '/'),
        handlerName: method.name,
        decorators: method.decorators.filter(d => !methodDecoratorNames.includes(d.name) && d.name !== 'UseGuards'),
        parameters: method.parameters.map(p => ({
          name: p.name,
          type: p.type || 'any',
          decorator: method.decorators.find(d => d.arguments?.includes(p.name))?.name
        })),
        returnType: method.returnType,
        response,
        guards,
        span: method.span
      });
    }
  }

  return routes;
}


const KNOWN_REACT_HOOKS = new Set([
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
  'useReducer', 'useContext', 'useLayoutEffect', 'useImperativeHandle',
  'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
  'useSyncExternalStore', 'useInsertionEffect',
  'useNavigate', 'useParams', 'useLocation', 'useSearchParams',
  'useQuery', 'useMutation', 'useLazyQuery',
  'useForm', 'useFieldArray', 'useWatch',
  'useDispatch', 'useSelector', 'useStore',
  'useTranslation',
]);

function extractReactComponents(root: Parser.SyntaxNode, functions: FunctionInfo[]): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  
  for (const func of functions) {
    if (!func.name || !/^[A-Z]/.test(func.name)) continue;
    
    const hooks: string[] = [];
    const stateVariables: string[] = [];
    const props: string[] = [];
    
    const allFuncs = [
      ...root.descendantsOfType('function_declaration'),
      ...root.descendantsOfType('arrow_function'),
      ...root.descendantsOfType('function_expression')
    ];
    const funcNode = allFuncs.find(n => {
      if (n.type === 'arrow_function' || n.type === 'function_expression') {
        const parent = n.parent;
        if (parent?.type === 'variable_declarator') {
          const idNode = parent.childForFieldName('name');
          return idNode?.text === func.name;
        }
        return false;
      }
      return n.descendantsOfType('identifier')[0]?.text === func.name;
    });
    
    if (funcNode) {
      for (const param of func.parameters) {
        if (!param.decorators?.length) props.push(param.name);
      }
      
      for (const call of funcNode.descendantsOfType('call_expression')) {
        const callee = call.childForFieldName('function');
        if (!callee) continue;
        const name = callee.text;
        
        if (KNOWN_REACT_HOOKS.has(name) || (name.startsWith('use') && /^use[A-Z]/.test(name))) {
          if (!hooks.includes(name)) hooks.push(name);
          
          if (name === 'useState') {
            const patternNode = call.parent;
            if (patternNode) {
              const ids = patternNode.descendantsOfType('identifier');
              for (const id of ids) {
                if (id.text !== 'set' && !id.text.startsWith('set') && !stateVariables.includes(id.text)) {
                  stateVariables.push(id.text);
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    components.push({
      name: func.name,
      type: 'function',
      props: props.length > 0 ? props : undefined,
      hooks: hooks.length > 0 ? hooks : undefined,
      stateVariables: stateVariables.length > 0 ? stateVariables : undefined,
      span: func.span,
      startPosition: func.startPosition,
      endPosition: func.endPosition
    });
  }
  
  return components;
}

export function parseTypeScript(
  content: string,
  filePath: string,
  fileHash: string,
  isTSX: boolean = false
): Omit<ParsedFile, 'parsedAt'> {
  const parser = isTSX ? tsxParser : tsParser;
  if (!parser) {
    throw new Error('TypeScript parser not initialized. Call initialize() first.');
  }
  
  const tree = parser.parse(content);
  const root = tree.rootNode;
  
  const rootNodeAST = nodeToASTNode(root, false, 5);
  
  const classes: ClassInfo[] = [];
  const functions: FunctionInfo[] = [];
  const symbols: SymbolInfo[] = [];
  
  const classNodes = [
    ...root.descendantsOfType('class_declaration'),
    ...root.descendantsOfType('class_expression')
  ];
  for (const node of classNodes) {
    const classInfo = extractClassInfo(node);
    if (classInfo) {
      classes.push(classInfo);
      symbols.push({
        type: 'class',
        name: classInfo.name,
        span: classInfo.span,
        startPosition: classInfo.startPosition,
        endPosition: classInfo.endPosition
      });
    }
  }
  
  const funcNodes = [
    ...root.descendantsOfType('function_declaration'),
    ...root.descendantsOfType('arrow_function'),
    ...root.descendantsOfType('function_expression')
  ];
  for (const node of funcNodes) {
    const funcInfo = extractFunctionInfo(node);
    if (funcInfo) {
      functions.push(funcInfo);
      symbols.push({
        type: 'function',
        name: funcInfo.name,
        span: funcInfo.span,
        startPosition: funcInfo.startPosition,
        endPosition: funcInfo.endPosition
      });
    }
  }
  
  for (const node of root.descendantsOfType('interface_declaration')) {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      symbols.push({
        type: 'interface',
        name: nameNode.text,
        span: { start: node.startIndex, end: node.endIndex },
        startPosition: { row: node.startPosition.row, column: node.startPosition.column },
        endPosition: { row: node.endPosition.row, column: node.endPosition.column }
      });
    }
  }
  
  for (const node of root.descendantsOfType('type_alias_declaration')) {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      symbols.push({
        type: 'type',
        name: nameNode.text,
        span: { start: node.startIndex, end: node.endIndex },
        startPosition: { row: node.startPosition.row, column: node.startPosition.column },
        endPosition: { row: node.endPosition.row, column: node.endPosition.column }
      });
    }
  }
  
  for (const node of root.descendantsOfType('enum_declaration')) {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      symbols.push({
        type: 'enum',
        name: nameNode.text,
        span: { start: node.startIndex, end: node.endIndex },
        startPosition: { row: node.startPosition.row, column: node.startPosition.column },
        endPosition: { row: node.endPosition.row, column: node.endPosition.column }
      });
    }
  }
  
  const imports = extractImports(root);
  const exports = extractExports(root);
  
  const nestjs = extractNestJSInfo(classes);
  const routes = extractRoutes(nestjs.controllers, root);
  
  const react = isTSX ? {
    components: extractReactComponents(root, functions)
  } : undefined;
  
  return {
    filePath,
    fileHash,
    language: isTSX ? 'tsx' : 'typescript',
    rootNode: rootNodeAST,
    symbols,
    imports,
    exports,
    classes,
    functions,
    nestjs,
    routes,
    react
  };
}
