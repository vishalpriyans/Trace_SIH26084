import { SIGNAL_META, type Signals } from "@/lib/types";
import { score } from "@/lib/format";

/**
 * The seven scoring signals behind one candidate.
 *
 * This exists because a confidence score with no breakdown beside it is a
 * number pretending to be an answer. A planner asked to approve or overrule a
 * match needs to see which signal carried it.
 *
 * The one worth looking at is `s_logic`, predecessor satisfaction in the
 * schedule. A textually perfect match with s_logic near zero is the case a
 * pure text matcher gets confidently wrong: it writes an actual start against
 * an activity whose predecessor has not finished, and nobody notices for a
 * month. Any signal that has fallen below 0.35 is drawn in the critical tone,
 * because a signal pulling the score down is the reason the row is here.
 */
export function SignalBars({ signals }: { signals: Signals }) {
  const keys = Object.keys(SIGNAL_META) as (keyof Signals)[];
  return (
    <>
    <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1.5">
      {keys.map((k) => {
        const v = signals[k];
        const meta = SIGNAL_META[k];
        const isLogic = k === "s_logic";
        const absent = v === null;
        const pulls = !absent && v < 0.35;
        return (
          <li key={k} className="contents">
            <span
              className={`font-mono text-[length:var(--text-label)] ${
                isLogic ? "text-accent" : "text-ink-meta"
              }`}
            >
              {meta.label}
            </span>
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-sunken">
              {!absent && (
                <span
                  className={`block h-full rounded-full ${
                    pulls ? "bg-crit" : isLogic ? "bg-accent" : "bg-ramp-2"
                  }`}
                  style={{ width: `${Math.max(v, 0.01) * 100}%` }}
                />
              )}
            </span>
            <span
              className={`font-mono text-[length:var(--text-label)] tnum ${
                absent ? "text-ink-meta" : pulls ? "text-crit" : "text-ink-mid"
              }`}
            >
              {absent ? "none" : score(v)}
            </span>
          </li>
        );
      })}
    </ul>
    <details className="mt-2.5">
      <summary className="cursor-pointer text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta">
        What each signal is
      </summary>
      <dl className="mt-2 space-y-1.5">
        {keys.map((k) => (
          <div key={k}>
            <dt className="font-mono text-[length:var(--text-label)] text-ink-mid">
              {SIGNAL_META[k].label}
              <span className="ml-1.5 font-sans text-ink-meta">
                {SIGNAL_META[k].weightClass}
              </span>
            </dt>
            <dd className="text-[length:var(--text-data)] text-ink-meta">
              {SIGNAL_META[k].note}
            </dd>
          </div>
        ))}
      </dl>
    </details>
    </>
  );
}
