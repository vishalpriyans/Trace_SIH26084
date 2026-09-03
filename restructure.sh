#!/usr/bin/env bash
#
# TRACE — repository restructuring, phases 1 to 3.
#
#   ./restructure.sh            do it
#   ./restructure.sh --dry-run  print every action, change nothing
#
# Every move is `git mv`, so history follows the file and `git reset --hard`
# undoes the lot. Nothing here splits data.ts or main.py: this script only
# relocates files and repoints the references that relocation breaks.
#
# Run from the repository root, on a clean tree, on a branch you can throw away.
set -eu

DRY=""
[ "${1:-}" = "--dry-run" ] && DRY=1

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

say()  { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '  %s\n' "$1"; }
run()  { if [ -n "$DRY" ]; then printf '  + %s\n' "$*"; else eval "$@"; fi; }

# git mv that does not abort the run on a path the snapshot did not have.
mv_() {
  if [ -e "$1" ] || [ -L "$1" ]; then
    run "mkdir -p \"\$(dirname '$2')\""
    run "git mv -k '$1' '$2'"
  else
    step "skip (absent): $1"
  fi
}

# in-place sed that works on both GNU and BSD sed
sed_() {
  local expr="$1" file="$2"
  [ -f "$file" ] || { step "skip (absent): $file"; return 0; }
  if [ -n "$DRY" ]; then printf '  + sed %s %s\n' "$expr" "$file"; return 0; fi
  sed -i.bak "$expr" "$file" && rm -f "$file.bak"
}

