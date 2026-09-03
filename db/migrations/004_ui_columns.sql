-- ============================================================
-- TRACE — 004: the columns the console actually renders
--
-- 002 and 003 model the pipeline correctly and are missing ten columns the
-- built interface reads on every queue row. Without this file those parts of
-- the screen go blank the moment `DATA_SOURCE` flips to supabase, which reads
-- as a broken product rather than an unfinished schema.
--
-- Idempotent. Safe to run twice. Run after 003.
-- ============================================================

-- ---------- extracted_events: the time evidence ----------
--
-- Spec section 3.4 is explicit: a spoken time phrase is stored VERBATIM, the
-- system normalises it, and the normalised value is read back for
-- confirmation. Never a silent guess. That requires both halves on the row,
-- so `spoken_start` sits beside `actual_start` rather than replacing it.
--
-- `actual_start` and `actual_finish` here are the times this one event
-- asserts. They are not the activity's actual dates: those stay derived by
-- fn_rollup_actuals, because an activity that takes its dates straight from
-- events finishes three times.
alter table public.extracted_events
  add column if not exists spoken_start    text,
  add column if not exists spoken_finish   text,
  add column if not exists actual_start    timestamptz,
  add column if not exists actual_finish   timestamptz,
  add column if not exists time_validation text not null default 'none_given';

-- A completed activity with no start is not an error to be corrected, it is a
-- state to be carried: the row is captured, flagged, and routed to a human.
-- The vocabulary is closed so a sixth value cannot appear in one code path.
alter table public.extracted_events
  drop constraint if exists events_time_validation_vocab;
alter table public.extracted_events
  add constraint events_time_validation_vocab check (time_validation in
    ('ok','missing_start','missing_finish','implausible','none_given'));

-- ---------- matches: why the gate held it ----------
--
-- `gate_reason` is the single most useful line on the review queue and it is
-- not in the spec. A planner clearing forty rows needs to know WHY each was
-- held, not just that it was: margin guard, schedule logic, missing start,
-- below threshold. Stored rather than computed at read time, because the
-- sentence has to describe the gate as it stood when the decision was made,
-- not as the settings read today.
--
-- `fan_out` carries section 6.2, one utterance hitting several activities.
-- `proposed_parent` carries section 6.3, genuinely new work whose nearest
-- home in the WBS is a suggestion for the planner rather than a match.
alter table public.matches
  add column if not exists gate_reason     text,
  add column if not exists fan_out         text[],
  add column if not exists proposed_parent text;

-- ---------- activities: quantity rollup and the on-track label ----------
--
-- Section 6.1: an actual finish is asserted on an explicit completion, OR
-- when the quantity rollup reaches planned scope. Neither is expressible
-- without the planned and done figures, so "14 of 18 spools" cannot be shown
-- and, worse, the rollup rule cannot fire.
alter table public.activities
  add column if not exists percent_complete int  not null default 0,
  add column if not exists quantity_planned numeric,
  add column if not exists quantity_done    numeric,
  add column if not exists quantity_unit    text,
  add column if not exists schedule_label   text not null default 'on_track';

-- Written by the nightly re-labelling pass, never typed by a person. An
-- in-progress activity past its planned finish becomes at_risk with no new
-- report needed, which is the flow that makes the system proactive rather
-- than a passive log.
alter table public.activities
  drop constraint if exists activities_label_vocab;
alter table public.activities
  add constraint activities_label_vocab check (schedule_label in
    ('ahead','on_track','at_risk','behind'));

-- ---------- the review queue view, rebuilt over the new columns ----------
--
-- Dropped rather than replaced: create or replace view can only append
-- columns, and the time evidence belongs beside the event it describes.
-- Nothing else in the schema selects from this view.
drop view if exists public.v_review_queue;

create view public.v_review_queue as
select
  m.id                as match_id,
  m.confidence,
  m.top2_margin       as margin,
  m.resolved_tier,
  m.decision,
  m.status,
  m.gate_reason,
  m.fan_out,
  m.proposed_parent,
  m.activity_id,
  a.description       as activity_description,
  a.quantity_planned,
  e.id                as event_id,
  e.event_type,
  e.evidence_span,
  e.event_time,
  e.quantity,
  e.quantity_unit,
  e.spoken_start,
  e.spoken_finish,
  e.actual_start,
  e.actual_finish,
  e.time_validation,
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
  -- Threshold AND margin. Two candidates at 0.91 and 0.89 mean the model is
  -- confident something matches and has no idea which, so a score alone can
  -- never open this gate.
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

-- ---------- the candidate set, ranked, with its seven signals ----------
--
-- The queue needs the runner up and its signals to draw the margin as a
-- distance rather than a number, and W3 needs all seven to show why a
-- textually perfect match scored 0.588. One view rather than a second
-- round trip per row.
create or replace view public.v_match_candidates as
select
  mc.event_id,
  mc.activity_id,
  mc.rank,
  coalesce(a.description, mc.activity_id) as description,
  mc.score,
  mc.s_tag, mc.s_lex, mc.s_sem, mc.s_front, mc.s_date, mc.s_logic, mc.s_hist
from public.match_candidates mc
left join public.activities a on a.activity_id = mc.activity_id
order by mc.event_id, mc.rank;

-- ---------- sanity check ----------
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'v_review_queue'
order by ordinal_position;
