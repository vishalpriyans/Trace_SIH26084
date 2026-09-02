/**
 * Generates `sql/005_seed.sql` from the fixture modules.
 *
 * Written as a generator rather than hand authored SQL for one reason: the
 * fixtures are the thing the console has been designed and reviewed against,
 * and hand transcribing seventy records across a dozen tables introduces
 * differences nobody would ever find. Change a fixture, re-run this, and the
 * database matches the screens again.
 *
 * Run:  node web/scripts/generate-seed.mjs
 *
 * Node reads the .ts fixtures directly. Every fixture imports its types with
 * `import type`, which type stripping erases, so there is nothing left to
 * resolve at runtime and no build step is needed here.
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "sql", "005_seed.sql");

const { ACTIVITIES } = await import("../lib/fixtures/activities.ts");
const { SUPERVISORS, CONSOLE_USERS } = await import("../lib/fixtures/people.ts");
const { QUEUE, GATE_SETTINGS } = await import("../lib/fixtures/queue.ts");
const { BLOCKERS } = await import("../lib/fixtures/blockers.ts");
const { CALLS, SOS_EVENTS } = await import("../lib/fixtures/calls.ts");
const { EXPECTED_TODAY, MY_UPDATES, DISPUTES } = await import("../lib/fixtures/field.ts");
const { AUDIT_TRAILS } = await import("../lib/fixtures/audit.ts");

/* ---------------------------------------------------------------------------
   Deterministic ids.

   The fixtures key on readable strings ("sup-ramesh", "q-03"); the schema
   wants uuids. Hashing the fixture key into a v5 shaped uuid means the same
   fixture always produces the same uuid, so foreign keys line up across
   tables and re-running the generator produces a byte identical file.
--------------------------------------------------------------------------- */
function uuid(key) {
  const h = createHash("sha1").update(`trace:${key}`).digest("hex");
  const v = "5" + h.slice(13, 16);
  const r = ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${v}-${r}-${h.slice(20, 32)}`;
}

/* ---------------------------------------------------------------------------
   SQL literals.
--------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   Dates move with the calendar.

   The fixtures were authored against 1 September 2026. Several views are
   relative to `current_date`: v_coverage counts what was reported TODAY, and
   fn_expected_today filters on the planned window. Left fixed, the demo decays
   a little every day, and by the second day the coverage board reads six of
   eight silent and Expected today is empty. That does not look like a seeded
   database, it looks like a broken product.

   So every ISO date and timestamp is shifted by the gap between the anchor and
   the day the seed is generated. Re-running the seed re-dates the demo to
   today. Wall clock time and the +05:30 offset are preserved exactly: 07:40 on
   site stays 07:40 on site, on a later day.

   Set TRACE_SEED_ANCHOR to a date to pin it, or to "none" to emit the fixture
   dates unshifted, which is what a reproducible test wants.
--------------------------------------------------------------------------- */
const ANCHOR = "2026-09-01";
const pin = process.env.TRACE_SEED_ANCHOR;
const today = pin && pin !== "none" ? pin : new Date().toISOString().slice(0, 10);
const OFFSET_DAYS =
  pin === "none"
    ? 0
    : Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${ANCHOR}T00:00:00Z`)) / 86400000);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/;

