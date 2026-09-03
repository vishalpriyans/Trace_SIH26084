#!/usr/bin/env bash
# Full verification of the TRACE spike. Prints PASS/FAIL per check.
#
#   ./verify.sh              # local only
#   ./verify.sh --tunnel     # also exercise the cloudflared path
#
# Prints no secret values. Safe to paste the output anywhere.
set -u
cd "$(dirname "$0")/../.." || exit 1
ROOT="$PWD"
SP="$(mktemp -d)"
trap 'rm -rf "$SP"' EXIT

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m  %s\n' "$1"; }
chk()  { [ "$2" = "$3" ] && ok "$1 ($3)" || bad "$1 (got $2, want $3)"; }
hdr()  { printf '\n\033[1m%s\033[0m\n' "$1"; }

unquote() { sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
get() { sed -n "s/^$1=//p" .env | head -1 | unquote; }
BASE="http://localhost:8787"
TOK="$(get TOOL_BEARER_TOKEN)"
SECRET="$(get WEBHOOK_PATH_SECRET)"
code() { curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$@"; }
bodyof() { curl -sS --max-time 20 "$@"; }

hdr "1. Configuration"
[ -f .env ] && ok ".env exists" || bad ".env missing"
chk ".env permissions" "$(stat -f '%Sp' .env)" "-rw-------"
for k in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY TOOL_BEARER_TOKEN WEBHOOK_PATH_SECRET \
         SARVAM_API_KEY SARVAM_ORG_ID SARVAM_WORKSPACE_ID SARVAM_APP_ID \
         SARVAM_CONNECTION_ID SARVAM_AGENT_PHONE_NUMBER; do
  [ -n "$(get $k)" ] && ok "$k set" || bad "$k EMPTY"
done
case "$(get SARVAM_API_KEY)" in
  sk-xx*|*REPLACE*|*xxxx*) bad "SARVAM_API_KEY is a placeholder" ;;
  *) ok "SARVAM_API_KEY is not a placeholder" ;;
esac

hdr "2. Startup guard (a half-configured process must not serve)"
mkdir -p "$SP/partial"
grep -v '^TOOL_BEARER_TOKEN=' .env > "$SP/partial/.env"
GUARD="$(cd "$SP/partial" && PYTHONPATH="$ROOT/services/voice-ingest" "$ROOT/.venv/bin/python" -c "import app.main" 2>&1)"
echo "$GUARD" | grep -q "refusing to start" && ok "refuses to boot without TOOL_BEARER_TOKEN" \
  || bad "booted anyway without TOOL_BEARER_TOKEN"
echo "$GUARD" | grep -q "TOOL_BEARER_TOKEN" && ok "names the missing key" || bad "does not name the missing key"

hdr "3. Health and process identity"
H="$(bodyof "$BASE/health")"
echo "$H" | grep -q '"ok":true' && ok "/health ok" || bad "/health: $H"
echo "$H" | grep -q '"config_fingerprint"' && ok "reports config_fingerprint" || bad "no fingerprint"
echo "$H" | grep -q '"debug_errors":false' && ok "DEBUG_ERRORS off (no traceback leak)" \
  || bad "DEBUG_ERRORS is ON — tracebacks leak in responses"
LOOPBACK="$(lsof -nP -iTCP:8787 -sTCP:LISTEN | awk 'NR>1{print $(NF-1)}' | head -1)"
case "$LOOPBACK" in
  127.0.0.1:8787|'[::1]:8787') ok "bound to loopback only ($LOOPBACK)" ;;
  *) bad "bound to $LOOPBACK — reachable beyond loopback" ;;
esac

hdr "4. Authentication"
chk "log_update no token"      "$(code -X POST "$BASE/voice/log_update" -H 'Content-Type: application/json' -d '{"line_reference_raw":"x"}')" 401
chk "log_update wrong token"   "$(code -X POST "$BASE/voice/log_update" -H 'Authorization: Bearer wrong' -H 'Content-Type: application/json' -d '{"line_reference_raw":"x"}')" 401
chk "webhook wrong secret"     "$(code -X POST "$BASE/voice/webhook/nope" -H 'Content-Type: application/json' -d '{}')" 401
chk "/updates no token"        "$(code "$BASE/updates?limit=1")" 401
chk "/calls no token"          "$(code "$BASE/calls?limit=1")" 401
chk "/updates with token"      "$(code "$BASE/updates?limit=1" -H "Authorization: Bearer $TOK")" 200
chk "/calls with token"        "$(code "$BASE/calls?limit=1" -H "Authorization: Bearer $TOK")" 200

