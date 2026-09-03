import type { CallRecord, SosEvent } from "@/types";

/**
 * THE OUTSTANDING BLOCKER, carried in code so no screen can quietly forget it.
 *
 * The manager's live call panel shows captured items appearing row by row as
 * the agent confirms each one. That works only because our own mid call tool
 * writes each item as it is confirmed. That tool has never fired on a live
 * call, because the trigger paragraph is missing from the agent's system
 * prompt. Until this flips to true, the live panel must say what it depends on
 * rather than render an empty frame that looks merely broken.
 */
export const MIDCALL_TOOL_VERIFIED = false;

/** The one genuinely real artefact in this build: a 106 second call captured
 *  end to end through Sarvam into Supabase on 31 August 2026. Every other
 *  record in this file is hand authored. */
export const CALLS: CallRecord[] = [
  {
    id: "call-2291",
    supervisorId: "sup-ramesh",
    supervisor: "Ramesh Bora",
    discipline: "piping",
    trigger: "supervisor",
    placedAt: "2026-09-01T16:10:20+05:30",
    connectedAt: "2026-09-01T16:10:38+05:30",
    endedAt: "2026-09-01T16:12:24+05:30",
    durationSec: 106,
    disposition: "completed",
    language: "Assamese and English",
    transcriptAvailable: true,
    recordingAvailable: true,
    activityIds: ["PIP-2400-ERC-015"],
    liveItems: [],
  },
  {
    id: "call-2288",
    supervisorId: "sup-jyoti",
    supervisor: "Jyotishman Das",
    discipline: "instrumentation",
    trigger: "manager",
    triggeredBy: "Ravi Kumar",
    placedAt: "2026-09-01T14:02:00+05:30",
    connectedAt: "2026-09-01T14:02:19+05:30",
    endedAt: "2026-09-01T14:05:11+05:30",
    durationSec: 172,
    disposition: "completed",
    language: "Assamese",
    transcriptAvailable: true,
    recordingAvailable: true,
    activityIds: ["INS-3100-LPC-022"],
    liveItems: [],
  },
  {
    id: "call-2285",
    supervisorId: "sup-hiren",
    supervisor: "Hiren Kalita",
    discipline: "civil",
    trigger: "automated",
    placedAt: "2026-09-01T15:05:00+05:30",
    disposition: "no_answer",
    transcriptAvailable: false,
    recordingAvailable: false,
    activityIds: ["CIV-1800-FDN-041", "CIV-1800-PAV-003"],
  },
  {
    id: "call-2280",
    supervisorId: "sup-bhaskar",
    supervisor: "Bhaskar Rabha",
    discipline: "static-rotating",
    trigger: "missed_call",
    placedAt: "2026-08-31T17:44:00+05:30",
    connectedAt: "2026-08-31T17:44:12+05:30",
    endedAt: "2026-08-31T17:45:50+05:30",
    durationSec: 98,
    disposition: "completed",
    language: "Hindi",
    transcriptAvailable: true,
    recordingAvailable: false,
    activityIds: ["STR-5200-ALN-002"],
  },
];

/**
 * Emergency. Two features, not one button: a supervisor SOS travels upward as
 * an incident, a manager broadcast travels downward. One control doing both
 * would be ambiguous at the exact moment ambiguity is most dangerous.
 */
export const SOS_EVENTS: SosEvent[] = [
  {
    id: "sos-04",
    kind: "broadcast",
    raisedBy: "Ravi Kumar",
    raisedByRole: "manager",
    category: "evacuation",
    message: "Mock evacuation of Unit 24. Muster at gate 3. This is a drill.",
    isDrill: true,
    channelUsed: "app",
    createdAt: "2026-08-28T10:00:00+05:30",
    resolvedAt: "2026-08-28T10:26:00+05:30",
    resolutionNote: "Drill closed. 41 of 47 acknowledged inside 12 minutes.",
    recipients: [
      { userId: "sup-ramesh", name: "Ramesh Bora", deliveredAt: "2026-08-28T10:00:03+05:30", seenAt: "2026-08-28T10:00:41+05:30" },
      { userId: "sup-nilim", name: "Nilim Hazarika", deliveredAt: "2026-08-28T10:00:03+05:30", seenAt: "2026-08-28T10:01:12+05:30" },
      { userId: "sup-jyoti", name: "Jyotishman Das", deliveredAt: "2026-08-28T10:00:04+05:30", seenAt: "2026-08-28T10:02:30+05:30" },
      { userId: "sup-pranab", name: "Pranab Saikia", deliveredAt: "2026-08-28T10:00:04+05:30" },
      { userId: "sup-hiren", name: "Hiren Kalita", deliveredAt: "2026-08-28T10:00:05+05:30" },
      { userId: "sup-bhaskar", name: "Bhaskar Rabha", deliveredAt: "2026-08-28T10:00:05+05:30", seenAt: "2026-08-28T10:03:04+05:30" },
      { userId: "sup-mridul", name: "Mridul Pegu", deliveredAt: "2026-08-28T10:00:06+05:30", seenAt: "2026-08-28T10:00:22+05:30" },
    ],
  },
  {
    id: "sos-03",
    kind: "incident",
    raisedBy: "Mridul Pegu",
    raisedByRole: "supervisor",
    category: "gas",
    severity: "high",
    message: "Smell of gas near the condensate manifold.",
    workFront: "North Rack",
    discipline: "hse",
    lat: 27.4728,
    lng: 94.9119,
    accuracyM: 8,
    isDrill: false,
    channelUsed: "app",
    createdAt: "2026-08-30T11:18:00+05:30",
    acknowledgedBy: "Ravi Kumar",
    acknowledgedAt: "2026-08-30T11:18:34+05:30",
    resolvedAt: "2026-08-30T12:05:00+05:30",
    resolutionNote: "Flange leak isolated. Line depressurised, joint remade.",
    escalation: [
      { at: "2026-08-30T11:18:00+05:30", step: "Raised. All consoles alerted, push to the on duty manager." },
      { at: "2026-08-30T11:18:34+05:30", step: "Acknowledged by Ravi Kumar inside 34 seconds. Ladder stopped." },
    ],
  },
];

export const CALL_BY_ID = new Map(CALLS.map((c) => [c.id, c]));