[ -d .git ] || { echo "Not a git repository. Aborting."; exit 1; }
if [ -z "$DRY" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first, then re-run."; exit 1
fi

# =====================================================================
say "Phase 1 — script preamble (own commit, per the agreed order)"
# =====================================================================
# Every script does `cd "$(dirname "$0")"` and then reads .env and .tunnel_url
# from that directory. Once they live in scripts/voice/ that lands two levels
# down. Fix the preamble BEFORE the move so the two are never both in flight.

for f in add_sarvam.sh curl_for_sarvam.sh peek.sh place_call.sh \
         setup_env.sh show_config.sh tunnel.sh verify.sh; do
  sed_ 's#^cd "$(dirname "$0")" || exit 1#cd "$(dirname "$0")/../.." || exit 1#' "$f"
done
# diag.sh has the same line without the `|| exit 1` guard
sed_ 's#^cd "$(dirname "$0")"$#cd "$(dirname "$0")/../.."#' diag.sh

# test.sh never cd'd at all — it relied on being invoked from the root.
if [ -f test.sh ] && ! grep -q 'dirname "\$0"' test.sh; then
  sed_ '/^set -u$/a\
cd "$(dirname "$0")/../.." || exit 1' test.sh
fi

# verify.sh:43 passes "$OLDPWD" as PYTHONPATH, assuming the shell was already
# in the repo root when the script started. After the deeper cd that is the
# invocation directory instead, and the startup-guard check silently stops
# testing anything. Pin the root explicitly.
sed_ 's#^cd "$(dirname "$0")/../\.\." || exit 1$#&\
ROOT="$PWD"#' verify.sh
sed_ 's#PYTHONPATH="$OLDPWD" "$OLDPWD/.venv/bin/python"#PYTHONPATH="$ROOT" "$ROOT/.venv/bin/python"#' verify.sh
# verify.sh:138-143 syntax-checks the scripts by bare filename and invokes
# ./place_call.sh. Both are now one directory down from the root it cd's to.
sed_ 's#bash -n "$f"#bash -n "scripts/voice/$f"#' verify.sh
sed_ 's|sh -n setup_env.sh|sh -n scripts/voice/setup_env.sh|' verify.sh
sed_ 's|\./place_call\.sh|./scripts/voice/place_call.sh|g' verify.sh
sed_ 's|\./setup_env\.sh|./scripts/voice/setup_env.sh|g' README.md

say "  commit this phase, run each script once, then continue."

# =====================================================================
say "Phase 2 — move the Python service, the scripts and the SQL"
# =====================================================================
run "mkdir -p services/voice-ingest/app scripts/voice db/migrations db/seed docs"

mv_ app/main.py        services/voice-ingest/app/main.py
mv_ requirements.txt   services/voice-ingest/requirements.txt

for f in add_sarvam.sh curl_for_sarvam.sh diag.sh peek.sh place_call.sh \
         setup_env.sh show_config.sh test.sh tunnel.sh verify.sh; do
  mv_ "$f" "scripts/voice/$f"
done

for f in sql/001_minimal_schema.sql sql/002_spec_v2_schema.sql \
         sql/003_app_schema.sql sql/004_ui_columns.sql; do
  mv_ "$f" "db/migrations/$(basename "$f")"
done
mv_ sql/005_seed.sql db/seed/005_seed.sql

mv_ PRODUCT.md  docs/PRODUCT.md
mv_ database.md docs/database.md

# Ruling #4: keep `uvicorn app.main:app` and `import app.main` alive until every
# call site is repointed. Loaded by path because `voice-ingest` has a hyphen and
# cannot be imported as a package — this keeps the locked tree unchanged.
if [ -z "$DRY" ]; then
  mkdir -p app
  cat > app/main.py <<'SHIM'
"""Compatibility shim. DELETE once every reference points at
services/voice-ingest/ and ./scripts/voice/verify.sh is green again."""
import importlib.util as _il
import pathlib as _pl

_src = _pl.Path(__file__).resolve().parent.parent / "services" / "voice-ingest" / "app" / "main.py"
_spec = _il.spec_from_file_location("trace_voice_ingest_main", _src)
_mod = _il.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

app = _mod.app
SHIM
  git add app/main.py
else
  step "+ write app/main.py shim"
fi

# =====================================================================
say "Phase 3 — hoist the Next app to src/ and repoint imports"
# =====================================================================
run "mkdir -p src/server/db src/server/repositories src/server/mappers src/server/services src/domain src/lib src/types src/config"

mv_ web/app        src/app
mv_ web/components src/components
mv_ web/public     public

mv_ web/lib/supabase.ts src/server/db/client.ts
mv_ web/lib/fixtures    src/server/fixtures
mv_ web/lib/data.ts     src/server/data.ts      # split in the next phase, not here
mv_ web/lib/status.ts   src/domain/status.ts
mv_ web/lib/format.ts   src/lib/format.ts
mv_ web/lib/types.ts    src/types/index.ts

mv_ web/scripts/generate-seed.mjs scripts/generate-seed.mjs

for f in package.json tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs; do
  mv_ "web/$f" "$f"
done
mv_ web/AGENTS.md AGENTS.md
mv_ web/CLAUDE.md CLAUDE.md
mv_ web/README.md docs/web-README.md

# web/.gitignore duplicates the root one, which already covers node_modules and
# the build output. Two ignore files disagreeing is how a build artefact gets
# committed.
if [ -f web/.gitignore ]; then run "git rm -q web/.gitignore"; fi

# --- import rewrites -------------------------------------------------
# Only three aliases actually move. @/lib/format is unchanged by design.
if [ -z "$DRY" ]; then
  FILES="$(find src scripts -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' \) 2>/dev/null || true)"
  for f in $FILES; do
    sed -i.bak \
      -e 's|@/lib/data|@/server/data|g' \
      -e 's|@/lib/status|@/domain/status|g' \
      -e 's|@/lib/types|@/types|g' \
      "$f" && rm -f "$f.bak"
  done
  # data.ts moved out of lib/, so its own relative imports change.
  sed -i.bak \
    -e 's|from "./status"|from "@/domain/status"|' \
    -e 's|from "./types"|from "@/types"|' \
    -e 's|import("./supabase")|import("./db/client")|' \
    src/server/data.ts && rm -f src/server/data.ts.bak
  # fixtures and types both climbed a level
  for f in src/server/fixtures/*.ts; do
    sed -i.bak 's|from "../types"|from "@/types"|' "$f" && rm -f "$f.bak"
  done
  sed -i.bak 's|from "./status"|from "@/domain/status"|' src/types/index.ts \
    && rm -f src/types/index.ts.bak
else
  step "+ rewrite @/lib/{data,status,types} across src/ and scripts/"
fi

# --- config that encodes the old layout -------------------------------
sed_ 's|"@/\*": \["\./\*"\]|"@/*": ["./src/*"]|' tsconfig.json
sed_ 's|"cwd": "web"|"cwd": "."|' .claude/launch.json
sed_ 's|^web/\.next/$|.next/|' .gitignore
sed_ 's|^web/out/$|out/|' .gitignore

# generate-seed.mjs is two hops from the root now, not three, and its fixtures
# moved under src/server/.
sed_ 's|join(here, "\.\.", "\.\.", "sql", "005_seed.sql")|join(here, "..", "db", "seed", "005_seed.sql")|' scripts/generate-seed.mjs
if [ -z "$DRY" ] && [ -f scripts/generate-seed.mjs ]; then
  sed -i.bak 's|"\.\./lib/fixtures/|"../src/server/fixtures/|g' scripts/generate-seed.mjs \
    && rm -f scripts/generate-seed.mjs.bak
fi
sed_ 's|node web/scripts/generate-seed.mjs|node scripts/generate-seed.mjs|' scripts/generate-seed.mjs
sed_ 's|web/lib/fixtures/\*.ts|src/server/fixtures/*.ts|' scripts/generate-seed.mjs
sed_ 's|web/lib/data.ts|src/server/data.ts|' scripts/generate-seed.mjs

# The service's own "how to fix it" hint names a script that has moved.
sed_ 's|\./setup_env\.sh|./scripts/voice/setup_env.sh|' services/voice-ingest/app/main.py

# --- dead weight ------------------------------------------------------
if [ -d .impeccable/archive/permit-board-rejected ]; then
  run "git rm -rq .impeccable/archive/permit-board-rejected"
fi

# empty shells left behind
for d in web/lib web/scripts web sql; do
  if [ -d "$d" ] && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then run "rmdir '$d'"; fi
done

say "Done. Next: npm install && npm run build, then ./scripts/voice/verify.sh"
