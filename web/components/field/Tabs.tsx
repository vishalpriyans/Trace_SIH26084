"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClockCounterClockwise, Question } from "@phosphor-icons/react/ssr";

/**
 * Three tabs, thumb height, and no more. The supervisor's session is under
 * thirty seconds and their motivation is low: anything that is not today's
 * work, their receipt, or a question aimed at them is a reason to close the
 * app. No feed, no chat, no badges beyond the two counts that mean somebody
 * needs an answer.
 */
export function FieldTabs({
  questions,
  actionable,
  sos,
}: {
  questions: number;
  actionable: number;
  sos: React.ReactNode;
}) {
  const path = usePathname();
  const items = [
    { href: "/field", label: "Today", icon: House, count: 0 },
    {
      href: "/field/updates",
      label: "Updates",
      icon: ClockCounterClockwise,
      count: actionable,
    },
    { href: "/field/questions", label: "Questions", icon: Question, count: questions },
  ];

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[560px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map((it) => {
          const active = path === it.href;
          const I = it.icon;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 ${
                  active ? "text-accent" : "text-ink-mid"
                }`}
              >
                <I size={24} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="text-[length:var(--text-body)] font-medium leading-none">
                  {it.label}
                </span>
                {it.count > 0 && (
                  <span className="absolute left-1/2 top-2 ml-2 flex min-w-[22px] items-center justify-center rounded-[var(--radius-pill)] bg-accent px-1.5 py-0.5 font-mono text-[length:var(--text-data)] font-medium leading-none text-accent-ink tnum">
                    {it.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {/* Different in kind from the three tabs, so it is coloured and
            labelled apart rather than sitting in the row as a fourth
            destination. It navigates nowhere: it sends. */}
        <li className="w-[78px] shrink-0 border-l border-line bg-crit-wash">{sos}</li>
      </ul>
    </nav>
  );
}
