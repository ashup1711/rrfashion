---
name: orchestrator
description: Orchestrates multi-stack development workflows across DB, backend, and frontend layers. Analyzes project structure and user prompt to determine required skills and manages the development pipeline.
license: Apache-2.0
metadata:
  author: opencode
  version: "2.0.0"
  category: development
  repository: https://github.com/your-repo/opencode-pipeline
compatibility: Requires Node.js 18+ or modern browser with ES modules support. Internet access is needed for downloading models from Hugging Face Hub (optional if using local models).
---

# Orchestrator Skill

The orchestrator skill manages multi-stack development workflows by analyzing project structure and user prompts to determine which skills are needed for the task.

## Pipeline

The pipeline supports multiple modes to give you flexible control over which agents run and in what order:

### Pipeline Modes

| Mode | When to Use | What It Does |
|------|-------------|-------------|
| `full` | Default — you want the complete flow | Research → Experts → QA → Suggestion |
| `research-first` | You want to plan first, implement later | Runs research + suggestion only, writes reports, stops |
| `implement` | You already have a research report (e.g. from a prior `research-first` run) | Skips research, starts from expert agents using existing reports |
| `qa-only` | You want to review existing code without running agents | Runs only code-review-and-qa |

### Full Pipeline

```
research-agent → expert agents → code-review-and-qa → suggestion-agent
```

### Research-First Pipeline (Pre-Planning)

```
research-agent → suggestion-agent (pre-implementation mode)
   ↓
   Writes: research_report.md + research_report_coverage.json + suggestion_report_pre.md
   ↓
   Stops. User can later run `implement` mode.
```

### Implement Pipeline (Warm-Start / Resume)

```
(reads existing research_report.md + suggestion_report_pre.md)
   ↓
expert agents → code-review-and-qa → suggestion-agent (post-implementation)
```

The `suggestion_report_pre.md` from the research-first pass guides implementation priorities — expert agents know *what* matters most before they start coding.

### QA-Only Pipeline

```
code-review-and-qa (reads existing code on disk)
```

## When to Use This Skill

Use this skill when:
- The project involves multiple technology stacks (database, backend, frontend)
- You need to coordinate complex workflows across different layers
- The task requires analyzing existing project structure
- You need to dynamically determine which skills to activate based on the prompt

## Core Functionality

### 1. Project Analysis
The orchestrator analyzes the repository structure to understand:
- Database layer (migrations, schema files)
- Backend layer (Python/Flask/FastAPI files, requirements.txt)
- Frontend layer (Flutter files, pubspec.yaml)

### 2. Prompt Understanding
Analyzes the user's prompt to determine:
- Which layers are affected
- What type of changes are needed
- Dependencies between layers

### 3. Skill Selection
Based on the analysis, selects the appropriate skills:
- `research-agent` — always first when any expert is needed (researches codebase and produces final requirement prompt)
- `db-expert` for database changes
- `backend-expert` for backend changes
- `frontend-expert` for frontend changes
- `code-review-and-qa` for technical code review and QA verification
- `suggestion-agent` for post-implementation improvements

### 4. State Management
Creates and manages the shared state file (`.opencode/state/project_state.json`) that:
- Tracks required skills
- Stores design decisions
- Manages workflow progress
- `.opencode/state/prompts/` — per-dispatch prompt files written by the orchestrator before each agent dispatch (layer-filtered from the research report), keeping Task prompts small
- `pipeline_mode` — controls which agents run (full / research-first / implement / qa-only)
- `coverage_manifests` — tracks per-agent completion manifests with requirement coverage
- `requirement_coverage` — aggregates all coverage data for QA cross-verification

### 5. Requirement Coverage & Traceability
Ensures every requirement from the research report is implemented by at least one expert agent:
- **Research agent** assigns requirement IDs (e.g. `REQ-DB-001`, `REQ-BE-001`, `REQ-FE-001`) and writes `research_report_coverage.json` mapping every design doc item → requirement ID → report section
- **Expert agents** write `coverage_<agent>.json` after completing their work, listing which requirement IDs they implemented and the evidence (file paths, line ranges)
- **code-review-and-qa** cross-verifies: every requirement ID in `research_report_coverage.json` must appear in at least one expert's `coverage_<agent>.json` — any gap is a `qa_failure/missing_requirement`
- **Orchestrator** tracks `requirement_coverage` in the state file and can halt if gaps are found

