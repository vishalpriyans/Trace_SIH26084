import type { Dispute, ExpectedActivity, FieldUpdate } from "@/types";

/**
 * The supervisor's own surface, seen as Ramesh Bora, piping, South Rack.
 *
 * Two rules govern every string in this file. No activity id ever appears,
 * because a supervisor is never asked to read, type or recognise one. And no
 * status is invented: the six from the shared vocabulary are the only states
 * an entry can be in, rendered here in the field wording.
 */

/** S2 Expected today. This list is also the retrieval envelope: it is what
 *  collapses the candidate space from tens of thousands to a handful before
 *  any model runs, which is why publishing the look ahead is the highest
 *  leverage action a planner takes. */
export const EXPECTED_TODAY: ExpectedActivity[] = [
  {
    id: "exp-1",
    activityId: "PIP-2400-ERC-015",
    description: 'Erect Line 24" - South Rack',
    workFront: "South Rack",
    discipline: "piping",
    plannedFinish: "2026-09-02",
    countable: { unit: "spools", suggested: 8 },
    state: "done",
    startedAt: "2026-08-31T07:30:00+05:30",
    scheduleLabel: "on_track",
  },
  {
    id: "exp-2",
    activityId: "PIP-2400-WLD-015",
    description: 'Weld joints Line 24" - South Rack',
    workFront: "South Rack",
    discipline: "piping",
    plannedFinish: "2026-09-09",
    countable: { unit: "joints", suggested: 2 },
    state: "blocked",
    scheduleLabel: "at_risk",
  },
  {
    id: "exp-3",
    activityId: "PIP-2400-SUP-021",
    description: "Fit pipe supports grid 10 to 14",
    workFront: "South Rack",
    discipline: "piping",
    plannedFinish: "2026-09-03",
    state: "in_progress",
    startedAt: "2026-09-02T08:10:00+05:30",
    scheduleLabel: "on_track",
  },
  {
    id: "exp-4",
    activityId: "PIP-2600-HYD-004",
    description: "Hydro test condensate line A",
    workFront: "Fab Yard",
    discipline: "piping",
    plannedFinish: "2026-09-04",
    state: "none",
    scheduleLabel: "on_track",
  },
];

/** S7 My updates. The receipt, and the only thing the app gives the
 *  supervisor back. It exists so they cannot be blamed later, which is a
 *  large part of why they keep using it at all. */
export const MY_UPDATES: FieldUpdate[] = [
  {
    id: "fu-01",
    activityDescription: 'Erect Line 24" - South Rack',
    what: "Finished. 8 spools.",
    status: "clarification",
    eventType: "finish",
    channel: "call",
    at: "2026-09-01T16:12:00+05:30",
    actualStart: "2026-08-31T07:30:00+05:30",
    actualFinish: "2026-09-01T14:30:00+05:30",
    quantity: "8 spools",
    scheduleLabel: "on_track",
    plannerNote: "Was this the north or the south rack?",
  },
  {
    id: "fu-02",
    activityDescription: 'Weld joints Line 24" - South Rack',
    what: "Blocked. Waiting on material.",
    status: "confirmed",
    eventType: "blocker",
    channel: "app",
    at: "2026-09-01T09:20:00+05:30",
    plannerNote: "Blocker raised, open 6 days.",
  },
  {
    id: "fu-03",
    activityDescription: "Fit pipe supports grid 10 to 14",
    what: "Started 08:10.",
    status: "auto_applied",
    eventType: "start",
    channel: "app",
    at: "2026-09-02T08:11:00+05:30",
    actualStart: "2026-09-02T08:10:00+05:30",
    scheduleLabel: "on_track",
  },
  {
    id: "fu-04",
    activityDescription: "Removed old pipe support at grid 10",
    what: "Cleared the old support before erection could start.",
    status: "needs_review",
    eventType: "progress",
    channel: "call",
    at: "2026-08-31T11:05:00+05:30",
  },
  {
    id: "fu-05",
    activityDescription: "Hydro test condensate line A",
    what: "Test pump reading noted.",
    status: "rejected",
    eventType: "progress",
    channel: "app",
    at: "2026-08-30T17:40:00+05:30",
    rejectReason: "duplicate",
    plannerNote: "Already logged by Nilim Hazarika at 17:02 the same day.",
  },
  {
    id: "fu-06",
    activityDescription: "Fit pipe supports grid 10 to 14",
    what: "Recorded offline at the work front.",
    status: "captured",
    eventType: "progress",
    channel: "offline",
    at: "2026-09-02T07:55:00+05:30",
    syncState: "saved_on_device",
  },
];

/** S8. Should almost always be empty. Asking a supervisor a question is the
 *  only planner action allowed to interrupt them, so it is used sparingly by
 *  design rather than by restraint. */
export const MY_QUESTIONS = [
  {
    id: "qn-1",
    updateId: "fu-01",
    activityDescription: 'Erect Line 24" - South Rack',
    originalPhrase:
      "South rack or north rack ase? Ami kali 24 inch line tu ercect korisilo, aji finish hol.",
    question: "Was this the north or the south rack?",
    options: ["South Rack", "North Rack", "Not sure"],
    askedAt: "2026-09-01T16:40:00+05:30",
    answer: "South Rack",
    answeredAt: "2026-09-01T17:02:00+05:30",
  },
];

/**
 * Answers to rejections. One captured, one still queued for the callback.
 *
 * These go to the Engineer in Charge, not back to the planner who rejected the
 * entry. A disputed rejection wants a different pair of eyes.
 */
export const DISPUTES: Dispute[] = [
  {
    id: "dsp-01",
    updateId: "fu-05",
    activityDescription: "Hydro test condensate line A",
    raisedBy: "Ramesh Bora",
    raisedById: "sup-ramesh",
    discipline: "piping",
    workFront: "South Rack",
    route: "voice_note",
    raisedAt: "2026-09-01T07:40:00+05:30",
    rejectReason: "duplicate",
    rejectNote: "Already logged by Nilim Hazarika at 17:02 the same day.",
    transcript:
      "Nilim tu north rack tut korisile. Moi south rack tut kora. Duta bilag line, eta nohoi.",
    language: "Assamese",
    recordingAvailable: true,
    state: "captured",
  },
  {
    id: "dsp-02",
    updateId: "fu-04",
    activityDescription: "Removed old pipe support at grid 10",
    raisedBy: "Ramesh Bora",
    raisedById: "sup-ramesh",
    discipline: "piping",
    workFront: "South Rack",
    route: "callback",
    raisedAt: "2026-09-02T06:20:00+05:30",
    rejectReason: "not a progress update",
    recordingAvailable: false,
    state: "queued",
  },
];

/** The signed in supervisor for this build. Real authentication is de-scoped
 *  by the spec; this stands in for a session. */
export const FIELD_USER = {
  id: "sup-ramesh",
  name: "Ramesh Bora",
  discipline: "piping" as const,
  workFront: "South Rack",
  shift: "07:00 to 15:00",
  siteEmergencyNumber: "1800 000 0000",
};
