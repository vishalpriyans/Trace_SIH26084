"""
TRACE / SIH26122 — voice-agent -> Supabase ingest.

One job: prove that Sarvam's voice agent can capture field data
and land it in Supabase. No matching engine, no dashboard.

Run:  .venv/bin/uvicorn app.main:app --reload --port 8787
"""
import hashlib
import hmac
import json
import os
import re
import sys
import traceback
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
TOOL_BEARER_TOKEN = os.getenv("TOOL_BEARER_TOKEN", "")
WEBHOOK_PATH_SECRET = os.getenv("WEBHOOK_PATH_SECRET", "")

# Tracebacks in HTTP responses. Off unless you ask for it.
DEBUG_ERRORS = os.getenv("DEBUG_ERRORS", "").lower() in ("1", "true", "yes")

# --- Refuse to run half-configured -----------------------------------------
# The original 500s came from a stale uvicorn holding port 8787 with no .env
# loaded: it answered requests, failed before the network, and looked like a
# Supabase problem. A process with missing config must not serve traffic.
_REQUIRED = {
    "SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_KEY,
    "TOOL_BEARER_TOKEN": TOOL_BEARER_TOKEN,
    "WEBHOOK_PATH_SECRET": WEBHOOK_PATH_SECRET,
}
_MISSING = sorted(k for k, v in _REQUIRED.items() if not v)
if _MISSING:
    sys.stderr.write(
        "\n*** TRACE refusing to start ***\n"
        "Missing in .env: " + ", ".join(_MISSING) + "\n"
        "Fix with:  ./setup_env.sh \"<supabase url>\" \"<sb_secret_key>\"\n\n"
    )
    raise SystemExit(1)

# Short fingerprint of the loaded config. If /health shows a fingerprint you
# don't recognise, you are talking to a stale process — not a broken one.
CONFIG_FINGERPRINT = hashlib.sha256(
    "|".join(f"{k}={v}" for k, v in sorted(_REQUIRED.items())).encode()
).hexdigest()[:12]

app = FastAPI(title="TRACE voice ingest (spike)")


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    """Always log the traceback server-side; only leak it when DEBUG_ERRORS=1."""
    tb = traceback.format_exc()
    print("\n=== UNHANDLED ERROR ===\n" + tb, flush=True)
    body: dict = {"error": "internal_error"}
    if DEBUG_ERRORS:
        body = {
            "error": type(exc).__name__,
            "message": str(exc),
            "traceback": tb.splitlines()[-12:],
        }
    return JSONResponse(status_code=500, content=body)


# ---------------------------------------------------------------- helpers
def _sb_headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


async def supabase_insert(table: str, row: dict) -> dict:
    """Insert one row via Supabase PostgREST using the service role key."""
    headers = {**_sb_headers(), "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=row)
    if r.status_code >= 300:
        # surface the real Postgres error instead of a generic 500
        raise HTTPException(502, f"Supabase {r.status_code}: {r.text}")
    data = r.json()
    return data[0] if isinstance(data, list) and data else {}


async def supabase_select(table: str, params: dict) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{table}", headers=_sb_headers(), params=params
        )
    if r.status_code >= 300:
        raise HTTPException(502, f"Supabase {r.status_code}: {r.text}")
    return r.json()


