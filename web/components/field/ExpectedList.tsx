"use client";

import { useState } from "react";
import {
  CheckCircle,
  PlayCircle,
  Prohibit,
  PencilSimple,
  Check,
  DeviceMobile,
} from "@phosphor-icons/react/ssr";
import type { ExpectedActivity } from "@/lib/types";
import {
  BLOCKER_CAUSES,
  BLOCKER_CAUSE_LABEL,
  SCHEDULE_LABEL,
  type BlockerCause,
} from "@/lib/status";
import { Tag } from "@/components/ui/Tag";

type Mode = "done" | "in_progress" | "blocked";

const MODE = {
  done: { label: "Done", icon: CheckCircle, timeLabel: "What time did you finish?" },
  in_progress: { label: "Started", icon: PlayCircle, timeLabel: "What time did you start?" },
  blocked: { label: "Blocked", icon: Prohibit, timeLabel: "" },
};

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * S-2, the quick tap. A secondary path on purpose.
 *
 * The call is the primary route. This exists for a supervisor who happens to
 * have the app open and wants to clear one item without talking, and the
 * product does not depend on it: it asks them to open an app, find a row and
 * confirm a time, which is three things a phone call does for them, and it
 * only ever covers work that is already on the expected list. Voice handles
 * everything, including work nobody planned.
 *
 * Two rules this component exists to hold. Time capture is not skippable,
 * because a duration needs both ends and an activity with one end is a row the
 * planner has to chase. And the confirm back is never skipped: it is the
 * attestation the whole audit trail rests on, and it is the defence against a
 * mis-heard tag number silently corrupting an otherwise confident match.
 *
 * No activity id appears anywhere on this surface. The supervisor is never
 * asked to read, type or recognise one.
 */
