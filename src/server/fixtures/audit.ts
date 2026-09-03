import type { AuditEntry } from "@/types";

/**
 * W3. The audit trail is the screen that makes an actual date defensible in a
 * claim or an audit, so it reads as an ordered chain rather than a log dump:
 * source report, extraction, match with the tier that resolved it, gate
 * decision, human action, and every correction since.
 *
 * Nothing is ever overwritten. A correction is a new event superseding an old
 * one, and both stay visible.
 */
export const AUDIT_TRAILS: Record<string, AuditEntry[]> = {
  "PIP-2400-ERC-015": [
    {
      at: "2026-09-01T16:10:20+05:30",
      actor: "Ramesh Bora",
      actorRole: "supervisor",
      action: "Call placed",
      detail:
        "Supervisor requested the call from Today. Candidate set pre loaded from the published look ahead: 4 activities.",
    },
    {
      at: "2026-09-01T16:12:04+05:30",
      actor: "Capture",
      actorRole: "system",
      action: "Raw report stored",
      detail:
        "Verbatim Assamese and English, 106 second call. The original is the audit anchor and is never mutated.",
      after:
        "South rack or north rack ase? Ami kali 24 inch line tu ercect korisilo, aji finish hol.",
    },
    {
      at: "2026-09-01T16:12:05+05:30",
      actor: "Normalise",
      actorRole: "system",
      action: "English normalisation written beside the original",
      detail: "Detected language: Assamese and English. The original is kept, not replaced.",
      after:
        "Which rack is it, south or north? We were erecting the 24 inch line yesterday, today it finished.",
    },
    {
      at: "2026-09-01T16:12:06+05:30",
      actor: "Extract",
      actorRole: "system",
      action: "Event extracted",
      detail:
        'Type finish. Evidence span "24 inch line tu ercect korisilo, aji finish hol". Spoken times kept verbatim beside the normalised values.',
    },
    {
      at: "2026-09-01T16:12:06+05:30",
      actor: "Match",
      actorRole: "system",
      action: "Resolved at tier 2, semantic",
      detail:
        "Confidence 0.874 against a piping threshold of 0.86. Margin 0.291 against a minimum of 0.08. Both conditions met.",
    },
    {
      at: "2026-09-01T16:12:06+05:30",
      actor: "Gate",
      actorRole: "system",
      action: "Held for review",
      detail:
        "The reporter asked which rack inside the utterance itself. An unresolved question in the source outranks a passing score.",
    },
    {
      at: "2026-09-01T16:40:00+05:30",
      actor: "Anjali Sharma",
      actorRole: "planner",
      action: "Clarification asked",
      detail: "Was this the north or the south rack? Three options attached for a one tap answer.",
    },
    {
      at: "2026-09-01T17:02:00+05:30",
      actor: "Ramesh Bora",
      actorRole: "supervisor",
      action: "Answered",
      detail: "South Rack. Item returns to the top of the queue marked answered.",
      after: "South Rack",
    },
  ],
  "PIP-2400-WLD-015": [
    {
      at: "2026-09-01T09:14:00+05:30",
      actor: "Ramesh Bora",
      actorRole: "supervisor",
      action: "Raw report stored",
      detail: "Typed in English from the field surface.",
      after: "Two joints welded on the 24 inch line at south rack this morning.",
    },
    {
      at: "2026-09-01T09:14:02+05:30",
      actor: "Match",
      actorRole: "system",
      action: "Resolved at tier 1, lexical",
      detail:
        'Textually near perfect against Weld joints Line 24" - South Rack. s_lex 0.94, s_sem 0.91.',
    },
    {
      at: "2026-09-01T09:14:02+05:30",
      actor: "Gate",
      actorRole: "system",
      action: "Held for review on schedule topology",
      detail:
        "s_logic 0.08. The predecessor PIP-2400-ERC-015 is 78 percent complete. You cannot weld a joint on a spool that is not erected, so topology pulled the score below the piping threshold. A pure text matcher would have written a wrong actual start here and nobody would have noticed for a month.",
    },
  ],
};

export const DEFAULT_TRAIL: AuditEntry[] = [
  {
    at: "2026-09-01T00:00:00+05:30",
    actor: "Baseline load",
    actorRole: "system",
    action: "Activity registered",
    detail:
      "Loaded from the P6 export at baseline version 3. No field report has been matched to this activity yet.",
  },
];
