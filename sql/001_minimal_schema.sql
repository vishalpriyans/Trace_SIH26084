-- ============================================================
-- TRACE / SIH26122 — minimal spike schema
-- Goal: prove the voice agent can land captured data in Supabase.
-- Run this whole file in the Supabase SQL Editor.
-- ============================================================

-- 1. What the agent captured, one row per task update -------------
create table if not exists public.task_updates (
  id                    uuid primary key default gen_random_uuid(),

  -- call linkage
  call_id               text,                 -- Sarvam attempt_id / call id
  seq                   int default 1,        -- position within the call

  -- who reported
  reporter_name         text,
  reporter_id           text,
  discipline            text,

  -- what they reported (raw, exactly as spoken)
  line_reference_raw    text,
  task_type             text,                 -- welding | spool_erection | bolting | inspection | other
  task_type_other_text  text,
  task_status           text,                 -- started | in_progress | completed | blocked
  task_status_raw       text,                 -- e.g. "almost done"
  quantity_reported     text,
  supervisor_name       text,

  -- blockers / safety
  has_blocker           boolean default false,
  blocker_description   text,
  safety_issue_reported boolean default false,
  safety_emergency      boolean default false,

  -- attestation
  readback_confirmed    boolean default false,

  -- provenance
  source                text,                 -- 'mid_call' | 'on_end'
  raw_payload           jsonb,                -- everything we received, unmodified
  created_at            timestamptz not null default now()
);

create index if not exists task_updates_call_id_idx on public.task_updates (call_id);
create index if not exists task_updates_created_at_idx on public.task_updates (created_at desc);


-- 2. Raw capture bin — for DISCOVERING Sarvam's real payload shape --
-- The webhook payload schema is not fully documented, so we store
-- whatever arrives verbatim. Inspect this table after your first
-- real call to learn the actual field names.
create table if not exists public.call_events (
  id           uuid primary key default gen_random_uuid(),
  received_at  timestamptz not null default now(),
  source       text,          -- 'webhook' | 'mid_call' | 'on_end'
  headers      jsonb,
  payload      jsonb
);


-- 3. Security -----------------------------------------------------
-- RLS ON with NO anon policies = anon key is denied by default.
-- All writes come from the backend using the service role key.
alter table public.task_updates enable row level security;
alter table public.call_events  enable row level security;

-- (deliberately no "for insert with check (true)" policies here)


-- 4. Sanity check -------------------------------------------------
-- After running, this should return two rows:
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('task_updates', 'call_events');
