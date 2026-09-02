/**
 * THE DATA SEAM.
 *
 * Every screen in this build reads through this file and nothing else. No
 * component imports a fixture module or the database client directly. That is
 * the whole point: swapping the source changes the bodies here and no screen
 * changes at all. `database.md` at the repository root documents the swap.
 *
 * Four properties are deliberate.
 *
 * 1. Every function is async, even in fixture mode where the read is
 *    synchronous. A Server Component awaiting a fixture awaits a network round
 *    trip instead with no call site edited.
 * 2. Return types come from `lib/types.ts`, never from the row shape. A column
 *    rename breaks one mapper in this file rather than leaking into thirty
 *    components.
 * 3. Both sources stay live behind `DATA_SOURCE`. Keeping the fixture path
 *    working is not sentiment: it is how the console demonstrates without
 *    network, and how a regression gets bisected against known good data.
 * 4. `./supabase` is imported lazily, inside the functions that need it. It
 *    throws at import time when the environment is not configured, and fixture
 *    mode must not require a database to exist.
 */

import type {
  Activity,
  AuditEntry,
  Blocker,
  CallRecord,
  Candidate,
  CoverageRow,
  Dispute,
  ExpectedActivity,
  FieldUpdate,
  Metric,
  QueueItem,
  Signals,
  SosEvent,
  Supervisor,
  Tier,
} from "./types";
import type { BlockerCause, Discipline, RejectReason, ScheduleLabel, Status } from "./status";

import { ACTIVITIES, ACTIVITY_BY_ID } from "./fixtures/activities";
import { AUDIT_TRAILS, DEFAULT_TRAIL } from "./fixtures/audit";
import { BLOCKERS } from "./fixtures/blockers";
import { CALLS, MIDCALL_TOOL_VERIFIED, SOS_EVENTS } from "./fixtures/calls";
import { DISPUTES, EXPECTED_TODAY, FIELD_USER, MY_QUESTIONS, MY_UPDATES } from "./fixtures/field";
import { METRICS, TIER_MIX } from "./fixtures/metrics";
import { CONSOLE_USERS, SUPERVISORS, WORK_FRONTS } from "./fixtures/people";
import { GATE_SETTINGS, QUEUE } from "./fixtures/queue";

export type DataSource = "fixture" | "supabase";

/**
 * Flip to "supabase" only when every body below actually queries. Flipping it
 * early silences the provenance banner while the data is still invented, which
 * is the one failure this build cannot afford.
 *
 * Note what this flag does NOT mean. It says where the rows come from, not
 * whether the numbers are measured. The matching engine still does not exist:
 * the confidences, margins and tiers now in Postgres are the same hand
 * authored values, loaded from `sql/005_seed.sql`. They become measurements
 * when a matcher writes them, not when a database serves them.
 */
export const DATA_SOURCE: DataSource = "supabase";

const isDb = DATA_SOURCE === "supabase";

/**
 * Whether a matching engine computed the scores on screen.
 *
 * This is a SEPARATE question from `DATA_SOURCE`, and conflating the two was a
 * real defect: the provenance banner used to hide itself as soon as the rows
 * came from Postgres, which quietly removed the disclosure while every
 * confidence, margin and tier was still a value a person typed.
 *
 * Moving rows into a database changes where they are stored. It does not
 * measure anything. These numbers become measurements when Tiers 0 to 3 write
 * them, and this flag is what says so.
 *
 * Flip to true only when the matcher actually scores the rows on screen.
 */
export const MATCHER_BUILT = false;

/** The baseline the console reads. Matches are valid against the baseline they
 *  were made against, so this is explicit rather than "the latest". */
const BASELINE = 3;

export const MID_CALL_TOOL_VERIFIED = MIDCALL_TOOL_VERIFIED;

/** Lazy, so fixture mode needs no environment and no network. */
async function client() {
  const { db } = await import("./supabase");
  return db;
}

/** Postgres errors carry the useful part in `message`; surfacing the table
 *  makes a failed screen name itself instead of rendering an empty state. */
