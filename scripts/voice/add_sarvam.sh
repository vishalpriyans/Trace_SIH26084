#!/usr/bin/env bash
# Add the four Sarvam credentials to .env.
#
#   ./add_sarvam.sh
#
# Prompts, so nothing lands in your shell history. The API key is not echoed.
# Press Return on any prompt to keep the value already in .env.
#
#   ./add_sarvam.sh --show-key    echo the API key as you type it
#
# NEVER edit this file to add your values. It is a program, not a config file.
# The values live in .env; this script only writes them there.
set -u
cd "$(dirname "$0")/../.." || exit 1
SHOW_KEY=""
[ "${1:-}" = "--show-key" ] && SHOW_KEY=1
[ -f .env ] || { echo "No .env — run ./setup_env.sh first."; exit 1; }

get() { sed -n "s/^$1=//p" .env | head -1; }

# $1 = var name, $2 = human prompt, $3 = "secret" to hide input
ask() {
  local var="$1" prompt="$2" secret="${3:-}" cur new
  cur="$(get "$var")"
  if [ -n "$cur" ]; then
    if [ -n "$secret" ]; then
      prompt="$prompt [currently set, ${#cur} chars — Return to keep]"
    else
      prompt="$prompt [currently $cur — Return to keep]"
    fi
  fi
  printf '%s\n> ' "$prompt" >&2
  if [ -n "$secret" ] && [ -z "$SHOW_KEY" ]; then
    read -rs new; echo >&2
  else
    read -r new
  fi
  new="$(printf '%s' "${new:-$cur}" | tr -d '[:space:]' | tr -d '"' | tr -d "'")"
  printf '%s' "$new"
}

echo "Sarvam credentials. Dashboard -> API Keys, and your agent's app / connection pages." >&2
echo >&2
API_KEY="$(ask   SARVAM_API_KEY            "Sarvam API key (sent as X-API-Key)" secret)"
APP_ID="$(ask    SARVAM_APP_ID             "Agent app id")"
CONN_ID="$(ask   SARVAM_CONNECTION_ID      "Telephony connection id")"
AGENT_NUM="$(ask SARVAM_AGENT_PHONE_NUMBER "Agent phone number to dial OUT from (+91...)")"
APP_VER="$(ask   SARVAM_APP_VERSION        "App version")"
[ -n "$APP_VER" ] || APP_VER=1

MISSING=""
[ -z "$API_KEY" ]   && MISSING="$MISSING SARVAM_API_KEY"
[ -z "$APP_ID" ]    && MISSING="$MISSING SARVAM_APP_ID"
[ -z "$CONN_ID" ]   && MISSING="$MISSING SARVAM_CONNECTION_ID"
[ -z "$AGENT_NUM" ] && MISSING="$MISSING SARVAM_AGENT_PHONE_NUMBER"
[ -n "$MISSING" ] && { echo; echo "Still empty:$MISSING"; echo "Nothing written."; exit 1; }

# Rewrite only these keys, leave everything else in .env untouched.
umask 077
python3 - "$API_KEY" "$APP_ID" "$CONN_ID" "$AGENT_NUM" "$APP_VER" <<'PY'
import sys, pathlib
api, app_id, conn, num, ver = sys.argv[1:6]
vals = {
    "SARVAM_API_KEY": api,
    "SARVAM_APP_ID": app_id,
    "SARVAM_CONNECTION_ID": conn,
    "SARVAM_AGENT_PHONE_NUMBER": num,
    "SARVAM_APP_VERSION": ver,
}
p = pathlib.Path(".env")
lines = p.read_text().rstrip("\n").split("\n")
out, seen = [], set()
for line in lines:
    k = line.split("=", 1)[0] if "=" in line else None
    if k in vals:
        out.append(f"{k}={vals[k]}"); seen.add(k)
    else:
        out.append(line)
for k, v in vals.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
PY
chmod 600 .env

echo
echo "Wrote .env:"
echo "  SARVAM_API_KEY            = $(printf '%s' "$API_KEY" | cut -c1-6)...  (${#API_KEY} chars)"
echo "  SARVAM_APP_ID             = $APP_ID"
echo "  SARVAM_APP_VERSION        = $APP_VER"
echo "  SARVAM_CONNECTION_ID      = $CONN_ID"
echo "  SARVAM_AGENT_PHONE_NUMBER = $AGENT_NUM"
echo
echo "Next:  ./show_config.sh    then paste into the Sarvam dashboard"
