import type { Metric } from "@/types";

/**
 * W10, the measurement layer made visible.
 *
 * The rule this file exists to enforce: a metric that has not been measured
 * reads "not measured", never a plausible zero and never an invented figure.
 * A screen that shows 94% next to a number nobody computed is a
 * misrepresentation, and it is the exact failure this build is most exposed to
 * because the matching engine is not written yet.
 *
 * `value` is non-null ONLY where the number can be derived from the fixture
 * set on screen and is labelled as such. Everything requiring production
 * history is null, with the note saying what would produce it.
 */
export const METRICS: Metric[] = [
  {
    key: "coverage_rate",
    label: "Coverage rate",
    definition: "Share of active work fronts that reported this shift.",
    value: 62.5,
    unit: "%",
    baseline: null,
    trend: null,
    target: "rising",
    note: "Derived from the eight supervisors in the fixture directory: five reported, three did not. Not a production measurement.",
  },
  {
    key: "tier_mix",
    label: "Resolved at tier 0 or 1",
    definition:
      "Share of events the deterministic tiers resolved without a model. The evidence that the language model is not doing work regex could.",
    value: 30,
    unit: "%",
    baseline: null,
    trend: null,
    target: "rising",
    note: "Counted across the ten hand authored queue rows. The matching engine does not exist, so no tier was actually executed.",
  },
  {
    key: "auto_apply_rate",
    label: "Auto apply rate",
    definition:
      "Share of events resolved without a planner touch. Determines whether the queue survives at all.",
    value: 10,
    unit: "%",
    baseline: null,
    trend: null,
    target: "rising",
    note: "One of ten fixture rows clears both threshold and margin. This is a property of the fixtures, not of a system.",
  },
  {
    key: "reconciliation_latency",
    label: "Reconciliation latency",
    definition:
      "Median hours from a physical event to the schedule reflecting it. The headline metric.",
    value: null,
    unit: "hours",
    baseline: null,
    trend: null,
    target: "falling",
    note: "Not measured. Needs a pre deployment baseline captured in the first two weeks, or the number means nothing.",
  },
  {
    key: "correction_rate",
    label: "Correction rate",
    definition: "Share of auto applied matches later reversed. The production precision proxy.",
    value: null,
    unit: "%",
    baseline: null,
    trend: null,
    target: "falling",
    note: "Not measured. Requires auto applied matches that have had time to be reversed.",
  },
  {
    key: "time_to_log",
    label: "Time to log",
    definition: "Median seconds from first tap to Send on the field surface.",
    value: null,
    unit: "s",
    baseline: null,
    trend: null,
    target: "falling",
    note: "Not measured. The telemetry table is authored in the schema and the field surface is not yet instrumented.",
  },
  {
    key: "planner_queue_time",
    label: "Planner queue time",
    definition:
      "Minutes per day clearing the queue. Must beat the manual reconciliation baseline or this is a worse tool with better technology.",
    value: null,
    unit: "min/day",
    baseline: null,
    trend: null,
    target: "falling",
    note: "Not measured. No baseline captured.",
  },
  {
    key: "week8_retention",
    label: "Week 8 retention",
    definition: "Share of supervisors still logging voluntarily at week eight.",
    value: null,
    unit: "%",
    baseline: null,
    trend: null,
    target: "rising",
    note: "Not measured. The honest metric: adoption is the real risk, not accuracy. Nothing here can stand in for it.",
  },
  {
    key: "unmatched_rate",
    label: "Unmatched rate",
    definition: "Share of events landing in unmatched_new as genuinely unplanned work.",
    value: 10,
    unit: "%",
    baseline: null,
    trend: null,
    target: "falling",
    note: "One of ten fixture rows. Counted, not measured.",
  },
  {
    key: "eval_precision",
    label: "Precision at 1 on the evaluation set",
    definition:
      "Accuracy of the top ranked match on the hand labelled evaluation set. The number that would justify a threshold.",
    value: null,
    unit: "%",
    baseline: null,
    trend: null,
    target: "rising",
    note: "Not measured. The evaluation set of roughly 200 labelled pairs is spec build step 0 and is not built. Until it exists, every threshold on the settings screen is a guess and is labelled as one.",
  },
];

/** Tier mix across the fixture queue, for the W10 breakdown bar. */
export const TIER_MIX = [
  { tier: 0 as const, count: 1 },
  { tier: 1 as const, count: 2 },
  { tier: 2 as const, count: 5 },
  { tier: 3 as const, count: 2 },
];
