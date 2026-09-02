"use client";

import {
  Tray,
  UsersThree,
  Warning,
  ListChecks,
  ChartBar,
  SlidersHorizontal,
  Phone,
  Siren,
} from "@phosphor-icons/react/ssr";
import { Rail } from "./Rail";

export interface Counts {
  queueDepth: number;
  answered: number;
  notReported: number;
  openBlockers: number;
  agedBlockers: number;
  openQuestions: number;
  actionableUpdates: number;
}

/**
 * The three rails.
 *
 * They are deliberately different lengths. A planner lives here all day and
 * gets every screen; a senior manager who has to learn a tool will not use it,
 * so their rail is three items and stays three items; the supervisor's rail is
 * four large targets and carries no screen codes, because W and S numbers are
 * the specification's vocabulary and not theirs.
 */
export function ConsoleRail({ counts }: { counts: Counts }) {
  return (
    <Rail
      seatRole="Planning engineer"
      groups={[
        {
          title: "Clear",
          items: [
            {
              href: "/console",
              screen: "W1",
              label: "Review queue",
              icon: Tray,
              count: counts.queueDepth,
              tone: "accent",
            },
            {
              href: "/console/coverage",
              screen: "W2",
              label: "Coverage",
              icon: UsersThree,
              count: counts.notReported,
              tone: "warn",
            },
            {
              href: "/console/blockers",
              screen: "W5",
              label: "Blockers",
              icon: Warning,
              count: counts.agedBlockers,
              tone: "crit",
            },
          ],
        },
        {
          title: "Inspect",
          items: [
            { href: "/console/activities", screen: "W3", label: "Activities", icon: ListChecks },
            { href: "/console/health", screen: "W10", label: "System health", icon: ChartBar },
          ],
        },
        {
          title: "Configure",
          items: [
            {
              href: "/console/settings",
              screen: "W9",
              label: "Thresholds and synonyms",
              icon: SlidersHorizontal,
            },
          ],
        },
      ]}
      unbuilt={[
        { screen: "W4", label: "Progress and S curve" },
        { screen: "W6", label: "Bulk ingestion" },
        { screen: "W7", label: "Institutional memory" },
        { screen: "W8", label: "Schedule and look ahead" },
      ]}
    />
  );
}

export function ManagerRail({ counts }: { counts: Counts }) {
  return (
    <Rail
      seatRole="Engineer in Charge"
      groups={[
        {
          title: "Today",
          items: [
            {
              href: "/manager",
              screen: "M1",
              label: "Exceptions",
              icon: Warning,
              count: counts.notReported + counts.agedBlockers,
              tone: "crit",
            },
            { href: "/manager/request", screen: "M2", label: "Request an update", icon: Phone },
            { href: "/manager/emergency", screen: "M3", label: "Emergency", icon: Siren },
          ],
        },
      ]}
      unbuilt={[
        { screen: "W4", label: "Progress and S curve" },
        { screen: "W7", label: "Institutional memory" },
      ]}
    />
  );
}
