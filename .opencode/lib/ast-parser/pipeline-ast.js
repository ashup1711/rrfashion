#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const AST_PARSE_DIR = resolve(import.meta.dirname);
const ANALYZE_SCRIPT = join(AST_PARSE_DIR, 'ast-analyze.js');
const STATE_DIR = join(ROOT, '.opencode', 'state');

const [nodeBin, scriptPath, mode, agentName, promptFilePath] = process.argv;

const USAGE = `Usage: node pipeline-ast.js <mode> <agent-name> [prompt-file]

Modes:
  pre-dispatch   — Inject AST context into the agent's prompt file
  post-dispatch  — Validate agent's output files (runs automatically)
`;

async function main() {
  if (!mode || !['pre-dispatch', 'post-dispatch'].includes(mode) || !agentName) {
    console.error(USAGE);
    process.exit(1);
  }

  const projectStatePath = join(STATE_DIR, 'project_state.json');
  let projectState = {};
  if (existsSync(projectStatePath)) {
    try {
      projectState = JSON.parse(readFileSync(projectStatePath, 'utf-8'));
    } catch {}
  }

  const setup = projectState.project_setup || {};
  const promptAnalysis = projectState.prompt_analysis || {};

  if (mode === 'pre-dispatch') {
    if (!promptFilePath) {
      console.error('Error: pre-dispatch mode requires a prompt file path');
      process.exit(1);
    }
    await injectASTContext(agentName, promptFilePath, setup, promptAnalysis);
  } else if (mode === 'post-dispatch') {
    await validateAgentOutput(agentName, setup, promptAnalysis);
  }
}

