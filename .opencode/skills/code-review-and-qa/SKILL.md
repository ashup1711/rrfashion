---
name: code-review-and-qa
description: Code reviewer and QA verifier. Performs technical code review (quality, security, patterns, error handling) and QA verification (requirement compliance, cross-stack contracts). Reports pass/fail with specific, actionable errors.
license: Apache-2.0
metadata:
  author: opencode
  version: "1.0.0"
  category: quality-assurance
  repository: https://github.com/your-repo/opencode-pipeline
compatibility: Requires Node.js 18+ or modern browser with ES modules support. Internet access is needed for downloading models from Hugging Face Hub (optional if using local models).
---

# Code Review & QA Skill

The code-review-and-qa skill performs two critical functions in the pipeline:

1. **Technical Code Review** — Reviews implementation quality, patterns, security, error handling, and best practices
2. **QA Verification** — Validates that the implementation matches the research report's requirements and contracts

## Pipeline Position

```
research-agent → expert agents → code-review-and-qa → suggestion-agent
```

## When to Use This Skill

Use this skill when:
- Expert agents (db-expert, backend-expert, frontend-expert) have completed
- You need a technical review of the generated code quality
- You need to verify requirements were fully implemented
- You need to validate cross-stack contracts (DB ↔ Backend ↔ Frontend)
- You need specific, actionable error reports for fixes

## Core Functionality

### Phase 1: Technical Code Review

Reviews code quality across all layers:

**Code Quality**
- Convention adherence (following project's existing patterns)
- Code smells (long functions, deep nesting, duplication)
- Type safety and annotations
- Naming conventions

**Security**
- Authentication/authorization enforcement
- SQL injection risks
- Input validation
- Secrets management
- CORS configuration

**Error Handling**
- Explicit error paths
- Correct HTTP status codes
- Informative but safe error messages
- Exception logging

**Layer-Specific**
- Backend: Pydantic v2 patterns, session management, N+1 queries
- Frontend: Loading/error/empty states, API contract matching, memory leaks
- Database: Column types, foreign keys, indexes, migration completeness

### Phase 2: QA Verification

Validates implementation against requirements:

**Requirement Compliance**
- All "What to Build" items implemented
- All files in "Exact Files to Modify/Create" touched
- No requirements silently dropped

**Cross-Stack Contracts**
- Backend ↔ DB field/type matching
- Frontend ↔ Backend API path/field matching
- Enum consistency across layers

**Syntax & Compilation**
- Python: `py_compile` checks
- Dart: `dart analyze` checks
- Import and type errors

## Usage Examples

### Example 1: Full Feature Review
```
orchestrator dispatches: ["research-agent", "db-expert", "backend-expert", "frontend-expert", "code-review-and-qa", "suggestion-agent"]
→ research-agent writes research_report.md
→ experts implement the feature
→ code-review-and-qa:
  Phase 1 - Code Review:
    - Reviews backend routes for security patterns
    - Checks frontend error handling completeness
    - Validates database index coverage
  Phase 2 - QA Verification:
    - Verifies all research report requirements are implemented
    - Checks API contracts between frontend and backend
    - Runs syntax checks on all generated files
→ If all passes: status → "ready_for_suggestion"
→ If fails: specific errors with file/line locations
```

### Example 2: API-Only Review
```
orchestrator dispatches: ["research-agent", "db-expert", "backend-expert", "code-review-and-qa", "suggestion-agent"]
→ code-review-and-qa:
  Phase 1 - Code Review:
    - Reviews Pydantic model patterns
    - Checks auth middleware usage
    - Validates error response formats
  Phase 2 - QA Verification:
    - Verifies DB schema matches backend models
    - Checks API endpoints match research report
    - Validates migration completeness
```

### Example 3: Frontend-Only Review
```
orchestrator dispatches: ["research-agent", "frontend-expert", "code-review-and-qa", "suggestion-agent"]
→ code-review-and-qa:
  Phase 1 - Code Review:
    - Checks widget state management patterns
    - Reviews API service error handling
    - Validates navigation setup
  Phase 2 - QA Verification:
    - Verifies API calls match backend routes
    - Checks widget rendering matches requirements
    - Validates state provider patterns
```

## Error Format

### Code Review Error
```json
{
  "type": "code_review",
  "subtype": "security",
  "location": "backend/app/auth/routes.py:login() line 45",
  "expected": "Password compared with bcrypt.checkpw()",
  "actual": "Plain text comparison with ==",
  "fix": "Use bcrypt.checkpw(plain_password.encode(), stored_hash)"
}
```

### QA Verification Error
```json
{
  "type": "qa_failure",
  "subtype": "contract_mismatch",
  "location": "mobile_flutter/lib/services/orders_api_service.dart",
  "expected": "Response field 'created_at'",
  "actual": "Frontend reads 'createdAt'",
  "fix": "Change parsing to use 'created_at' to match backend"
}
```

## Integration with Other Skills

The code-review-and-qa skill works with other skills by:

1. **Reading Research Report**: Uses the final requirement prompt as the verification baseline
2. **Reading Actual Code**: Reviews files on disk, not just state file summaries
3. **Providing Specific Errors**: Names exact files, lines, and fields for each issue
4. **Managing Retry Logic**: Tracks retry count and controls workflow progression
5. **Separating Issue Types**: Code review issues vs QA failures have different fix strategies

## Best Practices

1. **Read actual code files** — don't just check state file summaries
2. **Separate code review from QA failures** — they need different fixes
3. **Be specific** — every error names the exact file, line, and field
4. **Don't pass to move forward** — a false pass is worse than a slow loop
5. **Check only what ran** — only validate contracts between agents that actually ran
6. **Include fix suggestions** — every error should suggest a specific fix
7. **Track retry count** — prevent infinite loops
8. **Use clear status codes** — READY_FOR_SUGGESTION, REVISION_NEEDED, HALT

## Quick Reference

| Phase | Check Type | Error Type | Fix Strategy |
|-------|-----------|------------|--------------|
| Code Review | Security | `code_review/security` | May not need re-dispatch |
| Code Review | Error Handling | `code_review/error_handling` | May not need re-dispatch |
| Code Review | Patterns | `code_review/pattern_violation` | May not need re-dispatch |
| QA Verification | Missing Requirement | `qa_failure/missing_requirement` | Re-dispatch expert |
| QA Verification | Contract Mismatch | `qa_failure/contract_mismatch` | Re-dispatch expert |
| QA Verification | Type Mismatch | `qa_failure/type_mismatch` | Re-dispatch expert |
| QA Verification | Syntax Error | `qa_failure/syntax_error` | Re-dispatch expert |

This skill provides expert-level code review and QA verification capabilities, ensuring both code quality and requirement compliance before suggestions are generated.
