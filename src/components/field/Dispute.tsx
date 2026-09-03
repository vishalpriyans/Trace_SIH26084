"use client";

import { useState } from "react";
import { PhoneCall, Microphone, CheckCircle, Stop } from "@phosphor-icons/react/ssr";
import type { Dispute } from "@/types";

/**
 * S-13 extended. The supervisor's answer to a rejection.
 *
 * A rejection already carries its reason, which is the hard half and was
 * already done. What was missing is the reply. "Nothing is ever discarded" is
 * promised twice on this surface, and being told no with no route back is
 * still a one way door.
 *
 * Two routes, and neither is a text box. Voice is the primary path for this
 * user, they may not be English comfortable, and they are wearing gloves.
 * A callback puts the system on the phone to them with the rejected entry
 * pre-loaded; a voice note is recorded on the device and transcribed server
 * side on sync, the same path every other captured clip takes.
 *
 * It goes to the Engineer in Charge rather than back to the planner who
 * rejected it. A disputed rejection wants a different pair of eyes.
 */
export function DisputeControl({
  activityDescription,
  existing,
}: {
  activityDescription: string;
  existing?: Dispute;
}) {
  const [phase, setPhase] = useState<"idle" | "choose" | "recording" | "sent">(
    existing ? "sent" : "idle",
  );
  const [route, setRoute] = useState<Dispute["route"] | null>(existing?.route ?? null);

  if (phase === "sent") {
    const queued = existing?.state === "queued" || route === "callback";
    return (
      <div
        role="status"
        className="mt-3 rounded-[var(--radius-control)] border border-ok/40 bg-ok-wash px-3 py-3"
      >
        <div className="flex items-center gap-2">
          <CheckCircle size={20} weight="fill" className="shrink-0 text-ok" aria-hidden />
          <span className="text-[length:var(--text-body)] font-medium text-ink">
            {queued
              ? "We will call you back about this"
              : "Your answer is with the Engineer in Charge"}
          </span>
        </div>
        <p className="mt-1.5 text-[length:var(--text-body)] text-ink-mid">
          {queued
            ? "Your work is not closed. Nothing about this entry is settled until you have been heard."
            : "Ravi Kumar sees it, not the planner who rejected this. It goes to a different pair of eyes."}
        </p>
        {existing?.transcript && (
          <p className="mt-2 text-[length:var(--text-body)] text-ink-meta">
            You said: &ldquo;{existing.transcript}&rdquo;
          </p>
        )}
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div
        role="status"
        className="mt-3 rounded-[var(--radius-control)] border border-crit/40 bg-crit-wash px-3 py-3"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-full bg-crit" />
          <span className="text-[length:var(--text-body)] font-medium text-ink">
            Recording. Say what happened.
          </span>
        </div>
        <p className="mt-1.5 text-[length:var(--text-body)] text-ink-mid">
          Any language. It is written down for you when you have signal.
        </p>
        <button
          type="button"
          onClick={() => {
            setRoute("voice_note");
            setPhase("sent");
          }}
          className="mt-3 flex min-h-[68px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-crit text-[length:var(--text-lead)] font-semibold text-ground"
        >
          <Stop size={24} weight="fill" aria-hidden />
          Stop and send
        </button>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="mt-3 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-3">
        <p className="text-[length:var(--text-body)] font-medium text-ink">
          Tell them what happened with {activityDescription}.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setRoute("callback");
              setPhase("sent");
            }}
            className="flex min-h-[68px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-accent text-[length:var(--text-lead)] font-semibold text-accent-ink"
          >
            <PhoneCall size={24} weight="fill" aria-hidden />
            Call me back
          </button>
          <button
            type="button"
            onClick={() => setPhase("recording")}
            className="flex min-h-[68px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-line bg-surface text-[length:var(--text-title)] font-medium text-ink"
          >
            <Microphone size={22} aria-hidden />
            Record a voice note
          </button>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="flex min-h-[56px] items-center justify-center text-[length:var(--text-body)] font-medium text-ink-mid"
          >
            Leave it
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPhase("choose")}
      className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
    >
      That is not right
    </button>
  );
}
