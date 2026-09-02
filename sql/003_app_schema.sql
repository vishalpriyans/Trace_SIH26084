-- ============================================================
-- TRACE — schema additions the web console and field app need
-- on top of 002_spec_v2_schema.sql.
--
-- 002 implements the pipeline of spec v2 §17: registry, capture,
-- extraction, candidates, matches, audit, blockers, telemetry,
-- emergency, supervisors, calls. Everything below is what the two
-- built surfaces read or write that the pipeline tables do not
-- already cover, plus the read models each screen queries.
--
-- Run 002 first, then this file, in the Supabase SQL Editor.
-- Every statement is idempotent, so re-running is safe.
--
-- The web app does not query these tables yet. It reads typed
-- fixtures through web/lib/data.ts, and each function there names
-- the query that replaces its body. See database.md.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Accounts
--
-- Spec §22 de-scopes real authentication to a role picker, and the
-- built entry surface honours that: no credential is verified. This
-- table is what it becomes when Supabase Auth is switched on, which
-- is why the primary key is auth.users(id) rather than a fresh uuid.
-- A supervisor never appears here: they authenticate by phone and OTP
-- and live in public.supervisors, because asking a contractor's site
-- supervisor for an email and a password is the fastest way to lose
-- them.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key,           -- = auth.users(id)
  full_name    text not null,
  email        text unique,
  role         text not null,              -- planner | manager
  organisation text,                       -- OIL | EIL | thyssenkrupp | Technip | contractor
  created_at   timestamptz not null default now(),
  constraint profiles_role_vocab check (role in ('planner','manager'))
);

-- The supervisor directory in 002 is missing two columns the console
-- reads: the escalation target for a coverage gap, and the reporter
-- history that feeds s_hist.
alter table public.supervisors add column if not exists section_engineer text;
alter table public.supervisors add column if not exists correction_rate  real not null default 0;
alter table public.supervisors add column if not exists last_reported_at timestamptz;

-- ------------------------------------------------------------
-- 2. The gate, W9
--
-- Threshold AND margin, per discipline, never one alone and never
-- global. Two candidates at 0.91 and 0.89 mean the model is confident
-- that something matches and has no idea which, so the margin floor
-- is as load bearing as the threshold.
--
-- These are data, not code, precisely so they can be moved without a
-- deploy. The rule the console prints beside them: never move one
-- without the historical number in front of you. Pick the threshold
-- by target precision and report whatever auto-apply rate falls out.
-- ------------------------------------------------------------
create table if not exists public.gate_settings (
  discipline  text primary key,
  threshold   real not null,
  min_margin  real not null,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint gate_threshold_range check (threshold  between 0 and 1),
  constraint gate_margin_range    check (min_margin between 0 and 1)
);

-- Deliberately conservative starting values. Spec P-0 step 6 says to
-- run week one at effectively 1.0 so nothing auto-applies and every
-- planner correction becomes a training pair.
insert into public.gate_settings (discipline, threshold, min_margin) values
  ('piping',           0.86, 0.08),
  ('civil',            0.88, 0.08),
  ('electrical',       0.86, 0.08),
  ('instrumentation',  0.90, 0.10),
  ('static-rotating',  0.90, 0.10),
  ('hse',              0.95, 0.12)
on conflict (discipline) do nothing;

-- ------------------------------------------------------------
-- 3. Discipline synonyms, W9
--
-- Nothing in a P6 export knows that "spool up" means erect. This comes
-- from a site engineer rather than a planner, because the words differ
-- from the schedule's. It grows on its own: every correction_pairs row
-- is a candidate entry here.
-- ------------------------------------------------------------
create table if not exists public.synonyms (
  id         uuid primary key default gen_random_uuid(),
  discipline text not null,
  term       text not null,
  means      text not null,
  source     text not null default 'manual',   -- manual | correction_pair
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (discipline, term)
);

