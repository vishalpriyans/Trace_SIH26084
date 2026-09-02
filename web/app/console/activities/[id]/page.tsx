import { notFound } from "next/navigation";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card, CardHead, Figure } from "@/components/ui/Control";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { Provenance } from "@/components/ui/Provenance";
import { getActivity, getAuditTrail, getCounts } from "@/lib/data";
import { DISCIPLINE_LABEL, SCHEDULE_LABEL } from "@/lib/status";
import { day, dayTime } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${decodeURIComponent(id)} - TRACE` };
}

/**
 * W3. The screen that makes an actual date defensible.
 *
 * It reads as an ordered chain rather than a log dump: source report,
 * normalisation, extraction, match with the tier that resolved it, the gate
 * decision, the human action, and every correction since. Nothing is ever
 * overwritten, so a correction appears as a new event superseding an old one
 * and both stay visible.
 *
 * After a claim or an audit this is the evidence, which is why the verbatim
 * original sits at the top of the chain and is never replaced by its
 * translation.
 */
export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await getActivity(decodeURIComponent(id));
  if (!activity) notFound();

  const [trail, counts] = await Promise.all([
    getAuditTrail(activity.activityId),
    getCounts(),
  ]);

  const ROLE_TONE = {
    system: "idle",
    planner: "accent",
    supervisor: "ok",
    manager: "warn",
  } as const;

  return (
    <>
      <TopBar
        crumbs={["Console", "Inspect", "W3", activity.activityId]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead title={activity.description} standfirst={activity.wbsPath} />

      <div className="grid gap-5 px-5 pb-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-4">
            <Provenance>
              This trail is hand authored to demonstrate the shape of the audit chain. No pipeline
              stage has actually executed.
            </Provenance>
          </div>

          <Card>
            <CardHead
              title="Audit trail"
              note="Source report to approved actual, in order. Nothing here is ever overwritten."
            />
            <ol className="px-4 pb-5">
              {trail.map((e, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < trail.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[15px] top-8 bottom-0 w-px bg-line"
                    />
                  )}
                  <span className="relative z-10 mt-0.5 shrink-0">
                    {e.actorRole === "system" ? (
                      <span className="flex size-8 items-center justify-center rounded-[var(--radius-pill)] border border-line bg-raised font-mono text-[length:var(--text-label)] text-ink-meta">
                        {i + 1}
                      </span>
                    ) : (
                      <Avatar name={e.actor} size="md" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[length:var(--text-body)] font-medium text-ink">
                        {e.action}
                      </span>
                      <Tag tone={ROLE_TONE[e.actorRole]}>{e.actor}</Tag>
                      <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                        {dayTime(e.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[length:var(--text-data)] text-ink-mid">{e.detail}</p>
                    {e.after && (
                      <p className="mt-2 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-[length:var(--text-data)] text-ink">
                        {e.after}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <div className="font-mono text-[length:var(--text-title)] text-accent">
              {activity.activityId}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MetaTag>{activity.level}</MetaTag>
              <MetaTag>{DISCIPLINE_LABEL[activity.discipline]}</MetaTag>
              <MetaTag>{activity.workFront}</MetaTag>
              <MetaTag>baseline v{activity.baselineVer}</MetaTag>
            </div>
            <div className="mt-4">
              <Tag tone={SCHEDULE_LABEL[activity.scheduleLabel].tone} dot size="md">
                {SCHEDULE_LABEL[activity.scheduleLabel].text}
              </Tag>
            </div>
          </Card>

          <Card className="p-4">
            <Figure
              value={`${activity.percentComplete}%`}
              label="Complete"
              note={
                activity.quantityUnit
                  ? `${activity.quantityDone} of ${activity.quantityPlanned} ${activity.quantityUnit}`
                  : undefined
              }
            />
          </Card>

          <Card>
            <CardHead title="Dates" note="Actuals derived by the rollup rule, never typed in." />
            <dl className="px-4 pb-4 text-[length:var(--text-data)]">
              {[
                ["Planned start", day(activity.plannedStart)],
                ["Planned finish", day(activity.plannedFinish)],
                [
                  "Actual start",
                  activity.actualStart ? dayTime(activity.actualStart) : "not derived yet",
                ],
                [
                  "Actual finish",
                  activity.actualFinish ? dayTime(activity.actualFinish) : "not derived yet",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                  <dt className="text-ink-mid">{k}</dt>
                  <dd className="font-mono text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {activity.predecessors.length > 0 && (
            <Card>
              <CardHead
                title="Predecessors"
                note="What s_logic reads. A textually perfect match against an activity whose predecessor is unfinished is the case a pure text matcher gets wrong."
              />
              <ul className="px-4 pb-4">
                {activity.predecessors.map((p) => (
                  <li key={p} className="font-mono text-[length:var(--text-data)] text-ink-mid">
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {activity.tagTokens.length > 0 && (
            <Card>
              <CardHead title="Tag tokens" note="The tier 0 index. Free, deterministic, offline." />
              <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                {activity.tagTokens.map((t) => (
                  <span
                    key={t}
                    className="rounded-[var(--radius-chip)] border border-line bg-raised px-2 py-1 font-mono text-[length:var(--text-data)] text-ink-mid"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
