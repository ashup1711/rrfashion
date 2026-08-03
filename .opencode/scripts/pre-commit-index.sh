#!/usr/bin/env bash
# REQ-INF-003 optional pre-commit stale-check. Wire with: git config core.hooksPath .githooks
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
MANIFEST="$ROOT/.opencode/state/vector-index/manifest.json"
if [ ! -f "$MANIFEST" ]; then
  echo "[opencode-index] no index yet — run: node .opencode/lib/ast-parser/vector-index.js build"
  exit 0
fi
# Rebuild only if an indexable source file is newer than the manifest.
if find "$ROOT/backend/src" "$ROOT/frontend/src" "$ROOT/prisma" "$ROOT/.opencode/lib/ast-parser" \
     -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.json' -o -name '*.prisma' -o -name '*.sql' \) \
     -newer "$MANIFEST" -print -quit 2>/dev/null | grep -q .; then
  echo "[opencode-index] sources changed — rebuilding vector index..."
  (cd "$ROOT/.opencode/lib/ast-parser" && node vector-index.js build)
fi
exit 0
