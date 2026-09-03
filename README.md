# TRACE — voice agent → Supabase (spike)

**One goal:** prove a Sarvam voice agent can capture field progress data and land it in Supabase.
No matching engine, no dashboard, no sync job. Those come after this works.

```
Sarvam agent ──(mid-call API tool)──> localhost:8787/voice/log_update ──> Supabase task_updates
          └────(post-call webhook)──> localhost:8787/voice/webhook/<secret> ──> Supabase call_events
```

---

## Step 1 — Create the tables

Supabase dashboard → **SQL Editor** → paste all of `sql/001_minimal_schema.sql` → Run.

You should get two rows back from the check query at the bottom. Note that RLS is ON with
**no anon policies**, so the anon key cannot write. Only the service role key can, and it
lives on your server, never in the Sarvam config.

## Step 2 — Fill in .env

```bash
cp .env.example .env
openssl rand -hex 24   # paste into TOOL_BEARER_TOKEN
openssl rand -hex 24   # paste into WEBHOOK_PATH_SECRET
```

Then add your Supabase URL and **service role** key (Project Settings → API Keys).
`.env` is gitignored. Never paste these into a chat window.

## Step 3 — Run the server

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --app-dir services/voice-ingest --reload --port 8787
```

Port 8787 matches the tunnel. The app **refuses to start** if any required `.env` value is
missing and tells you which — so a half-configured process can never serve traffic. Add
`DEBUG_ERRORS=1` in front of the command to get tracebacks in HTTP responses while debugging.

Only one uvicorn may hold the port: `lsof -ti:8787 | xargs kill -9`

## Step 4 — Smoke test locally, before involving Sarvam

```bash
./test.sh
```

Expected: health ok → 401 → 401 → 200 with a confirmation string → 401 → 200 → one row listed.
If step 4 returns a Supabase error, the message is passed straight through — read it, it will
name the column or policy at fault.

## Step 5 — Confirm the tunnel reaches you

```bash
curl https://definitions-cartoons-bathrooms-tractor.trycloudflare.com/health
```

Use `./tunnel.sh` — it starts cloudflared, waits for the edge connection to register, writes
the hostname to `.tunnel_url`, and prints the exact URL and token to paste into Sarvam.

Compare `pid` and `config_fingerprint` in the tunnelled `/health` against the local one. If
they differ, you are talking to a stale process, not a broken one.

Then run the whole suite over the path Sarvam will actually use:

```bash
./test.sh "$(cat .tunnel_url)"
```

Quick tunnels are ephemeral: every restart gives a **new hostname**, and the Sarvam **tool
URL** must be re-pasted in the dashboard by hand. `./place_call.sh` picks the new webhook URL
up from `.tunnel_url` automatically; the tool URL cannot be.

If cloudflared logs only QUIC/UDP failures, retry with
`cloudflared tunnel --protocol http2 --url http://localhost:8787`. Its precheck can report
"critical failures" and then connect anyway — trust `Registered tunnel connection`.

## Step 6 — Configure the tool in Sarvam

Dashboard → **Tools → Create API tool**

| Field | Value |
|---|---|
| Name | `log_task_update` |
| Description | `Saves the reporter's task progress update. Call this as soon as a line reference and a status have been given.` |
| Method | `POST` |
| URL | `https://<your-tunnel>.trycloudflare.com/voice/log_update` |
| When should this tool run? | `run` (mid-conversation, LLM-callable) |
| Auth | Bearer token → paste `TOOL_BEARER_TOKEN` into the masked secret field |

**Body:**
```json
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
```

Only `line_reference_raw` is required server-side. Everything else can arrive empty —
a half-captured real call is still useful data, and nothing is invented server-side.

**Response template** (so the agent speaks the confirmation back):
> `{{confirmation}}`

## Step 7 — Tell the agent when to fire it

The tool will not fire on its own. Add this to the agent's system prompt:

```
You have a tool named log_task_update. Invoke it as soon as the reporter has given
you both a line or plan reference and a task status. Do not wait until the end of
the call. After the tool returns, read its confirmation back to the reporter and ask
them to confirm it is correct. If they correct any detail, call the tool again with
the corrected values. Never invent a line reference, status, or supervisor name — if
something was not said, leave that field empty.
```

## Step 8 — Point the webhook at yourself

In the outbound call request, include:

```json
"webhook_config": {
  "url": "https://<your-tunnel>.trycloudflare.com/voice/webhook/<WEBHOOK_PATH_SECRET>",
  "metadata": { "supervisor_id": "sup-001", "discipline": "piping", "shift_date": "2026-08-31" }
}
```

`webhook_config` has no custom-header field, which is why the secret is in the path.
Use `metadata` to attach your own identifiers — **phone numbers come back masked from
Sarvam's APIs**, so this is the only reliable way to know which supervisor a call belongs to.

## Step 9 — Place one real call, then inspect

```bash
./place_call.sh +91XXXXXXXXXX   # needs the SARVAM_* values in .env
./peek.sh                        # task_updates — did the mid-call tool fire?
./peek.sh calls                  # call_events — the real payload, verbatim
```

Or straight from the SQL editor:

```sql
select created_at, reporter_name, line_reference_raw, task_status, readback_confirmed
from task_updates order by created_at desc limit 10;

-- and to learn the real webhook payload shape:
select received_at, payload from call_events order by received_at desc limit 3;
```

That `call_events.payload` is the point of this spike beyond "does it write" — it tells you
the actual field names Sarvam sends, which the docs don't fully specify. Once you know them,
the post-call handler can be written properly.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Confirm the tunnel reaches you |
| POST | `/voice/log_update` | Bearer | Mid-call capture → `task_updates` |
| POST | `/voice/webhook/{secret}` | path secret | Post-call payload → `call_events` |
| GET | `/updates?limit=20` | Bearer | Read back recent task updates |
| GET | `/calls?limit=5` | Bearer | Read back raw webhook payloads verbatim |

`/updates` and `/calls` require the bearer token. Use `./peek.sh` and `./peek.sh calls`
rather than curling them by hand.

It was previously unauthenticated, which meant anyone who found the tunnel URL could read
the field reports. Fixed rather than deleted, because reading the rows back is genuinely
useful during a call.

## What is deliberately NOT here

- **Matching engine** — nothing links `line_reference_raw` to an L5/L6 activity ID yet, so
  there is no confidence score and no review queue. That is the next spike.
- Multiple updates per call are supported by the schema (`seq`) but the agent script
  currently captures one.
- No reconciliation sync against the Analytics API, so a dropped webhook is silently lost.
