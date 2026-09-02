import Link from "next/link";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card } from "@/components/ui/Control";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Provenance } from "@/components/ui/Provenance";
import { getActivities, getCounts } from "@/lib/data";
import { DISCIPLINE_LABEL, SCHEDULE_LABEL } from "@/lib/status";
import { day } from "@/lib/format";

export const metadata = { title: "W3 Activities - TRACE" };

/** The registry, versioned. Every row is one click from its audit trail,
 *  because a number with no path to its evidence is a claim rather than a
 *  fact. */
export default async function ActivitiesPage() {
  const [activities, counts] = await Promise.all([getActivities(), getCounts()]);

  return (
    <>
      <TopBar
        crumbs={["Console", "Inspect", "W3 Activities"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead
        title="Activities"
        standfirst="A synthetic slice of the L5 and L6 registry at baseline version 3. Open any row for the full chain from source report to approved actual."
      />

      <div className="px-5 pb-10">
        {/* The registry is synthetic by instruction, but the actual dates and
            percentages on these rows were derived from authored matches rather
            than from a matcher, so the disclosure belongs here too. */}
        <div className="mb-5">
          <Provenance>
            The registry is synthetic, as the problem statement instructs. The actual dates and
            percent complete on these rows were derived from hand authored matches, not from a
            matching engine.
          </Provenance>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-sunken">
                  {["Activity", "Description", "Front", "Planned", "Done", "Label"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-2.5 text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr
                    key={a.activityId}
                    className="border-b border-line last:border-0 hover:bg-raised"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/console/activities/${a.activityId}`}
                        className="font-mono text-[length:var(--text-data)] text-accent hover:underline"
                      >
                        {a.activityId}
                      </Link>
                      <div className="mt-1 text-[length:var(--text-label)] text-ink-meta">
                        {a.level} · {DISCIPLINE_LABEL[a.discipline]}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-[length:var(--text-data)] text-ink">
                      {a.description}
                      {a.isProposed && (
                        <Tag tone="accent" className="ml-2">
                          Proposed
                        </Tag>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <MetaTag>{a.workFront}</MetaTag>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-[length:var(--text-data)] text-ink-mid tnum">
                      {day(a.plannedStart)} to {day(a.plannedFinish)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-sunken">
                          <span
                            className="block h-full rounded-full bg-ramp-3"
                            style={{ width: `${a.percentComplete}%` }}
                          />
                        </span>
                        <span className="font-mono text-[length:var(--text-data)] text-ink-mid tnum">
                          {a.percentComplete}%
                        </span>
                      </div>
                      {a.quantityUnit && (
                        <div className="mt-1 font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                          {a.quantityDone} of {a.quantityPlanned} {a.quantityUnit}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Tag tone={SCHEDULE_LABEL[a.scheduleLabel].tone} dot>
                        {SCHEDULE_LABEL[a.scheduleLabel].text}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="mt-4 max-w-[70ch] text-[length:var(--text-data)] text-ink-meta">
          Actual dates never appear as an editable field anywhere in this product. They are
          derived by the rollup rule from the event log, because the field reports at spool level
          while the plan holds four spools in one activity, and without that rule an activity
          finishes three times.
        </p>
      </div>
    </>
  );
}
