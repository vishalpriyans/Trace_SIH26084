#!/usr/bin/env bash
# Print the cURL command to paste into Sarvam's "Set up the API call" box.
#
#   ./curl_for_sarvam.sh
#
# Sarvam parses this to derive the method, URL, headers and body, then lets the
# agent fill the body values at call time. The bearer token is a real secret:
# copy it straight into the dashboard, do not paste it into a chat or a ticket.
set -u
cd "$(dirname "$0")" || exit 1
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
get() { sed -n "s/^$1=//p" .env | head -1 | unquote; }

[ -f .tunnel_url ] || { echo "No .tunnel_url — start ./tunnel.sh first."; exit 1; }
BASE="$(cat .tunnel_url)"
TOKEN="$(get TOOL_BEARER_TOKEN)"

if ! curl -sf --max-time 15 "$BASE/health" >/dev/null 2>&1; then
  echo "WARNING: $BASE is not answering. Restart ./tunnel.sh, then re-run this."
  echo
fi

cat <<BANNER
================================================================
PASTE THIS INTO STEP 2 — "Set up the API call"
================================================================
BANNER
cat <<CURL
curl -X POST $BASE/voice/log_update \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"call_id": "dashboard-test", "reporter_name": "Ramesh Bora", "discipline": "piping", "line_reference_raw": "Erect Line 24 dash XX", "task_type": "spool_erection", "task_status": "in_progress", "task_status_raw": "almost done", "quantity_reported": "8 joints", "supervisor_name": "", "has_blocker": "false", "blocker_description": "", "safety_issue_reported": "false", "readback_confirmed": "true"}'
CURL
cat <<'BANNER'

================================================================
STEP 3 — "Send fields from the API response to the agent"
================================================================
Type this in the box (the @ picker should offer "confirmation"):

  @confirmation

Our response is {"status": ..., "id": ..., "confirmation": "..."} so
"confirmation" is the field the agent should read back to the reporter.

================================================================
AFTER SAVING — check what Sarvam inferred
================================================================
Hitting "Send" in the dashboard now performs a REAL insert and should return
200 with a confirmation string — that is your end-to-end proof from inside
Sarvam. It lands a row tagged call_id="dashboard-test".

It will turn the body into 13 fields. Confirm that:
  - line_reference_raw is present (the only one the server requires)
  - the others are all OPTIONAL — a real call fills only some of them
Empty values and unfilled placeholders are handled server-side, so a
partially captured update still lands rather than failing.
BANNER
