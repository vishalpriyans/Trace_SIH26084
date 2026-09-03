#!/bin/sh
# Write .env for the TRACE spike.
#
# Preferred (no prompts, nothing can hang):
#   ./setup_env.sh "https://xxxx.supabase.co" "sb_secret_xxxxx"
#
# Or run with no arguments and it will ask (input is visible).

set -u
cd "$(dirname "$0")/../.." || exit 1

# reuse already-generated tokens if .env exists
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
get() { [ -f .env ] && sed -n "s/^$1=//p" .env | head -1 | unquote; }
TOOL_TOKEN="$(get TOOL_BEARER_TOKEN)"
HOOK_SECRET="$(get WEBHOOK_PATH_SECRET)"
# Sarvam values are entered by hand; never lose them on a re-run.
SARVAM_API_KEY="$(get SARVAM_API_KEY)"
SARVAM_ORG_ID="${SARVAM_ORG_ID:-$(get SARVAM_ORG_ID)}"
SARVAM_WORKSPACE_ID="${SARVAM_WORKSPACE_ID:-$(get SARVAM_WORKSPACE_ID)}"
SARVAM_APP_ID="$(get SARVAM_APP_ID)"
SARVAM_APP_VERSION="$(get SARVAM_APP_VERSION)"
SARVAM_CONNECTION_ID="$(get SARVAM_CONNECTION_ID)"
SARVAM_AGENT_PHONE_NUMBER="$(get SARVAM_AGENT_PHONE_NUMBER)"
[ -n "$SARVAM_ORG_ID" ]       || SARVAM_ORG_ID=01a03cdf-0617-7940-9abd-40d8529c47d9
[ -n "$SARVAM_WORKSPACE_ID" ] || SARVAM_WORKSPACE_ID=01a03cdf-061c-79fa-a613-9520c2afefe2
[ -n "$SARVAM_APP_VERSION" ]  || SARVAM_APP_VERSION=1
[ -n "$TOOL_TOKEN" ]  || TOOL_TOKEN="$(openssl rand -hex 24)"
[ -n "$HOOK_SECRET" ] || HOOK_SECRET="$(openssl rand -hex 24)"

SB_URL="${1:-}"
SB_KEY="${2:-}"

if [ -z "$SB_URL" ]; then
  echo "Supabase Project URL (looks like https://xxxx.supabase.co)"
  printf '> '
  read -r SB_URL
fi
if [ -z "$SB_KEY" ]; then
  echo "Supabase SECRET key (starts sb_secret_)"
  printf '> '
  read -r SB_KEY
fi

# strip whitespace / stray quotes / trailing slash
clean() { printf '%s' "$1" | tr -d '[:space:]' | tr -d '"' | tr -d "'"; }
SB_URL="$(clean "$SB_URL" | sed 's|/*$||')"
SB_KEY="$(clean "$SB_KEY")"

# --- validate, warn but never block ---------------------------------
WARN=0
case "$SB_URL" in
  https://*.supabase.co) ;;
  *) echo "WARNING: URL does not look like https://xxxx.supabase.co"; WARN=1 ;;
esac
case "$SB_KEY" in
  sb_secret_*) ;;
  eyJ*) echo "NOTE: legacy JWT key — make sure it is service_role, not anon" ;;
  sb_publishable_*)
    echo "ERROR: that is the PUBLISHABLE key. It respects RLS and cannot write."
    echo "       Use the key with the reveal/eye icon (sb_secret_...). Nothing written."
    exit 1 ;;
  *) echo "WARNING: key does not start with sb_secret_"; WARN=1 ;;
esac
[ -z "$SB_URL" ] && { echo "ERROR: URL is empty. Nothing written."; exit 1; }
[ -z "$SB_KEY" ] && { echo "ERROR: key is empty. Nothing written."; exit 1; }

umask 077
cat > .env <<ENVEOF
SUPABASE_URL=$SB_URL
SUPABASE_SERVICE_ROLE_KEY=$SB_KEY
TOOL_BEARER_TOKEN=$TOOL_TOKEN
WEBHOOK_PATH_SECRET=$HOOK_SECRET
SARVAM_API_KEY=$SARVAM_API_KEY
SARVAM_ORG_ID=$SARVAM_ORG_ID
SARVAM_WORKSPACE_ID=$SARVAM_WORKSPACE_ID
SARVAM_APP_ID=$SARVAM_APP_ID
SARVAM_APP_VERSION=$SARVAM_APP_VERSION
SARVAM_CONNECTION_ID=$SARVAM_CONNECTION_ID
SARVAM_AGENT_PHONE_NUMBER=$SARVAM_AGENT_PHONE_NUMBER
ENVEOF
chmod 600 .env

echo
echo "Wrote .env"
echo "  SUPABASE_URL              = $SB_URL"
echo "  SUPABASE_SERVICE_ROLE_KEY = $(printf '%s' "$SB_KEY" | cut -c1-14)...  (${#SB_KEY} chars)"
echo "  TOOL_BEARER_TOKEN         = $TOOL_TOKEN"
echo "  WEBHOOK_PATH_SECRET       = $HOOK_SECRET"
[ "$WARN" = "1" ] && echo && echo "There were warnings above — check the values if the test fails."
echo
echo "Next:  uvicorn app.main:app --app-dir services/voice-ingest --reload --port 8787     then  ./test.sh"
