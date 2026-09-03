#!/usr/bin/env bash
# Place one Sarvam outbound call at a phone number, pointing the post-call
# webhook at the current tunnel.
#
#   ./place_call.sh +919876543210
#   ./place_call.sh +919876543210 --dry-run    # print the request, send nothing
#
# Reads the tunnel hostname from .tunnel_url (written by ./tunnel.sh), so you
# never have to paste it twice. Requires the SARVAM_* values in .env.
#
# This DIALS A REAL PHONE. Use --dry-run while you are still checking config.
set -u
cd "$(dirname "$0")/../.." || exit 1

CALLEE="${1:-}"
DRY=""
[ "${2:-}" = "--dry-run" ] && DRY=1
[ "$CALLEE" = "--dry-run" ] && { echo "usage: ./place_call.sh +91XXXXXXXXXX [--dry-run]"; exit 1; }
[ -z "$CALLEE" ] && { echo "usage: ./place_call.sh +91XXXXXXXXXX [--dry-run]"; exit 1; }

# A wrong number is a call to a stranger, so insist on the E.164 shape.
case "$CALLEE" in
  +[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*) ;;
  *) echo "Refusing: '$CALLEE' is not an E.164 number (expected +91XXXXXXXXXX)."; exit 1 ;;
esac

# python-dotenv strips surrounding quotes from .env values but sed does not,
# so a hand-quoted value would reach curl with the quotes still attached.
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
get() { sed -n "s/^$1=//p" .env | head -1 | unquote; }
SARVAM_API_KEY="$(get SARVAM_API_KEY)"
SARVAM_ORG_ID="$(get SARVAM_ORG_ID)"
SARVAM_WORKSPACE_ID="$(get SARVAM_WORKSPACE_ID)"
SARVAM_APP_ID="$(get SARVAM_APP_ID)"
SARVAM_APP_VERSION="$(get SARVAM_APP_VERSION)"
SARVAM_CONNECTION_ID="$(get SARVAM_CONNECTION_ID)"
SARVAM_AGENT_PHONE_NUMBER="$(get SARVAM_AGENT_PHONE_NUMBER)"
WEBHOOK_PATH_SECRET="$(get WEBHOOK_PATH_SECRET)"
: "${SARVAM_APP_VERSION:=1}"

MISSING=""
for v in SARVAM_API_KEY SARVAM_ORG_ID SARVAM_WORKSPACE_ID SARVAM_APP_ID \
         SARVAM_CONNECTION_ID SARVAM_AGENT_PHONE_NUMBER; do
  eval "val=\$$v"
  [ -z "$val" ] && MISSING="$MISSING $v"
done
if [ -n "$MISSING" ]; then
  echo "Missing in .env:$MISSING"
  echo "Add them, then re-run. See .env.example for where each one comes from."
  exit 1
fi

# A placeholder passes the not-empty check above but would POST a bogus key to
# Sarvam and come back 401 — which reads like a revoked key rather than an
# unfilled one. Catch it by name instead.
case "$SARVAM_API_KEY" in
  sk-xx*|*REPLACE*|*replace*|*CHANGEME*|*changeme*|*your-*|*xxxx*)
    echo "SARVAM_API_KEY is still the placeholder '$SARVAM_API_KEY'."
    echo "Put your real key in with:  ./add_sarvam.sh"
    [ -n "$DRY" ] || exit 1
    echo "(continuing anyway because this is a --dry-run)"
    echo ;;
esac

[ -f .tunnel_url ] || { echo "No .tunnel_url — run ./tunnel.sh in another terminal first."; exit 1; }
BASE="$(cat .tunnel_url)"
WEBHOOK_URL="$BASE/voice/webhook/$WEBHOOK_PATH_SECRET"

# Confirm the app is reachable through the tunnel before spending a phone call.
if ! curl -sf --max-time 15 "$BASE/health" >/dev/null; then
  echo "The tunnel at $BASE is not reaching the app. Not placing the call."
  exit 1
fi

# Sarvam's analytics APIs return masked phone numbers, so metadata is the only
# reliable way to know which supervisor a call belongs to. Always set it.
SHIFT_DATE="$(date +%F)"
PAYLOAD=$(cat <<JSON
{
  "app_config": {
    "app_id": "$SARVAM_APP_ID",
    "app_version": $SARVAM_APP_VERSION,
    "connection_config": {
      "connection_id": "$SARVAM_CONNECTION_ID",
      "agent_phone_number": "$SARVAM_AGENT_PHONE_NUMBER"
    }
  },
  "user_config": { "user_phone_number": "$CALLEE" },
  "webhook_config": {
    "url": "$WEBHOOK_URL",
    "metadata": {
      "supervisor_id": "${SUPERVISOR_ID:-sup-001}",
      "discipline": "${DISCIPLINE:-piping}",
      "shift_date": "$SHIFT_DATE"
    }
  }
}
JSON
)

URL="https://apps.sarvam.ai/api/outbounds/v1/orgs/$SARVAM_ORG_ID/workspaces/$SARVAM_WORKSPACE_ID/outbounds"

if [ -n "$DRY" ]; then
  echo "DRY RUN — nothing will be sent."
  echo "  POST $URL"
  echo "  X-API-Key: <${#SARVAM_API_KEY} chars, starts $(printf '%s' "$SARVAM_API_KEY" | cut -c1-4)...>"
  echo "  body:"
  printf '%s\n' "$PAYLOAD" | sed 's/^/    /'
  echo
  echo "Re-run without --dry-run to actually dial $CALLEE."
  exit 0
fi

echo "This will DIAL $CALLEE for real."
printf 'Type the number again to confirm, or anything else to abort:\n> '
read -r CONFIRM
[ "$CONFIRM" = "$CALLEE" ] || { echo "Aborted. Nothing sent."; exit 1; }

echo
echo "Calling $CALLEE"
echo "  webhook -> $BASE/voice/webhook/<secret>"
echo
curl -sS -w "\n--> HTTP %{http_code}  time %{time_total}s\n" \
  -X POST "$URL" \
  -H "X-API-Key: $SARVAM_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo
echo "Watch the rows land:"
echo "  ./peek.sh          # task_updates (mid-call tool)"
echo "  ./peek.sh calls    # call_events  (post-call webhook, verbatim)"