hdr "5. Mid-call capture"
R="$(bodyof -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"call_id":"verify-mid","line_reference_raw":"Line 24-XX","task_status":"completed"}')"
echo "$R" | grep -q '"confirmation": *"Logged Line 24-XX, status completed"' \
  && ok "returns the spoken confirmation" || bad "confirmation wrong: $R"

hdr "6. Messy real-world payloads (the 422 class of bug)"
chk "empty strings for booleans" "$(code -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"call_id":"verify-blank","line_reference_raw":"L1","has_blocker":"","safety_issue_reported":"","seq":""}')" 200
chk "unrendered {{placeholder}}" "$(code -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"call_id":"verify-tmpl","line_reference_raw":"L2","has_blocker":"{{has_blocker}}"}')" 200
chk "ellipsis placeholders"      "$(code -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"call_id":"verify-dots","line_reference_raw":"L3","has_blocker":"...","readback_confirmed":"..."}')" 200
chk "string booleans true/false" "$(code -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"call_id":"verify-strbool","line_reference_raw":"L4","has_blocker":"false","readback_confirmed":"true"}')" 200
chk "missing line reference"     "$(code -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"line_reference_raw":"","task_status":"completed"}')" 422

hdr "7. Agent's own field names (aliases)"
R="$(bodyof -X POST "$BASE/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"attempt_id":"verify-alias","line_reference":"Line 24-XX","worker_name":"Vishal (2689)","task_status":"completed"}')"
echo "$R" | grep -q '"Logged Line 24-XX' && ok "line_reference / worker_name / attempt_id accepted" || bad "aliases rejected: $R"

hdr "8. Post-call capture (maps final_agent_variables)"
R="$(bodyof -X POST "$BASE/voice/webhook/$SECRET" -H 'Content-Type: application/json' -d '{
  "status":"connected","attempt_id":"verify-postcall",
  "webhook_config":{"url":"https://x/voice/webhook/'"$SECRET"'","metadata":{"discipline":"piping"}},
  "final_agent_variables":{"line_reference":"Line 24-XX","worker_name":"Vishal (2689)",
    "task_type":"fixing of wires","task_status":"completed",
    "supervisor_name":"Yashwant Nimgadda","safety_issue_reported":"none"}}')"
echo "$R" | grep -q '"received":true' && ok "webhook accepted" || bad "webhook: $R"
echo "$R" | grep -q '"task_update_id":"[0-9a-f]' && ok "projected into task_updates" || bad "no task_update_id: $R"
V="$(bodyof "$BASE/updates?limit=20" -H "Authorization: Bearer $TOK" | python3 -c "
import json,sys
rows=json.load(sys.stdin)['rows']
r=next((x for x in rows if x['call_id']=='verify-postcall'), None)
if not r: print('MISSING'); raise SystemExit
print('|'.join([str(r['reporter_name']),str(r['reporter_id']),str(r['discipline']),
                str(r['task_status']),str(r['safety_issue_reported']),str(r['source'])]))")"
chk "mapped fields" "$V" "Vishal|2689|piping|completed|False|on_end"

hdr "9. Secret hygiene"
LAST="$(bodyof "$BASE/calls?limit=3" -H "Authorization: Bearer $TOK")"
echo "$LAST" | grep -q -- "$SECRET" && bad "webhook secret STORED in call_events" \
  || ok "webhook secret redacted before storage"
echo "$LAST" | grep -q -- "$TOK" && bad "bearer token stored in call_events" || ok "bearer token not stored"
SBK="$(get SUPABASE_SERVICE_ROLE_KEY)"
# Every file git would ever commit, excluding .env (which is SUPPOSED to hold them).
git ls-files -co --exclude-standard 2>/dev/null | grep -vE '^\.env$' > "$SP/tracked.txt"
scan_for() {  # $1 = label, $2 = secret. Fails loudly if the secret is empty.
  local label="$1" sec="$2" hit
  if [ -z "$sec" ]; then bad "$label — secret empty, check inconclusive"; return; fi
  hit="$(grep -lIF -e "$sec" $(tr '\n' ' ' < "$SP/tracked.txt") 2>/dev/null | head -1)"
  if [ -n "$hit" ]; then bad "$label — found in $hit"; else ok "$label"; fi
}
chk "files scanned for secrets" "$([ -s "$SP/tracked.txt" ] && echo yes || echo no)" "yes"
scan_for "Supabase key not in any committable file" "$SBK"
scan_for "bearer token not in any committable file" "$TOK"
scan_for "webhook secret not in any committable file" "$SECRET"
scan_for "Sarvam API key not in any committable file" "$(get SARVAM_API_KEY)"
git check-ignore -q .env && ok ".env is gitignored" || bad ".env NOT gitignored"
git check-ignore -q .tunnel_url && ok ".tunnel_url is gitignored" || bad ".tunnel_url NOT gitignored"

