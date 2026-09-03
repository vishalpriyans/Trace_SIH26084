#!/usr/bin/env bash
# Raw diagnostic — no json.tool, shows status + body + curl errors.
set -u
cd "$(dirname "$0")/../.."
source .env
BASE="${1:-http://localhost:8787}"

echo "### A. health (known good) ###"
curl -sS -w "\n--> HTTP %{http_code}  time %{time_total}s\n" "$BASE/health"

echo
echo "### B. /updates  — GET that READS from Supabase ###"
curl -sS -w "\n--> HTTP %{http_code}  time %{time_total}s\n" \
  "$BASE/updates?limit=1" -H "Authorization: Bearer $TOOL_BEARER_TOKEN"

echo
echo "### C. /voice/log_update — POST that WRITES to Supabase ###"
curl -sS -w "\n--> HTTP %{http_code}  time %{time_total}s\n" \
  -X POST "$BASE/voice/log_update" \
  -H "Authorization: Bearer $TOOL_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"call_id":"diag-001","line_reference_raw":"Erect Line 24 dash XX","task_status":"completed"}'

echo
echo "### D. direct to Supabase, bypassing our server entirely ###"
echo "(this tells us if the problem is our code or the credentials/network)"
curl -sS -w "\n--> HTTP %{http_code}  time %{time_total}s\n" \
  -X POST "$SUPABASE_URL/rest/v1/task_updates" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"call_id":"diag-direct","line_reference_raw":"direct curl test"}'
