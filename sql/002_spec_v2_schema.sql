-- ============================================================
-- TRACE / SIH26122 — product spec v2 §17 data model
-- Supersedes the two-table spike schema in 001_minimal_schema.sql,
-- which stays in place: task_updates and call_events keep receiving
-- voice traffic until the pipeline is migrated onto raw_reports.
--
-- Run this whole file in the Supabase SQL Editor.
-- ============================================================

-- ---------- stage 0: versioned activity registry ----------
create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  activity_id     text not null,       -- 'PIP-2400-ERC-015'
  baseline_ver    int  not null default 1,
  wbs_path        text,
  level           text,                -- 'L5' | 'L6'
  discipline      text not null,
  work_front      text,
  description     text not null,
  tag_tokens      text[],              -- Tier 0 index: {'24"','PG-1204'}
  planned_start   date,
  planned_finish  date,
  predecessors    text[],              -- drives s_logic
  actual_start    timestamptz,         -- derived by rollup, never written directly (§6.1)
  actual_finish   timestamptz,
  is_proposed     boolean not null default false,  -- §6.3, awaiting planner approval
  unique (activity_id, baseline_ver)
);
create index if not exists activities_disc_front_idx on public.activities (discipline, work_front);
create index if not exists activities_planned_idx    on public.activities (planned_start, planned_finish);
create index if not exists activities_tag_idx        on public.activities using gin (tag_tokens);

-- ---------- stage 1: capture, never mutated ----------
create table if not exists public.raw_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid,
  channel       text not null,         -- 'call' | 'app' | 'upload'
  discipline    text,
  work_front    text,
  language      text,
  original_text text not null,         -- the audit anchor
  normalised_en text,                  -- stage 2
  media_url     text,
  captured_at   timestamptz not null default now(),
  received_at   timestamptz not null default now()  -- differs when offline-queued
);
create index if not exists raw_reports_received_idx on public.raw_reports (received_at desc);

-- ---------- stage 3: extraction ----------
create table if not exists public.extracted_events (
  id              uuid primary key default gen_random_uuid(),
  raw_report_id   uuid references public.raw_reports(id) on delete cascade,
  event_type      text not null,       -- start|finish|progress|blocker|safety
  object_phrase   text,
  location_phrase text,
  quantity        numeric,
  quantity_unit   text,
  event_time      timestamptz,
  evidence_span   text not null,       -- verbatim substring
  status          text not null default 'captured'
);

-- ---------- stage 4: retrieval candidates ----------
create table if not exists public.match_candidates (
  event_id     uuid references public.extracted_events(id) on delete cascade,
  activity_id  text not null,
  rank         int  not null,
  s_tag        real, s_lex real, s_sem real,
  s_front      real, s_date real, s_logic real, s_hist real,
  score        real not null,
  primary key (event_id, activity_id)
);

-- ---------- stage 5 + 6: the decision ----------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references public.extracted_events(id) on delete cascade,
  activity_id   text,                  -- null when unmatched_new
  baseline_ver  int default 1,
  confidence    real not null,
  top2_margin   real not null,
  resolved_tier int not null,          -- 0|1|2|3, feeds the tier-mix metric
  decision      text not null,         -- auto_applied|needs_review|unmatched_new
  status        text not null,         -- the six statuses of §9.1
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now(),
  -- §9.1 says exactly six statuses. A seventh is a spec violation, so the
  -- database refuses one rather than letting the two surfaces drift apart.
  constraint matches_status_vocab check (status in
    ('captured','auto_applied','needs_review','clarification','confirmed','rejected')),
  constraint matches_decision_vocab check (decision in
    ('auto_applied','needs_review','unmatched_new')),
  constraint matches_tier_range check (resolved_tier between 0 and 3)
);
create index if not exists matches_status_idx     on public.matches (status);
create index if not exists matches_confidence_idx on public.matches (confidence asc);
create index if not exists matches_created_idx    on public.matches (created_at desc);

