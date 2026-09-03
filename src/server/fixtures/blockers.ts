import type { Blocker } from "@/types";

/**
 * The blocker board. Ageing is the whole point: a blocker open for six days
 * should look wrong on screen before anyone reads the note.
 *
 * The cause values are a closed list, not free text, because they are the
 * delay-cause taxonomy that feeds institutional memory. CAG Report 42/2015
 * found this organisation's board received target versus achievement figures
 * but not the structured reasons for chronic shortfall. This list is the
 * answer to that finding, so it cannot be a text box.
 */
export const BLOCKERS: Blocker[] = [
  {
    id: "blk-01",
    activityId: "PIP-2400-WLD-015",
    activityDescription: 'Weld joints Line 24" - South Rack',
    cause: "material",
    note: "Welding consumables not released from stores. E7018 rods short.",
    raisedBy: "Ramesh Bora",
    raisedById: "sup-ramesh",
    discipline: "piping",
    workFront: "South Rack",
    raisedAt: "2026-08-26T09:15:00+05:30",
    ageHours: 151,
    hasPhoto: true,
  },
  {
    id: "blk-02",
    activityId: "INS-3100-LPC-022",
    activityDescription: "Loop check PT-3104 - CDU Unit",
    cause: "permit",
    note: "Hot work permit expired at noon, not renewed.",
    raisedBy: "Jyotishman Das",
    raisedById: "sup-jyoti",
    discipline: "instrumentation",
    workFront: "CDU Unit",
    raisedAt: "2026-09-01T12:40:00+05:30",
    ageHours: 28,
    hasVoiceNote: true,
  },
  {
    id: "blk-03",
    activityId: "ELE-4400-CBL-008",
    activityDescription: "Cable pulling feeder 4 - Substation 4",
    cause: "crew",
    note: "Two cable jointers pulled to the tank farm. Front idle since morning.",
    raisedBy: "Pranab Saikia",
    raisedById: "sup-pranab",
    discipline: "electrical",
    workFront: "Substation 4",
    raisedAt: "2026-08-31T08:00:00+05:30",
    ageHours: 57,
    owner: "R. Deka",
    dueAt: "2026-09-02T17:00:00+05:30",
  },
  {
    id: "blk-04",
    activityId: "CIV-1800-PAV-003",
    activityDescription: "Paving Unit 18 access road",
    cause: "weather",
    note: "Continuous rain since Saturday. Subgrade will not compact.",
    raisedBy: "Dhruba Gogoi",
    raisedById: "sup-dhruba",
    discipline: "civil",
    workFront: "Unit 18 paving",
    raisedAt: "2026-08-29T06:30:00+05:30",
    ageHours: 106,
  },
  {
    id: "blk-05",
    activityId: "STR-5200-ALN-002",
    activityDescription: "Compressor K-5201 alignment",
    cause: "equipment",
    note: "Laser alignment kit under calibration at the vendor.",
    raisedBy: "Bhaskar Rabha",
    raisedById: "sup-bhaskar",
    discipline: "static-rotating",
    workFront: "Compressor House",
    raisedAt: "2026-09-01T15:05:00+05:30",
    ageHours: 25,
  },
  {
    id: "blk-06",
    activityId: "PIP-2600-HYD-004",
    activityDescription: "Hydro test condensate line A",
    cause: "material",
    note: "Blind flanges arrived. Test pump booked for Wednesday.",
    raisedBy: "Nilim Hazarika",
    raisedById: "sup-nilim",
    discipline: "piping",
    workFront: "North Rack",
    raisedAt: "2026-08-28T10:00:00+05:30",
    ageHours: 96,
    resolvedAt: "2026-09-01T09:30:00+05:30",
    resolutionNote: "Flanges released from stores, pump booked for 3 September.",
  },
];

export const OPEN_BLOCKERS = BLOCKERS.filter((b) => !b.resolvedAt);
