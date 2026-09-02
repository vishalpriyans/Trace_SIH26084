import { score as fmtScore } from "@/lib/format";

/**
 * The confidence track. The one element this console owns outright.
 *
 * A confidence score printed as a figure has to be parsed, compared against a
 * threshold held in the reader's head, and then compared against the row
 * above. Drawn against a track that is identical on every card, rank becomes a
 * position: a planner scanning the register sees which rows fall short of the
 * threshold without reading a single number.
 *
 * Three things are drawn, and the third is the one that matters.
 *
 *   the threshold      a labelled tick, per discipline, never global
 *   the top candidate  a solid marker
 *   the margin         the span between the top two candidates
 *
 * The margin is here because a score alone cannot decide anything. Two
 * candidates at 0.91 and 0.89 mean the model is confident that something
 * matches and has no idea which, and that must never auto apply however high
 * the top score. Auto apply requires confidence at or above the threshold AND
 * margin at or above its floor, so the track shows both or it is showing a
 * number pretending to be an answer.
 */
export function Graticule({
  confidence,
  margin,
  threshold,
  minMargin,
  className = "",
}: {
  confidence: number;
  margin: number;
  threshold: number;
  minMargin: number;
  className?: string;
}) {
  const top2 = Math.max(0, confidence - margin);
  const passesThreshold = confidence >= threshold;
  const passesMargin = margin >= minMargin;
  const passes = passesThreshold && passesMargin;

  const marker = passes ? "bg-accent" : passesThreshold ? "bg-warn" : "bg-crit";
  const span = passes ? "bg-accent/30" : passesThreshold ? "bg-warn/25" : "bg-crit/20";

  return (
    <div className={className}>
      <div
        className="relative h-6"
        role="img"
        aria-label={`Confidence ${fmtScore(confidence)} against a threshold of ${fmtScore(
          threshold,
        )}. Margin over the runner up ${fmtScore(margin)} against a floor of ${fmtScore(
          minMargin,
        )}. ${passes ? "Both conditions met." : "Held for review."}`}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-sunken" />

        {/* The margin, drawn as the distance the top candidate stands clear of
            the runner up. A short span here is the coin toss case. */}
        <div
          className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${span}`}
          style={{ left: `${top2 * 100}%`, width: `${Math.max(margin, 0.004) * 100}%` }}
        />
        <div
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-dim bg-surface"
          style={{ left: `${top2 * 100}%` }}
          title={`Runner up ${fmtScore(top2)}`}
        />

        {/* The threshold, per discipline. A single global line would be a lie:
            a new discipline starts conservative and loosens as its correction
            rate falls. */}
        <div
          className="absolute inset-y-0 flex w-px justify-center bg-line-firm"
          style={{ left: `${threshold * 100}%` }}
          title={`Threshold ${fmtScore(threshold)}`}
        />

        <div
          className={`absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${marker}`}
          style={{ left: `${confidence * 100}%` }}
        />
      </div>

      <div className="mt-1 flex items-baseline gap-2.5 font-mono text-[length:var(--text-label)] tnum">
        <span className={passesThreshold ? "text-ink" : "text-crit"}>
          conf {fmtScore(confidence)}
        </span>
        <span className={passesMargin ? "text-ink-mid" : "text-crit"}>
          margin {fmtScore(margin)}
        </span>
        <span className="ml-auto text-ink-meta">
          needs {fmtScore(threshold)} and {fmtScore(minMargin)}
        </span>
      </div>
    </div>
  );
}