-- ------------------------------------------------------------
-- 4. Clarifications, P-4 and S-9
--
-- The only planner action allowed to interrupt a supervisor, which is
-- why it is a first class table with its own reminder clock rather
-- than a nullable column on matches. Unanswered for 12 hours gets one
-- reminder and then the planner resolves it without them.
--
-- "Not sure" is a valid answer and closes the loop honestly. A guess
-- recorded as fact is worse for the schedule than an admitted unknown.
-- ------------------------------------------------------------
create table if not exists public.clarifications (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references public.matches(id) on delete cascade,
  event_id    uuid references public.extracted_events(id) on delete cascade,
  question    text not null,
  options     text[],                  -- up to 3, for a one-tap answer
  asked_by    uuid references public.profiles(id) on delete set null,
  asked_at    timestamptz not null default now(),
  reminded_at timestamptz,
  answer      text,
  answered_at timestamptz
);
create index if not exists clarifications_open_idx
  on public.clarifications (answered_at, asked_at);

-- ------------------------------------------------------------
-- 5. Call requests, M2 and S-5
--
-- The call stays outbound in every one of the three triggers. That is
-- what lets the candidate activity set be pre-loaded before anyone
-- speaks, which is what makes matching accurate; an inbound helpline
-- would arrive with no context.
--
-- activity_ids is the pre-selected set the agent asks about, and it is
-- the retrieval envelope for that call.
-- ------------------------------------------------------------
create table if not exists public.call_requests (
  id             uuid primary key default gen_random_uuid(),
  supervisor_id  uuid references public.supervisors(id) on delete cascade,
  trigger_source text not null,        -- supervisor | manager | automated | missed_call
  requested_by   uuid references public.profiles(id) on delete set null,
  activity_ids   text[],               -- what the agent will ask about
  shift_date     date not null default current_date,
  state          text not null default 'queued',  -- queued|placed|completed|failed
  call_id        uuid references public.calls(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint call_requests_trigger_vocab check (trigger_source in
    ('supervisor','manager','automated','missed_call')),
  constraint call_requests_state_vocab check (state in
    ('queued','placed','completed','failed'))
);
create index if not exists call_requests_open_idx on public.call_requests (state, created_at);

-- ------------------------------------------------------------
-- 5b. Answers to rejections
--
-- A rejection already carries its reason, and the field surface already shows
-- it. What was missing was the reply. "Nothing is ever discarded" is promised
-- twice on that surface, and being told no with no route back is still a one
-- way door.
--
-- The reply rides voice rather than a text box, because that is the channel
-- this product is built on and this user may be neither English comfortable
-- nor free to type. Either the supervisor asks to be called back, which writes
-- a call_requests row, or they record a note on the device which is
-- transcribed server side on sync exactly like every other captured clip.
--
-- It is addressed to the Engineer in Charge, not to the planner who rejected
-- the entry. A disputed rejection wants a different pair of eyes, so this is
-- deliberately not another row in the review queue.
-- ------------------------------------------------------------
create table if not exists public.rejection_disputes (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid references public.matches(id) on delete cascade,
  raised_by      uuid references public.supervisors(id) on delete set null,
  route          text not null,        -- callback | voice_note
  reject_reason  text not null,        -- carried so both sides are visible
  media_url      text,                 -- the clip, when route = voice_note
  transcript     text,                 -- written server side on sync
  language       text,
  call_request_id uuid references public.call_requests(id) on delete set null,
  state          text not null default 'queued',   -- queued|captured|seen
  raised_at      timestamptz not null default now(),
  seen_by        uuid references public.profiles(id) on delete set null,
  seen_at        timestamptz,
  constraint disputes_route_vocab check (route in ('callback','voice_note')),
  constraint disputes_state_vocab check (state in ('queued','captured','seen')),
  -- Only the Engineer in Charge closes one. The planner who rejected the entry
  -- is not the right reviewer of their own rejection.
  constraint disputes_reason_vocab check (reject_reason in
    ('duplicate','out of scope','not a progress update','test or noise'))
);
create index if not exists disputes_open_idx on public.rejection_disputes (state, raised_at desc);

-- ------------------------------------------------------------
-- 6. The look-ahead, P-10
--
-- The highest leverage action in the product. Publishing shrinks the
-- matcher's candidate set from tens of thousands of activities to
-- roughly fifteen before any model runs, and it is what populates
-- "Expected today" on every affected phone.
--
-- Cut this and the matcher does not break, it degrades: retrieval
-- falls back to the full discipline set, confidence drops with it, and
-- more items land in the review queue.
-- ------------------------------------------------------------
create table if not exists public.look_ahead_publishes (
  id            uuid primary key default gen_random_uuid(),
  published_by  uuid references public.profiles(id) on delete set null,
  window_start  date not null,
  window_end    date not null,
  work_fronts   text[],
  baseline_ver  int not null default 1,
  activity_ids  text[] not null,
  published_at  timestamptz not null default now()
);
create index if not exists look_ahead_recent_idx on public.look_ahead_publishes (published_at desc);

-- ------------------------------------------------------------
-- 7. Rollup, spec §6.1
--
-- Nothing writes an actual date directly, anywhere, ever. The field
-- reports at spool level while the plan holds four spools in one
-- activity, so a match appends to the event log and dates are derived
-- from it. Without this rule an activity finishes three times.
--
--   actual_start  <- first matched start or progress event
--   actual_finish <- only on an explicit completion assertion, or when
--                    quantity rollup reaches the planned scope
--
-- Only rows a human or the gate has accepted are counted: an entry
-- sitting in the review queue must not move a date.
-- ------------------------------------------------------------
create or replace function public.fn_rollup_actuals(p_activity_id text)
returns void
language plpgsql
as $$
begin
  update public.activities a
  set
    actual_start = sub.first_event,
    actual_finish = sub.finish_event
  from (
    select
      min(e.event_time) filter (
        where e.event_type in ('start','progress','finish')
      ) as first_event,
      min(e.event_time) filter (
        where e.event_type = 'finish'
      ) as finish_event
    from public.matches m
    join public.extracted_events e on e.id = m.event_id
    where m.activity_id = p_activity_id
      and m.status in ('auto_applied','confirmed')
  ) sub
  where a.activity_id = p_activity_id;
end;
$$;

-- ------------------------------------------------------------
-- 8. Read models
--
-- One view per screen that needs a join. These exist so the app never
-- assembles a screen from four round trips, and so the shape the
-- console depends on is declared in one place rather than spread
-- across TypeScript.
-- ------------------------------------------------------------

-- W1. Worst first, with answered clarifications jumping to the top:
-- the supervisor already paid the interruption cost, so the planner
-- should spend it rather than let it age.
create or replace view public.v_review_queue as
select
  m.id                as match_id,
  m.confidence,
  m.top2_margin       as margin,
  m.resolved_tier,
  m.decision,
  m.status,
  m.activity_id,
  a.description       as activity_description,
  e.id                as event_id,
  e.event_type,
  e.evidence_span,
  e.event_time,
  e.quantity,
  e.quantity_unit,
  r.original_text     as raw_phrase,
  r.normalised_en     as normalised,
  r.language,
  r.channel,
  r.discipline,
  r.work_front,
  r.captured_at,
  r.received_at,
  s.full_name         as reporter,
  s.id                as reporter_id,
  g.threshold,
  g.min_margin,
  (m.confidence >= g.threshold and m.top2_margin >= g.min_margin) as passes_gate,
  c.question          as clarification_question,
  c.options           as clarification_options,
  c.answer            as clarification_answer,
  c.answered_at       as clarification_answered_at
from public.matches m
join public.extracted_events e on e.id = m.event_id
join public.raw_reports r      on r.id = e.raw_report_id
left join public.activities a  on a.activity_id = m.activity_id
                              and a.baseline_ver = coalesce(m.baseline_ver, a.baseline_ver)
left join public.supervisors s on s.id = r.reporter_id
left join public.gate_settings g on g.discipline = r.discipline
left join public.clarifications c on c.match_id = m.id
where m.status in ('needs_review','clarification');

-- W2. Coverage state is derived, never stored.
--
-- The partial case is the one that matters. The automated end-of-shift
-- call deliberately skips anyone who logged anything at all, so a
-- supervisor who accounted for two of five activities is invisible to
-- the system and visible only to a human on this board.
create or replace view public.v_coverage as
with expected as (
  select s.id as supervisor_id, count(distinct a.activity_id) as expected_today
  from public.supervisors s
  left join public.activities a
    on a.discipline = s.discipline
   and a.work_front = s.work_front
   and current_date between a.planned_start and a.planned_finish
  group by s.id
),
reported as (
  select r.reporter_id as supervisor_id, count(distinct m.activity_id) as reported_today
  from public.raw_reports r
  join public.extracted_events e on e.raw_report_id = r.id
  join public.matches m on m.event_id = e.id
  where r.captured_at::date = current_date
  group by r.reporter_id
)
select
  s.id, s.full_name, s.discipline, s.work_front, s.phone_e164,
  s.section_engineer, s.last_reported_at, s.excused_until,
  coalesce(e.expected_today, 0) as expected_today,
  coalesce(rp.reported_today, 0) as reported_today,
  case
    when s.excused_until is not null and s.excused_until >= current_date then 'excused'
    when coalesce(rp.reported_today, 0) = 0                              then 'silent'
    when coalesce(rp.reported_today, 0) < coalesce(e.expected_today, 0)  then 'partial'
    else 'reported'
  end as state
from public.supervisors s
left join expected e  on e.supervisor_id = s.id
left join reported rp on rp.supervisor_id = s.id
where s.is_active;

-- W5. Ageing is the point: a blocker open six days should look wrong
-- before anyone reads the note, so age is computed here rather than in
-- the client where a stale render would freeze it.
create or replace view public.v_blockers as
select
  b.*,
  a.description as activity_description,
  s.full_name   as raised_by_name,
  s.discipline,
  s.work_front,
  floor(extract(epoch from (now() - b.raised_at)) / 3600)::int as age_hours
from public.blockers b
left join public.activities a  on a.activity_id = b.activity_id
left join public.supervisors s on s.id = b.raised_by;

-- W10. The tier mix, which is the evidence that the language model is
-- not doing work a regex could. "Tiers 0 and 1 resolved N percent" is
-- a far stronger claim than "we used AI".
create or replace view public.v_tier_mix as
select resolved_tier, count(*) as n
from public.matches
group by resolved_tier
order by resolved_tier;

-- W10. Everything countable in one row. Anything absent from here is
-- absent because it genuinely has not been measured, and the console
-- prints "not measured" rather than a plausible zero.
create or replace view public.v_system_health as
select
  (select count(*) from public.matches where status in ('needs_review','clarification'))
    as queue_depth,
  (select count(*) from public.matches where decision = 'auto_applied')
    as auto_applied,
  (select count(*) from public.matches)
    as total_matches,
  (select count(*) from public.matches where decision = 'unmatched_new')
    as unmatched_new,
  (select count(*) from public.matches where resolved_tier <= 1)
    as resolved_deterministically,
  (select count(*) from public.v_coverage where state in ('reported','partial'))
    as fronts_reporting,
  (select count(*) from public.v_coverage where state <> 'excused')
    as fronts_active,
  (select count(*) from public.blockers where resolved_at is null)
    as open_blockers;

-- S2. Expected today, which is also the retrieval envelope. Scoped to
-- one supervisor, always: the field app never reads planner-only data.
create or replace function public.fn_expected_today(p_supervisor uuid)
returns setof public.activities
language sql
stable
as $$
  select a.*
  from public.activities a
  join public.supervisors s on s.id = p_supervisor
  where a.discipline = s.discipline
    and a.work_front = s.work_front
    and a.baseline_ver = (select max(baseline_ver) from public.activities)
    and current_date between a.planned_start - interval '2 days' and a.planned_finish
    and a.actual_finish is null
  order by a.planned_finish;
$$;

-- ------------------------------------------------------------
-- 9. Security
--
-- Same posture as 002: RLS on, no anon policies, so the anon key is
-- denied by default and every read and write goes through the Next.js
-- server using the service role key. A service key in a browser bundle
-- is a total compromise, which is why the data seam in web/lib/data.ts
-- is server-only by construction.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','gate_settings','synonyms','clarifications',
    'call_requests','look_ahead_publishes','rejection_disputes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- sos_events is append-only after the fact. An emergency record that
-- can be edited afterwards is not evidence, and after a real incident
-- this log is exactly that.
create or replace rule sos_events_no_delete as
  on delete to public.sos_events do instead nothing;

-- audit_log is append-only for the same reason, one layer down.
create or replace rule audit_log_no_update as
  on update to public.audit_log do instead nothing;
create or replace rule audit_log_no_delete as
  on delete to public.audit_log do instead nothing;
