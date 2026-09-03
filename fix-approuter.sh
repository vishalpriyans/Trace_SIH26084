#!/usr/bin/env bash
#
# TRACE — remove the app/ shim that shadows src/app.
#
#   ./fix-approuter.sh --dry-run
#   ./fix-approuter.sh
#
# Next resolves the App Router at app/ OR src/app/, and root app/ wins. The
# compatibility shim therefore made Next ignore every route in src/app and
# build the pages-router fallback instead. The shim cannot coexist with the
# src/ hoist, so it goes now.
#
# `app.main` stays the module path — uvicorn is pointed at the service
# directory with --app-dir instead, so no import string changes.
set -eu

DRY=""
[ "${1:-}" = "--dry-run" ] && DRY=1

cd "$(cd "$(dirname "$0")" && pwd)"
[ -d .git ] || { echo "Not a git repository. Aborting."; exit 1; }
if [ -z "$DRY" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first."; exit 1
fi

run()  { if [ -n "$DRY" ]; then printf '  + %s\n' "$*"; else eval "$@"; fi; }
sed_() {
  [ -f "$2" ] || { printf '  skip (absent): %s\n' "$2"; return 0; }
  if [ -n "$DRY" ]; then printf '  + sed %s\n' "$2"; return 0; fi
  sed -i.bak "$1" "$2" && rm -f "$2.bak"
}

printf '\033[1mRemoving the shim\033[0m\n'
if [ -e app/main.py ]; then
  if grep -q 'trace_voice_ingest_main' app/main.py 2>/dev/null; then
    run "git rm -rq app"
    run "rm -rf app"
  else
    printf '\033[31mapp/main.py is not the shim I wrote. Not touching it.\033[0m\n'; exit 1
  fi
else
  printf '  already gone\n'
fi

printf '\033[1mRepointing uvicorn and the import probe\033[0m\n'
# Every "uvicorn app.main:app" gains --app-dir. Idempotent: skips lines that
# already have it.
for f in README.md docs/PRODUCT.md docs/database.md docs/web-README.md \
         scripts/voice/*.sh services/voice-ingest/app/main.py; do
  [ -f "$f" ] || continue
  if grep -q 'uvicorn app.main:app' "$f" && ! grep -q 'app-dir' "$f"; then
    sed_ 's|uvicorn app.main:app|uvicorn app.main:app --app-dir services/voice-ingest|g' "$f"
  fi
done

# verify.sh's startup-guard probe does `import app.main` with PYTHONPATH set to
# the repo root. That root no longer holds an `app` package.
sed_ 's|PYTHONPATH="$ROOT"|PYTHONPATH="$ROOT/services/voice-ingest"|' scripts/voice/verify.sh

printf '\033[1mChecking\033[0m\n'
if [ -d app ]; then printf '\033[31m  app/ still exists — src/app stays shadowed\033[0m\n'; exit 1; fi
printf '  app/ gone; src/app is now the App Router.\n'
BAD="$(grep -rn 'uvicorn app.main:app' --include='*.sh' --include='*.md' --include='*.py' . 2>/dev/null \
       | grep -v 'app-dir' | grep -v fix-approuter.sh || true)"
if [ -n "$BAD" ]; then printf '\033[33m  still missing --app-dir:\033[0m\n%s\n' "$BAD"; fi

LEFT="$(find web -type f 2>/dev/null || true)"
if [ -n "$LEFT" ]; then
  printf '\n\033[33mStill in web/ (decide these yourself, not moved):\033[0m\n'
  printf '%s\n' "$LEFT" | sed 's/^/  /'
fi

printf '\nNow: npm run build  — expect a Route (app) table, not Route (pages)\n'