## Usage Examples

### Example 1: Full Pipeline (Full Feature)
```
User: "Add an orders endpoint with status tracking and a screen to view order history"
→ orchestrator analyzes repo, detects DB, backend, and frontend layers
→ orchestrator selects pipeline_mode: "full"
→ orchestrator creates project_state.json with design doc
→ research-agent analyzes codebase, writes research_report.md + research_report_coverage.json
→ db-expert reads research report, creates orders table, writes coverage_db.json
→ backend-expert reads research report + coverage_db.json, creates /api/orders endpoints, writes coverage_backend.json
→ frontend-expert reads research report + coverage_backend.json, creates OrderHistoryScreen, writes coverage_frontend.json
→ code-review-and-qa cross-verifies all coverage manifests against research_report_coverage.json
→ suggestion-agent provides improvement suggestions
```

### Example 2: Research-First → Implement (Two-Phase)
```
Phase 1 (research-first mode):
User: "I want to plan a multi-feature rollout — address book, deposits, offline PWA"
→ orchestrator sets pipeline_mode: "research-first"
→ research-agent researches codebase, writes research_report.md + research_report_coverage.json
→ suggestion-agent (pre-implementation mode) writes suggestion_report_pre.md
→ pipeline stops with status "completed"

// Later...
Phase 2 (implement mode):
User: "Continue with the plan from the research phase"
→ orchestrator sets pipeline_mode: "implement"
→ orchestrator reads existing research_report.md + suggestion_report_pre.md
→ Expert agents run in order using the pre-written reports
→ QA verifies against research_report_coverage.json
```

### Example 2: Pure UI Change
```
User: "Add a dark mode toggle to the settings screen"
→ orchestrator analyzes repo, detects only Flutter layer
→ orchestrator selects: ["research-agent", "frontend-expert", "code-review-and-qa", "suggestion-agent"]
→ orchestrator creates project_state.json with UI-only design doc
→ research-agent analyzes frontend patterns
→ orchestrator dispatches frontend-expert
→ code-review-and-qa reviews code and verifies implementation
→ suggestion-agent suggests improvements
```

### Example 3: Database Schema Update
```
User: "Add a status column to the users table"
→ orchestrator analyzes repo, detects DB layer
→ orchestrator selects: ["research-agent", "db-expert", "code-review-and-qa", "suggestion-agent"]
→ orchestrator creates project_state.json with schema change design doc
→ research-agent analyzes existing schema patterns
→ orchestrator dispatches db-expert
→ code-review-and-qa reviews schema and verifies changes
→ suggestion-agent suggests improvements
```

## State Management

The orchestrator creates and manages a shared state file at `.opencode/state/project_state.json` with the following structure:

```json
{
  "project_setup": {
    "has_database": true,
    "has_backend": true,
    "has_frontend": true,
    "database_type": "sqlalchemy",
    "backend_framework": "fastapi",
    "frontend_framework": "flutter",
    "flutter_state_management": "riverpod"
  },
  "prompt_analysis": {
    "layers_affected": ["database", "backend", "frontend"],
    "change_type": "feature",
    "complexity": "high"
  },
  "required_agents": ["research-agent", "db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"],
  "pipeline_mode": "full",
  "design_doc_path": ".opencode/state/design_doc.md",
  "research_report": ".opencode/state/research_report.md",
  "research_report_coverage": ".opencode/state/research_report_coverage.json",
  "suggestion_report": "",
  "suggestion_report_paths": {
    "pre_implementation": ".opencode/state/suggestion_report_pre.md",
    "post_implementation": ".opencode/state/suggestion_report.md"
  },
  "coverage_manifests": {
    "db-expert-postgres": ".opencode/state/coverage_db.json",
    "node-expert": ".opencode/state/coverage_backend.json",
    "payment-expert": ".opencode/state/coverage_payment.json",
    "react-expert": ".opencode/state/coverage_frontend.json",
    "insights-expert": ".opencode/state/coverage_insights.json"
  },
  "requirement_coverage": {
    "total": 0,
    "covered": 0,
    "gap": 0,
    "gap_items": []
  },
  "status": "in_progress",
  "qa_report": {
    "passed": false,
    "errors": [],
    "retry_count": 0,
    "max_retries": 3,
    "checked_contracts": [],
    "notes": ""
  },
  "loopback_targets": [],
  "db_schema": {},
  "backend_code": {},
  "frontend_code": {}
}
```