def redact_secrets(obj: Any) -> Any:
    """
    Strip our own secrets out of anything before it is persisted.

    Sarvam echoes the full webhook_config back in the post-call payload, URL and
    path secret included. Storing that verbatim writes the shared secret into
    the database in plaintext, where it survives every future rotation of the
    live value. Walk the structure and blank it wherever it appears.
    """
    secrets = [v for v in (WEBHOOK_PATH_SECRET, TOOL_BEARER_TOKEN, SUPABASE_SERVICE_KEY) if v]
    if isinstance(obj, str):
        for sec in secrets:
            obj = obj.replace(sec, "<redacted>")
        return obj
    if isinstance(obj, dict):
        return {k: redact_secrets(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact_secrets(v) for v in obj]
    return obj


def check_bearer(authorization: Optional[str]) -> None:
    """Constant-time compare so the token can't be probed byte by byte."""
    presented = (authorization or "")
    if not hmac.compare_digest(presented, f"Bearer {TOOL_BEARER_TOKEN}"):
        raise HTTPException(401, "bad or missing bearer token")


# ---------------------------------------------------------------- models
# Sarvam renders its tool body from a template. Any variable the agent did not
# fill arrives as an empty string, and a variable name that doesn't exist in the
# agent arrives as the literal "{{name}}". Either one makes Pydantic reject a
# bool or int field with a 422, which on a live call is a silently dropped
# update. Normalise both to None before validation.
_BLANKS = {"", "null", "none", "nil", "undefined", "n/a", "na", "-",
           "...", "\u2026"}  # "..." is Sarvam's own placeholder in its cURL example


class TaskUpdateIn(BaseModel):
    # Everything optional except the line reference: a real call is messy
    # and half-captured data is still data. Nothing is invented server-side.
    #
    # The first real call showed the agent's own variables are named
    # line_reference and worker_name, not line_reference_raw / reporter_name.
    # Accept both rather than relying on the LLM to rename them correctly —
    # a mismatch here is a silently dropped update.
    model_config = ConfigDict(populate_by_name=True)

    call_id: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("call_id", "attempt_id"))
    seq: Optional[int] = 1
    reporter_name: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("reporter_name", "worker_name"))
    reporter_id: Optional[str] = None
    discipline: Optional[str] = None

    line_reference_raw: str = Field(
        validation_alias=AliasChoices("line_reference_raw", "line_reference"))
    task_type: Optional[str] = None
    task_type_other_text: Optional[str] = None
    task_status: Optional[str] = None
    task_status_raw: Optional[str] = None
    quantity_reported: Optional[str] = None
    supervisor_name: Optional[str] = None

    has_blocker: Optional[bool] = None
    blocker_description: Optional[str] = None
    safety_issue_reported: Optional[bool] = None
    safety_emergency: Optional[bool] = None
    readback_confirmed: Optional[bool] = None

    @field_validator("*", mode="before")
    @classmethod
    def _blank_to_none(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v
        s = v.strip()
        if s.lower() in _BLANKS:
            return None
        if s.startswith("{{") and s.endswith("}}"):
            return None  # unrendered template placeholder
        return s


# ------------------------------------------------- post-call mapping
# Learned from the first real call (attempt bacc7079). Sarvam's post-call
# payload carries the whole captured update under final_agent_variables, with
# its own field names. That makes the webhook a viable capture path even when
# the mid-call tool never fires — which is exactly what happened on call one.
_STATUS_WORDS = {
    "completed": "completed", "complete": "completed", "done": "completed",
    "finished": "completed", "in_progress": "in_progress",
    "in progress": "in_progress", "ongoing": "in_progress",
    "started": "started", "start": "started",
    "blocked": "blocked", "stopped": "blocked",
}
# The agent reports "none" for no safety issue, not a boolean.
_NEGATIVES = {"none", "no", "nil", "na", "n/a", "false", "no issues", "nothing"}


def map_final_variables(payload: dict) -> Optional[dict]:
    """Turn a post-call payload into a task_updates row, or None if unusable."""
    fav = payload.get("final_agent_variables")
    if not isinstance(fav, dict):
        return None

    line = str(fav.get("line_reference") or fav.get("line_reference_raw") or "").strip()
    if not line:
        return None  # no line reference means nothing to attach the update to

    meta = (payload.get("webhook_config") or {}).get("metadata") or {}
    status_raw = str(fav.get("task_status") or "").strip()
    safety_raw = str(fav.get("safety_issue_reported") or "").strip()

    # "Vishal (2689)" -> name and id, without inventing either.
    worker = str(fav.get("worker_name") or "").strip()
    name, rid = worker or None, None
    m = re.match(r"^(.*?)\s*\((\d+)\)$", worker)
    if m:
        name, rid = m.group(1).strip(), m.group(2)

    row = {
        "call_id": payload.get("attempt_id"),
        "line_reference_raw": line,
        "reporter_name": name,
        "reporter_id": rid,
        "discipline": meta.get("discipline") or None,
        "task_type": fav.get("task_type") or None,
        # Normalised where we recognise the word; the spoken form is always kept.
        "task_status": _STATUS_WORDS.get(status_raw.lower()),
        "task_status_raw": status_raw or None,
        "supervisor_name": fav.get("supervisor_name") or None,
        "safety_issue_reported": bool(safety_raw) and safety_raw.lower() not in _NEGATIVES,
        "source": "on_end",
    }
    return {k: v for k, v in row.items() if v is not None}


# ---------------------------------------------------------------- routes
@app.get("/health")
async def health():
    """Hit this through the tunnel first. Proves Sarvam can reach you."""
    return {
        "ok": True,
        "supabase_configured": True,
        "bearer_configured": True,
        "webhook_secret_configured": True,
        # Identify the process. Two servers with different .env values are the
        # single most confusing failure mode here.
        "pid": os.getpid(),
        "config_fingerprint": CONFIG_FINGERPRINT,
        "debug_errors": DEBUG_ERRORS,
    }


@app.post("/voice/log_update")
async def log_update(
    body: TaskUpdateIn,
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    """
    THE MID-CALL TOOL. Sarvam calls this while the agent is talking.

    Writes the captured update, then returns a short confirmation string
    the agent reads back to the reporter. That read-back is the attestation.
    """
    check_bearer(authorization)

    # Verbatim body, so a field-name mismatch in the dashboard is diagnosable
    # from the row itself rather than from a guess.
    try:
        received = json.loads(await request.body() or b"{}")
    except json.JSONDecodeError:
        received = None

    # Drop nulls so the column defaults in the schema apply instead of NULL.
    row = {k: v for k, v in body.model_dump().items() if v is not None}
    row["source"] = "mid_call"
    row["raw_payload"] = {"received": received, "parsed": body.model_dump()}

    saved = await supabase_insert("task_updates", row)

    # Keep the spoken confirmation short — it goes straight into speech.
    spoken = f"Logged {body.line_reference_raw}"
    if body.task_status:
        spoken += f", status {body.task_status.replace('_', ' ')}"

    return {
        "status": "logged",
        "id": saved.get("id"),
        "confirmation": spoken,
    }


@app.post("/voice/webhook/{secret}")
async def webhook(secret: str, request: Request):
    """
    POST-CALL HOOK. Sarvam's webhook_config has no custom-header field,
    so the shared secret lives in the URL path instead.

    Stores the payload verbatim. The webhook schema isn't fully documented,
    so this is also how you DISCOVER the real field names: place one test
    call, then read public.call_events.
    """
    if not hmac.compare_digest(secret, WEBHOOK_PATH_SECRET):
        raise HTTPException(401, "bad webhook secret")

    raw = await request.body()
    try:
        payload = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        payload = {"_unparsed_body": raw.decode("utf-8", "replace")}

    await supabase_insert(
        "call_events",
        {
            "source": "webhook",
            "headers": redact_secrets(dict(request.headers)),
            "payload": redact_secrets(payload),
        },
    )
    # Also project it into task_updates. Wrapped, because the webhook must
    # still 200 even if the shape changes and the mapping breaks — a retried
    # or dropped webhook is a lost update.
    logged_id = None
    try:
        mapped = map_final_variables(payload)
        if mapped:
            mapped["raw_payload"] = redact_secrets(
                {"from": "post_call_webhook",
                 "final_agent_variables": payload.get("final_agent_variables"),
                 "attempt_id": payload.get("attempt_id"),
                 "interaction_id": payload.get("interaction_id")}
            )
            saved = await supabase_insert("task_updates", mapped)
            logged_id = saved.get("id")
    except Exception:
        print("\n=== post-call mapping failed ===\n" + traceback.format_exc(), flush=True)

    # Always 200 quickly — a slow or failing webhook may be retried.
    return {"received": True, "task_update_id": logged_id}


# ---------------------------------------------------------------- read-back
# Both read routes require the bearer token. They were unauthenticated, which
# meant anyone who found the tunnel URL could read the field reports.
@app.get("/updates")
async def list_updates(limit: int = 20, authorization: Optional[str] = Header(default=None)):
    """Convenience read-back so you can verify without opening Supabase."""
    check_bearer(authorization)
    rows = await supabase_select(
        "task_updates",
        {"select": "*", "order": "created_at.desc", "limit": str(limit)},
    )
    return {"count": len(rows), "rows": rows}


@app.get("/calls")
async def list_calls(limit: int = 5, authorization: Optional[str] = Header(default=None)):
    """Raw post-call webhook payloads — this is how you learn Sarvam's schema."""
    check_bearer(authorization)
    rows = await supabase_select(
        "call_events",
        {"select": "*", "order": "received_at.desc", "limit": str(limit)},
    )
    return {"count": len(rows), "rows": rows}
