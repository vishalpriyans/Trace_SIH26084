import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card, CardHead, Figure } from "@/components/ui/Control";
import { Gauge, Proportion } from "@/components/ui/Gauge";
import { Provenance } from "@/components/ui/Provenance";
import { Person } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { QueueBoard } from "@/components/console/QueueBoard";
import { getAllQueueItems, getCounts, getGateSettings, getQueue, getTierMix } from "@/server/data";
import { TIER_LABEL } from "@/domain/status";
import { time } from "@/lib/format";

export const metadata = { title: "W1 Review queue - TRACE" };

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [queue, all, gate, counts, tierMix] = await Promise.all([
    getQueue(),
    getAllQueueItems(),
    getGateSettings(),
    getCounts(),
    getTierMix(),
  ]);

  /* Search is filtered here rather than in the client, so the URL is the
     state: a planner can send a colleague the row they are asking about. */
  const needle = (q ?? "").trim().toLowerCase();
  const shown = needle
    ? queue.filter((i) =>
        [
          i.rawPhrase,
          i.normalised ?? "",
          i.reporter,
          i.workFront,
          i.discipline,
          ...i.candidates.flatMap((c) => [c.activityId, c.description]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : queue;

  const autoApplied = all.filter((i) => i.decision === "auto_applied").length;
  const held = all.length - autoApplied;
  const timeFailures = queue.filter((i) => i.timeValidation !== "ok").length;

  const rampSwatches = ["var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)"];

  return (
    <>
      <TopBar
        crumbs={["Console", "Clear", "W1 Review queue"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />

      <PageHead
        title="Review queue"
        standfirst="Worst first. Everything the matcher could not settle on its own, with the reason it could not, so the decision can be made without leaving the row."
      />

      <div className="grid gap-5 px-5 pb-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-4">
            <Provenance />
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <Figure
                value={counts.queueDepth}
                label="Waiting on you"
                note="Sorted by confidence ascending"
                size="hero"
              />
            </Card>
            <Card className="p-4">
              <Figure
                value={counts.answered}
                label="Answered questions"
                note="Jumped to the top of the queue"
                tone={counts.answered > 0 ? "text-accent" : "text-ink"}
              />
            </Card>
            <Card className="p-4">
              <Figure
                value={timeFailures}
                label="Time validation failures"
                note="Never bulk approved, whatever the score"
                tone={timeFailures > 0 ? "text-warn" : "text-ink"}
              />
            </Card>
          </div>

          {needle && (
            <p className="mb-3 text-[length:var(--text-data)] text-ink-mid">
              {shown.length} of {queue.length} match{" "}
              <span className="font-medium text-ink">{q}</span>.{" "}
              <Link href="/console" className="text-accent hover:underline">
                Clear
              </Link>
            </p>
          )}
          <QueueBoard items={shown} gate={gate} />
        </div>

        {/* The right rail carries the two things a planner glances at without
            leaving the queue: whether the gate is letting anything through,
            and what has moved since they last looked. */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead
              title="The gate"
              note="Auto apply needs the score AND the margin. Both, never one."
            />
            <div className="px-4 pb-4">
              <Gauge
                centreLabel="cleared both conditions"
                series={[
                  {
                    label: "Auto applied",
                    value: autoApplied,
                    className: "",
                    swatch: "var(--accent)",
                  },
                  { label: "Held", value: held, className: "", swatch: "var(--warn)" },
                ]}
                caption="Counted across the ten hand authored fixture rows. The matching engine does not exist, so no gate has actually run."
              />
            </div>
          </Card>

          <Card>
            <CardHead
              title="Which tier resolved it"
              note="The evidence that the language model is not doing work a regex could."
            />
            <div className="px-4 pb-4">
              <Proportion
                series={tierMix.map((t, i) => ({
                  label: TIER_LABEL[t.tier].replace(/^Tier \d · /, ""),
                  value: t.count,
                  className: "",
                  swatch: rampSwatches[i],
                }))}
              />
              <p className="mt-3 text-[length:var(--text-data)] text-ink-meta">
                Tiers 0 and 1 are deterministic and work offline. The model runs only where the
                problem statement itself certifies that rules fail.
              </p>
            </div>
          </Card>

          <Card>
            <CardHead title="Recent activity" />
            <ul className="flex flex-col gap-4 px-4 pb-4">
              <li>
                <Person name="Ramesh Bora" meta={time("2026-09-01T17:02:00+05:30")}>
                  Answered <span className="text-ink">South Rack</span> on the 24 inch line
                  erection question.
                </Person>
              </li>
              <li>
                <Person name="Anjali Sharma" meta={time("2026-09-01T16:40:00+05:30")}>
                  Asked which rack, with three one tap options attached.
                </Person>
              </li>
              <li>
                <Person name="Jyotishman Das" meta={time("2026-09-01T12:40:00+05:30")}>
                  Raised a <Tag tone="warn">permit</Tag> blocker on the CDU loop check.
                </Person>
              </li>
              <li>
                <Person name="Hiren Kalita" meta={time("2026-09-01T15:05:00+05:30")}>
                  Did not answer the end of shift call. Now showing as silent on coverage.
                </Person>
              </li>
            </ul>
            <div className="border-t border-line px-4 py-3">
              <Link
                href="/console/coverage"
                className="inline-flex items-center gap-1.5 text-[length:var(--text-data)] font-medium text-accent hover:underline"
              >
                Who has not reported
                <ArrowSquareOut size={13} aria-hidden />
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