function discoverFiles(setup, promptAnalysis) {
  const files = { backend: [], frontend: [], schema: [] };

  const layers = promptAnalysis.layers_affected || [];

  if (setup.has_backend || layers.includes('backend') || layers.includes('database') || layers.includes('payment') || layers.includes('insights')) {
    try {
      const backendDir = join(ROOT, 'backend', 'src');
      if (existsSync(backendDir)) {
        const results = execSync(
          `find ${backendDir} -type f \\( -name "*.controller.ts" -o -name "*.service.ts" -o -name "*.module.ts" -o -name "*.dto.ts" -o -name "*.guard.ts" -o -name "*.interceptor.ts" -o -name "*.filter.ts" -o -name "*.pipe.ts" \\) 2>/dev/null | head -30`,
          { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
        );
        files.backend = results.trim().split('\n').filter(Boolean);
      }
    } catch {}
  }

  if (setup.has_frontend || layers.includes('frontend')) {
    try {
      const frontendDir = join(ROOT, 'frontend', 'src');
      if (existsSync(frontendDir)) {
        const results = execSync(
          `find ${frontendDir} -type f -name "*.tsx" 2>/dev/null | head -30`,
          { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
        );
        files.frontend = results.trim().split('\n').filter(Boolean);
      }
    } catch {}
  }

  if (setup.has_database || layers.includes('database')) {
    const schemaPaths = [
      join(ROOT, 'backend', 'prisma', 'schema.prisma'),
      join(ROOT, 'prisma', 'schema.prisma'),
    ];
    for (const p of schemaPaths) {
      if (existsSync(p)) {
        files.schema.push(p);
        break;
      }
    }
  }

  return files;
}

async function injectASTContext(agentName, promptFilePath, setup, promptAnalysis) {
  const files = discoverFiles(setup, promptAnalysis);
  let astContextSections = [];

  const agentBackendAgents = ['node-expert', 'db-expert-postgres', 'payment-expert', 'insights-expert', 'code-review-and-qa'];
  const agentFrontendAgents = ['react-expert', 'code-review-and-qa'];

  if (agentBackendAgents.includes(agentName) && files.backend.length > 0) {
    const result = execSync(
      `node ${ANALYZE_SCRIPT} validate-contracts ${files.backend.join(' ')} 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    try {
      const data = JSON.parse(result);
      const rows = [];
      for (const [filePath, info] of Object.entries(data)) {
        const shortName = filePath.split('/').slice(-2).join('/');
        const routes = (info.routes || []).map(r => `${r.method} ${r.path}`).join(', ');
        const controllers = (info.controllers || []).join(', ');
        const services = (info.services || []).join(', ');
        if (controllers || routes) {
          rows.push(`| \`${shortName}\` | ${controllers} | ${routes} |`);
        }
      }
      if (rows.length > 0) {
        astContextSections.push(
          '### Existing Backend Routes & Controllers\n' +
          '| File | Controller | Routes |\n' +
          '|------|------------|--------|\n' +
          rows.join('\n')
        );
      }
    } catch {}
  }

  if ((agentFrontendAgents.includes(agentName) || agentName === 'research-agent' || agentName === 'suggestion-agent') && files.frontend.length > 0) {
    const result = execSync(
      `node ${ANALYZE_SCRIPT} explore ${files.frontend.slice(0, 20).join(' ')} 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    try {
      const data = JSON.parse(result);
      const compRows = [];
      for (const [filePath, info] of Object.entries(data)) {
        const shortName = filePath.split('/').slice(-2).join('/');
        for (const comp of info.components || []) {
          const hooks = (comp.hooks || []).join(', ');
          compRows.push(`| \`${shortName}\` | ${comp.name} | ${hooks} |`);
        }
      }
      if (compRows.length > 0) {
        astContextSections.push(
          '### Existing React Components\n' +
          '| File | Component | Detected Hooks |\n' +
          '|------|-----------|----------------|\n' +
          compRows.join('\n')
        );
      }
    } catch {}
  }

  if ((agentName === 'db-expert-postgres' || agentName === 'research-agent' || agentName === 'code-review-and-qa') && files.schema.length > 0) {
    const result = execSync(
      `node ${ANALYZE_SCRIPT} validate-schema ${files.schema[0]} 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    try {
      const data = JSON.parse(result);
      if (data.issues && data.issues.length > 0) {
        astContextSections.push(
          '### Schema Validation Warnings\n' +
          '| Model | Field | Issue |\n' +
          '|------|-------|-------|\n' +
          data.issues.map(i => `| ${i.model || '-'} | ${i.field || '-'} | ${i.issue} |`).join('\n')
        );
      }
    } catch {}
  }

  if (astContextSections.length > 0) {
    const astBlock = '\n\n## AST Context (Pre-Computed)\n\n' + astContextSections.join('\n\n') + '\n';
    if (existsSync(promptFilePath)) {
      const existing = readFileSync(promptFilePath, 'utf-8');
      if (!existing.includes('## AST Context')) {
        writeFileSync(promptFilePath, existing + astBlock);
      }
    }
  }

  console.log(JSON.stringify({ mode: 'pre-dispatch', agentName, injected: astContextSections.length > 0, sections: astContextSections.length }));
}

async function validateAgentOutput(agentName, setup, promptAnalysis) {
  const files = discoverFiles(setup, promptAnalysis);
  const issues = [];

  const validationCommands = [];

  if (agentName === 'node-expert' && files.backend.length > 0) {
    validationCommands.push(
      `node ${ANALYZE_SCRIPT} validate-nestjs ${files.backend.join(' ')} 2>/dev/null`
    );
  }

  if (agentName === 'react-expert' && files.frontend.length > 0) {
    validationCommands.push(
      `node ${ANALYZE_SCRIPT} validate-react ${files.frontend.join(' ')} 2>/dev/null`
    );
  }

  if (agentName === 'db-expert-postgres' && files.schema.length > 0) {
    validationCommands.push(
      `node ${ANALYZE_SCRIPT} validate-schema ${files.schema[0]} 2>/dev/null`
    );
  }

  for (const cmd of validationCommands) {
    try {
      const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
      const data = JSON.parse(result);
      if (!data.validated && data.issues && data.issues.length > 0) {
        issues.push(...data.issues);
      }
    } catch {}
  }

  if (issues.length > 0) {
    console.log(JSON.stringify({ mode: 'post-dispatch', agentName, passed: false, issues }));
    process.exit(1);
  }

  console.log(JSON.stringify({ mode: 'post-dispatch', agentName, passed: true, issues: [] }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
