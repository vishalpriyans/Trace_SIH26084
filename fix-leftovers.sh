#!/usr/bin/env bash
#
# TRACE — pick up the files restructure.sh did not know about.
#
#   ./fix-leftovers.sh --dry-run
#   ./fix-leftovers.sh
#
# The first script moved lib/ file by file, by name. Your repo has grown a
# write-side seam (inbox.ts) and route-handler helpers (api/http.ts) since the
# snapshot it was written against, so those two stayed behind in web/lib while
# the routes that import them moved to src/. This finishes the job and then
# refuses to exit quietly if anything is still stranded.
set -eu

DRY=""
[ "${1:-}" = "--dry-run" ] && DRY=1

cd "$(cd "$(dirname "$0")" && pwd)"
[ -d .git ] || { echo "Not a git repository. Aborting."; exit 1; }
if [ -z "$DRY" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first."; exit 1
fi

run() { if [ -n "$DRY" ]; then printf '  + %s\n' "$*"; else eval "$@"; fi; }
mv_() {
  if [ -e "$1" ]; then run "mkdir -p \"\$(dirname '$2')\""; run "git mv -k '$1' '$2'"
  else printf '  skip (absent): %s\n' "$1"; fi
}

printf '\033[1mMoving the stranded modules\033[0m\n'

# inbox.ts is the write-side counterpart to data.ts: server only, holds the
# Supabase client, same layer. It lands beside data.ts and gets split the same
# way in the repositories phase.
mv_ web/lib/inbox.ts src/server/inbox.ts

# http.ts is request/response shaping for route handlers. Pure, no database,
# safe either side of the boundary — so it keeps its @/lib/api/http specifier
# and no route handler import changes.
mv_ web/lib/api src/lib/api

if [ -z "$DRY" ]; then
  # inbox.ts climbed out of lib/, so its relative imports move with it.
  if [ -f src/server/inbox.ts ]; then
    sed -i.bak \
      -e 's|from "./status"|from "@/domain/status"|g' \
      -e 's|from "./data"|from "./data"|g' \
      -e 's|import("./supabase")|import("./db/client")|g' \
      -e 's|from "./supabase"|from "./db/client"|g' \
      -e 's|from "./types"|from "@/types"|g' \
      src/server/inbox.ts && rm -f src/server/inbox.ts.bak
  fi
  # The one alias that actually changes for the route handlers.
  for f in $(find src -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null); do
    sed -i.bak 's|@/lib/inbox|@/server/inbox|g' "$f" && rm -f "$f.bak"
  done
else
  printf '  + rewrite @/lib/inbox -> @/server/inbox across src/\n'
  printf '  + repoint inbox.ts relative imports\n'
fi

# empty shells
for d in web/lib/api web/lib web/scripts web sql; do
  if [ -d "$d" ] && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then run "rmdir '$d'"; fi
done

# --- refuse to exit quietly on anything still stranded ----------------
printf '\n\033[1mChecking for anything still outside src/\033[0m\n'
LEFT="$(find web -type f 2>/dev/null || true)"
if [ -n "$LEFT" ]; then
  printf '\033[31mSTILL IN web/ — these need a home before the build passes:\033[0m\n'
  printf '%s\n' "$LEFT" | sed 's/^/  /'
  printf '\nTell me what these are and I will map them.\n'
  exit 1
fi
printf '  web/ is gone.\n'

STALE="$(grep -rn '@/lib/inbox\|@/lib/supabase\|@/lib/data\|@/lib/status\|@/lib/types' \
          --include='*.ts' --include='*.tsx' src 2>/dev/null || true)"
if [ -n "$STALE" ]; then
  printf '\033[31mStale aliases remain:\033[0m\n%s\n' "$STALE"; exit 1
fi
printf '  no stale aliases.\n\nNow: npm run build\n'