function shiftIso(value) {
  const m = ISO_DATE.exec(value);
  if (!m || OFFSET_DAYS === 0) return value;
  /* Only the date half moves. Rebuilding from a full Date would drag the
     timestamp through the runner's timezone and silently rewrite +05:30. */
  const d = new Date(Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`));
  d.setUTCDate(d.getUTCDate() + OFFSET_DAYS);
  return d.toISOString().slice(0, 10) + (m[4] ?? "");
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lit = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return q(typeof v === "string" ? shiftIso(v) : v);
};
const textArray = (a) =>
  !a || a.length === 0 ? "'{}'" : `array[${a.map(q).join(",")}]::text[]`;

/* Vocabularies the database enforces with check constraints. Asserting them
   here turns a failed migration halfway through the SQL editor into a failed
   generator run with the offending value named.

   Keyed by table AND column, because the same column name means different
   things in different tables: matches.status is the six status vocabulary and
   calls.status is a Sarvam call disposition. */
const SIX = ["captured", "auto_applied", "needs_review", "clarification", "confirmed", "rejected"];
const VOCAB = {
  "matches.status": SIX,
  "matches.decision": ["auto_applied", "needs_review", "unmatched_new"],
  "extracted_events.status": SIX,
  "extracted_events.time_validation": [
    "ok", "missing_start", "missing_finish", "implausible", "none_given",
  ],
  "activities.schedule_label": ["ahead", "on_track", "at_risk", "behind"],
  "blockers.cause": ["material", "crew", "equipment", "permit", "weather", "other"],
  "rejection_disputes.route": ["callback", "voice_note"],
  "rejection_disputes.state": ["queued", "captured", "seen"],
  "rejection_disputes.reject_reason": [
    "duplicate", "out of scope", "not a progress update", "test or noise",
  ],
  "sos_events.kind": ["incident", "broadcast"],
  "profiles.role": ["planner", "manager"],
};

/** An insert that can be run twice. */
function upsert(table, cols, rows, conflict, update = true) {
  /* Arity. A column list and a row that disagree by one is the single most
     likely defect in a file this shape, and it fails at row 1 of 14 with a
     message that names neither table nor column. */
  rows.forEach((r, i) => {
    if (r.length !== cols.length) {
      throw new Error(
        `${table} row ${i}: ${r.length} values for ${cols.length} columns (${cols.join(", ")})`,
      );
    }
    cols.forEach((c, j) => {
      const allowed = VOCAB[`${table}.${c}`];
      if (!allowed) return;
      const v = String(r[j]);
      if (v === "null") return;
      const bare = v.replace(/^'|'$/g, "").replace(/''/g, "'");
      if (!allowed.includes(bare)) {
        throw new Error(`${table} row ${i}: ${c} = "${bare}" is not one of ${allowed.join(" | ")}`);
      }
    });
  });

  /* Duplicate conflict keys inside one statement. Postgres answers this with
     "ON CONFLICT DO UPDATE command cannot affect row a second time", which
     names neither the table nor the key, so the value is printed here. */
  const idx = conflict.map((c) => cols.indexOf(c));
  const seen = new Map();
  rows.forEach((r, i) => {
    const key = idx.map((j) => r[j]).join("|");
    if (seen.has(key)) {
      throw new Error(
        `${table}: rows ${seen.get(key)} and ${i} share the same ${conflict.join(" + ")} ` +
          `(${key}). One insert cannot upsert the same row twice.`,
      );
    }
    seen.set(key, i);
  });

  if (rows.length === 0) return `-- ${table}: nothing to seed\n`;
  const set = cols
    .filter((c) => !conflict.includes(c))
    .map((c) => `${c} = excluded.${c}`)
    .join(",\n    ");
  const action = update && set ? `do update set\n    ${set}` : "do nothing";
  return (
    `insert into public.${table}\n  (${cols.join(", ")})\nvalues\n` +
    rows.map((r) => `  (${r.join(", ")})`).join(",\n") +
    `\non conflict (${conflict.join(", ")}) ${action};\n`
  );
}

const out = [];
const warn = [];
const section = (title, body) => out.push(`-- ${"-".repeat(66)}\n-- ${title}\n-- ${"-".repeat(66)}\n${body}`);

/* ---------------------------------------------------------------------------
   The activity registry.

   EXPECTED_TODAY names activities the WBS fixture does not carry, because the
   supervisor's look ahead was authored against the work he can see rather
   than against the twelve activities the queue needed. Both are real rows in
   a real registry, so they are merged here rather than one of them silently
   losing its description in the join.
--------------------------------------------------------------------------- */
const registry = new Map(ACTIVITIES.map((a) => [a.activityId, { ...a }]));
for (const e of EXPECTED_TODAY) {
  if (registry.has(e.activityId)) continue;
  registry.set(e.activityId, {
    activityId: e.activityId,
    baselineVer: 3,
    wbsPath: null,
    level: "L6",
    discipline: e.discipline,
    workFront: e.workFront,
    description: e.description,
    tagTokens: [],
    plannedStart: null,
    plannedFinish: e.plannedFinish,
    predecessors: [],
    actualStart: e.startedAt ?? null,
    actualFinish: null,
    percentComplete: e.state === "done" ? 100 : e.state === "in_progress" ? 40 : 0,
    scheduleLabel: e.scheduleLabel,
    isProposed: false,
    quantityPlanned: e.countable?.suggested ?? null,
    quantityUnit: e.countable?.unit ?? null,
    quantityDone: null,
  });
  warn.push(`activity ${e.activityId} came from EXPECTED_TODAY, not the WBS fixture`);
}

const byDescription = new Map([...registry.values()].map((a) => [a.description, a.activityId]));

section(
  "Activity registry. Stage 0.",
  upsert(
    "activities",
    [
      "id", "activity_id", "baseline_ver", "wbs_path", "level", "discipline",
      "work_front", "description", "tag_tokens", "planned_start", "planned_finish",
      "predecessors", "actual_start", "actual_finish", "percent_complete",
      "quantity_planned", "quantity_done", "quantity_unit", "schedule_label", "is_proposed",
    ],
    [...registry.values()].map((a) => [
      lit(uuid(`activity:${a.activityId}:${a.baselineVer}`)),
      lit(a.activityId), lit(a.baselineVer), lit(a.wbsPath), lit(a.level),
      lit(a.discipline), lit(a.workFront), lit(a.description),
      textArray(a.tagTokens), lit(a.plannedStart), lit(a.plannedFinish),
      textArray(a.predecessors), lit(a.actualStart), lit(a.actualFinish),
      lit(a.percentComplete ?? 0), lit(a.quantityPlanned ?? null),
      lit(a.quantityDone ?? null), lit(a.quantityUnit ?? null),
      lit(a.scheduleLabel), lit(a.isProposed),
    ]),
    ["activity_id", "baseline_ver"],
  ),
);

/* --------------------------------------------------------------------------- */
section(
  "Supervisor directory. Without phone numbers no call can be placed.",
  upsert(
    "supervisors",
    /* section_engineer, correction_rate and last_reported_at are added by 003,
       not 002. Omitting them leaves the coverage board reading "never
       reported" for everyone, which is the one thing that screen must never
       get wrong: it is where silence is supposed to become visible, and a
       board that calls everybody silent says nothing at all. */
    ["id", "full_name", "worker_id", "phone_e164", "discipline", "work_front",
     "shift_start", "shift_end", "is_active", "excused_until",
     "section_engineer", "correction_rate", "last_reported_at"],
    SUPERVISORS.map((s) => [
      lit(uuid(`sup:${s.id}`)), lit(s.name), lit(s.id),
      lit(s.phone.replace(/\s/g, "")), lit(s.discipline), lit(s.workFronts[0] ?? null),
      lit("07:00"), lit("15:00"), lit(true),
      lit(s.excused ? "2026-09-03" : null),
      lit(s.sectionEngineer ?? null), lit(s.correctionRate ?? 0),
      lit(s.lastReportedAt ?? null),
    ]),
    ["id"],
  ),
);

section(
  "Console seats. profiles.id is auth.users(id) once Supabase Auth is on.",
  upsert(
    "profiles",
    ["id", "full_name", "email", "role", "organisation"],
    CONSOLE_USERS.map((u) => [
      lit(uuid(`usr:${u.id}`)), lit(u.name), lit(u.email), lit(u.role), lit("OIL"),
    ]),
    ["id"],
  ),
);

section(
  "Per discipline gate settings. Threshold AND margin, never one alone.",
  upsert(
    "gate_settings",
    ["discipline", "threshold", "min_margin"],
    Object.entries(GATE_SETTINGS).map(([d, g]) => [lit(d), lit(g.threshold), lit(g.minMargin)]),
    ["discipline"],
  ),
);

/* ---------------------------------------------------------------------------
   The pipeline rows.

   One queue item decomposes into four tables: the verbatim report, the event
   extracted from it, every candidate the retrieval stage returned with its
   seven signals, and the decision. That decomposition is the reason this is
   generated: it is exactly where hand transcription goes wrong.
--------------------------------------------------------------------------- */
const reports = [];
const events = [];
const candidates = [];
const matches = [];
const clarifications = [];

function emitPipelineRow(key, r) {
  const reportId = uuid(`report:${key}`);
  const eventId = uuid(`event:${key}`);
  const matchId = uuid(`match:${key}`);

  reports.push([
    lit(reportId), lit(uuid(`sup:${r.reporterId}`)), lit(r.channel),
    lit(r.discipline), lit(r.workFront), lit(r.language),
    lit(r.rawPhrase), lit(r.normalised ?? null), lit(null),
    lit(r.capturedAt), lit(r.receivedAt),
  ]);

  events.push([
    lit(eventId), lit(reportId), lit(r.eventType), lit(null), lit(r.workFront),
    lit(r.quantity?.value ?? null), lit(r.quantity?.unit ?? null),
    lit(r.actualFinish ?? r.actualStart ?? null), lit(r.evidenceSpan),
    lit(r.status), lit(r.spokenStart ?? null), lit(r.spokenFinish ?? null),
    lit(r.actualStart ?? null), lit(r.actualFinish ?? null), lit(r.timeValidation),
  ]);

  (r.candidates ?? []).forEach((c, i) => {
    candidates.push([
      lit(eventId), lit(c.activityId), lit(i + 1),
      lit(c.signals.s_tag), lit(c.signals.s_lex), lit(c.signals.s_sem),
      lit(c.signals.s_front), lit(c.signals.s_date), lit(c.signals.s_logic),
      lit(c.signals.s_hist), lit(c.score),
    ]);
  });

  matches.push([
    lit(matchId), lit(eventId), lit(r.matchedActivityId ?? null), lit(3),
    lit(r.confidence), lit(r.margin), lit(r.resolvedTier), lit(r.decision),
    lit(r.status), lit(null), lit(null), lit(r.rejectReason ?? null),
    lit(r.capturedAt), lit(r.gateReason ?? null),
    r.fanOut ? textArray(r.fanOut) : "null", lit(r.proposedParent ?? null),
  ]);

  if (r.clarification) {
    clarifications.push([
      lit(uuid(`clar:${key}`)), lit(matchId), lit(eventId),
      lit(r.clarification.question),
      r.clarification.options ? textArray(r.clarification.options) : "null",
      lit(uuid("usr:usr-anjali")), lit(r.clarification.askedAt), lit(null),
      lit(r.clarification.answer ?? null), lit(r.clarification.answeredAt ?? null),
    ]);
  }
}

for (const item of QUEUE) {
  emitPipelineRow(item.id, {
    ...item,
    matchedActivityId: item.decision === "unmatched_new" ? null : item.candidates[0]?.activityId,
  });
}

/* fu-01 and fu-04 are the supervisor's view of q-01 and q-04, the same two
   events seen from the other surface. Seeding them again would double count
   them in every metric on W10. The remaining four are genuinely separate
   rows, in states the review queue view excludes by design. */
const ALREADY_IN_QUEUE = new Map([
  ["fu-01", "q-01"],
  ["fu-04", "q-04"],
]);

/* Anything referencing a field update by id has to follow that aliasing, or
   it points at a match row that was deliberately never written. */
const matchKey = (updateId) => ALREADY_IN_QUEUE.get(updateId) ?? updateId;

for (const u of MY_UPDATES) {
  if (ALREADY_IN_QUEUE.has(u.id)) continue;
  const activityId = byDescription.get(u.activityDescription) ?? null;
  if (!activityId) warn.push(`field update ${u.id} has no activity for "${u.activityDescription}"`);
  emitPipelineRow(u.id, {
    reporterId: "sup-ramesh",
    channel: u.channel === "offline" ? "app" : u.channel,
    discipline: "piping",
    workFront: "South Rack",
    language: "English",
    rawPhrase: u.what,
    normalised: null,
    capturedAt: u.at,
    receivedAt: u.at,
    eventType: u.eventType,
    evidenceSpan: u.what,
    quantity: null,
    spokenStart: null,
    spokenFinish: null,
    actualStart: u.actualStart ?? null,
    actualFinish: u.actualFinish ?? null,
    timeValidation: u.actualStart || u.actualFinish ? "ok" : "none_given",
    confidence: 0.9,
    margin: 0.3,
    resolvedTier: 1,
    candidates: activityId
      ? [{
          activityId,
          description: u.activityDescription,
          score: 0.9,
          signals: { s_tag: null, s_lex: 0.9, s_sem: 0.9, s_front: 1, s_date: 0.9, s_logic: 1, s_hist: 0.94 },
        }]
      : [],
    matchedActivityId: activityId,
    decision: u.status === "auto_applied" ? "auto_applied" : "needs_review",
    status: u.status,
    rejectReason: u.rejectReason ?? null,
    gateReason: null,
    /* extracted_events.status is the six status vocabulary too. */
    ...{},
  });
}

section(
  "Stage 1. Verbatim capture, never mutated. The audit anchor.",
  upsert("raw_reports",
    ["id", "reporter_id", "channel", "discipline", "work_front", "language",
     "original_text", "normalised_en", "media_url", "captured_at", "received_at"],
    reports, ["id"]),
);

section(
  "Stage 3. Extraction, with the time evidence 004 added.",
  upsert("extracted_events",
    ["id", "raw_report_id", "event_type", "object_phrase", "location_phrase",
     "quantity", "quantity_unit", "event_time", "evidence_span", "status",
     "spoken_start", "spoken_finish", "actual_start", "actual_finish", "time_validation"],
    events, ["id"]),
);

section(
  "Stage 4. Every candidate the retrieval stage returned, all seven signals.",
  upsert("match_candidates",
    ["event_id", "activity_id", "rank", "s_tag", "s_lex", "s_sem",
     "s_front", "s_date", "s_logic", "s_hist", "score"],
    candidates, ["event_id", "activity_id"]),
);

section(
  "Stage 5 and 6. The decision, and why the gate held it.",
  upsert("matches",
    ["id", "event_id", "activity_id", "baseline_ver", "confidence", "top2_margin",
     "resolved_tier", "decision", "status", "reviewed_by", "reviewed_at",
     "reject_reason", "created_at", "gate_reason", "fan_out", "proposed_parent"],
    matches, ["id"]),
);

section(
  "The one planner action allowed to interrupt a supervisor.",
  upsert("clarifications",
    ["id", "match_id", "event_id", "question", "options", "asked_by",
     "asked_at", "reminded_at", "answer", "answered_at"],
    clarifications, ["id"]),
);

/* --------------------------------------------------------------------------- */
section(
  "Blockers. The delay cause taxonomy that answers the CAG finding.",
  upsert("blockers",
    ["id", "event_id", "activity_id", "cause", "note", "raised_by", "raised_at",
     "resolved_by", "resolved_at", "resolution_note"],
    BLOCKERS.map((b) => [
      lit(uuid(`blk:${b.id}`)), lit(null), lit(b.activityId),
      lit(b.cause), lit(b.note), lit(uuid(`sup:${b.raisedById}`)), lit(b.raisedAt),
      lit(b.resolvedAt ? uuid("usr:usr-anjali") : null), lit(b.resolvedAt ?? null),
      lit(b.resolutionNote ?? null),
    ]),
    ["id"]),
);

section(
  "Calls. attempt_id is Sarvam's, so real traffic reconciles against these.",
  upsert("calls",
    ["id", "attempt_id", "interaction_id", "supervisor_id", "trigger_source",
     "triggered_by", "status", "duration_s", "transcript", "recording_url",
     "placed_at", "completed_at"],
    CALLS.map((c) => [
      lit(uuid(`call:${c.id}`)), lit(c.id), lit(null),
      lit(uuid(`sup:${c.supervisorId}`)),
      lit(c.trigger === "missed_call" ? "supervisor" : c.trigger),
      lit(c.triggeredBy ? uuid("usr:usr-ravi") : null),
      lit(c.disposition), lit(c.durationSec ?? null), lit(null), lit(null),
      lit(c.placedAt), lit(c.endedAt ?? null),
    ]),
    ["id"]),
);

const supervisorByName = new Map(SUPERVISORS.map((s) => [s.name, s.id]));
const consoleUserByName = new Map(CONSOLE_USERS.map((u) => [u.name, u.id]));

/**
 * A person's id from their name and the seat they acted in.
 *
 * The fixtures name people the way the interface does, in words, because that
 * is what a planner reads. The database keys on ids. Getting this wrong is
 * quiet and serious: it attributes an action to somebody who did not take it,
 * on the two tables the spec calls evidence after an incident or a claim.
 */
function personId(name, role, context) {
  if (role === "system") return null;
  if (role === "manager" || role === "planner") {
    const u = consoleUserByName.get(name);
    if (u) return uuid(`usr:${u}`);
  }
  const s = supervisorByName.get(name);
  if (s) return uuid(`sup:${s}`);
  const u = consoleUserByName.get(name);
  if (u) return uuid(`usr:${u}`);
  warn.push(`${context} "${name}" matches no seeded person, stored as null`);
  return null;
}

const raiserId = (name, role) => personId(name, role, "SOS raised by");

const sosRecipients = [];
section(
  "Emergency. Never enters the review queue, never rate limited.",
  upsert("sos_events",
    ["id", "kind", "raised_by", "raised_by_role", "category", "severity", "message",
     "work_front", "discipline", "lat", "lng", "accuracy_m", "is_drill",
     "channel_used", "created_at", "acknowledged_by", "acknowledged_at",
     "resolved_at", "resolution_note"],
    SOS_EVENTS.map((s) => {
      const id = uuid(`sos:${s.id}`);
      for (const r of s.recipients ?? []) {
        sosRecipients.push([
          lit(id), lit(uuid(`sup:${r.userId}`)),
          lit(r.deliveredAt ?? null), lit(r.seenAt ?? null),
        ]);
      }
      return [
        lit(id), lit(s.kind),
        /* raisedBy is a person's name in the fixtures, not an id. Minting a
           uuid from the SOS id here would attribute an emergency to a
           supervisor who does not exist, on the one table the spec calls
           evidence after a real incident. */
        lit(raiserId(s.raisedBy, s.raisedByRole)),
        lit(s.raisedByRole), lit(s.category), lit(s.severity ?? null),
        lit(s.message ?? null), lit(s.workFront ?? null), lit(s.discipline ?? null),
        lit(s.lat ?? null), lit(s.lng ?? null), lit(s.accuracyM ?? null),
        lit(s.isDrill), lit(s.channelUsed), lit(s.createdAt),
        lit(s.acknowledgedBy ? uuid("usr:usr-ravi") : null),
        lit(s.acknowledgedAt ?? null), lit(s.resolvedAt ?? null),
        lit(s.resolutionNote ?? null),
      ];
    }),
    ["id"]),
);

section(
  "Broadcast read receipts. The unacknowledged list never auto clears.",
  upsert("sos_recipients", ["sos_id", "user_id", "delivered_at", "seen_at"],
    sosRecipients, ["sos_id", "user_id"]),
);

section(
  "Disputed rejections. Answered by the EIC, not the planner who rejected it.",
  upsert("rejection_disputes",
    ["id", "match_id", "raised_by", "route", "reject_reason", "media_url",
     "transcript", "language", "state", "raised_at", "seen_by", "seen_at"],
    DISPUTES.map((d) => [
      lit(uuid(`dsp:${d.id}`)), lit(uuid(`match:${matchKey(d.updateId)}`)),
      lit(uuid(`sup:${d.raisedById}`)), lit(d.route), lit(d.rejectReason),
      lit(null), lit(d.transcript ?? null), lit(d.language ?? "English"),
      lit(d.state ?? "queued"), lit(d.raisedAt),
      lit(d.seenAt ? uuid("usr:usr-ravi") : null), lit(d.seenAt ?? null),
    ]),
    ["id"]),
);

/* audit_log is append only and has a bigserial key, so it cannot be upserted.
   Guarded instead: it inserts only into an empty log. */
const auditRows = [];
for (const [activityId, trail] of Object.entries(AUDIT_TRAILS)) {
  for (const e of trail) {
    auditRows.push(
      `  (${["'activity'", lit(uuid(`activity:${activityId}:3`)), lit(e.action),
        lit(personId(e.actor, e.actorRole, "audit actor")),
        lit(e.actorRole),
        lit(JSON.stringify({ detail: e.detail, before: e.before ?? null })) + "::jsonb",
        lit(JSON.stringify({ actor: e.actor, after: e.after ?? null })) + "::jsonb",
        lit(e.at)].join(", ")})`,
    );
  }
}
/* Every other statement here is a plain INSERT ... VALUES, where Postgres
   coerces an unknown-typed literal straight to the target column's type. This
   one is an INSERT ... SELECT over a VALUES list, and there the literal types
   are resolved BEFORE the insert sees them, so a uuid arrives as text and the
   insert is rejected. The casts belong in the select for that reason.

   It is written this way because audit_log takes a bigserial key and therefore
   cannot be upserted; the guard makes it insert only into an empty log. */
section(
  "Audit trail. Append only, so this runs once into an empty log.",
  auditRows.length === 0
    ? "-- no audit fixtures\n"
    : `insert into public.audit_log (entity_type, entity_id, action, actor_id, actor_role, before, after, at)\n` +
      `select\n` +
      `  v.entity_type,\n` +
      `  v.entity_id::uuid,\n` +
      `  v.action,\n` +
      `  v.actor_id::uuid,\n` +
      `  v.actor_role,\n` +
      `  v.before::jsonb,\n` +
      `  v.after::jsonb,\n` +
      `  v.at::timestamptz\n` +
      `from (values\n${auditRows.join(",\n")}\n) as v(entity_type, entity_id, action, actor_id, actor_role, before, after, at)\n` +
      `where not exists (select 1 from public.audit_log);\n`,
);

const header = `-- ============================================================
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
-- DATES ARE RELATIVE. The fixtures are authored against ${ANCHOR} and every
-- date below is shifted by ${OFFSET_DAYS} day(s) so that "today" is ${today}.
-- v_coverage and fn_expected_today are relative to current_date, so a fixed
-- seed decays into an empty board within a day. Re-run the generator to
-- re-date the demo. TRACE_SEED_ANCHOR=none emits the unshifted fixture dates.
--
-- Generated ${today} from ${QUEUE.length} queue rows,
-- ${registry.size} activities, ${SUPERVISORS.length} supervisors.
-- ============================================================

begin;

`;

const footer = `
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
`;

writeFileSync(OUT, header + out.join("\n") + footer, "utf8");

console.log(`wrote ${OUT}`);
console.log(
  OFFSET_DAYS === 0
    ? `  dates unshifted (anchor ${ANCHOR})`
    : `  dates shifted ${OFFSET_DAYS > 0 ? "+" : ""}${OFFSET_DAYS} day(s): ${ANCHOR} reads as ${today}`,
);
console.log(
  `  activities ${registry.size} · supervisors ${SUPERVISORS.length} · reports ${reports.length} · ` +
  `events ${events.length} · candidates ${candidates.length} · matches ${matches.length} · ` +
  `clarifications ${clarifications.length} · blockers ${BLOCKERS.length} · calls ${CALLS.length} · ` +
  `sos ${SOS_EVENTS.length} · disputes ${DISPUTES.length} · audit ${auditRows.length}`,
);
if (warn.length) {
  console.log("\nnotes:");
  for (const w of [...new Set(warn)]) console.log("  - " + w);
}
