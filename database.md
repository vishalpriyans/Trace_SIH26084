# Database

How the TRACE schema is laid out, and exactly what to change to move the web app
off fixtures and onto it.

**Current state: the web app does not touch the database.** Every screen reads
typed fixtures through one file, [`web/lib/data.ts`](web/lib/data.ts). The schema
below is authored and ready; nothing in `web/` queries it yet. That is deliberate
and it is disclosed on screen: while `DATA_SOURCE` says `fixture`, every console
screen carrying a score renders a provenance banner saying so.

The Python voice service in [`app/main.py`](app/main.py) is a separate matter. It
already reads and writes Supabase, against the two-table spike schema in
`sql/001_minimal_schema.sql`, and it keeps working unchanged through everything
below.

---

## 1. Migration files, in order

| File | What it holds | Applied |
|---|---|---|
| `sql/001_minimal_schema.sql` | The two-table spike: `task_updates`, `call_events`. Still receiving live voice traffic. | Yes |
| `sql/002_spec_v2_schema.sql` | The pipeline of spec v2 section 17: registry, capture, extraction, candidates, matches, audit, corrections, blockers, telemetry, evaluation labels, emergency, supervisor directory, calls. | **No** |
| `sql/003_app_schema.sql` | What the two built surfaces need on top of that: accounts, gate settings, synonyms, clarifications, call requests, rejection disputes, look-ahead publishes, the rollup function, and one read model per screen. | **No** |
| `sql/004_ui_columns.sql` | Ten columns the built console renders and 002 does not carry: the verbatim spoken time phrases beside their normalised values, `time_validation`, the per row `gate_reason`, `fan_out` and `proposed_parent`, and the activity quantity rollup and on-track label. Rebuilds `v_review_queue` over them and adds `v_match_candidates`. | **No** |
| `sql/005_seed.sql` | Generated from `web/lib/fixtures/*.ts`. Without it 002 to 004 leave a correct and completely empty database, and every screen renders its empty state. | **No** |

Run 002, 003, 004 then 005 in the Supabase SQL editor. All four are idempotent,
so re-running is safe. 001 stays in place: the pipeline migrates onto
`raw_reports` later, and until it does, deleting it would stop voice capture.

`005` is a **generated file, never edited by hand**. Change a fixture and
regenerate it:

```bash
npm --prefix web run seed
```

The generator hashes each fixture key into a stable uuid, so foreign keys line
up across tables and the output is byte identical between runs. It asserts
every value against the database's own check constraint vocabularies before
writing, so a bad status fails the generator with the column named rather than
failing halfway through the SQL editor.

---

## 2. The shape of it

The pipeline is a straight line, and every capture channel converges on it. No
channel gets a private path.

```
P6 / MSP export ──► activities            (stage 0, versioned registry)

call ─┐
app  ─┼──────────► raw_reports            (stage 1, verbatim, NEVER mutated)
upload┘                 │
                        ▼
                   raw_reports.normalised_en   (stage 2, written beside the
                        │                       original, never over it)
                        ▼
                   extracted_events       (stage 3, typed events + evidence span)
                        │
                        ▼
                   match_candidates       (stage 4, top-k inside the envelope)
                        │
                        ▼
                   matches                (stage 5, confidence + margin + tier)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
      passes the gate      needs_review ──► clarifications ──► correction_pairs
              │                   │                                  │
              ▼                   ▼                                  │
      fn_rollup_actuals    (planner clears W1)                       │
              │                                                      │
              ▼                                                      ▼
      activities.actual_start / actual_finish              feeds stage 4 back
```

Four properties are load bearing, and each is enforced by the schema rather than
by convention.

**`raw_reports.original_text` is never updated.** It is the audit anchor.
Normalisation writes to a second column beside it. Everything downstream can be
checked back against the words that were actually spoken.

**Six statuses, and the database refuses a seventh.** `matches.status` carries a
check constraint listing exactly the six from spec section 9.1. The same six are
a TypeScript union in [`web/lib/status.ts`](web/lib/status.ts), so a seventh
fails to compile on one side and fails to insert on the other.

**Nothing writes an actual date directly.** `activities.actual_start` and
`actual_finish` are only ever set by `fn_rollup_actuals()`, which derives them
from accepted events. The field reports at spool level while the plan holds four
spools in one activity, so without the rollup rule an activity finishes three
times.

**Auto-apply needs two conditions.** `gate_settings` carries `threshold` and
`min_margin` per discipline, and `v_review_queue.passes_gate` requires both. Two
candidates at 0.91 and 0.89 mean the model is confident that something matches
and has no idea which.

---

## 3. Read models

One view per screen that needs a join, so the shape the console depends on is
declared once in SQL rather than reassembled in TypeScript.

| View or function | Screen | Notes |
|---|---|---|
| `v_review_queue` | W1 | Joins match, event, raw report, activity, reporter and the discipline's gate. Exposes `passes_gate` as a computed column. |
| `v_coverage` | W2 | Coverage state is derived, never stored. Returns `reported`, `partial`, `silent`, `excused`. |
| `v_blockers` | W5 | Computes `age_hours` server side so a stale render cannot freeze it. |
| `v_tier_mix` | W10 | Counts by `resolved_tier`. |
| `v_system_health` | W10 | Everything countable, in one row. |
| `fn_expected_today(supervisor)` | S2 | Scoped to one supervisor. This is also the retrieval envelope. |
| `fn_rollup_actuals(activity_id)` | pipeline | Call after any match reaches `auto_applied` or `confirmed`. |

