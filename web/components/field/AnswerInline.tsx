"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react/ssr";

/**
 * S-9, answered where the question is asked.
 *
 * The question was previously shown on the receipt and answerable only on a
 * different tab. Under a thirty second session budget, asking someone to go
 * and find the answer screen is asking them not to answer.
 *
 * "Not sure" is a first class option and always last. It closes the loop
 * honestly, and a guess recorded as fact is worse for the schedule than an
 * admitted unknown.
 */
export function AnswerInline({ options }: { options: string[] }) {
  const [answered, setAnswered] = useState<string | null>(null);

  if (answered) {
    return (
      <div
        role="status"
        className="mt-3 flex items-center gap-2 rounded-[var(--radius-control)] border border-ok/40 bg-ok-wash px-3 py-3"
      >
        <CheckCircle size={20} weight="fill" className="shrink-0 text-ok" aria-hidden />
        <span className="text-[length:var(--text-body)] text-ink">
          Sent: {answered}. Thanks, that closes it.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setAnswered(o)}
          className="min-h-[68px] rounded-[var(--radius-control)] border border-line bg-raised px-4 text-[length:var(--text-lead)] font-medium text-ink"
        >
          {o}
        </button>
      ))}
    </div>
  );
}
