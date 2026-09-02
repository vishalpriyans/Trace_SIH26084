#!/usr/bin/env bash
# Local smoke test. Run the server first, in another terminal:
#   uvicorn app.main:app --reload --port 8787
set -u
source .env 2>/dev/null || { echo "no .env found — copy .env.example to .env first"; exit 1; }
BASE="${1:-http://localhost:8787}"

echo "=== 1. health ==="
curl -s "$BASE/health" | python3 -m json.tool

echo; echo "=== 2. log_update with NO token (expect 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/voice/log_update" \
  -H "Content-Type: application/json" \
  -d '{"line_reference_raw":"should be rejected"}'

echo; echo "=== 3. log_update with WRONG token (expect 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/voice/log_update" \
  -H "Authorization: Bearer definitely-wrong" \
  -H "Content-Type: application/json" \
  -d '{"line_reference_raw":"should be rejected"}'

echo; echo "=== 4. log_update with CORRECT token (expect 200 + confirmation) ==="
curl -s -X POST "$BASE/voice/log_update" \
  -H "Authorization: Bearer $TOOL_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "call_id":"smoketest-001",
        "reporter_name":"Ramesh Bora",
        "discipline":"piping",
        "line_reference_raw":"Erect Line 24 dash XX",
        "task_type":"spool_erection",
        "task_status":"completed",
        "task_status_raw":"done, finished it today",
        "quantity_reported":"8 joints",
        "has_blocker":false,
        "readback_confirmed":true
      }' | python3 -m json.tool

echo; echo "=== 5. webhook with WRONG secret (expect 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/voice/webhook/nope" \
  -H "Content-Type: application/json" -d '{"test":true}'

echo; echo "=== 6. webhook with CORRECT secret (expect 200) ==="
curl -s -X POST "$BASE/voice/webhook/$WEBHOOK_PATH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"smoketest-001","note":"fake payload"}' | python3 -m json.tool

echo; echo "=== 7. /updates with NO token (expect 401 — it used to be open) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/updates?limit=1"

echo; echo "=== 8. read back what landed in Supabase ==="
curl -s "$BASE/updates?limit=3" -H "Authorization: Bearer $TOOL_BEARER_TOKEN" | python3 -m json.tool