---

## 4. Wiring it up

### Step 1. Apply the migrations

Supabase dashboard, SQL editor, run `sql/002_spec_v2_schema.sql`,
`sql/003_app_schema.sql`, `sql/004_ui_columns.sql`, then `sql/005_seed.sql`,
in that order. Each ends with a sanity-check select, so you can read the result
pane to confirm before moving to the next.

### Step 2. Environment

The repository root `.env` already carries `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` for the Python service. Next.js reads its own
`web/.env.local`, so add them there too:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Both names are deliberately **not** prefixed `NEXT_PUBLIC_`. A service role key
bypasses row level security completely, so a `NEXT_PUBLIC_` prefix would ship a
full-access credential in the browser bundle. RLS is enabled on every table with
no anonymous policies, which means the anon key cannot read anything: all access
goes through the Next.js server.

### Step 3. Install the client

```bash
npm --prefix web install @supabase/supabase-js
```

### Step 4. Create a server-only client

`web/lib/supabase.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
```

The `server-only` import is the guard that matters. If any client component ever
imports this transitively, the build fails rather than shipping the key.

### Step 5. Replace the bodies in `web/lib/data.ts`

This is the whole migration. Every screen reads through that one file, no
component imports a fixture module directly, and every function is already
`async`, so a fixture read becomes a network round trip with no call site
touched. Each function carries the query that replaces it in a comment above it.

For example:

```ts
export async function getQueue(): Promise<QueueItem[]> {
  const { data, error } = await db
    .from("v_review_queue")
    .select("*")
    .order("clarification_answered_at", { ascending: false, nullsFirst: false })
    .order("confidence", { ascending: true });
  if (error) throw error;
  return data.map(toQueueItem);   // map at this boundary, not in components
}
```

Map row shapes to the domain types from `web/lib/types.ts` inside this file. That
is the point of the seam: a column rename breaks one mapping function rather than
thirty components.

### Step 6. Flip the flag

```ts
export const DATA_SOURCE: DataSource = "supabase";
```

That removes the fixture provenance banners from every screen. **Do not flip it
before the queries are real.** The banner is the only thing telling a viewer that
the confidence scores on screen were written by hand, and silencing it early is
the one failure this build genuinely cannot afford.

---

## 5. Function to table map

| `lib/data.ts` | Reads |
|---|---|
| `getQueue`, `getQueueItem`, `getAllQueueItems` | `v_review_queue` |
| `getGateSettings` | `gate_settings` |
| `getActivities`, `getActivity` | `activities` where `baseline_ver` is current |
| `getAuditTrail` | `audit_log` where `entity_type = 'activity'` |
| `getSupervisors`, `getWorkFronts` | `supervisors` |
| `getConsoleUsers` | `profiles` |
| `getCoverage` | `v_coverage` |
| `getBlockers` | `v_blockers` |
| `getMetrics`, `getTierMix` | `v_system_health`, `v_tier_mix`, `telemetry_events` |
| `getCalls` | `calls` joined to `call_requests` |
| `getSosEvents` | `sos_events` joined to `sos_recipients` |
| `getExpectedToday` | `fn_expected_today(supervisor)` |
| `getMyUpdates` | `raw_reports` joined to `matches` for one reporter |
| `getMyQuestions` | `clarifications` where `answer is null` |
| `getDisputes` | `rejection_disputes` joined to `supervisors` |
| `getCounts` | `v_system_health` |

---

## 6. Authentication

Sign in and sign up are fully navigable and verify nothing. Spec section 22
de-scopes real authentication to a role picker, and the entry surface says so on
screen rather than implying a session exists.

Two different mechanisms replace it, because two very different people arrive:

**Planner and manager** map to Supabase Auth email and password, with
`public.profiles.id` set to `auth.users(id)`. The sign-up form already collects
name, email, password and organisation, which is exactly that row.

**Supervisors never get an email or a password.** They authenticate by phone and
OTP, and they live in `public.supervisors`. Asking a contractor's site supervisor
for an email address and a twelve character password is the fastest way to lose
the user this product depends on. Supabase phone auth covers this, with
`supervisors.phone_e164` as the join key.

The missed-call callback route needs no account at all: the system recognises the
number, hangs up, and calls back. That path removes the single largest adoption
objection and it must survive whatever authentication is added.

---

## 7. What is deliberately not here

**No P6 write-back.** Approved matches land in a staging table and a human pushes
them. This is a safety property, not a shortcut: a wrong auto-apply that reaches
the live baseline is very hard to unwind, and every write here is reversible with
the reversal logged.

**No matching engine.** `match_candidates` and the seven `s_*` signal columns are
defined and empty. Nothing populates them yet, which is why every score in the
built console is hand authored and labelled.

**No evaluation set.** `eval_labels` exists and is empty. Until roughly 200 hand
labelled pairs are in it, every threshold in `gate_settings` is a starting guess,
and the W9 screen says exactly that.

**The dispute loop is schema-complete but not wired.** `rejection_disputes` holds the
supervisor's answer to a rejection. The route is a callback or a recorded voice note, never a
typed form, because that is the channel the product is built on and this user may be neither
English comfortable nor free to type. A callback writes a `call_requests` row; a voice note is
transcribed server side on sync like every other captured clip. It is addressed to the Engineer
in Charge rather than to the planner who rejected the entry, so it is deliberately not another
row in the review queue.

**No offline support on web.** Offline is a field-surface requirement and belongs
to the Expo app this web surface stands in for.
