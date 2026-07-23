---
description: Generate improvement suggestions with web research. Standalone mode: provide a prompt and @-referenced files. Pipeline mode: runs without arguments to enhance existing suggestions.
agent: suggestion-research-agent
subtask: true
---

Run the suggestion pipeline. Determine the mode based on the input:

## Standalone Mode (arguments provided)

If $ARGUMENTS contains a prompt and/or @-referenced files:

1. **Ensure explore findings exist for THIS request**:
   - Compute a `request_id` from the analysis prompt (e.g. first 12 chars of `sha256(analysis_prompt)`)
   - Check if `.opencode/state/explore_findings.md` exists
   - If it exists, read its first line — it should contain `<!-- request_id: <request_id> -->` for request-matching
   - **Match found** → Reuse existing `explore_findings.md`, skip dispatch
   - **No match or missing** → Dispatch the built-in explore subagent (`subagent_type: "explore"`) to scan the codebase and write it first. Save findings with `<!-- request_id: <request_id> -->` as the first line.
2. **Parse the input**: Extract the analysis prompt (what to focus on) and any file paths prefixed with `@` (e.g. `@backend/app/routes.py`, `@mobile_flutter/lib/main.dart`).
3. **Read context**: Use `explore_findings.md` as the primary codebase context. Read `@`-referenced files directly only if they are not covered by explore findings.
4. **Dispatch suggestion-research-agent**: Pass the analysis prompt, referenced files, and `explore_findings.md` path.

Example usage:
```
/suggestion "improve performance and security" @backend/app/routes.py @mobile_flutter/lib/main.dart
/suggestion "review this code for best practices" @backend/app/models.py
/suggestion "suggest follow-up features" @mobile_flutter/lib/features/
```

## Pipeline Mode (no arguments)

If $ARGUMENTS is empty:

1. Verify the existing `.opencode/state/suggestion_report.md` matches the current pipeline request:
   - Read `.opencode/state/project_state.json` → get `request_id`
   - If `suggestion_report.md` exists, read its first line — it should contain `<!-- request_id: <request_id> -->`
   - **Match found** → Proceed with the existing report
   - **No match or missing** → Inform the user that the suggestion report is stale (doesn't match the current request). Suggest running the orchestrator pipeline fresh or using standalone mode with a prompt.

2. For each suggestion in the report, perform web research to find best practices, relevant packages, and code examples.
3. Write the enhanced report back to `.opencode/state/suggestion_report.md`, preserving original content and appending research findings.

If `suggestion_report.md` doesn't exist, inform the user that either a completed pipeline or a prompt with file references is required.
