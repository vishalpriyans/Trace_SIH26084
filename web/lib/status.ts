/**
 * The shared status vocabulary, spec section 9.1.
 *
 * Exactly six, used verbatim on both surfaces. Never invent a seventh and never
 * re-word one: the two surfaces drift apart the moment one app carries a status
 * the other lacks. Because this is a union type rather than a string, a seventh
 * value fails to compile instead of failing in review.
 */
export const STATUSES = [
  "captured",
  "auto_applied",
  "needs_review",
  "clarification",
  "confirmed",
  "rejected",
] as const;

export type Status = (typeof STATUSES)[number];

export type Tone = "ok" | "warn" | "crit" | "idle" | "accent";

interface StatusPresentation {
  /** What the planner and the manager read on web. */
  web: string;
  /** What the supervisor reads on the field surface. */
  field: string;
  /** Whether the supervisor has anything to do about it. */
  fieldActionable: boolean;
  tone: Tone;
  meaning: string;
}

export const STATUS: Record<Status, StatusPresentation> = {
  captured: {
    web: "In processing",
    field: "Sent",
    fieldActionable: false,
    tone: "idle",
    meaning: "Received, not yet linked to an activity.",
  },
  auto_applied: {
    web: "Auto applied",
    field: "Confirmed",
    fieldActionable: false,
    tone: "ok",
    meaning: "Matched above threshold and margin, posted to the schedule staging table.",
  },
  needs_review: {
    // The supervisor is not told this one is uncertain and is not asked to fix
    // it. That is the planner's job, not theirs.
    web: "Needs review",
    field: "Sent",
    fieldActionable: false,
    tone: "warn",
    meaning: "Below threshold, or the top two candidates sit too close to separate.",
  },
  clarification: {
    web: "Awaiting supervisor",
    field: "1 question for you",
    fieldActionable: true,
    tone: "accent",
    meaning: "The planner has asked a question only the supervisor can answer.",
  },
  confirmed: {
    web: "Confirmed",
    field: "Confirmed",
    fieldActionable: false,
    tone: "ok",
    meaning: "A planner approved it.",
  },
  rejected: {
    // Never a silent disappearance. That is how field trust dies.
    web: "Rejected",
    field: "Not accepted, tap to see why",
    fieldActionable: true,
    tone: "crit",
    meaning: "Not valid or out of scope. The reason is always carried with it.",
  },
};

/** Reasons a rejection can carry. Spec P-5: the reason is mandatory. */
export const REJECT_REASONS = [
  "duplicate",
  "out of scope",
  "not a progress update",
  "test or noise",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

/**
 * The on-track label, spec section 3.4. Derived nightly by the re-labelling
 * pass, never typed in by a person.
 */
export const SCHEDULE_LABELS = ["ahead", "on_track", "at_risk", "behind"] as const;
export type ScheduleLabel = (typeof SCHEDULE_LABELS)[number];

export const SCHEDULE_LABEL: Record<ScheduleLabel, { text: string; tone: Tone }> = {
  ahead: { text: "Ahead", tone: "ok" },
  on_track: { text: "On track", tone: "ok" },
  at_risk: { text: "At risk", tone: "warn" },
  behind: { text: "Behind", tone: "crit" },
};

/** The delay-cause taxonomy from S5. These chips feed institutional memory, so
 *  they are a closed list rather than free text. */
export const BLOCKER_CAUSES = [
  "material",
  "crew",
  "equipment",
  "permit",
  "weather",
  "other",
] as const;

export type BlockerCause = (typeof BLOCKER_CAUSES)[number];

export const BLOCKER_CAUSE_LABEL: Record<BlockerCause, string> = {
  material: "Waiting on material",
  crew: "Waiting on crew",
  equipment: "Equipment",
  permit: "Permit",
  weather: "Weather",
  other: "Other",
};

export const DISCIPLINES = [
  "civil",
  "piping",
  "static-rotating",
  "electrical",
  "instrumentation",
  "hse",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  civil: "Civil",
  piping: "Piping",
  "static-rotating": "Static and rotating",
  electrical: "Electrical",
  instrumentation: "Instrumentation",
  hse: "HSE",
};

/** Which tier of the cascade resolved a match. Reported as a metric, because
 *  "tier 0 and 1 resolved N percent" is a stronger claim than "we used AI". */
export const TIER_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "Tier 0 · exact tag",
  1: "Tier 1 · lexical",
  2: "Tier 2 · semantic",
  3: "Tier 3 · language model",
};
