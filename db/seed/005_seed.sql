-- ============================================================
-- TRACE — 005: seed, GENERATED FILE. Do not edit by hand.
--
--   Regenerate:  node web/scripts/generate-seed.mjs
--   Source:      web/lib/fixtures/*.ts
--
-- Run after 004. Idempotent: every insert upserts on its primary key, so
-- re-running after changing a fixture updates the rows rather than
-- duplicating them.
--
-- WHAT THIS DATA IS. Hand authored against a synthetic WBS, per discipline,
-- and structurally grounded in OIL's own tag convention and twice daily
-- reporting cadence. The problem statement states live project data will not
-- be shared and instructs teams to work with synthetic data of similar
-- structure, so this complies with the brief rather than standing in for
-- something real.
--
-- WHAT IT IS NOT. Every confidence, margin, tier and signal value below was
-- written by a person. The matching engine does not exist, so no number here
-- is a measurement. Leave DATA_SOURCE on "fixture" in web/lib/data.ts until
-- real queries replace the fixture reads, because that flag is what keeps the
-- provenance banner on screen.
--
-- DATES ARE RELATIVE. The fixtures are authored against 2026-09-01 and every
-- date below is shifted by 1 day(s) so that "today" is 2026-09-02.
-- v_coverage and fn_expected_today are relative to current_date, so a fixed
-- seed decays into an empty board within a day. Re-run the generator to
-- re-date the demo. TRACE_SEED_ANCHOR=none emits the unshifted fixture dates.
--
-- Generated 2026-09-02 from 10 queue rows,
-- 14 activities, 8 supervisors.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- Activity registry. Stage 0.
-- ------------------------------------------------------------------
insert into public.activities
  (id, activity_id, baseline_ver, wbs_path, level, discipline, work_front, description, tag_tokens, planned_start, planned_finish, predecessors, actual_start, actual_finish, percent_complete, quantity_planned, quantity_done, quantity_unit, schedule_label, is_proposed)
values
  ('1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'PIP-2400-ERC-015', 3, 'Refinery Expansion / Unit 24 / Piping / South Rack / Erection', 'L6', 'piping', 'South Rack', 'Erect Line 24" - South Rack', array['24"','PG-1204','SR-24']::text[], '2026-08-27', '2026-09-03', array['PIP-2400-FAB-011']::text[], '2026-08-28T07:40:00+05:30', null, 78, 18, 14, 'spools', 'on_track', false),
  ('2258ebf8-e5e6-5ab6-8989-84ad007f39ea', 'PIP-2400-WLD-015', 3, 'Refinery Expansion / Unit 24 / Piping / South Rack / Welding', 'L6', 'piping', 'South Rack', 'Weld joints Line 24" - South Rack', array['24"','PG-1204','J-03']::text[], '2026-09-04', '2026-09-10', array['PIP-2400-ERC-015']::text[], null, null, 0, 42, 0, 'joints', 'on_track', false),
  ('9ad86712-13a6-5558-8bf2-297d2dbdda68', 'PIP-2400-FAB-011', 3, 'Refinery Expansion / Unit 24 / Piping / Fab Yard / Fabrication', 'L6', 'piping', 'Fab Yard', 'Fabricate spools Line 24"', array['24"','PG-1204']::text[], '2026-08-13', '2026-08-26', '{}', '2026-08-13T08:05:00+05:30', '2026-08-25T16:20:00+05:30', 100, 18, 18, 'spools', 'ahead', false),
  ('cac075f1-edd6-5406-b707-e336df126e93', 'PIP-2600-HYD-004', 3, 'Refinery Expansion / Unit 26 / Piping / Condensate / Testing', 'L6', 'piping', 'North Rack', 'Hydro test condensate line A', array['CD-A','PG-2610']::text[], '2026-08-31', '2026-09-02', array['PIP-2600-NDT-004']::text[], '2026-09-01T09:10:00+05:30', null, 60, null, null, null, 'at_risk', false),
  ('fdf25e3f-36cc-5a09-a47c-2eda28c24871', 'PIP-2600-HYD-005', 3, 'Refinery Expansion / Unit 26 / Piping / Condensate / Testing', 'L6', 'piping', 'North Rack', 'Hydro test condensate line B', array['CD-B','PG-2611']::text[], '2026-08-31', '2026-09-02', array['PIP-2600-NDT-005']::text[], '2026-09-01T09:10:00+05:30', null, 60, null, null, null, 'at_risk', false),
  ('832a6e44-5241-5769-a6e8-c59a19cb9b4a', 'PIP-2600-NDT-004', 3, 'Refinery Expansion / Unit 26 / Piping / Condensate / Testing', 'L6', 'piping', 'North Rack', 'NDT radiography condensate line A', array['CD-A']::text[], '2026-08-28', '2026-08-30', '{}', '2026-08-28T08:00:00+05:30', '2026-08-30T15:45:00+05:30', 100, null, null, null, 'on_track', false),
  ('a02ae9d2-6737-5365-96ef-1cae7f8ad799', 'INS-3100-LPC-022', 3, 'Refinery Expansion / Unit 31 / Instrumentation / CDU / Loop check', 'L6', 'instrumentation', 'CDU Unit', 'Loop check PT-3104', array['PT-3104']::text[], '2026-09-01', '2026-09-02', array['INS-3100-CAL-022']::text[], null, null, 0, null, null, null, 'at_risk', false),
  ('5fc062f9-b1a8-5cd5-81d3-070884496fdd', 'ELE-4200-CAB-108', 3, 'Refinery Expansion / Unit 42 / Electrical / Substation 4 / Cabling', 'L6', 'electrical', 'Substation 4', 'Pull LT power cable feeder 7 to Substation 4', array['F-07','LT-4207']::text[], '2026-08-30', '2026-09-05', array['ELE-4200-TRY-108']::text[], '2026-08-31T07:55:00+05:30', null, 45, 800, 340, 'm', 'on_track', false),
  ('e1afc867-aeca-50f3-b14d-14614ca77030', 'ELE-4200-CAB-109', 3, 'Refinery Expansion / Unit 42 / Electrical / Substation 4 / Cabling', 'L6', 'electrical', 'Substation 4', 'Pull control cable feeder 7 to Substation 4', array['F-07','CT-4207']::text[], '2026-09-02', '2026-09-07', array['ELE-4200-CAB-108']::text[], null, null, 0, null, null, null, 'on_track', false),
  ('2b0da158-400f-5160-b485-3a329fd962a8', 'CIV-1800-FDN-031', 3, 'Refinery Expansion / Unit 18 / Civil / Tank Farm 2 / Foundations', 'L6', 'civil', 'Tank Farm 2', 'Pour foundation pedestal P-14, Tank Farm 2', array['P-14','TF2']::text[], '2026-08-29', '2026-09-01', array['CIV-1800-RBR-031']::text[], '2026-08-29T06:50:00+05:30', null, 85, 46, 39, 'cum', 'behind', false),
  ('6cb955be-d33e-54ff-8acb-aa86e6fe9d0e', 'CIV-1800-RBR-031', 3, 'Refinery Expansion / Unit 18 / Civil / Tank Farm 2 / Foundations', 'L6', 'civil', 'Tank Farm 2', 'Reinforcement pedestal P-14, Tank Farm 2', array['P-14','TF2']::text[], '2026-08-25', '2026-08-28', '{}', '2026-08-25T07:15:00+05:30', '2026-08-28T17:30:00+05:30', 100, null, null, null, 'on_track', false),
  ('ac9f257b-99fa-5895-b8f9-b6051c829a7b', 'SR-2900-ALG-006', 3, 'Refinery Expansion / Unit 29 / Static and rotating / Compressor House / Alignment', 'L6', 'static-rotating', 'Compressor House', 'Align compressor K-2901 to driver', array['K-2901']::text[], '2026-09-01', '2026-09-04', array['SR-2900-SET-006']::text[], '2026-09-02T08:20:00+05:30', null, 20, null, null, null, 'on_track', false),
  ('5d72ec87-b2e8-5fce-83e0-cf8e593c4f76', 'SR-2900-SET-006', 3, 'Refinery Expansion / Unit 29 / Static and rotating / Compressor House / Setting', 'L6', 'static-rotating', 'Compressor House', 'Set compressor K-2901 on baseplate', array['K-2901']::text[], '2026-08-28', '2026-08-31', '{}', '2026-08-28T07:10:00+05:30', '2026-08-31T16:05:00+05:30', 100, null, null, null, 'on_track', false),
  ('c811b844-4733-5be4-b2c2-2ff01002f12d', 'PIP-2400-SUP-021', 3, null, 'L6', 'piping', 'South Rack', 'Fit pipe supports grid 10 to 14', '{}', null, '2026-09-04', '{}', '2026-09-03T08:10:00+05:30', null, 40, null, null, null, 'on_track', false)
on conflict (activity_id, baseline_ver) do update set
    id = excluded.id,
    wbs_path = excluded.wbs_path,
    level = excluded.level,
    discipline = excluded.discipline,
    work_front = excluded.work_front,
    description = excluded.description,
    tag_tokens = excluded.tag_tokens,
    planned_start = excluded.planned_start,
    planned_finish = excluded.planned_finish,
    predecessors = excluded.predecessors,
    actual_start = excluded.actual_start,
    actual_finish = excluded.actual_finish,
    percent_complete = excluded.percent_complete,
    quantity_planned = excluded.quantity_planned,
    quantity_done = excluded.quantity_done,
    quantity_unit = excluded.quantity_unit,
    schedule_label = excluded.schedule_label,
    is_proposed = excluded.is_proposed;

-- ------------------------------------------------------------------
-- Supervisor directory. Without phone numbers no call can be placed.
-- ------------------------------------------------------------------
insert into public.supervisors
  (id, full_name, worker_id, phone_e164, discipline, work_front, shift_start, shift_end, is_active, excused_until, section_engineer, correction_rate, last_reported_at)
values
  ('a8203728-aa76-504e-82a5-c6f1931b8108', 'Ramesh Bora', 'sup-ramesh', '+919855000114', 'piping', 'South Rack', '07:00', '15:00', true, null, 'A. Choudhury', 0.06, '2026-09-02T16:12:00+05:30'),
  ('dd70e15b-0385-5cc5-998c-4fa9504ce46e', 'Nilim Hazarika', 'sup-nilim', '+919855000127', 'piping', 'North Rack', '07:00', '15:00', true, null, 'A. Choudhury', 0.04, '2026-09-02T15:48:00+05:30'),
  ('b547c01d-71cf-5061-ad5c-7dd2b5501e68', 'Jyotishman Das', 'sup-jyoti', '+919855000133', 'instrumentation', 'CDU Unit', '07:00', '15:00', true, null, 'S. Barman', 0.11, '2026-09-02T14:05:00+05:30'),
  ('ddd17d1b-29e2-5483-b6db-1b3a5e0255f2', 'Pranab Saikia', 'sup-pranab', '+919855000148', 'electrical', 'Substation 4', '07:00', '15:00', true, null, 'S. Barman', 0.09, '2026-09-02T13:30:00+05:30'),
  ('892f7ab4-69e5-5296-b7b0-8f5550dab14b', 'Hiren Kalita', 'sup-hiren', '+919855000152', 'civil', 'Tank Farm 2', '07:00', '15:00', true, null, 'R. Deka', 0.14, null),
  ('464f7063-5b9c-5ad4-974c-019e1da9b79b', 'Bhaskar Rabha', 'sup-bhaskar', '+919855000169', 'static-rotating', 'Compressor House', '07:00', '15:00', true, null, 'R. Deka', 0.08, null),
  ('6ea3e2a9-4016-510f-ad80-21e2b76cc576', 'Mridul Pegu', 'sup-mridul', '+919855000171', 'hse', 'All fronts', '07:00', '15:00', true, null, 'R. Deka', 0.02, '2026-09-02T11:20:00+05:30'),
  ('3a9ee839-778f-5a06-9fee-368f09e6759f', 'Dhruba Gogoi', 'sup-dhruba', '+919855000185', 'civil', 'Tank Farm 2', '07:00', '15:00', true, '2026-09-04', 'R. Deka', 0.07, null)
on conflict (id) do update set
    full_name = excluded.full_name,
    worker_id = excluded.worker_id,
    phone_e164 = excluded.phone_e164,
    discipline = excluded.discipline,
    work_front = excluded.work_front,
    shift_start = excluded.shift_start,
    shift_end = excluded.shift_end,
    is_active = excluded.is_active,
    excused_until = excluded.excused_until,
    section_engineer = excluded.section_engineer,
    correction_rate = excluded.correction_rate,
    last_reported_at = excluded.last_reported_at;

-- ------------------------------------------------------------------
-- Console seats. profiles.id is auth.users(id) once Supabase Auth is on.
-- ------------------------------------------------------------------
insert into public.profiles
  (id, full_name, email, role, organisation)
values
  ('3b47b0f8-c089-5048-b0dd-8ab7c47e9cd5', 'Anjali Sharma', 'anjali.sharma@example.co.in', 'planner', 'OIL'),
  ('cfaa863f-1f55-5f8f-be81-953ecb0c12b1', 'Ravi Kumar', 'ravi.kumar@example.co.in', 'manager', 'OIL')
on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    organisation = excluded.organisation;

-- ------------------------------------------------------------------
-- Per discipline gate settings. Threshold AND margin, never one alone.
-- ------------------------------------------------------------------
insert into public.gate_settings
  (discipline, threshold, min_margin)
values
  ('piping', 0.86, 0.08),
  ('civil', 0.88, 0.08),
  ('electrical', 0.86, 0.08),
  ('instrumentation', 0.9, 0.1),
  ('static-rotating', 0.9, 0.1),
  ('hse', 0.95, 0.12)
on conflict (discipline) do update set
    threshold = excluded.threshold,
    min_margin = excluded.min_margin;

-- ------------------------------------------------------------------
-- Stage 1. Verbatim capture, never mutated. The audit anchor.
-- ------------------------------------------------------------------
insert into public.raw_reports
  (id, reporter_id, channel, discipline, work_front, language, original_text, normalised_en, media_url, captured_at, received_at)
values
  ('45be9371-4ab6-593b-9bbb-83ded59fc383', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'call', 'piping', 'South Rack', 'Assamese and English', 'South rack or north rack ase? Ami kali 24 inch line tu ercect korisilo, aji finish hol.', 'Which rack is it, south or north? We were erecting the 24 inch line yesterday, today it finished.', null, '2026-09-02T16:12:00+05:30', '2026-09-02T16:12:04+05:30'),
  ('8249442c-d43f-56f4-886f-c610aca02f4e', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'call', 'piping', 'South Rack', 'English', 'Two joints welded on the 24 inch line at south rack this morning.', null, null, '2026-09-02T11:48:00+05:30', '2026-09-02T11:48:03+05:30'),
  ('da6d02f3-ffbe-5b97-9f3b-0592753352d4', 'dd70e15b-0385-5cc5-998c-4fa9504ce46e', 'app', 'piping', 'North Rack', 'English', 'Hydro test finished on the condensate line, pressure held for two hours.', null, null, '2026-09-02T15:48:00+05:30', '2026-09-02T15:48:01+05:30'),
  ('e4a43c89-4033-5deb-938a-a5330c7a44be', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'call', 'piping', 'South Rack', 'English', 'Removed the old pipe support at grid 10 before we could start erection there.', null, null, '2026-09-02T10:05:00+05:30', '2026-09-02T10:05:02+05:30'),
  ('89557ab6-af23-5fdb-8680-b45c4ec4ae59', 'dd70e15b-0385-5cc5-998c-4fa9504ce46e', 'call', 'piping', 'North Rack', 'English', 'Hydro tested both condensate lines today, both passed.', null, null, '2026-09-02T16:02:00+05:30', '2026-09-02T16:02:05+05:30'),
  ('316c9ea3-73f1-51cd-b336-fa2353e614ee', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'app', 'piping', 'South Rack', 'English', 'Eight more spools up on the south rack line today.', null, null, '2026-09-02T17:20:00+05:30', '2026-09-02T17:20:01+05:30'),
  ('c5732ea0-02ca-58dc-b763-d32ab4556b09', 'b547c01d-71cf-5061-ad5c-7dd2b5501e68', 'call', 'instrumentation', 'CDU Unit', 'English', 'PT-3104 loop check completed, all points responding.', null, null, '2026-09-02T14:05:00+05:30', '2026-09-02T14:05:02+05:30'),
  ('4d11f9b2-49cb-588a-a0e2-bcc486afe1fb', 'ddd17d1b-29e2-5483-b6db-1b3a5e0255f2', 'call', 'electrical', 'Substation 4', 'Assamese and English', 'Feeder seven cable pulling cholise, aji prai teen sho meter hoise, kali baki khini hobo.', 'Feeder seven cable pulling is ongoing, about three hundred metres today, the rest will happen tomorrow.', null, '2026-09-02T13:30:00+05:30', '2026-09-02T13:30:04+05:30'),
  ('6bbe7e2f-010a-5061-9517-7ae583072fe9', '892f7ab4-69e5-5296-b7b0-8f5550dab14b', 'upload', 'civil', 'Tank Farm 2', 'English', 'Pedestal P-14 pour completed at Tank Farm 2, forty six cubic metres placed.', null, null, '2026-09-01T18:00:00+05:30', '2026-09-02T07:15:00+05:30'),
  ('d6160e35-dc93-5df8-a122-aa9ee1082a16', '464f7063-5b9c-5ad4-974c-019e1da9b79b', 'app', 'static-rotating', 'Compressor House', 'English', 'Started on the K-2901 alignment.', null, null, '2026-09-02T09:02:00+05:30', '2026-09-02T09:02:01+05:30'),
  ('55e8008e-027b-5195-beca-cc4312f5e7c9', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'app', 'piping', 'South Rack', 'English', 'Blocked. Waiting on material.', null, null, '2026-09-02T09:20:00+05:30', '2026-09-02T09:20:00+05:30'),
  ('8f6dd9bd-4502-583f-a896-c41d2c6677b1', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'app', 'piping', 'South Rack', 'English', 'Started 08:10.', null, null, '2026-09-03T08:11:00+05:30', '2026-09-03T08:11:00+05:30'),
  ('23c0080d-3773-5547-85e8-be81553731ee', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'app', 'piping', 'South Rack', 'English', 'Test pump reading noted.', null, null, '2026-08-31T17:40:00+05:30', '2026-08-31T17:40:00+05:30'),
  ('4e771f4b-efdf-528b-99e1-b0b53c907f44', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'app', 'piping', 'South Rack', 'English', 'Recorded offline at the work front.', null, null, '2026-09-03T07:55:00+05:30', '2026-09-03T07:55:00+05:30')
on conflict (id) do update set
    reporter_id = excluded.reporter_id,
    channel = excluded.channel,
    discipline = excluded.discipline,
    work_front = excluded.work_front,
    language = excluded.language,
    original_text = excluded.original_text,
    normalised_en = excluded.normalised_en,
    media_url = excluded.media_url,
    captured_at = excluded.captured_at,
    received_at = excluded.received_at;

-- ------------------------------------------------------------------
-- Stage 3. Extraction, with the time evidence 004 added.
-- ------------------------------------------------------------------
insert into public.extracted_events
  (id, raw_report_id, event_type, object_phrase, location_phrase, quantity, quantity_unit, event_time, evidence_span, status, spoken_start, spoken_finish, actual_start, actual_finish, time_validation)
values
  ('a97652c3-26ad-536f-9f58-646995aceaab', '45be9371-4ab6-593b-9bbb-83ded59fc383', 'finish', null, 'South Rack', null, null, '2026-09-02T14:30:00+05:30', '24 inch line tu ercect korisilo, aji finish hol', 'clarification', 'kali morning', 'aji, lunch or pichot', '2026-09-01T07:30:00+05:30', '2026-09-02T14:30:00+05:30', 'ok'),
  ('b02a73a9-4ae5-50ba-b258-68c893f7d077', '8249442c-d43f-56f4-886f-c610aca02f4e', 'progress', null, 'South Rack', 2, 'joints', '2026-09-02T08:00:00+05:30', 'Two joints welded on the 24 inch line', 'needs_review', 'this morning', null, '2026-09-02T08:00:00+05:30', null, 'ok'),
  ('78c025e5-aa1f-5dc8-8f4b-024a6e3dfb04', 'da6d02f3-ffbe-5b97-9f3b-0592753352d4', 'finish', null, 'North Rack', null, null, '2026-09-02T15:40:00+05:30', 'Hydro test finished on the condensate line', 'needs_review', '09:10', '15:40', '2026-09-02T09:10:00+05:30', '2026-09-02T15:40:00+05:30', 'ok'),
  ('e64e0850-52eb-5baf-a911-2a847f9ac82f', 'e4a43c89-4033-5deb-938a-a5330c7a44be', 'finish', null, 'South Rack', null, null, '2026-09-02T09:45:00+05:30', 'Removed the old pipe support at grid 10', 'needs_review', '07:30', '09:45', '2026-09-02T07:30:00+05:30', '2026-09-02T09:45:00+05:30', 'ok'),
  ('6a2655f6-ff0a-5359-8c0e-0728667961cb', '89557ab6-af23-5fdb-8680-b45c4ec4ae59', 'finish', null, 'North Rack', null, null, '2026-09-02T15:40:00+05:30', 'Hydro tested both condensate lines today', 'needs_review', '09:10', '15:40', '2026-09-02T09:10:00+05:30', '2026-09-02T15:40:00+05:30', 'ok'),
  ('86141214-498d-53e2-b315-b8cf9d563b88', '316c9ea3-73f1-51cd-b336-fa2353e614ee', 'progress', null, 'South Rack', 8, 'spools', '2026-09-02T17:05:00+05:30', 'Eight more spools up on the south rack line', 'needs_review', '07:40', '17:05', '2026-09-02T07:40:00+05:30', '2026-09-02T17:05:00+05:30', 'ok'),
  ('806113ee-26ed-5fb1-85e8-2c443444dfe7', 'c5732ea0-02ca-58dc-b763-d32ab4556b09', 'finish', null, 'CDU Unit', null, null, '2026-09-02T13:50:00+05:30', 'PT-3104 loop check completed', 'needs_review', null, '13:50', null, '2026-09-02T13:50:00+05:30', 'missing_start'),
  ('6d51683d-5166-5c14-aad4-1dc33559d00a', '4d11f9b2-49cb-588a-a0e2-bcc486afe1fb', 'progress', null, 'Substation 4', 300, 'm', '2026-08-31T07:55:00+05:30', 'aji prai teen sho meter hoise', 'needs_review', 'beleg din pora', null, '2026-08-31T07:55:00+05:30', null, 'ok'),
  ('b12bdd16-f69a-535f-b24b-38b539416028', '6bbe7e2f-010a-5061-9517-7ae583072fe9', 'finish', null, 'Tank Farm 2', 46, 'cum', '2026-09-01T17:35:00+05:30', 'Pedestal P-14 pour completed', 'auto_applied', '06:50', '17:35', '2026-09-01T06:50:00+05:30', '2026-09-01T17:35:00+05:30', 'ok'),
  ('eed58498-c632-5ec0-95e8-c78c358260b4', 'd6160e35-dc93-5df8-a122-aa9ee1082a16', 'start', null, 'Compressor House', null, null, null, 'Started on the K-2901 alignment', 'needs_review', null, null, null, null, 'none_given'),
  ('b7cd7a9e-dc20-5d2c-83b1-8a21db6ec0aa', '55e8008e-027b-5195-beca-cc4312f5e7c9', 'blocker', null, 'South Rack', null, null, null, 'Blocked. Waiting on material.', 'confirmed', null, null, null, null, 'none_given'),
  ('71351494-f789-5597-a2c5-02cf3a8bf7d5', '8f6dd9bd-4502-583f-a896-c41d2c6677b1', 'start', null, 'South Rack', null, null, '2026-09-03T08:10:00+05:30', 'Started 08:10.', 'auto_applied', null, null, '2026-09-03T08:10:00+05:30', null, 'ok'),
  ('2b5a71f2-774d-5784-8fb3-73c531f2031b', '23c0080d-3773-5547-85e8-be81553731ee', 'progress', null, 'South Rack', null, null, null, 'Test pump reading noted.', 'rejected', null, null, null, null, 'none_given'),
  ('03a48265-b3ef-5afd-99da-73e6ecf64bc2', '4e771f4b-efdf-528b-99e1-b0b53c907f44', 'progress', null, 'South Rack', null, null, null, 'Recorded offline at the work front.', 'captured', null, null, null, null, 'none_given')
on conflict (id) do update set
    raw_report_id = excluded.raw_report_id,
    event_type = excluded.event_type,
    object_phrase = excluded.object_phrase,
    location_phrase = excluded.location_phrase,
    quantity = excluded.quantity,
    quantity_unit = excluded.quantity_unit,
    event_time = excluded.event_time,
    evidence_span = excluded.evidence_span,
    status = excluded.status,
    spoken_start = excluded.spoken_start,
    spoken_finish = excluded.spoken_finish,
    actual_start = excluded.actual_start,
    actual_finish = excluded.actual_finish,
    time_validation = excluded.time_validation;

-- ------------------------------------------------------------------
-- Stage 4. Every candidate the retrieval stage returned, all seven signals.
-- ------------------------------------------------------------------
insert into public.match_candidates
  (event_id, activity_id, rank, s_tag, s_lex, s_sem, s_front, s_date, s_logic, s_hist, score)
values
  ('a97652c3-26ad-536f-9f58-646995aceaab', 'PIP-2400-ERC-015', 1, 0.96, 0.71, 0.88, 1, 0.92, 1, 0.94, 0.874),
  ('a97652c3-26ad-536f-9f58-646995aceaab', 'PIP-2400-WLD-015', 2, 0.96, 0.44, 0.52, 1, 0.3, 0.08, 0.94, 0.583),
  ('b02a73a9-4ae5-50ba-b258-68c893f7d077', 'PIP-2400-WLD-015', 1, 0.94, 0.88, 0.91, 1, 0.44, 0.08, 0.94, 0.588),
  ('b02a73a9-4ae5-50ba-b258-68c893f7d077', 'PIP-2400-ERC-015', 2, 0.94, 0.36, 0.41, 1, 0.95, 1, 0.94, 0.484),
  ('78c025e5-aa1f-5dc8-8f4b-024a6e3dfb04', 'PIP-2600-HYD-004', 1, null, 0.9, 0.93, 1, 0.97, 1, 0.96, 0.912),
  ('78c025e5-aa1f-5dc8-8f4b-024a6e3dfb04', 'PIP-2600-HYD-005', 2, null, 0.88, 0.91, 1, 0.97, 1, 0.96, 0.893),
  ('e64e0850-52eb-5baf-a911-2a847f9ac82f', 'PIP-2400-ERC-015', 1, null, 0.21, 0.34, 1, 0.9, 1, 0.94, 0.312),
  ('e64e0850-52eb-5baf-a911-2a847f9ac82f', 'PIP-2400-FAB-011', 2, null, 0.18, 0.29, 0.4, 0.2, 1, 0.94, 0.271),
  ('6a2655f6-ff0a-5359-8c0e-0728667961cb', 'PIP-2600-HYD-004', 1, null, 0.89, 0.92, 1, 0.97, 1, 0.96, 0.905),
  ('6a2655f6-ff0a-5359-8c0e-0728667961cb', 'PIP-2600-HYD-005', 2, null, 0.89, 0.92, 1, 0.97, 1, 0.96, 0.901),
  ('86141214-498d-53e2-b315-b8cf9d563b88', 'PIP-2400-ERC-015', 1, 0.88, 0.94, 0.95, 1, 0.96, 1, 0.94, 0.941),
  ('86141214-498d-53e2-b315-b8cf9d563b88', 'PIP-2400-FAB-011', 2, 0.88, 0.62, 0.58, 0.4, 0.1, 1, 0.94, 0.569),
  ('806113ee-26ed-5fb1-85e8-2c443444dfe7', 'INS-3100-LPC-022', 1, 1, 0.96, 0.94, 1, 0.98, 1, 0.89, 0.968),
  ('806113ee-26ed-5fb1-85e8-2c443444dfe7', 'ELE-4200-CAB-108', 2, null, 0.14, 0.19, 0, 0.7, 1, 0.89, 0.227),
  ('6d51683d-5166-5c14-aad4-1dc33559d00a', 'ELE-4200-CAB-108', 1, 0.72, 0.58, 0.79, 1, 0.91, 1, 0.91, 0.706),
  ('6d51683d-5166-5c14-aad4-1dc33559d00a', 'ELE-4200-CAB-109', 2, 0.72, 0.55, 0.71, 1, 0.42, 0.15, 0.91, 0.618),
  ('b12bdd16-f69a-535f-b24b-38b539416028', 'CIV-1800-FDN-031', 1, 1, 0.95, 0.93, 1, 0.94, 1, 0.86, 0.958),
  ('b12bdd16-f69a-535f-b24b-38b539416028', 'CIV-1800-RBR-031', 2, 1, 0.31, 0.28, 1, 0.1, 1, 0.86, 0.346),
  ('eed58498-c632-5ec0-95e8-c78c358260b4', 'SR-2900-ALG-006', 1, 1, 0.92, 0.9, 1, 0.96, 1, 0.9, 0.934),
  ('eed58498-c632-5ec0-95e8-c78c358260b4', 'SR-2900-SET-006', 2, 1, 0.24, 0.22, 1, 0.2, 1, 0.9, 0.246),
  ('b7cd7a9e-dc20-5d2c-83b1-8a21db6ec0aa', 'PIP-2400-WLD-015', 1, null, 0.9, 0.9, 1, 0.9, 1, 0.94, 0.9),
  ('71351494-f789-5597-a2c5-02cf3a8bf7d5', 'PIP-2400-SUP-021', 1, null, 0.9, 0.9, 1, 0.9, 1, 0.94, 0.9),
  ('2b5a71f2-774d-5784-8fb3-73c531f2031b', 'PIP-2600-HYD-004', 1, null, 0.9, 0.9, 1, 0.9, 1, 0.94, 0.9),
  ('03a48265-b3ef-5afd-99da-73e6ecf64bc2', 'PIP-2400-SUP-021', 1, null, 0.9, 0.9, 1, 0.9, 1, 0.94, 0.9)
on conflict (event_id, activity_id) do update set
    rank = excluded.rank,
    s_tag = excluded.s_tag,
    s_lex = excluded.s_lex,
    s_sem = excluded.s_sem,
    s_front = excluded.s_front,
    s_date = excluded.s_date,
    s_logic = excluded.s_logic,
    s_hist = excluded.s_hist,
    score = excluded.score;

-- ------------------------------------------------------------------
-- Stage 5 and 6. The decision, and why the gate held it.
-- ------------------------------------------------------------------
insert into public.matches
  (id, event_id, activity_id, baseline_ver, confidence, top2_margin, resolved_tier, decision, status, reviewed_by, reviewed_at, reject_reason, created_at, gate_reason, fan_out, proposed_parent)
values
  ('87690272-8028-55c8-a469-7c5a70055d63', 'a97652c3-26ad-536f-9f58-646995aceaab', 'PIP-2400-ERC-015', 3, 0.874, 0.291, 2, 'needs_review', 'clarification', null, null, null, '2026-09-02T16:12:00+05:30', null, null, null),
  ('27dc75c5-ba08-5831-9787-43ae1f4a7ec8', 'b02a73a9-4ae5-50ba-b258-68c893f7d077', 'PIP-2400-WLD-015', 3, 0.588, 0.104, 2, 'needs_review', 'needs_review', null, null, null, '2026-09-02T11:48:00+05:30', 'Held by schedule logic. The text matches welding almost perfectly, but the erection predecessor PIP-2400-ERC-015 is 78 percent complete, so these joints cannot exist yet on the activity the text points at.', null, null),
  ('914a60b6-3d07-53c1-b52c-e621a02f2d55', '78c025e5-aa1f-5dc8-8f4b-024a6e3dfb04', 'PIP-2600-HYD-004', 3, 0.912, 0.019, 2, 'needs_review', 'needs_review', null, null, null, '2026-09-02T15:48:00+05:30', 'Held by the margin guard. Confidence 0.912 clears the 0.86 threshold, but the second candidate sits at 0.893, a margin of 0.019 against a floor of 0.08. The supervisor said the condensate line and there are two of them.', null, null),
  ('d1c11dd0-c385-5792-9a72-79278a9fb34c', 'e64e0850-52eb-5baf-a911-2a847f9ac82f', null, 3, 0.312, 0.041, 3, 'unmatched_new', 'needs_review', null, null, null, '2026-09-02T10:05:00+05:30', 'No candidate cleared the floor. Demolition of an existing support is not in the WBS at any level, so this is real work with no home. Flag, do not drop.', null, 'PIP-2400-ERC-015'),
  ('29710d16-2e68-57bd-92ab-fc95fd6f1e27', '6a2655f6-ff0a-5359-8c0e-0728667961cb', 'PIP-2600-HYD-004', 3, 0.905, 0.004, 2, 'needs_review', 'needs_review', null, null, null, '2026-09-02T16:02:00+05:30', 'One utterance, two activities. The word "both" is the evidence, and picking one silently is the same class of error as dropping the row. Split it or send it back.', array['PIP-2600-HYD-004','PIP-2600-HYD-005']::text[], null),
  ('42a60d02-2f04-5b33-af8f-9abc7bb2b8eb', '86141214-498d-53e2-b315-b8cf9d563b88', 'PIP-2400-ERC-015', 3, 0.941, 0.372, 1, 'needs_review', 'needs_review', null, null, null, '2026-09-02T17:20:00+05:30', 'Match is not in doubt. Quantity rollup is: 14 of 18 spools against planned scope, so this appends a progress event and does not assert a finish. An activity that finishes three times is what this rule prevents.', null, null),
  ('8d7f8226-d1b7-514c-9922-f4c2aa451a0e', '806113ee-26ed-5fb1-85e8-2c443444dfe7', 'INS-3100-LPC-022', 3, 0.968, 0.741, 0, 'needs_review', 'needs_review', null, null, null, '2026-09-02T14:05:00+05:30', 'Match is certain at Tier 0 on an exact tag. Held only because a finish was reported with no start on record, and a duration needs both ends. The system does not invent the missing one.', null, null),
  ('53a03b43-35d0-5e27-aa64-0431b9a66f6f', '6d51683d-5166-5c14-aad4-1dc33559d00a', 'ELE-4200-CAB-108', 3, 0.706, 0.088, 3, 'needs_review', 'needs_review', null, null, null, '2026-09-02T13:30:00+05:30', 'Below the 0.86 threshold for electrical. Feeder 7 has a power cable and a control cable, and the report says neither. The quantity "about three hundred metres" is an inference from an approximation and is worth confirming.', null, null),
  ('0dd7d609-7532-5096-bbb9-b9c70ff2e720', 'b12bdd16-f69a-535f-b24b-38b539416028', 'CIV-1800-FDN-031', 3, 0.958, 0.612, 0, 'auto_applied', 'auto_applied', null, null, null, '2026-09-01T18:00:00+05:30', null, null, null),
  ('8f618eb2-4659-5a69-829b-ab5463437382', 'eed58498-c632-5ec0-95e8-c78c358260b4', 'SR-2900-ALG-006', 3, 0.934, 0.688, 0, 'needs_review', 'needs_review', null, null, null, '2026-09-02T09:02:00+05:30', 'No time was given at all and the app entry did not force one. Confidence and margin both clear, and it still cannot auto apply: a start with no timestamp is not an actual start.', null, null),
  ('6c979107-5d26-57b2-990f-33b1c89281f6', 'b7cd7a9e-dc20-5d2c-83b1-8a21db6ec0aa', 'PIP-2400-WLD-015', 3, 0.9, 0.3, 1, 'needs_review', 'confirmed', null, null, null, '2026-09-02T09:20:00+05:30', null, null, null),
  ('f41b096a-8aa8-5758-92c2-45748c53a6fb', '71351494-f789-5597-a2c5-02cf3a8bf7d5', 'PIP-2400-SUP-021', 3, 0.9, 0.3, 1, 'auto_applied', 'auto_applied', null, null, null, '2026-09-03T08:11:00+05:30', null, null, null),
  ('6dae3215-3fc9-5df7-889c-eb70b0f76c20', '2b5a71f2-774d-5784-8fb3-73c531f2031b', 'PIP-2600-HYD-004', 3, 0.9, 0.3, 1, 'needs_review', 'rejected', null, null, 'duplicate', '2026-08-31T17:40:00+05:30', null, null, null),
  ('83f0c872-8a5b-592a-8fef-bfa1df1d842a', '03a48265-b3ef-5afd-99da-73e6ecf64bc2', 'PIP-2400-SUP-021', 3, 0.9, 0.3, 1, 'needs_review', 'captured', null, null, null, '2026-09-03T07:55:00+05:30', null, null, null)
on conflict (id) do update set
    event_id = excluded.event_id,
    activity_id = excluded.activity_id,
    baseline_ver = excluded.baseline_ver,
    confidence = excluded.confidence,
    top2_margin = excluded.top2_margin,
    resolved_tier = excluded.resolved_tier,
    decision = excluded.decision,
    status = excluded.status,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    reject_reason = excluded.reject_reason,
    created_at = excluded.created_at,
    gate_reason = excluded.gate_reason,
    fan_out = excluded.fan_out,
    proposed_parent = excluded.proposed_parent;

-- ------------------------------------------------------------------
-- The one planner action allowed to interrupt a supervisor.
-- ------------------------------------------------------------------
insert into public.clarifications
  (id, match_id, event_id, question, options, asked_by, asked_at, reminded_at, answer, answered_at)
values
  ('ad760fd5-2a49-5788-8207-3d90b65d37c6', '87690272-8028-55c8-a469-7c5a70055d63', 'a97652c3-26ad-536f-9f58-646995aceaab', 'Was this the north or the south rack?', array['South Rack','North Rack','Not sure']::text[], '3b47b0f8-c089-5048-b0dd-8ab7c47e9cd5', '2026-09-02T16:40:00+05:30', null, 'South Rack', '2026-09-02T17:02:00+05:30')
on conflict (id) do update set
    match_id = excluded.match_id,
    event_id = excluded.event_id,
    question = excluded.question,
    options = excluded.options,
    asked_by = excluded.asked_by,
    asked_at = excluded.asked_at,
    reminded_at = excluded.reminded_at,
    answer = excluded.answer,
    answered_at = excluded.answered_at;

-- ------------------------------------------------------------------
-- Blockers. The delay cause taxonomy that answers the CAG finding.
-- ------------------------------------------------------------------
insert into public.blockers
  (id, event_id, activity_id, cause, note, raised_by, raised_at, resolved_by, resolved_at, resolution_note)
values
  ('9b75f50c-d82e-5c37-93bc-1668be2d7cae', null, 'PIP-2400-WLD-015', 'material', 'Welding consumables not released from stores. E7018 rods short.', 'a8203728-aa76-504e-82a5-c6f1931b8108', '2026-08-27T09:15:00+05:30', null, null, null),
  ('11dfb382-5b2e-57fc-9ba9-3fb2a5c76405', null, 'INS-3100-LPC-022', 'permit', 'Hot work permit expired at noon, not renewed.', 'b547c01d-71cf-5061-ad5c-7dd2b5501e68', '2026-09-02T12:40:00+05:30', null, null, null),
  ('0793b50d-33c3-5868-a83b-885ead007451', null, 'ELE-4400-CBL-008', 'crew', 'Two cable jointers pulled to the tank farm. Front idle since morning.', 'ddd17d1b-29e2-5483-b6db-1b3a5e0255f2', '2026-09-01T08:00:00+05:30', null, null, null),
  ('76fba569-1187-50a0-b4a6-9dd213643648', null, 'CIV-1800-PAV-003', 'weather', 'Continuous rain since Saturday. Subgrade will not compact.', '3a9ee839-778f-5a06-9fee-368f09e6759f', '2026-08-30T06:30:00+05:30', null, null, null),
  ('a063e54f-c5c6-5d3f-8600-99b40f568922', null, 'STR-5200-ALN-002', 'equipment', 'Laser alignment kit under calibration at the vendor.', '464f7063-5b9c-5ad4-974c-019e1da9b79b', '2026-09-02T15:05:00+05:30', null, null, null),
  ('f5e0b011-ee4c-5f70-96c8-7250d689d212', null, 'PIP-2600-HYD-004', 'material', 'Blind flanges arrived. Test pump booked for Wednesday.', 'dd70e15b-0385-5cc5-998c-4fa9504ce46e', '2026-08-29T10:00:00+05:30', '3b47b0f8-c089-5048-b0dd-8ab7c47e9cd5', '2026-09-02T09:30:00+05:30', 'Flanges released from stores, pump booked for 3 September.')
on conflict (id) do update set
    event_id = excluded.event_id,
    activity_id = excluded.activity_id,
    cause = excluded.cause,
    note = excluded.note,
    raised_by = excluded.raised_by,
    raised_at = excluded.raised_at,
    resolved_by = excluded.resolved_by,
    resolved_at = excluded.resolved_at,
    resolution_note = excluded.resolution_note;

-- ------------------------------------------------------------------
-- Calls. attempt_id is Sarvam's, so real traffic reconciles against these.
-- ------------------------------------------------------------------
insert into public.calls
  (id, attempt_id, interaction_id, supervisor_id, trigger_source, triggered_by, status, duration_s, transcript, recording_url, placed_at, completed_at)
values
  ('d22a96d1-8cdc-5a97-9bb3-ff019d55258e', 'call-2291', null, 'a8203728-aa76-504e-82a5-c6f1931b8108', 'supervisor', null, 'completed', 106, null, null, '2026-09-02T16:10:20+05:30', '2026-09-02T16:12:24+05:30'),
  ('181e6fbd-e406-5230-950e-574611abde89', 'call-2288', null, 'b547c01d-71cf-5061-ad5c-7dd2b5501e68', 'manager', 'cfaa863f-1f55-5f8f-be81-953ecb0c12b1', 'completed', 172, null, null, '2026-09-02T14:02:00+05:30', '2026-09-02T14:05:11+05:30'),
  ('cf3b02a3-2865-5403-a9de-57d878583018', 'call-2285', null, '892f7ab4-69e5-5296-b7b0-8f5550dab14b', 'automated', null, 'no_answer', null, null, null, '2026-09-02T15:05:00+05:30', null),
  ('ceb31871-84e9-5a17-a229-f997bcd775a8', 'call-2280', null, '464f7063-5b9c-5ad4-974c-019e1da9b79b', 'supervisor', null, 'completed', 98, null, null, '2026-09-01T17:44:00+05:30', '2026-09-01T17:45:50+05:30')
on conflict (id) do update set
    attempt_id = excluded.attempt_id,
    interaction_id = excluded.interaction_id,
    supervisor_id = excluded.supervisor_id,
    trigger_source = excluded.trigger_source,
    triggered_by = excluded.triggered_by,
    status = excluded.status,
    duration_s = excluded.duration_s,
    transcript = excluded.transcript,
    recording_url = excluded.recording_url,
    placed_at = excluded.placed_at,
    completed_at = excluded.completed_at;

-- ------------------------------------------------------------------
-- Emergency. Never enters the review queue, never rate limited.
-- ------------------------------------------------------------------
insert into public.sos_events
  (id, kind, raised_by, raised_by_role, category, severity, message, work_front, discipline, lat, lng, accuracy_m, is_drill, channel_used, created_at, acknowledged_by, acknowledged_at, resolved_at, resolution_note)
values
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', 'broadcast', 'cfaa863f-1f55-5f8f-be81-953ecb0c12b1', 'manager', 'evacuation', null, 'Mock evacuation of Unit 24. Muster at gate 3. This is a drill.', null, null, null, null, null, true, 'app', '2026-08-29T10:00:00+05:30', null, null, '2026-08-29T10:26:00+05:30', 'Drill closed. 41 of 47 acknowledged inside 12 minutes.'),
  ('3bc0d6e1-f77d-541d-ac07-e448af61fcf9', 'incident', '6ea3e2a9-4016-510f-ad80-21e2b76cc576', 'supervisor', 'gas', 'high', 'Smell of gas near the condensate manifold.', 'North Rack', 'hse', 27.4728, 94.9119, 8, false, 'app', '2026-08-31T11:18:00+05:30', 'cfaa863f-1f55-5f8f-be81-953ecb0c12b1', '2026-08-31T11:18:34+05:30', '2026-08-31T12:05:00+05:30', 'Flange leak isolated. Line depressurised, joint remade.')
on conflict (id) do update set
    kind = excluded.kind,
    raised_by = excluded.raised_by,
    raised_by_role = excluded.raised_by_role,
    category = excluded.category,
    severity = excluded.severity,
    message = excluded.message,
    work_front = excluded.work_front,
    discipline = excluded.discipline,
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    is_drill = excluded.is_drill,
    channel_used = excluded.channel_used,
    created_at = excluded.created_at,
    acknowledged_by = excluded.acknowledged_by,
    acknowledged_at = excluded.acknowledged_at,
    resolved_at = excluded.resolved_at,
    resolution_note = excluded.resolution_note;

-- ------------------------------------------------------------------
-- Broadcast read receipts. The unacknowledged list never auto clears.
-- ------------------------------------------------------------------
insert into public.sos_recipients
  (sos_id, user_id, delivered_at, seen_at)
values
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', 'a8203728-aa76-504e-82a5-c6f1931b8108', '2026-08-29T10:00:03+05:30', '2026-08-29T10:00:41+05:30'),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', 'dd70e15b-0385-5cc5-998c-4fa9504ce46e', '2026-08-29T10:00:03+05:30', '2026-08-29T10:01:12+05:30'),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', 'b547c01d-71cf-5061-ad5c-7dd2b5501e68', '2026-08-29T10:00:04+05:30', '2026-08-29T10:02:30+05:30'),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', 'ddd17d1b-29e2-5483-b6db-1b3a5e0255f2', '2026-08-29T10:00:04+05:30', null),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', '892f7ab4-69e5-5296-b7b0-8f5550dab14b', '2026-08-29T10:00:05+05:30', null),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', '464f7063-5b9c-5ad4-974c-019e1da9b79b', '2026-08-29T10:00:05+05:30', '2026-08-29T10:03:04+05:30'),
  ('4684af56-a5a3-52f5-aa48-02a19835d9a5', '6ea3e2a9-4016-510f-ad80-21e2b76cc576', '2026-08-29T10:00:06+05:30', '2026-08-29T10:00:22+05:30')
on conflict (sos_id, user_id) do update set
    delivered_at = excluded.delivered_at,
    seen_at = excluded.seen_at;

-- ------------------------------------------------------------------
-- Disputed rejections. Answered by the EIC, not the planner who rejected it.
-- ------------------------------------------------------------------
insert into public.rejection_disputes
  (id, match_id, raised_by, route, reject_reason, media_url, transcript, language, state, raised_at, seen_by, seen_at)
values
  ('8e978ba3-7fce-5ace-82de-567f9aa8bd45', '6dae3215-3fc9-5df7-889c-eb70b0f76c20', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'voice_note', 'duplicate', null, 'Nilim tu north rack tut korisile. Moi south rack tut kora. Duta bilag line, eta nohoi.', 'Assamese', 'captured', '2026-09-02T07:40:00+05:30', null, null),
  ('60ed7614-6f0e-5c6a-85a5-55d54294f48a', 'd1c11dd0-c385-5792-9a72-79278a9fb34c', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'callback', 'not a progress update', null, null, 'English', 'queued', '2026-09-03T06:20:00+05:30', null, null)
on conflict (id) do update set
    match_id = excluded.match_id,
    raised_by = excluded.raised_by,
    route = excluded.route,
    reject_reason = excluded.reject_reason,
    media_url = excluded.media_url,
    transcript = excluded.transcript,
    language = excluded.language,
    state = excluded.state,
    raised_at = excluded.raised_at,
    seen_by = excluded.seen_by,
    seen_at = excluded.seen_at;

-- ------------------------------------------------------------------
-- Audit trail. Append only, so this runs once into an empty log.
-- ------------------------------------------------------------------
insert into public.audit_log (entity_type, entity_id, action, actor_id, actor_role, before, after, at)
select
  v.entity_type,
  v.entity_id::uuid,
  v.action,
  v.actor_id::uuid,
  v.actor_role,
  v.before::jsonb,
  v.after::jsonb,
  v.at::timestamptz
from (values
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Call placed', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'supervisor', '{"detail":"Supervisor requested the call from Today. Candidate set pre loaded from the published look ahead: 4 activities.","before":null}'::jsonb, '{"actor":"Ramesh Bora","after":null}'::jsonb, '2026-09-02T16:10:20+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Raw report stored', null, 'system', '{"detail":"Verbatim Assamese and English, 106 second call. The original is the audit anchor and is never mutated.","before":null}'::jsonb, '{"actor":"Capture","after":"South rack or north rack ase? Ami kali 24 inch line tu ercect korisilo, aji finish hol."}'::jsonb, '2026-09-02T16:12:04+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'English normalisation written beside the original', null, 'system', '{"detail":"Detected language: Assamese and English. The original is kept, not replaced.","before":null}'::jsonb, '{"actor":"Normalise","after":"Which rack is it, south or north? We were erecting the 24 inch line yesterday, today it finished."}'::jsonb, '2026-09-02T16:12:05+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Event extracted', null, 'system', '{"detail":"Type finish. Evidence span \"24 inch line tu ercect korisilo, aji finish hol\". Spoken times kept verbatim beside the normalised values.","before":null}'::jsonb, '{"actor":"Extract","after":null}'::jsonb, '2026-09-02T16:12:06+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Resolved at tier 2, semantic', null, 'system', '{"detail":"Confidence 0.874 against a piping threshold of 0.86. Margin 0.291 against a minimum of 0.08. Both conditions met.","before":null}'::jsonb, '{"actor":"Match","after":null}'::jsonb, '2026-09-02T16:12:06+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Held for review', null, 'system', '{"detail":"The reporter asked which rack inside the utterance itself. An unresolved question in the source outranks a passing score.","before":null}'::jsonb, '{"actor":"Gate","after":null}'::jsonb, '2026-09-02T16:12:06+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Clarification asked', '3b47b0f8-c089-5048-b0dd-8ab7c47e9cd5', 'planner', '{"detail":"Was this the north or the south rack? Three options attached for a one tap answer.","before":null}'::jsonb, '{"actor":"Anjali Sharma","after":null}'::jsonb, '2026-09-02T16:40:00+05:30'),
  ('activity', '1e8a6e9c-2271-52ce-857e-0c1914b3b462', 'Answered', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'supervisor', '{"detail":"South Rack. Item returns to the top of the queue marked answered.","before":null}'::jsonb, '{"actor":"Ramesh Bora","after":"South Rack"}'::jsonb, '2026-09-02T17:02:00+05:30'),
  ('activity', '2258ebf8-e5e6-5ab6-8989-84ad007f39ea', 'Raw report stored', 'a8203728-aa76-504e-82a5-c6f1931b8108', 'supervisor', '{"detail":"Typed in English from the field surface.","before":null}'::jsonb, '{"actor":"Ramesh Bora","after":"Two joints welded on the 24 inch line at south rack this morning."}'::jsonb, '2026-09-02T09:14:00+05:30'),
  ('activity', '2258ebf8-e5e6-5ab6-8989-84ad007f39ea', 'Resolved at tier 1, lexical', null, 'system', '{"detail":"Textually near perfect against Weld joints Line 24\" - South Rack. s_lex 0.94, s_sem 0.91.","before":null}'::jsonb, '{"actor":"Match","after":null}'::jsonb, '2026-09-02T09:14:02+05:30'),
  ('activity', '2258ebf8-e5e6-5ab6-8989-84ad007f39ea', 'Held for review on schedule topology', null, 'system', '{"detail":"s_logic 0.08. The predecessor PIP-2400-ERC-015 is 78 percent complete. You cannot weld a joint on a spool that is not erected, so topology pulled the score below the piping threshold. A pure text matcher would have written a wrong actual start here and nobody would have noticed for a month.","before":null}'::jsonb, '{"actor":"Gate","after":null}'::jsonb, '2026-09-02T09:14:02+05:30')
) as v(entity_type, entity_id, action, actor_id, actor_role, before, after, at)
where not exists (select 1 from public.audit_log);

commit;

-- ---------- sanity check ----------
select 'activities' as t, count(*) from public.activities
union all select 'supervisors', count(*) from public.supervisors
union all select 'raw_reports', count(*) from public.raw_reports
union all select 'extracted_events', count(*) from public.extracted_events
union all select 'match_candidates', count(*) from public.match_candidates
union all select 'matches', count(*) from public.matches
union all select 'v_review_queue', count(*) from public.v_review_queue
union all select 'blockers', count(*) from public.blockers
union all select 'sos_events', count(*) from public.sos_events;
