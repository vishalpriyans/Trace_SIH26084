import Link from "next/link";
import { PhoneCall, Keyboard, WifiSlash } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Control";
import { InertAction } from "@/components/ui/InertAction";
import { Tag } from "@/components/ui/Tag";
import { ExpectedList } from "@/components/field/ExpectedList";
import { DATA_SOURCE, getCounts, getExpectedToday, getFieldUser, getMyUpdates } from "@/server/data";

export const metadata = { title: "Today - TRACE" };

/**
 * S2. The whole screen ends when the list ends.
 *
 * Report by call is the primary action and is sized to say so. The supervisor
 * presses it and the system rings them back, which is what lets the candidate
 * activity set be loaded before anyone speaks: an inbound helpline would
 * arrive with no context and the matching would fall apart.
 *
 * Expected today is not a convenience list. It is the retrieval envelope: it
 * collapses the candidate space from tens of thousands of activities to about
 * fifteen before any model runs, which is the single largest engineering lever
 * in the product. That is why publishing the look ahead is the highest value
 * thing a planner does.
 */
export default async function TodayPage() {
  const [user, expected, updates, counts] = await Promise.all([
    getFieldUser(),
    getExpectedToday(),
    getMyUpdates(),
    getCounts(),
  ]);

  const loggedToday = updates.filter((u) => u.at.startsWith("2026-09-02")).length;
  const queuedOffline = updates.filter((u) => u.syncState === "saved_on_device").length;

  return (
    <div className="px-4 py-4">
      <Card className="mb-4 p-4">
        <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-[length:var(--text-figure)] leading-none text-ink tnum">
            {loggedToday}
          </span>
          <span className="text-[length:var(--text-title)] font-normal text-ink-mid">
            logged today, shift {user.shift}
          </span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {counts.openQuestions > 0 ? (
            <Link
              href="/field/questions"
              className="inline-flex min-h-[56px] items-center rounded-[var(--radius-control)]"
            >
              <Tag tone="accent" size="md" dot>
                {counts.openQuestions} question for you
              </Tag>
            </Link>
          ) : (
            <Tag tone="ok" size="md" dot>
              No questions for you
            </Tag>
          )}
          {queuedOffline > 0 && (
            <Tag tone="idle" size="md">
              <WifiSlash size={15} aria-hidden />
              {queuedOffline} saved on this phone, will send
            </Tag>
          )}
        </div>
      </Card>

      {/* The primary action, sized so nobody has to work out which one it is. */}
      <InertAction
        unstyled
        className="flex min-h-[88px] w-full items-center justify-center gap-3 rounded-[var(--radius-card)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink shadow-[var(--shadow-card)]"
        note="No call is placed from this build. The voice pipe itself is real and runs from the terminal: one 106 second call was captured end to end on 31 August. What is missing here is the trigger, not the pipe."
      >
        <PhoneCall size={28} weight="fill" aria-hidden />
        Report by call
      </InertAction>
      <p className="mt-2 px-1 text-[length:var(--text-body)] text-ink-mid">
        We call you back in a moment with today&apos;s work already loaded. Speak in whatever
        language you like.
      </p>

      <Link
        href="/field/log"
        className="mt-3 flex min-h-[64px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface text-[length:var(--text-title)] font-medium text-ink"
      >
        <Keyboard size={22} aria-hidden />
        Log by text instead
      </Link>

      <h2 className="mb-3 mt-7 px-1 text-[length:var(--text-title)] font-medium text-ink-mid">
        Expected today
      </h2>
      <ExpectedList items={expected} persists={DATA_SOURCE !== "fixture"} />

      <p className="mt-6 px-1 text-[length:var(--text-body)] text-ink-meta">
        That is the whole list. Anything you did that is not on it, say it on a call and the
        planner will link it.
      </p>
    </div>
  );
}
