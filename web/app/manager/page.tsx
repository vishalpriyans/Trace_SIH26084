import Link from "next/link";
import { PhoneCall, CaretRight, Microphone } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card, CardHead } from "@/components/ui/Control";
import { InertAction } from "@/components/ui/InertAction";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { Provenance } from "@/components/ui/Provenance";
import { getActivities, getBlockers, getCounts, getCoverage, getDisputes } from "@/lib/data";
import { DISCIPLINE_LABEL, BLOCKER_CAUSE_LABEL } from "@/lib/status";
import { age, time } from "@/lib/format";

export const metadata = { title: "M1 Exceptions - TRACE" };

/**
 * M1. Not a dashboard, a list of what is wrong.
 *
 * A senior manager who has to learn a tool will not use it, so this view is
 * deliberately thin and stays thin. The target is under sixty seconds from
 * opening it to a decision, which means every row has to name the exception,
 * name the person, and offer the one action that resolves it, with nothing in
 * between.
 *
 * Nothing here is a chart. A chart tells a manager how things are going; this
 * tells them what needs them, which is a different question and the only one
 * worth sixty seconds.
 */
export default async function ManagerPage() {
  const [coverage, blockers, activities, disputes, counts] = await Promise.all([
    getCoverage(),
    getBlockers(),
    getActivities(),
    getDisputes(),
    getCounts(),
  ]);
  const openDisputes = disputes.filter((d) => d.state !== "seen");

  const silent = coverage.filter((c) => c.state === "silent");
  const partial = coverage.filter((c) => c.state === "partial");
  const aged = blockers.filter((b) => !b.resolvedAt && b.ageHours >= 72);
  const atRisk = activities.filter(
    (a) => a.scheduleLabel === "at_risk" || a.scheduleLabel === "behind",
  );

  return (
    <>
      <TopBar
        crumbs={["Manager", "M1 Exceptions"]}
        user="Ravi Kumar"
        userMeta="Engineer in Charge"
        notifications={silent.length}
      />
      <PageHead
        title="What needs you"
        standfirst="Four exceptions this shift. Everything that is running normally is deliberately absent from this screen."
      />

      <div className="px-5 pb-10">
        <div className="mb-5">
          <Provenance />
        </div>

        <div className="flex flex-col gap-4">
          <Section
            title="Nobody has reported"
            count={silent.length}
            tone="crit"
            why="The end of shift call fires for these. Everyone else it skips, including partial reporters."
          >
            {silent.map((c) => (
              <Row
                key={c.supervisor.id}
                name={c.supervisor.name}
                meta={`${DISCIPLINE_LABEL[c.supervisor.discipline]} · ${c.supervisor.workFronts.join(", ")}`}
                figure={`0 of ${c.supervisor.expectedToday}`}
                action="Call now"
              />
            ))}
          </Section>

          <Section
            title="Reported some of it"
            count={partial.length}
            tone="warn"
            why="The automated call deliberately skips anyone who logged anything at all, so these gaps are only ever caught by a person."
          >
            {partial.map((c) => (
              <Row
                key={c.supervisor.id}
                name={c.supervisor.name}
                meta={`${DISCIPLINE_LABEL[c.supervisor.discipline]} · last at ${time(c.lastAt)}`}
                figure={`${c.supervisor.reportedToday} of ${c.supervisor.expectedToday}`}
                action="Call now"
              />
            ))}
          </Section>

          <Section
            title="Blockers past three days"
            count={aged.length}
            tone="crit"
            why="A blocker that visibly moves is one of only three things this product gives a supervisor back."
          >
            {aged.map((b) => (
              <Row
                key={b.id}
                name={b.raisedBy}
                meta={`${b.activityDescription} · ${BLOCKER_CAUSE_LABEL[b.cause]}`}
                figure={`open ${age(b.ageHours)}`}
                action="Escalate"
                href="/console/blockers"
              />
            ))}
          </Section>

          <Section
            title="Drifting late"
            count={atRisk.length}
            tone="warn"
            why="Raised by the nightly re-labelling pass without anyone reporting anything. This is the system being proactive rather than a passive log."
          >
            {atRisk.map((a) => (
              <Row
                key={a.activityId}
                name={a.description}
                meta={`${a.activityId} · ${a.workFront}`}
                figure={`${a.percentComplete}%`}
                action="Open trail"
                href={`/console/activities/${a.activityId}`}
                avatar={false}
              />
            ))}
          </Section>

          {/* Addressed to this seat rather than to the planner who rejected the
              entry. A disputed rejection wants a different pair of eyes, and
              the supervisor answered by voice because that is the channel this
              product is actually built on. */}
          <Card>
            <CardHead
              title={
                <span className="flex items-center gap-2.5">
                  Supervisors answering a rejection
                  <Tag tone={openDisputes.length > 0 ? "accent" : "ok"} dot>
                    {openDisputes.length}
                  </Tag>
                </span>
              }
              note="They were told no and said otherwise. Nobody else sees these."
            />
            {openDisputes.length === 0 ? (
              <p className="px-4 pb-4 text-[length:var(--text-data)] text-ink-meta">
                Nothing disputed.
              </p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {openDisputes.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Avatar name={d.raisedBy} size="md" />
                      <span className="text-[length:var(--text-body)] text-ink">
                        {d.raisedBy}
                      </span>
                      <MetaTag>{d.activityDescription}</MetaTag>
                      <Tag tone="crit">rejected as {d.rejectReason}</Tag>
                      <span className="ml-auto flex items-center gap-2">
                        <MetaTag>
                          {d.route === "callback" ? (
                            <>
                              <PhoneCall size={12} aria-hidden />
                              Callback queued
                            </>
                          ) : (
                            <>
                              <Microphone size={12} aria-hidden />
                              Voice note
                            </>
                          )}
                        </MetaTag>
                        <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                          {time(d.raisedAt)}
                        </span>
                      </span>
                    </div>
                    {d.transcript ? (
                      <blockquote className="mt-2 border-l-2 border-line-firm pl-3 text-[length:var(--text-body)] text-ink">
                        {d.transcript}
                        <span className="mt-1 block text-[length:var(--text-data)] text-ink-meta">
                          {d.language}, transcribed on sync. The recording is attached.
                        </span>
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-[length:var(--text-data)] text-ink-mid">
                        They asked to be called back. Nothing is transcribed yet, and the entry
                        stays open until they have been heard.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[length:var(--text-title)] text-ink">
                Unverified, sitting with the planner
              </h2>
              <p className="mt-1 text-[length:var(--text-data)] text-ink-mid">
                {counts.queueDepth} entries are in the review queue. That is the planner&apos;s
                work, not yours, and it is here only so the number is never a surprise.
              </p>
            </div>
            <Link
              href="/console"
              className="inline-flex items-center gap-1.5 text-[length:var(--text-body)] font-medium text-accent hover:underline"
            >
              Open W1
              <CaretRight size={14} aria-hidden />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  count,
  tone,
  why,
  children,
}: {
  title: string;
  count: number;
  tone: "crit" | "warn";
  why: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-2.5">
            {title}
            <Tag tone={count > 0 ? tone : "ok"} dot>
              {count}
            </Tag>
          </span>
        }
        note={why}
      />
      {count === 0 ? (
        <p className="px-4 pb-4 text-[length:var(--text-data)] text-ink-meta">
          Nothing in this category.
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">{children}</ul>
      )}
    </Card>
  );
}

function Row({
  name,
  meta,
  figure,
  action,
  href,
  avatar = true,
}: {
  name: string;
  meta: string;
  figure: string;
  action: string;
  href?: string;
  avatar?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      {avatar && <Avatar name={name} size="md" />}
      <div className="min-w-0 flex-1">
        <div className="text-[length:var(--text-body)] text-ink">{name}</div>
        <div className="mt-0.5 text-[length:var(--text-data)] text-ink-mid">{meta}</div>
      </div>
      <MetaTag>{figure}</MetaTag>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[length:var(--text-data)] font-medium text-accent hover:underline"
        >
          {action}
          <CaretRight size={13} aria-hidden />
        </Link>
      ) : (
        <InertAction
          variant="primary"
          size="sm"
          note="No call is placed from this build. The voice pipe is real and runs from the terminal; the mid call trigger is the outstanding item, which is also why the live call panel on M2 is disabled."
        >
          <PhoneCall size={14} weight="fill" aria-hidden />
          {action}
        </InertAction>
      )}
    </li>
  );
}
