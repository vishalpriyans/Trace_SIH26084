#!/usr/bin/env bash
# Print the paste-ready values for the Sarvam dashboard.
# Reads the live tunnel hostname from .tunnel_url.
set -u
cd "$(dirname "$0")" || exit 1
# python-dotenv strips surrounding quotes from .env values but sed does not,
# so a hand-quoted value would reach curl with the quotes still attached.
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
get() { sed -n "s/^$1=//p" .env | head -1 | unquote; }

[ -f .tunnel_url ] || { echo "No .tunnel_url — start ./tunnel.sh first."; exit 1; }
BASE="$(cat .tunnel_url)"

if ! curl -sf --max-time 15 "$BASE/health" >/dev/null 2>&1; then
  echo "WARNING: $BASE is not reaching the app right now."
  echo "         The tunnel may have died. Restart ./tunnel.sh and re-run this."
  echo
fi

cat <<BANNER
================================================================
SARVAM DASHBOARD — Tools -> Create API tool
================================================================
  Name        : log_task_update
  Description : Saves the reporter's task progress update. Call as soon as a
                line reference and a status have been given.
  Method      : POST
  URL         : $BASE/voice/log_update
  When to run : run   (mid-conversation, LLM-callable)
  Auth        : Bearer token
  Token       : $(get TOOL_BEARER_TOKEN)

  Response template (so the agent speaks it back):  {{confirmation}}

  Body:
BANNER
cat <<'BODY'
  {
    "call_id": "{{call_id}}",
    "reporter_name": "{{reporter_name}}",
    "discipline": "{{discipline}}",
    "line_reference_raw": "{{line_reference_raw}}",
    "task_type": "{{task_type}}",
    "task_status": "{{task_status}}",
    "task_status_raw": "{{task_status_raw}}",
    "quantity_reported": "{{quantity_reported}}",
    "supervisor_name": "{{supervisor_name}}",
    "has_blocker": "{{has_blocker}}",
    "blocker_description": "{{blocker_description}}",
    "safety_issue_reported": "{{safety_issue_reported}}",
    "readback_confirmed": "{{readback_confirmed}}"
  }
BODY
cat <<BANNER

================================================================
Webhook URL (place_call.sh sets this for you automatically —
you only need it if you configure the webhook by hand)
================================================================
  $BASE/voice/webhook/$(get WEBHOOK_PATH_SECRET)

================================================================
Only line_reference_raw is required server-side. Every other field may arrive
empty; that is handled. Nothing is invented server-side.
BANNER