hdr "10. Rotated secrets are dead"
chk "old webhook secret (18:19 leak)" "$(code -X POST "$BASE/voice/webhook/5b3110913cb5f2b724818d44775e98c4592f659aaed2edd1" -H 'Content-Type: application/json' -d '{}')" 401
chk "older webhook secret"            "$(code -X POST "$BASE/voice/webhook/f7dc619685b93cde18ecc6cd1b04b7f9a8e4d38e514612c8" -H 'Content-Type: application/json' -d '{}')" 401
chk "old bearer token"                "$(code -X POST "$BASE/voice/log_update" -H 'Authorization: Bearer e57ab4086bff1a76be8c8417361b6984e1041815feb3c17a' -H 'Content-Type: application/json' -d '{"line_reference_raw":"x"}')" 401

hdr "11. Scripts"
for f in tunnel.sh place_call.sh peek.sh show_config.sh curl_for_sarvam.sh add_sarvam.sh test.sh diag.sh verify.sh; do
  bash -n "scripts/voice/$f" 2>/dev/null && ok "$f parses" || bad "$f SYNTAX ERROR"
done
sh -n scripts/voice/setup_env.sh 2>/dev/null && ok "setup_env.sh parses" || bad "setup_env.sh SYNTAX ERROR"
./scripts/voice/place_call.sh 2>&1 | grep -q usage && ok "place_call.sh rejects no argument" || bad "place_call.sh accepts no argument"
./scripts/voice/place_call.sh 9731130674 2>&1 | grep -q Refusing && ok "place_call.sh rejects non-E.164" || bad "place_call.sh accepts bad number"

hdr "12. Tunnel path"
if [ "${1:-}" = "--tunnel" ] && [ -f .tunnel_url ]; then
  TB="$(cat .tunnel_url)"
  TH="$(bodyof "$TB/health")"
  echo "$TH" | grep -q '"ok":true' && ok "tunnel reaches the app" || bad "tunnel /health: $TH"
  LP="$(echo "$H"  | python3 -c 'import sys,json;print(json.load(sys.stdin)["pid"])' 2>/dev/null)"
  TP="$(echo "$TH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["pid"])' 2>/dev/null)"
  chk "same process via tunnel (pid)" "$TP" "$LP"
  chk "tunnel mid-call tool" "$(code -X POST "$TB/voice/log_update" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"call_id":"verify-tunnel","line_reference_raw":"Line 24-XX"}')" 200
  pgrep -f "cloudflared tunnel" >/dev/null && ok "cloudflared running" || bad "cloudflared not running"
else
  printf '  \033[33mSKIP\033[0m  pass --tunnel to exercise the cloudflared path\n'
fi

hdr "13. Cleanup"
# Every row this script created is tagged call_id=verify-*. Remove them so the
# real capture data is not diluted by repeated verification runs.
SB_URL="$(get SUPABASE_URL)"; SB_KEY="$(get SUPABASE_SERVICE_ROLE_KEY)"
DEL_U="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
  "$SB_URL/rest/v1/task_updates?call_id=like.verify-*" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY")"
case "$DEL_U" in 20*) ok "removed verify-* rows from task_updates ($DEL_U)" ;;
                 *)   bad "cleanup of task_updates returned $DEL_U" ;; esac
LEFT="$(bodyof "$BASE/updates?limit=50" -H "Authorization: Bearer $TOK" \
  | python3 -c "import json,sys;print(sum(1 for r in json.load(sys.stdin)['rows'] if str(r['call_id']).startswith('verify-')))")"
chk "no verify rows remaining" "$LEFT" "0"

printf '\n\033[1m================ %d passed, %d failed ================\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
