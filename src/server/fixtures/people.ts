import type { Supervisor } from "@/types";

/**
 * The supervisor directory. Phone numbers are the one thing P6 cannot give
 * you, and without them no call can be placed and the entire product is
 * blocked. That is why this is a first class table rather than a detail.
 *
 * Names are synthetic and Assam appropriate. Numbers are in the reserved
 * 5550xxx range so none of them dials a real person.
 */
export const SUPERVISORS: Supervisor[] = [
  {
    id: "sup-ramesh",
    name: "Ramesh Bora",
    phone: "+91 98550 00114",
    discipline: "piping",
    workFronts: ["South Rack", "Fab Yard"],
    sectionEngineer: "A. Choudhury",
    lastReportedAt: "2026-09-01T16:12:00+05:30",
    reportedToday: 3,
    expectedToday: 4,
    correctionRate: 0.06,
  },
  {
    id: "sup-nilim",
    name: "Nilim Hazarika",
    phone: "+91 98550 00127",
    discipline: "piping",
    workFronts: ["North Rack"],
    sectionEngineer: "A. Choudhury",
    lastReportedAt: "2026-09-01T15:48:00+05:30",
    reportedToday: 2,
    expectedToday: 2,
    correctionRate: 0.04,
  },
  {
    id: "sup-jyoti",
    name: "Jyotishman Das",
    phone: "+91 98550 00133",
    discipline: "instrumentation",
    workFronts: ["CDU Unit"],
    sectionEngineer: "S. Barman",
    lastReportedAt: "2026-09-01T14:05:00+05:30",
    reportedToday: 1,
    expectedToday: 3,
    correctionRate: 0.11,
  },
  {
    id: "sup-pranab",
    name: "Pranab Saikia",
    phone: "+91 98550 00148",
    discipline: "electrical",
    workFronts: ["Substation 4"],
    sectionEngineer: "S. Barman",
    lastReportedAt: "2026-09-01T13:30:00+05:30",
    reportedToday: 1,
    expectedToday: 2,
    correctionRate: 0.09,
  },
  {
    id: "sup-hiren",
    name: "Hiren Kalita",
    phone: "+91 98550 00152",
    discipline: "civil",
    workFronts: ["Tank Farm 2"],
    sectionEngineer: "R. Deka",
    // Silent all day. This is what the coverage board exists to make visible.
    lastReportedAt: null,
    reportedToday: 0,
    expectedToday: 3,
    correctionRate: 0.14,
  },
  {
    id: "sup-bhaskar",
    name: "Bhaskar Rabha",
    phone: "+91 98550 00169",
    discipline: "static-rotating",
    workFronts: ["Compressor House"],
    lastReportedAt: null,
    reportedToday: 0,
    expectedToday: 2,
    sectionEngineer: "R. Deka",
    correctionRate: 0.08,
  },
  {
    id: "sup-mridul",
    name: "Mridul Pegu",
    phone: "+91 98550 00171",
    discipline: "hse",
    workFronts: ["All fronts"],
    sectionEngineer: "R. Deka",
    lastReportedAt: "2026-09-01T11:20:00+05:30",
    reportedToday: 1,
    expectedToday: 1,
    correctionRate: 0.02,
  },
  {
    id: "sup-dhruba",
    name: "Dhruba Gogoi",
    phone: "+91 98550 00185",
    discipline: "civil",
    workFronts: ["Tank Farm 2", "Unit 18 paving"],
    sectionEngineer: "R. Deka",
    lastReportedAt: null,
    reportedToday: 0,
    expectedToday: 2,
    excused: "On leave until 3 September",
    correctionRate: 0.07,
  },
];

export const SUPERVISOR_BY_ID = new Map(SUPERVISORS.map((s) => [s.id, s]));

/** The planner and manager seats. Real authentication is de-scoped by the
 *  spec; these stand in for it. */
export const CONSOLE_USERS = [
  {
    id: "usr-anjali",
    name: "Anjali Sharma",
    role: "planner" as const,
    title: "Planning engineer, project controls",
    email: "anjali.sharma@example.co.in",
  },
  {
    id: "usr-ravi",
    name: "Ravi Kumar",
    role: "manager" as const,
    title: "Engineer in Charge",
    email: "ravi.kumar@example.co.in",
  },
];

export const WORK_FRONTS = [
  "South Rack",
  "North Rack",
  "Fab Yard",
  "Tank Farm 2",
  "CDU Unit",
  "Substation 4",
  "Compressor House",
];