export function ExpectedList({
  items,
  persists,
}: {
  items: ExpectedActivity[];
  /** Whether an entry logged here actually survives to the receipt screen.
   *  Gated on the data source rather than hardcoded, so the caveat below
   *  retires itself the day the database is wired. Every other disclosure in
   *  this build is un-rottable for the same reason; this one should not be the
   *  exception. */
  persists: boolean;
}) {
  const [state, setState] = useState<Record<string, ExpectedActivity["state"]>>(
    Object.fromEntries(items.map((i) => [i.id, i.state])),
  );
  const [editing, setEditing] = useState<{ id: string; mode: Mode } | null>(null);
  /* What was just reported, kept on the row. The receipt screen reads the
     database, and there is no database behind this build, so an entry logged
     here would not appear there. Saying that on the row is better than a
     receipt screen that quietly loses what the supervisor just did: the
     receipt is the only thing this app gives them back. */
  const [justLogged, setJustLogged] = useState<Record<string, string>>({});

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const s = state[item.id];
        const open = editing?.id === item.id;
        return (
          <li key={item.id} className="card overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[length:var(--text-lead)] leading-snug text-ink">
                  {item.description}
                </h3>
                {s !== "none" && (
                  <Tag
                    tone={s === "done" ? "ok" : s === "blocked" ? "crit" : "accent"}
                    size="md"
                    dot
                  >
                    {s === "done" ? "Done" : s === "blocked" ? "Blocked" : "Started"}
                  </Tag>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tag tone={SCHEDULE_LABEL[item.scheduleLabel].tone}>
                  {SCHEDULE_LABEL[item.scheduleLabel].text}
                </Tag>
                <span className="text-[length:var(--text-body)] text-ink-mid">
                  {item.workFront}
                </span>
              </div>

              {!open && justLogged[item.id] && (
                <p
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-ok/40 bg-ok-wash px-3 py-2.5 text-[length:var(--text-body)] text-ink"
                >
                  <DeviceMobile size={18} aria-hidden className="mt-0.5 shrink-0 text-ok" />
                  <span>
                    Logged: {justLogged[item.id]}.
                    <span className="mt-1 block text-ink-mid">
                      {persists
                        ? "It is on your record. You can see it in My updates."
                        : "It stays on this phone until the database is wired, so it will not show up in My updates yet."}
                    </span>
                  </span>
                </p>
              )}

              {!open && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(["done", "in_progress", "blocked"] as Mode[]).map((m) => {
                    const I = MODE[m].icon;
                    const active =
                      (m === "done" && s === "done") ||
                      (m === "in_progress" && s === "in_progress") ||
                      (m === "blocked" && s === "blocked");
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditing({ id: item.id, mode: m })}
                        className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border text-[length:var(--text-body)] font-medium transition-colors duration-150 ${
                          active
                            ? "border-accent bg-accent-wash text-accent"
                            : "border-line bg-raised text-ink"
                        }`}
                      >
                        <I size={20} weight={active ? "fill" : "regular"} />
                        {MODE[m].label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {open && (
              <Capture
                item={item}
                mode={editing.mode}
                onCancel={() => setEditing(null)}
                onDone={(summary) => {
                  setState((st) => ({ ...st, [item.id]: editing.mode }));
                  setJustLogged((j) => ({ ...j, [item.id]: summary }));
                  setEditing(null);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function Capture({
  item,
  mode,
  onCancel,
  onDone,
}: {
  item: ExpectedActivity;
  mode: Mode;
  onCancel: () => void;
  onDone: (summary: string) => void;
}) {
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const [t, setT] = useState(nowHHMM());
  const [qty, setQty] = useState<number | null>(null);
  const [cause, setCause] = useState<BlockerCause | null>(null);

  if (step === "confirm") {
    return (
      <div className="border-t border-line bg-accent-wash px-4 py-4" role="status">
        <div className="text-[length:var(--text-body)] font-medium text-accent">
          Is this right?
        </div>
        <p className="mt-2 text-[length:var(--text-lead)] leading-snug text-ink">
          {item.description}
          {mode === "blocked" ? (
            <>
              {" is "}
              <strong className="font-semibold">blocked</strong>
              {cause ? `, ${BLOCKER_CAUSE_LABEL[cause].toLowerCase()}` : ""}.
            </>
          ) : (
            <>
              {mode === "done" ? " finished at " : " started at "}
              <strong className="font-mono font-semibold tnum">{t}</strong>
              {qty ? `, ${qty} ${item.countable?.unit}` : ""}.
            </>
          )}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              onDone(
                mode === "blocked"
                  ? `blocked, ${cause ? BLOCKER_CAUSE_LABEL[cause].toLowerCase() : "reason given"}`
                  : `${mode === "done" ? "finished" : "started"} ${t}${
                      qty ? `, ${qty} ${item.countable?.unit}` : ""
                    }`,
              )
            }
            className="flex min-h-[68px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink"
          >
            <Check size={24} weight="bold" aria-hidden />
            Yes, that is right
          </button>
          <button
            type="button"
            onClick={() => setStep("capture")}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
          >
            <PencilSimple size={18} aria-hidden />
            Fix something
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-line bg-sunken px-4 py-4" role="status">
      {mode === "blocked" ? (
        <>
          <div className="text-[length:var(--text-body)] font-medium text-ink-mid">
            What is holding it up?
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {BLOCKER_CAUSES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCause(c)}
                className={`min-h-[56px] rounded-[var(--radius-control)] border px-3 text-[length:var(--text-body)] font-medium ${
                  cause === c
                    ? "border-accent bg-accent-wash text-accent"
                    : "border-line bg-raised text-ink"
                }`}
              >
                {BLOCKER_CAUSE_LABEL[c]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <label
            htmlFor={`t-${item.id}`}
            className="block text-[length:var(--text-body)] font-medium text-ink-mid"
          >
            {MODE[mode].timeLabel}
          </label>
          <input
            id={`t-${item.id}`}
            type="time"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="mt-2 min-h-[56px] w-full rounded-[var(--radius-control)] border border-line bg-raised px-3 font-mono text-[length:var(--text-lead)] text-ink tnum focus:border-accent"
          />
          <p className="mt-1.5 text-[length:var(--text-data)] text-ink-meta">
            Already filled in with the time now. Change it if that is not right.
          </p>

          {item.countable && mode === "done" && (
            <div className="mt-4">
              <div className="text-[length:var(--text-body)] font-medium text-ink-mid">
                How many {item.countable.unit}?
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  item.countable.suggested - 2,
                  item.countable.suggested,
                  item.countable.suggested + 2,
                ]
                  .filter((n) => n > 0)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQty(n)}
                      className={`min-h-[56px] min-w-[72px] rounded-[var(--radius-control)] border px-4 font-mono text-[length:var(--text-lead)] tnum ${
                        qty === n
                          ? "border-accent bg-accent-wash text-accent"
                          : "border-line bg-raised text-ink"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[56px] flex-1 rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={mode === "blocked" && !cause}
          onClick={() => setStep("confirm")}
          className="min-h-[56px] flex-[2] rounded-[var(--radius-control)] bg-accent text-[length:var(--text-title)] font-semibold text-accent-ink disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
