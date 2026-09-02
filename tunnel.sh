#!/usr/bin/env bash
# Start a cloudflared quick tunnel to localhost:8787, wait for the hostname,
# then print the exact strings to paste into the Sarvam dashboard.
#
#   ./tunnel.sh
#
# The hostname changes on every restart. It is written to .tunnel_url so the
# other scripts (./place_call.sh) can pick it up without you re-pasting it.
set -u
cd "$(dirname "$0")" || exit 1

PORT=8787

if ! curl -sf --max-time 3 "http://localhost:$PORT/health" >/dev/null; then
  echo "The app is not answering on localhost:$PORT."
  echo "Start it first:  .venv/bin/uvicorn app.main:app --reload --port $PORT"
  exit 1
fi

# .env is chmod 600 and holds secrets; read the two we need without echoing it.
unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
WEBHOOK_PATH_SECRET="$(sed -n 's/^WEBHOOK_PATH_SECRET=//p' .env | head -1 | unquote)"
TOOL_BEARER_TOKEN="$(sed -n 's/^TOOL_BEARER_TOKEN=//p' .env | head -1 | unquote)"

LOG="$(mktemp -t trace-tunnel)"
cloudflared tunnel --url "http://localhost:$PORT" >"$LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill $TUNNEL_PID 2>/dev/null; rm -f .tunnel_url' INT TERM

echo "cloudflared started (pid $TUNNEL_PID). Waiting for the hostname..."
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1)"
  [ -n "$URL" ] && break
  kill -0 $TUNNEL_PID 2>/dev/null || { echo "cloudflared died:"; cat "$LOG"; exit 1; }
  sleep 1
done
[ -z "$URL" ] && { echo "No tunnel hostname after 60s. cloudflared log:"; cat "$LOG"; kill $TUNNEL_PID; exit 1; }

printf '%s' "$URL" > .tunnel_url

echo
echo "Hostname is $URL"
echo "Waiting for the edge connection (cloudflared prints the URL before it registers)..."
# Observed ~45s from launch to "Registered tunnel connection". A one-shot check
# here reports a false failure on a tunnel that is merely still coming up.
HEALTH=""
for _ in $(seq 1 30); do
  HEALTH="$(curl -sf --max-time 10 "$URL/health" 2>/dev/null)" && [ -n "$HEALTH" ] && break
  grep -q "Registered tunnel connection" "$LOG" && printf 'r' || printf '.'
  sleep 3
done
echo
if [ -n "$HEALTH" ]; then
  echo "Tunnel reaches the app:"
  echo "  $HEALTH"
  echo "  ^ pid and config_fingerprint must match your local /health. If they don't,"
  echo "    something else is holding port 8787:  lsof -ti:8787 | xargs kill -9"
else
  echo "WARNING: /health still not answering through the tunnel after 90s."
  echo "cloudflared log tail:"; tail -15 "$LOG"
  echo
  echo "If the log shows only QUIC/UDP failures, retry with:"
  echo "  cloudflared tunnel --protocol http2 --url http://localhost:8787"
fi

cat <<BANNER

================================================================
PASTE THESE INTO SARVAM
================================================================

Tools -> Create API tool -> "log_task_update"
  Method : POST
  URL    : $URL/voice/log_update
  Auth   : Bearer token
  Token  : $TOOL_BEARER_TOKEN

Outbound call webhook_config.url:
  $URL/voice/webhook/$WEBHOOK_PATH_SECRET

================================================================
Leave this terminal open. Ctrl-C kills the tunnel and the URL dies with it.
BANNER

wait $TUNNEL_PID
