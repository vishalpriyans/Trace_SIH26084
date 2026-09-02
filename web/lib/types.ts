import type {
  BlockerCause,
  Discipline,
  RejectReason,
  ScheduleLabel,
  Status,
} from "./status";

export type Role = "supervisor" | "planner" | "manager";
export type Channel = "call" | "app" | "upload" | "missed_call" | "offline";
export type Tier = 0 | 1 | 2 | 3;

/** Stage 0 of the pipeline. The versioned activity registry loaded from a P6
 *  or MSP export. Actual dates are derived by the rollup rule and never
 *  written directly, or an activity finishes three times. */
export interface Activity {
  activityId: string;
  baselineVer: number;
  wbsPath: string;
  level: "L5" | "L6";
  discipline: Discipline;
  workFront: string;
  description: string;
  tagTokens: string[];
  plannedStart: string;
  plannedFinish: string;
  predecessors: string[];
  actualStart: string | null;
  actualFinish: string | null;
  percentComplete: number;
  quantityPlanned?: number;
  quantityDone?: number;
  quantityUnit?: string;
  scheduleLabel: ScheduleLabel;
  isProposed: boolean;
}

/** The seven scoring signals, spec section 5.1. Every one of these is hand
 *  authored in this build: the matching engine does not exist yet. */
export interface Signals {
  /** Exact tag or line-number token match. Dominant when present. */
  s_tag: number | null;
  /** Normalised BM25 over the description. */
  s_lex: number;
  /** Embedding cosine similarity. */
  s_sem: number;
  /** Work-front agreement. */
  s_front: number;
  /** Plausibility against the planned window. */
  s_date: number;
  /** Predecessor satisfaction in the schedule. The differentiator. */
  s_logic: number;
  /** The reporter's historical correction rate. Low weight, grows with data. */
  s_hist: number;
}

export const SIGNAL_META: Record<
  keyof Signals,
  { label: string; weightClass: string; note: string }
> = {
  s_tag: {
    label: "s_tag",
    weightClass: "Dominant",
    note: "Exact tag or line number token match. Near deterministic when present.",
  },
  s_lex: { label: "s_lex", weightClass: "High", note: "Normalised BM25 over the description." },
  s_sem: { label: "s_sem", weightClass: "High", note: "Embedding cosine similarity." },
  s_front: { label: "s_front", weightClass: "Medium", note: "Work front agreement." },
  s_date: { label: "s_date", weightClass: "Medium", note: "Plausibility against the planned window." },
  s_logic: {
    label: "s_logic",
    weightClass: "Medium",
    note: "Predecessor satisfaction in the schedule. You cannot weld a joint on a spool that is not erected.",
  },
  s_hist: {
    label: "s_hist",
    weightClass: "Low",
    note: "The reporter's historical correction rate. Grows with data.",
  },
};

export interface Candidate {
  activityId: string;
  description: string;
  score: number;
  signals: Signals;
}

/**
 * A row in the review queue. One extracted event, its best match, and
 * everything a planner needs to decide without leaving the row.
 */
export interface QueueItem {
  id: string;
  /** Verbatim, as spoken or typed. The audit anchor, never mutated. */
  rawPhrase: string;
  /** English normalisation. The original is kept beside it, not replaced. */
  normalised?: string;
  language: string;
  channel: Channel;
  reporter: string;
  reporterId: string;
  discipline: Discipline;
  workFront: string;
  capturedAt: string;
  receivedAt: string;

  eventType: "start" | "finish" | "progress" | "blocker" | "safety";
  /** The verbatim substring that produced the event. */
  evidenceSpan: string;
  quantity?: { value: number; unit: string; of?: number };

  /** Raw spoken time phrase, kept beside the normalised value. Never a silent
   *  guess: the normalised value is read back for confirmation. */
  spokenStart?: string;
  spokenFinish?: string;
  actualStart?: string | null;
  actualFinish?: string | null;
  timeValidation: "ok" | "missing_start" | "missing_finish" | "implausible" | "none_given";

  confidence: number;
  /** score_top1 minus score_top2. Auto-apply needs threshold AND margin. */
  margin: number;
  resolvedTier: Tier;
  candidates: Candidate[];
  /** Empty when the top candidate cleared both conditions. */
  gateReason: string | null;

  status: Status;
  decision: "auto_applied" | "needs_review" | "unmatched_new";
  /** Set when the planner asked a question and the supervisor answered. */
  clarification?: {
    question: string;
    options?: string[];
    askedAt: string;
    answer?: string;
    answeredAt?: string;
  };
  rejectReason?: RejectReason;
  rejectNote?: string;
  /** Spec 6.2. One utterance that legitimately hits more than one activity. */
  fanOut?: string[];
  /** Spec 6.3. Genuinely new work with no home in the WBS. */
  proposedParent?: string;
  callId?: string;
}

export interface Supervisor {
  id: string;
  name: string;
  phone: string;
  discipline: Discipline;
  workFronts: string[];
  sectionEngineer: string;
  lastReportedAt: string | null;
  /** How many of their expected activities they have accounted for today. */
  reportedToday: number;
  expectedToday: number;
  excused?: string;
  /** Correction rate feeds s_hist. */
  correctionRate: number;
}

