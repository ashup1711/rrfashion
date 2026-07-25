#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';

const [nodeBin, scriptPath, mode, ...filePaths] = process.argv;

const USAGE = `Usage: node ast-analyze.js <mode> <file1> [file2...]

Modes:
  explore         — Extract all symbols, imports, exports, NestJS/React patterns
  validate-nestjs — Check NestJS decorator integrity (@Controller, @Injectable, @Module)
  validate-react  — Check React component exports and hook patterns
  validate-schema — Check Prisma schema for relation integrity and missing PKs
  validate-contracts — Check that routes match expected contracts
  symbol-index    — Build cross-file symbol index
`;

const modes = ['explore', 'validate-nestjs', 'validate-react', 'validate-schema', 'validate-contracts', 'symbol-index'];

async function main() {
  if (!mode || !modes.includes(mode) || filePaths.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }

  const { initialize, parseFile, parseFiles, findNestJSControllers, findNestJSServices, findNestJSModules, findRoutes, findReactComponents, findPrismaModels, extractImports, extractExports, findDecoratedClasses, generateSymbolIndex, getSymbolsByType } = await import('./dist/index.js');

  await initialize();
  const parsedFiles = await parseFiles(filePaths.map(p => resolve(p)));

  switch (mode) {
    case 'explore': {
      const result = {};
      for (const [filePath, parsed] of parsedFiles) {
        result[filePath] = {
          language: parsed.language,
          symbols: parsed.symbols.map(s => ({ type: s.type, name: s.name, position: `${s.startPosition.row}:${s.startPosition.column}` })),
          controllers: findNestJSControllers(parsed).map(c => ({
            name: c.name,
            decorators: c.decorators.map(d => ({ name: d.name, args: d.arguments })),
            methods: c.methods.map(m => m.name),
            constructor: c.constructor ? { params: c.constructor.parameters.map(p => ({ name: p.name, type: p.type })) } : null,
          })),
          services: findNestJSServices(parsed).map(s => ({ name: s.name, methods: s.methods.map(m => m.name) })),
          modules: findNestJSModules(parsed).map(m => ({ name: m.name })),
          routes: findRoutes(parsed).map(r => ({ method: r.method, path: r.path, handler: r.handlerName, guards: r.guards?.map(g => g.name), response: r.response })),
          components: findReactComponents(parsed).map(c => ({ name: c.name, type: c.type, props: c.props, hooks: c.hooks, stateVariables: c.stateVariables })),
          models: findPrismaModels(parsed).map(m => ({ name: m.name, fields: m.fields.map(f => ({ name: f.name, type: f.type, isOptional: f.isOptional, isId: f.isId, isUnique: f.isUnique, relation: f.relation ? { name: f.relation.name, fields: f.relation.fields, references: f.relation.references } : null })), indexes: m.indexes, enums: m.enums })),
          imports: extractImports(parsed).map(i => ({ source: i.source })),
          exports: extractExports(parsed).map(e => ({ name: e.name, isDefault: e.isDefault })),
        };
      }
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'validate-nestjs': {
      const issues = [];
      for (const [filePath, parsed] of parsedFiles) {
        const controllers = findNestJSControllers(parsed);
        const services = findNestJSServices(parsed);
        const modules = findNestJSModules(parsed);
        const routes = findRoutes(parsed);

        for (const ctrl of controllers) {
          if (!ctrl.decorators.some(d => d.name === 'Controller')) {
            issues.push({ file: filePath, severity: 'error', issue: 'Missing @Controller() decorator', controller: ctrl.name });
          }
          const matchingModule = modules.some(m => ctrl.name.replace('Controller', 'Module') === m.name || m.name.includes(ctrl.name.replace('Controller', '')));
          if (!matchingModule && modules.length > 0) {
            issues.push({ file: filePath, severity: 'warning', issue: 'Controller may not be registered in any module', controller: ctrl.name });
          }
        }
        for (const svc of services) {
          if (!svc.decorators.some(d => d.name === 'Injectable')) {
            issues.push({ file: filePath, severity: 'error', issue: 'Missing @Injectable() decorator', service: svc.name });
          }
        }
        for (const route of routes) {
          const hasGuard = route.guards && route.guards.length > 0;
          if (!hasGuard && !route.path.includes('/health')) {
            issues.push({ file: filePath, severity: 'warning', issue: 'Route may lack auth guard', route: `${route.method} ${route.path}` });
          }
        }
      }
      console.log(JSON.stringify({ validated: issues.length === 0, issues }, null, 2));
      break;
    }

    case 'validate-react': {
      const issues = [];
      for (const [filePath, parsed] of parsedFiles) {
        const components = findReactComponents(parsed);
        const exports = extractExports(parsed).map(e => e.name);
        for (const comp of components) {
          if (!exports.includes(comp.name) && !exports.includes('default')) {
            issues.push({ file: filePath, severity: 'warning', issue: 'Component not exported', component: comp.name });
          }
          if (comp.hooks && comp.hooks.length > 0 && !comp.hooks.some(h => h === 'useState' || h === 'useReducer')) {
            issues.push({ file: filePath, severity: 'info', issue: 'Component uses hooks but no state management', component: comp.name, hooks: comp.hooks });
          }
        }
      }
      console.log(JSON.stringify({ validated: issues.length === 0, issues }, null, 2));
      break;
    }

    case 'validate-schema': {
      const issues = [];
      for (const [filePath, parsed] of parsedFiles) {
        const models = findPrismaModels(parsed);
        const allModelNames = new Set(models.map(m => m.name));
        const nativeTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'BigInt', 'Decimal', 'Json', 'Bytes', 'Json']);

        for (const model of models) {
          if (!model.fields.some(f => f.isId)) {
            issues.push({ file: filePath, severity: 'error', issue: 'Model has no primary key', model: model.name });
          }
          for (const field of model.fields) {
            if (field.relation) {
              const refModel = field.relation.references?.[0];
              if (refModel && !allModelNames.has(refModel) && !nativeTypes.has(refModel)) {
                issues.push({ file: filePath, severity: 'error', issue: 'Relation references non-existent model', model: model.name, field: field.name, ref: refModel });
              }
            }
          }
        }
      }
      console.log(JSON.stringify({ validated: issues.length === 0, issues }, null, 2));
      break;
    }

    case 'validate-contracts': {
      const result = {};
      for (const [filePath, parsed] of parsedFiles) {
        result[filePath] = {
          routes: findRoutes(parsed).map(r => ({ method: r.method, path: r.path, handler: r.handlerName, guards: r.guards?.map(g => g.name), returnType: r.returnType })),
          controllers: findNestJSControllers(parsed).map(c => c.name),
          services: findNestJSServices(parsed).map(s => s.name),
          modules: findNestJSModules(parsed).map(m => m.name),
        };
      }
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'symbol-index': {
      const index = generateSymbolIndex(parsedFiles);
      console.log(JSON.stringify({ symbolCount: Object.keys(index).length, symbols: index }, null, 2));
      break;
    }
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
