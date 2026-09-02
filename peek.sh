#!/usr/bin/env bash
# Read back what landed. Both routes need the bearer token now.
#   ./peek.sh          -> task_updates
#   ./peek.sh calls    -> call_events (the verbatim Sarvam webhook payload)
set -u
cd "$(dirname "$0")" || exit 1
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
TOOL_BEARER_TOKEN="$(sed -n 's/^TOOL_BEARER_TOKEN=//p' .env | head -1 | unquote)"
BASE="${BASE:-http://localhost:8787}"
case "${1:-updates}" in
  calls)   PATHQ="/calls?limit=3" ;;
  *)       PATHQ="/updates?limit=5" ;;
esac
curl -sS "$BASE$PATHQ" -H "Authorization: Bearer $TOOL_BEARER_TOKEN" | python3 -m json.tool