export interface Blocker {
  id: string;
  activityId: string | null;
  activityDescription: string;
  cause: BlockerCause;
  note: string;
  raisedBy: string;
  raisedById: string;
  discipline: Discipline;
  workFront: string;
  raisedAt: string;
  /** Whole hours since raised. Ageing is the point: a blocker open for six
   *  days should look wrong. */
  ageHours: number;
  resolvedAt?: string;
  resolutionNote?: string;
  owner?: string;
  dueAt?: string;
  hasPhoto?: boolean;
  hasVoiceNote?: boolean;
}

export interface FieldUpdate {
  id: string;
  /** The plain description. Never an activity id on this surface. */
  activityDescription: string;
  what: string;
  status: Status;
  eventType: QueueItem["eventType"];
  channel: Channel;
  at: string;
  actualStart?: string;
  actualFinish?: string;
  quantity?: string;
  scheduleLabel?: ScheduleLabel;
  plannerNote?: string;
  rejectReason?: RejectReason;
  /** Offline entries move through saved, sent, confirmed. */
  syncState?: "saved_on_device" | "sent" | "confirmed";
  supersededBy?: string;
  supersedes?: string;
}

/**
 * A supervisor's answer to a rejection.
 *
 * The console can already tell a supervisor their entry was not accepted and
 * why. Until now that was a one way door: told no, with no route back, on a
 * surface whose whole argument is that nothing is ever discarded.
 *
 * The reply rides the channel the product is actually built on rather than a
 * text box. The supervisor asks for a callback or records a voice note; the
 * note is transcribed server side on sync, exactly like every other captured
 * audio; and the result goes to the Engineer in Charge rather than back to the
 * planner who rejected it, because a disputed rejection needs a different pair
 * of eyes and not the same ones.
 */
export interface Dispute {
  id: string;
  updateId: string;
  activityDescription: string;
  raisedBy: string;
  raisedById: string;
  discipline: Discipline;
  workFront: string;
  /** How the supervisor chose to answer. Never a typed form. */
  route: "callback" | "voice_note";
  raisedAt: string;
  /** What they are answering. Carried so the manager sees both sides. */
  rejectReason: RejectReason;
  rejectNote?: string;
  /** Present once the audio has been transcribed server side. */
  transcript?: string;
  language?: string;
  recordingAvailable: boolean;
  state: "queued" | "captured" | "seen";
  seenBy?: string;
  seenAt?: string;
}

export interface ExpectedActivity {
  id: string;
  activityId: string;
  description: string;
  workFront: string;
  discipline: Discipline;
  plannedFinish: string;
  countable?: { unit: string; suggested: number };
  state: "none" | "in_progress" | "done" | "blocked";
  startedAt?: string;
  scheduleLabel: ScheduleLabel;
}

export interface SosEvent {
  id: string;
  kind: "incident" | "broadcast";
  raisedBy: string;
  raisedByRole: Role;
  category:
    | "fire"
    | "gas"
    | "injury"
    | "fall"
    | "structural"
    | "evacuation"
    | "other";
  severity?: "high" | "critical";
  message?: string;
  workFront?: string;
  discipline?: Discipline;
  lat?: number;
  lng?: number;
  accuracyM?: number;
  isDrill: boolean;
  channelUsed: "app" | "sms" | "offline_queued";
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  /** Broadcast only. The unacknowledged list is the only thing that matters
   *  in an evacuation, so it never auto-clears. */
  recipients?: { userId: string; name: string; deliveredAt?: string; seenAt?: string }[];
  escalation?: { at: string; step: string }[];
}

export interface CallRecord {
  id: string;
  supervisorId: string;
  supervisor: string;
  discipline: Discipline;
  trigger: "supervisor" | "manager" | "automated" | "missed_call";
  triggeredBy?: string;
  placedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSec?: number;
  disposition: "completed" | "no_answer" | "busy" | "rejected" | "in_progress";
  language?: string;
  /** Items our own mid call tool wrote as the agent confirmed each one. This
   *  is the only genuinely live surface in the product. */
  liveItems?: { at: string; text: string; activityDescription: string }[];
  transcriptAvailable: boolean;
  recordingAvailable: boolean;
  activityIds: string[];
}

export interface Clarification {
  id: string;
  queueItemId: string;
  question: string;
  options?: string[];
  askedBy: string;
  askedAt: string;
  originalPhrase: string;
  activityDescription: string;
  answer?: string;
  answeredAt?: string;
  remindedAt?: string;
}

/** Spec section 15. Metrics that genuinely are not measured read "not
 *  measured" rather than a plausible zero. */
export interface Metric {
  key: string;
  label: string;
  definition: string;
  value: number | null;
  unit: string;
  baseline: number | null;
  trend: number[] | null;
  target: "rising" | "falling" | "none";
  note?: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  actorRole: Role | "system";
  action: string;
  detail: string;
  before?: string;
  after?: string;
}

export interface CoverageRow {
  supervisor: Supervisor;
  state: "reported" | "partial" | "silent" | "excused";
  lastAt: string | null;
  nudgedAt?: string[];
}
