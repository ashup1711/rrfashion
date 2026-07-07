# Opencode Multi-Stack Pipeline

A multi-agent pipeline for two supported stacks using opencode skills:
- **Flutter + Python (FastAPI/Flask) + SQLAlchemy** — original stack (Virtual Makeup app)
- **React + Node.js + PostgreSQL + Redis + Razorpay** — added stack (R R Fashion e-commerce/rental platform)

This pipeline orchestrates development workflows across database, backend, frontend, payment, and insights/reporting layers with code review, QA verification, and improvement suggestions. The orchestrator auto-detects which stack a given repo uses and routes to the matching set of expert agents.

## Layout

```
.opencode/
  agents/                    # Agent definitions (markdown files)
    orchestrator.md          # PRIMARY AGENT - Analyzes and dispatches
    research-agent.md        # SUBAGENT - Codebase analysis and final requirement prompt
    db-expert.md             # SUBAGENT - Database schema and migrations (Postgres/SQLAlchemy, Flutter+Python stack)
    db-expert-postgres.md    # SUBAGENT - Database schema and migrations (Postgres/Redis, React+Node stack)
    backend-expert.md        # SUBAGENT - Python API endpoints (refs: @fastapi-template)
    node-expert.md           # SUBAGENT - NestJS (TypeScript) API endpoints, strict-typed, lint/SonarQube-clean, + Redis locks/cache
    frontend-expert.md       # SUBAGENT - Flutter UI components (refs: @flutter-gallery, @flutter-ui-kit)
    react-expert.md          # SUBAGENT - React UI components (storefront + admin panel)
    payment-expert.md        # SUBAGENT - Razorpay integration (orders, verification, webhooks, refunds)
    insights-expert.md       # SUBAGENT - Admin dashboard insights, top-seller breakdowns, PDF/Excel export
    code-review-and-qa.md    # SUBAGENT - Technical code review + QA verification
    suggestion-agent.md      # SUBAGENT - Post-implementation improvements
  skills/
    orchestrator/
      SKILL.md              # Detailed skill documentation
    db-expert/
      SKILL.md              # Database patterns and examples
    flutter-ui-kit-reference/
      SKILL.md              # Flutter UI kit reference guide
    code-review-and-qa/
      SKILL.md              # Code review and QA verification patterns
  state/
    project_state.schema.json   # Documents the shared state shape
    project_state.template.json # Fresh copy used at the start of each run
  package.json              # Dependencies for the pipeline
```

External references (configured in `opencode.json` at project root):
- `@fastapi-template` → `fastapi/full-stack-fastapi-template` — Official FastAPI full-stack template
- `@flutter-gallery` → `flutter/gallery` — Official Flutter gallery app
- `@flutter-ui-kit` → `usman18/Flutter-UI-Kit` — Flutter UI component patterns

## Pipeline

```
orchestrator → research-agent → expert agents → code-review-and-qa → suggestion-agent
```

## Agents Overview

The pipeline uses 11 specialized agents defined in `.opencode/agents/`:

| Agent | Mode | Purpose | Stack | Permissions |
|-------|------|---------|-------|--------------|
| **orchestrator** | primary | Analyzes prompts, detects stack, dispatches subagents | both | Full access |
| **research-agent** | subagent | Codebase analysis and final requirement prompt | both | Read, bash only |
| **db-expert** | subagent | Database schema and migrations | Flutter+Python | Read, edit, bash |
| **db-expert-postgres** | subagent | Postgres schema, migrations, Redis key design | React+Node | Read, edit, bash |
| **backend-expert** | subagent | Python FastAPI/Flask endpoints | Flutter+Python | Read, edit, bash |
| **node-expert** | subagent | NestJS endpoints, strict TypeScript, lint/SonarQube-clean, Redis locks/cache/idempotency | React+Node | Read, edit, bash |
| **frontend-expert** | subagent | Flutter UI components | Flutter+Python | Read, edit, bash |
| **react-expert** | subagent | React UI components (storefront + admin) | React+Node | Read, edit, bash |
| **payment-expert** | subagent | Razorpay orders, verification, webhooks, refunds | React+Node | Read, edit, bash |
| **insights-expert** | subagent | Dashboard insights, top-sellers, PDF/Excel export | React+Node | Read, edit, bash |
| **code-review-and-qa** | subagent | Technical code review + QA verification | both | Read, bash only |
| **suggestion-agent** | subagent | Post-implementation improvements | both | Read, bash only |

### How Agents Work