-- ---------- immutable audit trail ----------
create table if not exists public.audit_log (
  id          bigserial primary key,
  entity_type text not null,
  entity_id   uuid not null,
  action      text not null,
  actor_id    uuid,
  actor_role  text,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, at desc);

-- ---------- stage 7 → stage 4 feedback ----------
create table if not exists public.correction_pairs (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid references public.extracted_events(id) on delete set null,
  phrase         text not null,
  wrong_activity text,
  right_activity text not null,
  discipline     text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);

-- ---------- blockers: the delay-cause taxonomy ----------
create table if not exists public.blockers (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references public.extracted_events(id) on delete set null,
  activity_id     text,
  cause           text not null,       -- material|crew|equipment|permit|weather|other
  note            text,
  raised_by       uuid,
  raised_at       timestamptz not null default now(),
  resolved_by     uuid,
  resolved_at     timestamptz,
  resolution_note text,
  constraint blockers_cause_vocab check (cause in
    ('material','crew','equipment','permit','weather','other'))
);
create index if not exists blockers_open_idx on public.blockers (resolved_at, raised_at);

-- ---------- §17.2 measurement ----------
create table if not exists public.telemetry_events (
  id          bigserial primary key,
  user_id     uuid,
  role        text,                    -- supervisor|planner|manager
  surface     text,                    -- mobile|web
  action      text not null,
  duration_ms int,
  was_offline boolean default false,
  ref_id      uuid,
  at          timestamptz not null default now()
);
create index if not exists telemetry_at_idx on public.telemetry_events (at desc);

create table if not exists public.eval_labels (
  id            uuid primary key default gen_random_uuid(),
  report_text   text not null,
  discipline    text not null,
  work_front    text,
  stratum       text not null,         -- easy|medium|hard|no_match
  true_activity text,                  -- null for the no_match stratum
  labelled_by   text,
  notes         text,
  constraint eval_labels_stratum_vocab check (stratum in ('easy','medium','hard','no_match'))
);

-- ---------- §17.3 emergency ----------
create table if not exists public.sos_events (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,       -- 'incident' | 'broadcast'
  raised_by       uuid,
  raised_by_role  text not null,
  category        text,
  severity        text,
  message         text,
  work_front      text,
  discipline      text,
  lat             double precision,
  lng             double precision,
  accuracy_m      int,
  is_drill        boolean not null default false,
  channel_used    text,                -- app|sms|offline_queued
  created_at      timestamptz not null default now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  resolution_note text,
  constraint sos_kind_vocab check (kind in ('incident','broadcast'))
);

create table if not exists public.sos_recipients (
  sos_id       uuid references public.sos_events(id) on delete cascade,
  user_id      uuid not null,
  delivered_at timestamptz,
  seen_at      timestamptz,
  primary key (sos_id, user_id)
);

-- ---------- supervisor directory ----------
-- Not in §17, but P-0 step 3 names it as the gap that blocks everything:
-- "No call can be placed without them. The entire product is blocked."
create table if not exists public.supervisors (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  worker_id    text,
  phone_e164   text,
  discipline   text not null,
  work_front   text,
  shift_start  time,
  shift_end    time,
  is_active    boolean not null default true,
  excused_until date,
  created_at   timestamptz not null default now()
);

-- ---------- calls ----------
create table if not exists public.calls (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      text unique,         -- Sarvam attempt_id
  interaction_id  text,
  supervisor_id   uuid references public.supervisors(id) on delete set null,
  trigger_source  text,                -- supervisor|manager|automated
  triggered_by    uuid,
  status          text,                -- Sarvam disposition
  duration_s      real,
  transcript      jsonb,
  recording_url   text,
  placed_at       timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists calls_placed_idx on public.calls (placed_at desc);

-- ---------- security ----------
-- RLS on with no anon policies: the anon key is denied by default.
-- All reads and writes come from the Next.js server using the service key.
do $$
declare t text;
begin
  foreach t in array array[
    'activities','raw_reports','extracted_events','match_candidates','matches',
    'audit_log','correction_pairs','blockers','telemetry_events','eval_labels',
    'sos_events','sos_recipients','supervisors','calls'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- sanity check ----------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
