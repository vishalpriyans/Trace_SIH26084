"use client";

import { useState } from "react";
import Link from "next/link";
import { Microphone, PaperPlaneRight, Check, PencilSimple } from "@phosphor-icons/react/ssr";
import { Tag } from "@/components/ui/Tag";
import type { ExpectedActivity } from "@/lib/types";

/**
 * S-3 and S-4. One box, one send, then the attestation.
 *
 * No dropdowns, no id lookup, no required fields beyond the one the pipeline
 * genuinely cannot derive, which is the time. If a completed activity arrives
 * without a finish time it cannot auto apply, because a duration needs both
 * ends, so the app asks once, inline, rather than letting the planner chase it
 * later.
 *
 * The confirm back is the important half. It is where a mis-heard tag number
 * gets caught before it enters the pipeline, and it is the attestation the
 * audit trail rests on. The human is the error correction layer here by
 * design, not by accident.
 *
 * What the supervisor is deliberately not told: whether the match was
 * confident. A low confidence entry still shows the best guess, still accepts
 * the confirmation, and still goes to the planner as needs review. Asking a
 * reluctant user to adjudicate a similarity score is how you lose them.
 */
/**
 * Tier 1, and only tier 1. Token overlap against the handful of activities on
 * this supervisor's expected list, which is the retrieval envelope: fifteen
 * candidates rather than fifty thousand.
 *
 * This is deterministic, runs offline, and is the honest floor of what can be
 * claimed without the matching engine. It is not semantic and it is not
 * pretending to be: when nothing overlaps it returns null and the screen says
 * the planner will link it, which is the specified behaviour for no match
 * rather than a failure state.
 */
const STOP = new Set([
  "the", "a", "an", "on", "at", "in", "of", "to", "and", "is", "was", "we", "i",
  "did", "done", "for", "it", "this", "that", "line", "today", "finished",
]);

function tokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9"]+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

function bestMatch(text: string, candidates: ExpectedActivity[]) {
  const q = tokens(text);
  if (q.size === 0) return null;
  let best: { item: ExpectedActivity; overlap: number } | null = null;
  for (const c of candidates) {
    const d = tokens(c.description);
    let overlap = 0;
    q.forEach((t) => {
      if (d.has(t)) overlap += 1;
    });
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { item: c, overlap };
  }
  return best;
}

export function LogFlow({ expected }: { expected: ExpectedActivity[] }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"write" | "time" | "confirm" | "done">("write");
  const [finish, setFinish] = useState("");

  if (step === "done") {
    return (
      <div className="card overflow-hidden" role="status">
        <div className="flex items-center gap-2.5 bg-ok-wash px-4 py-3">
          <Check size={22} weight="bold" className="text-ok" aria-hidden />
          <span className="text-[length:var(--text-title)] font-semibold text-ok">Logged</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-[length:var(--text-title)] text-ink">
            It is on your record with the time you gave. Nobody needs to phone you about it.
          </p>
          <Link
            href="/field/updates"
            className="mt-4 flex min-h-[68px] items-center justify-center rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink"
          >
            See my updates
          </Link>
          <button
            type="button"
            onClick={() => {
              setText("");
              setFinish("");
              setStep("write");
            }}
            className="mt-2 flex min-h-[56px] w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
          >
            Log something else
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    const match = bestMatch(text, expected);
    return (
      <div className="card overflow-hidden" role="status">
        <div className="bg-accent-wash px-4 py-3 text-[length:var(--text-body)] font-medium text-accent">
          Is this right?
        </div>
        <div className="px-4 py-4">
          <p className="text-[length:var(--text-lead)] leading-snug text-ink">
            &ldquo;{text.trim()}&rdquo;, finished at{" "}
            <strong className="font-mono font-semibold tnum">{finish}</strong>.
          </p>
          {match ? (
            <p className="mt-3 text-[length:var(--text-body)] text-ink-mid">
              Against <span className="text-ink">{match.item.description}</span>.
            </p>
          ) : (
            <p className="mt-3 text-[length:var(--text-body)] text-ink-mid">
              This is not on today&apos;s list, so the planner will link it. Nothing is lost.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStep("done")}
              className="flex min-h-[68px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink"
            >
              <Check size={24} weight="bold" aria-hidden />
              Yes, that is right
            </button>
            <button
              type="button"
              onClick={() => setStep("write")}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
            >
              <PencilSimple size={18} aria-hidden />
              Fix something
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "time") {
    return (
      <div className="card p-4" role="status">
        <label
          htmlFor="finish"
          className="block text-[length:var(--text-title)] font-medium text-ink"
        >
          What time did you finish?
        </label>
        <p className="mt-1 text-[length:var(--text-body)] text-ink-mid">
          You said it is done but not when. This one cannot be skipped: without both ends there
          is no duration, and the planner has to come back and ask you.
        </p>
        <input
          id="finish"
          type="time"
          value={finish}
          onChange={(e) => setFinish(e.target.value)}
          className="mt-3 min-h-[56px] w-full rounded-[var(--radius-control)] border border-line bg-raised px-3 font-mono text-[length:var(--text-lead)] text-ink tnum focus:border-accent"
        />
        <button
          type="button"
          disabled={!finish}
          onClick={() => setStep("confirm")}
          className="mt-4 flex min-h-[68px] w-full items-center justify-center rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <label htmlFor="log" className="block text-[length:var(--text-title)] font-medium text-ink">
        What did you do?
      </label>
      <p className="mt-1 text-[length:var(--text-body)] text-ink-mid">
        Any language. Type it or hold the mic and say it.
      </p>
      <textarea
        id="log"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Hydro test kori dilo condensate line tut"
        className="mt-3 w-full rounded-[var(--radius-control)] border border-line bg-raised px-3 py-3 text-[length:var(--text-title)] text-ink placeholder:text-ink-meta focus:border-accent"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-label="Hold to dictate. Not wired in this build."
          className="flex min-h-[68px] w-[88px] shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-ink-mid"
        >
          <Microphone size={26} aria-hidden />
        </button>
        <button
          type="button"
          disabled={text.trim().length < 3}
          onClick={() => setStep("time")}
          className="flex min-h-[68px] flex-1 items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink disabled:opacity-40"
        >
          <PaperPlaneRight size={24} weight="fill" aria-hidden />
          Send
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Tag tone="idle" size="md">
          Nothing is ever discarded
        </Tag>
        <Tag tone="idle" size="md">
          Works with no signal
        </Tag>
        <Tag tone="idle" size="md">
          Dictation not wired here
        </Tag>
      </div>
    </div>
  );
}