function fail(where: string, error: { message: string } | null): never {
  throw new Error(`data.${where}: ${error?.message ?? "unknown database error"}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/* -------------------------------------------------------------------------
   Queue. W1, the hero screen.
   ------------------------------------------------------------------------- */

function toSignals(r: Row): Signals {
  return {
    s_tag: r.s_tag ?? null,
    s_lex: r.s_lex ?? 0,
    s_sem: r.s_sem ?? 0,
    s_front: r.s_front ?? 0,
    s_date: r.s_date ?? 0,
    s_logic: r.s_logic ?? 0,
    s_hist: r.s_hist ?? 0,
  };
}

function toQueueItem(r: Row, candidates: Candidate[]): QueueItem {
  return {
    id: r.match_id,
    rawPhrase: r.raw_phrase,
    normalised: r.normalised ?? undefined,
    language: r.language ?? "English",
    channel: r.channel,
    reporter: r.reporter ?? "Unknown",
    reporterId: r.reporter_id ?? "",
    discipline: r.discipline as Discipline,
    workFront: r.work_front ?? "",
    capturedAt: r.captured_at,
    receivedAt: r.received_at,
    eventType: r.event_type,
    evidenceSpan: r.evidence_span,
    quantity:
      r.quantity === null || r.quantity === undefined
        ? undefined
        : {
            value: Number(r.quantity),
            unit: r.quantity_unit ?? "",
            /* The denominator is planned scope on the activity, which is what
               makes "14 of 18" a rollup rather than a running total. */
            of: r.quantity_planned === null ? undefined : Number(r.quantity_planned),
          },
    spokenStart: r.spoken_start ?? undefined,
    spokenFinish: r.spoken_finish ?? undefined,
    actualStart: r.actual_start ?? null,
    actualFinish: r.actual_finish ?? null,
    timeValidation: r.time_validation,
    confidence: r.confidence,
    margin: r.margin,
    resolvedTier: r.resolved_tier as Tier,
    candidates,
    gateReason: r.gate_reason ?? null,
    status: r.status as Status,
    decision: r.decision,
    clarification: r.clarification_question
      ? {
          question: r.clarification_question,
          options: r.clarification_options ?? undefined,
          askedAt: r.clarification_asked_at ?? r.captured_at,
          answer: r.clarification_answer ?? undefined,
          answeredAt: r.clarification_answered_at ?? undefined,
        }
      : undefined,
    fanOut: r.fan_out ?? undefined,
    proposedParent: r.proposed_parent ?? undefined,
  };
}

/**
 * Candidates for a set of events, in one round trip.
 *
 * A query per row would be nine round trips to draw one screen, and the
 * runner up is not optional decoration here: the margin is drawn as a distance
 * against the threshold, so the second candidate is part of the primary
 * reading of every row.
 */
async function candidatesFor(eventIds: string[]): Promise<Map<string, Candidate[]>> {
  const out = new Map<string, Candidate[]>();
  if (eventIds.length === 0) return out;
  const db = await client();
  const { data, error } = await db
    .from("v_match_candidates")
    .select("*")
    .in("event_id", eventIds)
    .order("rank");
  if (error) fail("candidatesFor", error);
  for (const r of data as Row[]) {
    const list = out.get(r.event_id) ?? [];
    list.push({
      activityId: r.activity_id,
      description: r.description,
      score: r.score,
      signals: toSignals(r),
    });
    out.set(r.event_id, list);
  }
  return out;
}

/**
 * Worst first. A planner opens the queue to find what the matcher could not
 * settle, so ascending confidence is the only sensible default, with one
 * exception: an item whose clarification has been answered jumps to the top,
 * because the supervisor already paid the interruption cost and the planner
 * should spend it.
 */
export async function getQueue(): Promise<QueueItem[]> {
  if (!isDb) {
    const open = QUEUE.filter((q) => q.status === "needs_review" || q.status === "clarification");
    return [...open].sort((a, b) => {
      const aAnswered = a.clarification?.answer ? 1 : 0;
      const bAnswered = b.clarification?.answer ? 1 : 0;
      if (aAnswered !== bAnswered) return bAnswered - aAnswered;
      return a.confidence - b.confidence;
    });
  }

  const db = await client();
  const { data, error } = await db
    .from("v_review_queue")
    .select("*")
    .order("clarification_answered_at", { ascending: false, nullsFirst: false })
    .order("confidence", { ascending: true });
  if (error) fail("getQueue", error);

  const rows = data as Row[];
  const cands = await candidatesFor(rows.map((r) => r.event_id));
  return rows.map((r) => toQueueItem(r, cands.get(r.event_id) ?? []));
}

/**
 * Everything, including what has already cleared. Used by the activity trail
 * and the field receipt so a resolved row is still findable.
 *
 * `v_review_queue` filters to the two open statuses by design, so this reads
 * the base tables instead of the view rather than quietly returning a subset
 * under a name that promises all of them.
 */
export async function getAllQueueItems(): Promise<QueueItem[]> {
  if (!isDb) return QUEUE;

  const db = await client();
  const { data, error } = await db
    .from("matches")
    .select(
      `id, activity_id, confidence, top2_margin, resolved_tier, decision, status,
       gate_reason, fan_out, proposed_parent, created_at, reject_reason,
       extracted_events!inner (
         id, event_type, evidence_span, quantity, quantity_unit, spoken_start,
         spoken_finish, actual_start, actual_finish, time_validation,
         raw_reports!inner (
           original_text, normalised_en, language, channel, discipline,
           work_front, captured_at, received_at, reporter_id
         )
       )`,
    )
    .order("confidence", { ascending: true });
  if (error) fail("getAllQueueItems", error);

  const rows = data as Row[];
  const cands = await candidatesFor(rows.map((r) => r.extracted_events.id));
  const [people, activities] = await Promise.all([getSupervisors(), getActivities()]);
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const plannedById = new Map(activities.map((a) => [a.activityId, a.quantityPlanned]));

  return rows.map((r) => {
    const e = r.extracted_events as Row;
    const rep = e.raw_reports as Row;
    return toQueueItem(
      {
        match_id: r.id,
        activity_id: r.activity_id,
        confidence: r.confidence,
        margin: r.top2_margin,
        resolved_tier: r.resolved_tier,
        decision: r.decision,
        status: r.status,
        gate_reason: r.gate_reason,
        fan_out: r.fan_out,
        proposed_parent: r.proposed_parent,
        event_id: e.id,
        event_type: e.event_type,
        evidence_span: e.evidence_span,
        quantity: e.quantity,
        quantity_unit: e.quantity_unit,
        quantity_planned: plannedById.get(r.activity_id) ?? null,
        spoken_start: e.spoken_start,
        spoken_finish: e.spoken_finish,
        actual_start: e.actual_start,
        actual_finish: e.actual_finish,
        time_validation: e.time_validation,
        raw_phrase: rep.original_text,
        normalised: rep.normalised_en,
        language: rep.language,
        channel: rep.channel,
        discipline: rep.discipline,
        work_front: rep.work_front,
        captured_at: rep.captured_at,
        received_at: rep.received_at,
        reporter: nameById.get(rep.reporter_id) ?? "Unknown",
        reporter_id: rep.reporter_id,
      },
      cands.get(e.id) ?? [],
    );
  });
}

export async function getQueueItem(id: string): Promise<QueueItem | undefined> {
  if (!isDb) return QUEUE.find((q) => q.id === id);
  const all = await getAllQueueItems();
  return all.find((q) => q.id === id);
}

/** Per discipline threshold and margin. Both conditions, never one alone. */
export async function getGateSettings() {
  if (!isDb) return GATE_SETTINGS;
  const db = await client();
  const { data, error } = await db.from("gate_settings").select("*");
  if (error) fail("getGateSettings", error);
  const out: typeof GATE_SETTINGS = {};
  for (const r of data as Row[]) {
    out[r.discipline] = {
      threshold: r.threshold,
      minMargin: r.min_margin,
      /* Null rather than zero. No auto apply rate has been measured, and a
         plausible looking zero is worse than an admitted absence. */
      autoApplyRate: null,
    };
  }
  return out;
}

/* -------------------------------------------------------------------------
   Registry and provenance. W3.
   ------------------------------------------------------------------------- */

function toActivity(r: Row): Activity {
  return {
    activityId: r.activity_id,
    baselineVer: r.baseline_ver,
    wbsPath: r.wbs_path ?? "",
    level: r.level ?? "L6",
    discipline: r.discipline as Discipline,
    workFront: r.work_front ?? "",
    description: r.description,
    tagTokens: r.tag_tokens ?? [],
    plannedStart: r.planned_start ?? "",
    plannedFinish: r.planned_finish ?? "",
    predecessors: r.predecessors ?? [],
    actualStart: r.actual_start ?? null,
    actualFinish: r.actual_finish ?? null,
    percentComplete: r.percent_complete ?? 0,
    quantityPlanned: r.quantity_planned === null ? undefined : Number(r.quantity_planned),
    quantityDone: r.quantity_done === null ? undefined : Number(r.quantity_done),
    quantityUnit: r.quantity_unit ?? undefined,
    scheduleLabel: (r.schedule_label ?? "on_track") as ScheduleLabel,
    isProposed: r.is_proposed ?? false,
  };
}

export async function getActivities(): Promise<Activity[]> {
  if (!isDb) return ACTIVITIES;
  const db = await client();
  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("baseline_ver", BASELINE)
    .order("activity_id");
  if (error) fail("getActivities", error);
  return (data as Row[]).map(toActivity);
}

export async function getActivity(activityId: string): Promise<Activity | undefined> {
  if (!isDb) return ACTIVITY_BY_ID.get(activityId);
  const db = await client();
  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("activity_id", activityId)
    .eq("baseline_ver", BASELINE)
    .maybeSingle();
  if (error) fail("getActivity", error);
  return data ? toActivity(data as Row) : undefined;
}

/**
 * The audit trail for one activity, oldest first, because it is read as a
 * sequence rather than a feed.
 *
 * The seed stores the human readable half of each entry in the `before` and
 * `after` jsonb, which is where the actor's name and the detail sentence live.
 */
export async function getAuditTrail(activityId: string): Promise<AuditEntry[]> {
  if (!isDb) return AUDIT_TRAILS[activityId] ?? DEFAULT_TRAIL;

  const db = await client();
  const activity = await getActivity(activityId);
  if (!activity) return DEFAULT_TRAIL;

  const { data: idRow, error: idErr } = await db
    .from("activities")
    .select("id")
    .eq("activity_id", activityId)
    .eq("baseline_ver", BASELINE)
    .maybeSingle();
  if (idErr) fail("getAuditTrail", idErr);
  if (!idRow) return DEFAULT_TRAIL;

  const { data, error } = await db
    .from("audit_log")
    .select("*")
    .eq("entity_type", "activity")
    .eq("entity_id", (idRow as Row).id)
    .order("at", { ascending: true });
  if (error) fail("getAuditTrail", error);
  if ((data as Row[]).length === 0) return DEFAULT_TRAIL;

  return (data as Row[]).map((r) => ({
    at: r.at,
    actor: r.after?.actor ?? "System",
    actorRole: r.actor_role,
    action: r.action,
    detail: r.before?.detail ?? "",
    before: r.before?.before ?? undefined,
    after: r.after?.after ?? undefined,
  }));
}

/* -------------------------------------------------------------------------
   People and coverage. W2, where silence becomes visible.
   ------------------------------------------------------------------------- */

export async function getSupervisors(): Promise<Supervisor[]> {
  if (!isDb) return SUPERVISORS;
  const rows = await coverageRows();
  return rows.map((r) => r.supervisor);
}

export async function getWorkFronts(): Promise<string[]> {
  if (!isDb) return WORK_FRONTS;
  const db = await client();
  const { data, error } = await db.from("activities").select("work_front").eq("baseline_ver", BASELINE);
  if (error) fail("getWorkFronts", error);
  return [...new Set((data as Row[]).map((r) => r.work_front).filter(Boolean))].sort();
}

export async function getConsoleUsers() {
  if (!isDb) return CONSOLE_USERS;
  const db = await client();
  const { data, error } = await db.from("profiles").select("*").order("role");
  if (error) fail("getConsoleUsers", error);
  return (data as Row[]).map((r) => ({
    id: r.id as string,
    name: r.full_name as string,
    role: r.role as "planner" | "manager",
    title: r.role === "planner" ? "Planning engineer, project controls" : "Engineer in Charge",
    email: r.email as string,
  }));
}

/**
 * Coverage state is derived in the view, never stored. A supervisor who
 * accounted for every expected activity reported; one who accounted for some
 * is partial; one who logged nothing at all is silent.
 *
 * The partial case matters most: the automated end of shift call deliberately
 * skips anyone who reported anything, so a partial report is invisible to the
 * system and visible only here.
 */
async function coverageRows(): Promise<CoverageRow[]> {
  const db = await client();
  /* The view carries the derived state; correction_rate lives on the table and
     is not projected through it. Two reads rather than a sixth migration, on
     a screen that loads once. */
  const [cov, sup] = await Promise.all([
    db.from("v_coverage").select("*").order("full_name"),
    db.from("supervisors").select("id, correction_rate"),
  ]);
  if (cov.error) fail("getCoverage", cov.error);
  if (sup.error) fail("getCoverage", sup.error);
  const rateById = new Map((sup.data as Row[]).map((r) => [r.id, Number(r.correction_rate ?? 0)]));
  const data = cov.data;
  return (data as Row[]).map((r) => ({
    supervisor: {
      id: r.id,
      name: r.full_name,
      phone: r.phone_e164 ?? "",
      discipline: r.discipline as Discipline,
      workFronts: r.work_front ? [r.work_front] : [],
      sectionEngineer: r.section_engineer ?? "",
      lastReportedAt: r.last_reported_at ?? null,
      reportedToday: r.reported_today ?? 0,
      expectedToday: r.expected_today ?? 0,
      excused: r.excused_until ? `On leave until ${r.excused_until}` : undefined,
      correctionRate: rateById.get(r.id) ?? 0,
    },
    state: r.state as CoverageRow["state"],
    lastAt: r.last_reported_at ?? null,
  }));
}

export async function getCoverage(): Promise<CoverageRow[]> {
  if (!isDb) {
    return SUPERVISORS.map((supervisor) => {
      let state: CoverageRow["state"];
      if (supervisor.excused) state = "excused";
      else if (supervisor.reportedToday === 0) state = "silent";
      else if (supervisor.reportedToday < supervisor.expectedToday) state = "partial";
      else state = "reported";
      return { supervisor, state, lastAt: supervisor.lastReportedAt };
    });
  }
  return coverageRows();
}

/* -------------------------------------------------------------------------
   Blockers. W5. Ageing is the point.
   ------------------------------------------------------------------------- */

export async function getBlockers(): Promise<Blocker[]> {
  if (!isDb) {
    return [...BLOCKERS].sort((a, b) => {
      if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1;
      return b.ageHours - a.ageHours;
    });
  }

  const db = await client();
  const { data, error } = await db.from("v_blockers").select("*");
  if (error) fail("getBlockers", error);

  return (data as Row[])
    .map((r) => ({
      id: r.id,
      activityId: r.activity_id ?? null,
      activityDescription: r.activity_description ?? "",
      cause: r.cause as BlockerCause,
      note: r.note ?? "",
      raisedBy: r.raised_by_name ?? "Unknown",
      raisedById: r.raised_by ?? "",
      discipline: r.discipline as Discipline,
      workFront: r.work_front ?? "",
      raisedAt: r.raised_at,
      ageHours: Math.round(Number(r.age_hours ?? 0)),
      resolvedAt: r.resolved_at ?? undefined,
      resolutionNote: r.resolution_note ?? undefined,
    }))
    .sort((a, b) => {
      if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1;
      return b.ageHours - a.ageHours;
    });
}

/* -------------------------------------------------------------------------
   Measurement. W10.
   ------------------------------------------------------------------------- */

/**
 * Four of the ten metrics are computable from what is in the database today.
 * The other six need telemetry, an evaluation set, or eight weeks of use that
 * have not happened, and they stay null so the screen reads "not measured"
 * rather than showing a plausible zero.
 */
export async function getMetrics(): Promise<Metric[]> {
  if (!isDb) return METRICS;

  const db = await client();
  const { data, error } = await db.from("v_system_health").select("*").maybeSingle();
  if (error) fail("getMetrics", error);
  const h = (data ?? {}) as Row;

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
  const n = {
    reporting: h.fronts_reporting ?? 0,
    active: h.fronts_active ?? 0,
    tier01: h.resolved_deterministically ?? 0,
    auto: h.auto_applied ?? 0,
    total: h.total_matches ?? 0,
    unmatched: h.unmatched_new ?? 0,
  };

  /* The note travels with the figure. The fixture notes quote fixture counts
     ("one of ten rows"), and once the figure is computed from the database
     those sentences describe a different dataset than the number above them.
     A provenance line that contradicts its own metric is worse than none: this
     is the screen whose entire job is being straight about what is measured. */
  const computed: Record<string, { value: number | null; note: string }> = {
    coverage_rate: {
      value: pct(n.reporting, n.active),
      note: `${n.reporting} of ${n.active} active work fronts reported this shift. Counted from the seeded directory, not a production measurement.`,
    },
    tier_mix: {
      value: pct(n.tier01, n.total),
      note: `Counted across ${n.total} seeded rows. The matching engine does not exist, so no tier was actually executed and these are the authored values.`,
    },
    auto_apply_rate: {
      value: pct(n.auto, n.total),
      note: `${n.auto} of ${n.total} rows clear both threshold and margin. A property of the seed data, not of a running system.`,
    },
    unmatched_rate: {
      value: pct(n.unmatched, n.total),
      note: `${n.unmatched} of ${n.total} rows landed unmatched. Counted, not measured.`,
    },
  };

  return METRICS.map((m) => (m.key in computed ? { ...m, ...computed[m.key] } : m));
}

export async function getTierMix() {
  if (!isDb) return TIER_MIX;
  const db = await client();
  const { data, error } = await db.from("v_tier_mix").select("*").order("resolved_tier");
  if (error) fail("getTierMix", error);
  const byTier = new Map((data as Row[]).map((r) => [Number(r.resolved_tier), Number(r.n)]));
  /* `as const` matters: TIER_LABEL is keyed on the literal union 0|1|2|3, so a
     widened number here would not index it. Every tier is emitted even at
     zero, because "no rows reached the language model" is the claim this chart
     exists to make and a missing bar cannot make it. */
  return ([0, 1, 2, 3] as const).map((tier) => ({ tier, count: byTier.get(tier) ?? 0 }));
}

/* -------------------------------------------------------------------------
   Calls and emergency.
   ------------------------------------------------------------------------- */

export async function getCalls(): Promise<CallRecord[]> {
  if (!isDb) return CALLS;

  const db = await client();
  const { data, error } = await db
    .from("calls")
    .select("*, supervisors (id, full_name, discipline)")
    .order("placed_at", { ascending: false });
  if (error) fail("getCalls", error);

  return (data as Row[]).map((r) => {
    const sup = (r.supervisors ?? {}) as Row;
    return {
      id: r.attempt_id ?? r.id,
      supervisorId: sup.id ?? "",
      supervisor: sup.full_name ?? "Unknown",
      discipline: (sup.discipline ?? "piping") as Discipline,
      trigger: r.trigger_source ?? "supervisor",
      triggeredBy: r.triggered_by ?? undefined,
      placedAt: r.placed_at,
      endedAt: r.completed_at ?? undefined,
      durationSec: r.duration_s === null ? undefined : Math.round(Number(r.duration_s)),
      disposition: r.status ?? "completed",
      /* The mid call tool has never fired on a live call, so no call in this
         database carries live items. The panel says so rather than rendering
         an empty list that reads as a failure. */
      liveItems: undefined,
      transcriptAvailable: r.transcript !== null,
      recordingAvailable: r.recording_url !== null,
      activityIds: [],
    };
  });
}

export async function getSosEvents(): Promise<SosEvent[]> {
  if (!isDb) return SOS_EVENTS;

  const db = await client();
  const { data, error } = await db
    .from("sos_events")
    .select("*, sos_recipients (user_id, delivered_at, seen_at)")
    .order("created_at", { ascending: false });
  if (error) fail("getSosEvents", error);

  const people = await getSupervisors();
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return (data as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    raisedBy: nameById.get(r.raised_by) ?? "Unknown",
    raisedByRole: r.raised_by_role,
    category: r.category ?? "other",
    severity: r.severity ?? undefined,
    message: r.message ?? undefined,
    workFront: r.work_front ?? undefined,
    discipline: (r.discipline ?? undefined) as Discipline | undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    accuracyM: r.accuracy_m ?? undefined,
    isDrill: r.is_drill,
    channelUsed: r.channel_used ?? "app",
    createdAt: r.created_at,
    acknowledgedBy: r.acknowledged_by ?? undefined,
    acknowledgedAt: r.acknowledged_at ?? undefined,
    resolvedAt: r.resolved_at ?? undefined,
    resolutionNote: r.resolution_note ?? undefined,
    recipients: ((r.sos_recipients ?? []) as Row[]).map((x) => ({
      userId: x.user_id,
      name: nameById.get(x.user_id) ?? "Unknown",
      deliveredAt: x.delivered_at ?? undefined,
      seenAt: x.seen_at ?? undefined,
    })),
  }));
}

/* -------------------------------------------------------------------------
   Field surface. Scoped to one supervisor, always.
   ------------------------------------------------------------------------- */

/**
 * The signed in supervisor.
 *
 * Still a fixture, and deliberately so: there is no real session yet, so this
 * is the demonstration seat rather than an authenticated identity. When
 * Supabase phone auth lands this reads the session and joins `supervisors` on
 * `phone_e164`. Until then, pinning it here keeps the field surface honest
 * about being one person's view rather than pretending at a login.
 */
export async function getFieldUser() {
  if (!isDb) return FIELD_USER;
  const people = await getSupervisors();
  const me = people.find((p) => p.name === FIELD_USER.name);
  if (!me) return FIELD_USER;
  return {
    ...FIELD_USER,
    id: me.id,
    discipline: me.discipline,
    workFront: me.workFronts[0] ?? FIELD_USER.workFront,
  };
}

/**
 * S2 Expected today, and the retrieval envelope. This list is what shrinks the
 * candidate space from thousands of activities to a handful before any model
 * runs, which is why publishing the look ahead is the highest leverage action
 * a planner takes.
 */
export async function getExpectedToday(): Promise<ExpectedActivity[]> {
  if (!isDb) return EXPECTED_TODAY;

  const db = await client();
  const me = await getFieldUser();
  const { data, error } = await db.rpc("fn_expected_today", { p_supervisor: me.id });
  if (error) fail("getExpectedToday", error);

  const openBlockers = new Set(
    (await getBlockers()).filter((b) => !b.resolvedAt).map((b) => b.activityId),
  );

  return (data as Row[]).map((r) => {
    const a = toActivity(r);
    let state: ExpectedActivity["state"] = "none";
    if (openBlockers.has(a.activityId)) state = "blocked";
    else if (a.actualFinish || a.percentComplete >= 100) state = "done";
    else if (a.actualStart) state = "in_progress";
    return {
      id: a.activityId,
      activityId: a.activityId,
      description: a.description,
      workFront: a.workFront,
      discipline: a.discipline,
      plannedFinish: a.plannedFinish,
      countable: a.quantityUnit
        ? { unit: a.quantityUnit, suggested: Number(a.quantityPlanned ?? 0) }
        : undefined,
      state,
      startedAt: a.actualStart ?? undefined,
      scheduleLabel: a.scheduleLabel,
    };
  });
}

/**
 * S7 My updates. The receipt, and the reason a supervisor keeps using this at
 * all: visible proof they reported, so they cannot be blamed later.
 *
 * Never an activity id on this surface. The plain description, always.
 */
export async function getMyUpdates(): Promise<FieldUpdate[]> {
  if (!isDb) return MY_UPDATES;

  const db = await client();
  const me = await getFieldUser();
  const all = await getAllQueueItems();
  const activities = await getActivities();
  const describe = new Map(activities.map((a) => [a.activityId, a.description]));

  const { data, error } = await db
    .from("rejection_disputes")
    .select("match_id, state")
    .eq("raised_by", me.id);
  if (error) fail("getMyUpdates", error);
  const disputed = new Set((data as Row[]).map((r) => r.match_id));

  return all
    .filter((q) => q.reporterId === me.id)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    .map((q) => ({
      id: q.id,
      activityDescription:
        describe.get(q.candidates[0]?.activityId ?? "") ??
        q.candidates[0]?.description ??
        "Not linked yet",
      what: q.rawPhrase,
      status: q.status,
      eventType: q.eventType,
      channel: q.channel,
      at: q.capturedAt,
      actualStart: q.actualStart ?? undefined,
      actualFinish: q.actualFinish ?? undefined,
      quantity: q.quantity ? `${q.quantity.value} ${q.quantity.unit}` : undefined,
      plannerNote: q.gateReason ?? undefined,
      rejectReason: undefined,
      syncState: disputed.has(q.id) ? "sent" : undefined,
    }));
}

/** S8. Should almost always be empty. */
export async function getMyQuestions() {
  if (!isDb) return MY_QUESTIONS;

  const db = await client();
  const { data, error } = await db
    .from("clarifications")
    .select("*, matches!inner (id, activity_id)")
    .order("asked_at", { ascending: false });
  if (error) fail("getMyQuestions", error);

  const all = await getAllQueueItems();
  const byMatch = new Map(all.map((q) => [q.id, q]));

  return (data as Row[]).map((r) => {
    const item = byMatch.get(r.match_id);
    return {
      id: r.id as string,
      updateId: r.match_id as string,
      activityDescription: item?.candidates[0]?.description ?? "Not linked yet",
      originalPhrase: item?.rawPhrase ?? "",
      question: r.question as string,
      options: (r.options ?? undefined) as string[] | undefined,
      askedBy: "Anjali Sharma",
      askedAt: r.asked_at as string,
      answer: (r.answer ?? undefined) as string | undefined,
      answeredAt: (r.answered_at ?? undefined) as string | undefined,
    };
  });
}

/**
 * Answers to rejections, newest first. Read by the field surface to show a
 * supervisor that their reply is moving, and by the manager because these are
 * addressed to them rather than to the planner who rejected the entry.
 */
export async function getDisputes(): Promise<Dispute[]> {
  if (!isDb) return [...DISPUTES].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  const db = await client();
  const { data, error } = await db
    .from("rejection_disputes")
    .select("*, supervisors (id, full_name, discipline, work_front)")
    .order("raised_at", { ascending: false });
  if (error) fail("getDisputes", error);

  const all = await getAllQueueItems();
  const byMatch = new Map(all.map((q) => [q.id, q]));

  return (data as Row[]).map((r) => {
    const sup = (r.supervisors ?? {}) as Row;
    const item = byMatch.get(r.match_id);
    return {
      id: r.id,
      updateId: r.match_id,
      activityDescription: item?.candidates[0]?.description ?? "Not linked yet",
      raisedBy: sup.full_name ?? "Unknown",
      raisedById: sup.id ?? "",
      discipline: (sup.discipline ?? "piping") as Discipline,
      workFront: sup.work_front ?? "",
      route: r.route,
      raisedAt: r.raised_at,
      rejectReason: r.reject_reason as RejectReason,
      rejectNote: undefined,
      transcript: r.transcript ?? undefined,
      language: r.language ?? undefined,
      state: r.state,
      seenAt: r.seen_at ?? undefined,
    } as Dispute;
  });
}

/* -------------------------------------------------------------------------
   Cross surface counts, for the rail badges.
   ------------------------------------------------------------------------- */

export async function getCounts() {
  const [queue, coverage, blockers, questions, updates, disputes] = await Promise.all([
    getQueue(),
    getCoverage(),
    getBlockers(),
    getMyQuestions(),
    getMyUpdates(),
    getDisputes(),
  ]);

  return {
    queueDepth: queue.length,
    answered: queue.filter((q) => q.clarification?.answer).length,
    notReported: coverage.filter((c) => c.state === "silent" || c.state === "partial").length,
    openBlockers: blockers.filter((b) => !b.resolvedAt).length,
    agedBlockers: blockers.filter((b) => !b.resolvedAt && b.ageHours >= 72).length,
    openQuestions: questions.filter((q) => !q.answer).length,
    actionableUpdates: updates.filter(
      (u) => u.status === "clarification" || u.status === "rejected",
    ).length,
    openDisputes: disputes.filter((d) => d.state !== "seen").length,
  };
}