## Status Flow

```
                                                     ┌─ research-first → research_complete → suggestion_done → completed (pre-planning only)
                                                     │
pending → in_progress ──┬─ full ──→ research_complete ──→ in_progress → (code-review-and-qa) → ready_for_suggestion → (suggestion-agent) → completed
                        │                                │                                        ↘ revision_needed → (retry loop)
                        │                                │                                        ↘ halt
                        ├─ implement ──→ in_progress (skips research) → (code-review-and-qa) → ...
                        │
                        └─ qa-only ──→ (code-review-and-qa directly) → completed
                                                     
Coverage-check substates within "in_progress":
  in_progress → coverage_check_passed → next_agent
             ↘ coverage_check_failed → halt (gap in requirement coverage)
```

## Integration with Other Skills

The orchestrator works with other skills by:

### 1. Research First**: Dispatches research-agent to analyze the codebase and produce a final requirement prompt before any code is written
2. **Providing Context**: Passes the research report (final requirement prompt) to expert agents as their primary instruction set, along with a dedicated prompt file at `.opencode/state/prompts/<agent-name>.md` containing their layer-specific instructions (written just-in-time before dispatch to keep the Task prompt short instead of inlining large content)
3. **Managing Dependencies**: Ensures skills run in the correct order (research → DB → backend → frontend)
4. **Handling QA Loop**: Manages the QA review process and retry logic
5. **Suggestions**: Coordinates suggestion-agent for post-implementation improvements

## Error Handling

If the orchestrator cannot determine the required skills or encounters an error:
- Logs the error to the state file
- Sets status to "HALT"
- Provides detailed error information to the user
- Recommends manual intervention if needed

## Configuration

The orchestrator can be configured with:
- Custom skill selection logic
- Different state file locations
- Custom analysis criteria
- Retry policies for failed analyses

## Best Practices

1. **Always analyze the project first**: Never dispatch skills without understanding the project structure
2. **Always run research first**: Never dispatch expert agents without a research report
3. **Use dependency order**: Always run DB skills before backend, backend before frontend
4. **Validate before proceeding**: Always run QA review before moving to suggestions
5. **Track state**: Always update the state file to track progress
6. **Handle errors gracefully**: Always provide clear error messages and recovery options

## Quick Reference

## Coverage & Traceability

The pipeline enforces requirement coverage through a multi-layered system:

1. **Research agent assigns IDs**: Every design doc point gets a unique ID (`REQ-<LAYER>-<NNN>`) in `research_report_coverage.json`
2. **Expert agents claim IDs**: Each expert writes `coverage_<agent>.json` listing which requirement IDs they implemented, with file paths as evidence
3. **QA cross-verifies**: code-review-and-qa reads both the coverage manifest and implementation manifests — any requirement ID not claimed by an expert is a `qa_failure/missing_requirement`
4. **Pre-dispatch consistency check**: Before dispatching an expert, orchestrator checks that its requirement IDs haven't been claimed by a previous agent (no duplicated work) and that nothing was dropped

## Quick Reference

| Scenario | Pipeline Mode | Selected Agents |
|----------|--------------|----------------|
| Full feature (DB + backend + frontend) | `full` | `["research-agent", "db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"]` |
| UI-only change | `full` | `["research-agent", "frontend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Backend API only | `full` | `["research-agent", "backend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Database schema only | `full` | `["research-agent", "db-expert", "code-review-and-qa", "suggestion-agent"]` |
| DB + Backend | `full` | `["research-agent", "db-expert", "backend-expert", "code-review-and-qa", "suggestion-agent"]` |
| Pure code review | `qa-only` | `["code-review-and-qa"]` |
| Research + Suggestion (pre-plan) | `research-first` | `["research-agent", "suggestion-agent"]` |
| Warm-start from existing plan | `implement` | `["db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"]` |

This skill enables complex multi-stack development workflows by intelligently coordinating the right skills for each task.
