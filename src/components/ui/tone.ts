import type { Tone } from "@/domain/status";

/**
 * Tone to class. Colour never carries meaning alone anywhere in this build:
 * every chip that uses one of these also carries its word, because a status
 * distinguished only by hue is unreadable to a planner with a colour vision
 * deficiency and unreadable to anyone in direct sun.
 */
export const TONE: Record<Tone, { fg: string; wash: string; rule: string }> = {
  ok: { fg: "text-ok", wash: "bg-ok-wash", rule: "border-ok" },
  warn: { fg: "text-warn", wash: "bg-warn-wash", rule: "border-warn" },
  crit: { fg: "text-crit", wash: "bg-crit-wash", rule: "border-crit" },
  idle: { fg: "text-idle", wash: "bg-idle-wash", rule: "border-idle" },
  accent: { fg: "text-accent", wash: "bg-accent-wash", rule: "border-accent" },
};