1. **Orchestrator** is the primary agent you interact with
2. It scans the repo, auto-detects the stack (Flutter+Python vs. React+Node), and determines which subagents are needed
3. **Research-agent** runs first — analyzes the codebase and writes a final requirement prompt
4. Expert agents matching the detected stack (db, backend, frontend, plus payment/insights for the React+Node stack) run in dependency order, reading the research report
5. **Code-review-and-qa** performs technical code review and verifies requirements
6. **Suggestion-agent** provides actionable improvement suggestions
7. Each subagent reads its corresponding SKILL.md (where one exists) for detailed patterns
8. Subagents update `project_state.json` as they work

## How It Works

### 1. User Provides Prompt
The user provides a feature request or task description:
```
"Add an orders endpoint with status tracking and a screen to view order history"
```

### 2. Orchestrator Analyzes
The orchestrator skill:
- Scans the project structure (pubspec.yaml, requirements.txt, migrations folder)
- Analyzes the prompt to determine which layers are affected
- Selects the appropriate skills based on the analysis
- Creates the design document and initializes state

### 3. Research Agent
The research-agent:
- Reads the orchestrator's design doc and the user's original request
- Scans the entire codebase to understand existing patterns and conventions
- Cross-references requirements with the actual codebase (what exists vs. what's needed)
- Writes a **final requirement prompt** (research_report.md) that tells expert agents exactly WHAT to build and HOW to build it following existing conventions
- Expert agents use this as their primary instruction set

### 4. Expert Agents Execute in Dependency Order
Expert agents execute in the correct order:
1. **db-expert** first if required (others may depend on its schema)
2. **backend-expert** after db-expert (if both required), otherwise immediately
3. **frontend-expert** after backend-expert (if both required), otherwise immediately

### 5. Code Review & QA
The code-review-and-qa agent performs two phases:

**Phase 1 — Technical Code Review:**
- Code quality and convention adherence
- Security vulnerabilities
- Error handling completeness
- Performance issues (N+1 queries, missing indexes)
- Layer-specific best practices

**Phase 2 — QA Verification:**
- Requirement compliance (all items implemented)
- Cross-stack contract validation (DB ↔ Backend ↔ Frontend)
- Syntax and compilation checks

### 6. Suggestions
The suggestion-agent provides:
- Performance improvements
- Security hardening opportunities
- Code quality and refactoring suggestions
- Follow-up feature ideas

## Routing Logic

### When to Enter This Pipeline
Any feature request that plausibly touches the database, the Python backend, or the Flutter frontend. Pure non-code questions, docs-only edits, or single typo fixes don't need this — just handle those directly.

### Routing Steps

1. **Fresh state.** If `.opencode/state/project_state.json` doesn't exist yet for this task, copy `.opencode/state/project_state.template.json` to `.opencode/state/project_state.json`.

2. **Dispatch `orchestrator`** with the user's prompt as input. It scans the repo, decides `required_agents`, and writes the design doc.

3. **Read `project_state.json.required_agents`.** Dispatch agents in this dependency order:
   - `research-agent` first — always runs before any expert agent
   - `db-expert` if required (others may depend on its schema)
   - `backend-expert` after `db-expert` (if both required), otherwise immediately if only backend is required
   - `frontend-expert` after `backend-expert` (if both required), otherwise immediately if only frontend is required

4. **Dispatch `code-review-and-qa`** once every expert agent in `required_agents` has completed for this pass.

5. **Check `project_state.json.status`** after code-review-and-qa:
   - `ready_for_suggestion` → dispatch `suggestion-agent`. Done.
   - `revision_needed` → re-dispatch only the agents listed in `loopback_targets`, passing `qa_report.errors` to them as additional task context, then go back to step 4.
   - `halt` → stop. Surface `qa_report.errors` and the retry count to the user directly; this needs a human decision, not another loop.

6. **After `suggestion-agent` reports**, tell the user what was shipped per layer and point them at the suggestion report — don't re-dump all the code inline if it's already on disk.

## Why Routing Isn't Fixed

A "add a dark mode toggle" request and a "add an orders feature with inventory tracking" request go through completely different subsets of agents. The orchestrator decides this per-request based on what it finds in `project_setup` and what the prompt actually asks for — hardcoding "always run all five" would waste a DB pass on a pure UI change.

## Example Runs

### Example 1: Full Feature Request
```
User: "Add an orders endpoint with status tracking and a screen to view order history"
→ orchestrator scans repo, detects DB, backend, and Flutter layers
→ orchestrator selects: ["research-agent", "db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"]
→ research-agent analyzes codebase and writes final requirement prompt
→ db-expert adds orders table + status enum
→ backend-expert adds GET/POST /orders routes + tests
→ frontend-expert adds OrderHistoryScreen + OrdersApiService
→ code-review-and-qa reviews code quality and verifies requirements
→ (if it fails) code-review-and-qa sends specific agents back with specific errors
→ (once it passes) suggestion-agent suggests improvements
```

### Example 2: Pure UI Change
```
User: "Add a dark mode toggle to the settings screen"
→ orchestrator scans repo, detects only Flutter layer
→ orchestrator selects: ["research-agent", "frontend-expert", "code-review-and-qa", "suggestion-agent"]
→ research-agent analyzes frontend patterns
→ frontend-expert creates theme provider and widgets
→ code-review-and-qa reviews code and verifies implementation
→ suggestion-agent suggests improvements
```

### Example 3: Database Schema Update
```
User: "Add a status column to the users table"
→ orchestrator scans repo, detects DB layer
→ orchestrator selects: ["research-agent", "db-expert", "code-review-and-qa", "suggestion-agent"]
→ research-agent analyzes existing schema
→ db-expert adds status column to users table
→ code-review-and-qa reviews schema and verifies changes
→ suggestion-agent suggests improvements
```

## Usage

### Starting the Pipeline

Simply enter any feature request in the orchestrator agent. The pipeline will automatically:
1. Analyze your project structure
2. Determine which agents are needed
3. Research codebase patterns
4. Dispatch expert agents in the correct order
5. Review code and verify requirements
6. Generate improvement suggestions

### Switching Agents

Use the **Tab** key to cycle between primary agents during a session. The orchestrator is the default primary agent.

To manually invoke a subagent (for debugging or special cases):
```
@code-review-and-qa review the backend API contracts
```

### Checking Pipeline Status

Read the current state:
```bash
cat .opencode/state/project_state.json
```

### Manual Pipeline Control

If you need to re-run a specific agent:
1. Update `project_state.json` status to `"in_progress"`
2. Manually invoke the agent via `@agent-name`
3. The agent will re-process based on current state

## Customization

### Models — Read Tier vs Reasoning Tier

The pipeline runs two model tiers, controlled from **one file**: `opencode.json` at the project root (sibling to `.opencode/`, not inside it).

| Tier | Agents | Why |
|---|---|---|
| **Read** (cheap/fast) | `research-agent`, `suggestion-agent` | Their job is to read the codebase/report and compress or list findings — high token volume, low judgment risk. |
| **Reasoning** (strong) | `orchestrator`, `db-expert`, `backend-expert`, `frontend-expert`, `code-review-and-qa`, `suggestion-research-agent` | Their job is to plan, write code, or make pass/fail judgment calls — mistakes here are expensive to unwind later in the pipeline. |

To swap models, edit `opencode.json`:

```json
{
  "agent": {
    "research-agent": { "model": "anthropic/claude-haiku-4-5-20251001" },
    "db-expert": { "model": "anthropic/claude-sonnet-4-6" }
  }
}
```

Run `opencode models` to see what's available to you. You do **not** need to touch any file in `agents/` to change models — this one file is the single point of control, the same way `research_report.md` is the single point of control for *what* gets built. If you skip this file entirely, opencode falls back to: primary agents use your globally configured model, subagents inherit whatever model dispatched them — meaning everything silently runs on one model with no cost/quality split.

Each run also writes which tier each agent used into `project_state.json.pipeline_models`, purely as an audit trail (it doesn't drive behavior — `opencode.json` does).

### Retry Cap
Edit `max_retries` in `project_state.template.json` to change the maximum number of QA retries (default is 3).

### Tool Access
Each agent's permissions are configured in its markdown frontmatter. Adjust `permission` settings to change what each agent can do.

### Adding Custom Agents
Create a new markdown file in `.opencode/agents/` with:
```markdown
---
description: What this agent does
mode: subagent
permission:
  read: allow
  edit: deny
  bash: deny
  task:
    "*": deny
---

# Agent Instructions

Your detailed instructions here...
```

The file name becomes the agent name (e.g., `my-agent.md` creates `my-agent`).

## State Management

The shared state file `.opencode/state/project_state.json` tracks:
- Project setup and configuration
- Prompt analysis results
- Required agents list
- Design document path
- Research report path
- Suggestion report path
- Workflow status
- QA review report (code review + verification results)

The state file is updated by each agent as the workflow progresses.

## Installation

Copy the `.opencode/skills/` directory into the root of your existing project (the one with your Flutter app, Python backend, and DB layer already in it — these skills inspect and extend what's there, they don't scaffold a new repo from scratch).

```bash
cp -r .opencode/skills /path/to/your/project/.opencode/
cp -r .opencode/state /path/to/your/project/.opencode/
```

## Quick Reference

| Scenario | Selected Agents |
|----------|----------------|
| Full feature (DB + backend + frontend) | `["research-agent", "db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"]` |
| UI-only change | `["research-agent", "frontend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Backend API only | `["research-agent", "backend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Database schema only | `["research-agent", "db-expert", "code-review-and-qa", "suggestion-agent"]` |
| DB + Backend | `["research-agent", "db-expert", "backend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Pure code review | `["code-review-and-qa"]` |
