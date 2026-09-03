import { CheckCircle, Camera, Microphone, UserCircle } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Provenance } from "@/components/ui/Provenance";
import { Card, Figure } from "@/components/ui/Control";
import { InertAction } from "@/components/ui/InertAction";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { Proportion } from "@/components/ui/Gauge";
import { getBlockers, getCounts } from "@/server/data";
import { BLOCKER_CAUSES, BLOCKER_CAUSE_LABEL, DISCIPLINE_LABEL } from "@/domain/status";
import { age, dayTime } from "@/lib/format";

export const metadata = { title: "W5 Blockers - TRACE" };

/**
 * W5. Ageing is the point.
 *
 * A blocker open for six days should look wrong before anyone reads the note,
 * so age is the sort key, the largest figure on the row, and the only thing
 * that changes tone as it grows.
 *
 * The cause chips are a closed list rather than free text on purpose. CAG
 * Report 42/2015 on this organisation found the board received target versus
 * achievement statistics but not the structured reasons for chronic shortfall.
 * A free text box would reproduce exactly that gap. This taxonomy is what
 * makes delay causes countable, and it is what institutional memory is built
 * from after close out.
 */
export default async function BlockersPage() {
  const [blockers, counts] = await Promise.all([getBlockers(), getCounts()]);
  const open = blockers.filter((b) => !b.resolvedAt);
  const resolved = blockers.filter((b) => b.resolvedAt);
  const oldest = open[0];

  const causeCounts = BLOCKER_CAUSES.map((c) => ({
    label: BLOCKER_CAUSE_LABEL[c],
    value: open.filter((b) => b.cause === c).length,
    className: "",
    swatch: `var(--ramp-${(BLOCKER_CAUSES.indexOf(c) % 4) + 1})`,
  })).filter((c) => c.value > 0);

  function ageTone(hours: number) {
    if (hours >= 96) return "text-crit";
    if (hours >= 48) return "text-warn";
    return "text-ink";
  }

  return (
    <>
      <TopBar
        crumbs={["Console", "Clear", "W5 Blockers"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead
        title="Blockers"
        standfirst="Sorted by age, oldest first. A blocker that visibly gets picked up is one of only three things this product gives a supervisor back, and the reason they keep reporting at all."
      />

      <div className="px-5 pb-10">
        <div className="mb-5">
          <Provenance>
            Ages and cause counts come from six hand authored blockers. No blocker here was raised by a real person.
          </Provenance>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <Figure value={open.length} label="Open" size="hero" />
          </Card>
          <Card className="p-4">
            <Figure
              value={oldest ? age(oldest.ageHours) : "none"}
              label="Oldest open blocker"
              note={oldest?.activityDescription}
              tone={oldest ? ageTone(oldest.ageHours) : "text-ink"}
            />
          </Card>
          <Card className="p-4">
            <div className="text-[length:var(--text-data)] font-medium text-ink-mid">
              Cause mix, open only
            </div>
            <div className="mt-3">
              <Proportion series={causeCounts} />
            </div>
          </Card>
        </div>

        <ul className="flex flex-col gap-3">
          {open.map((b) => (
            <li key={b.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <div
                    className={`shrink-0 text-right font-mono text-[length:var(--text-figure)] leading-none tnum ${ageTone(
                      b.ageHours,
                    )}`}
                  >
                    {age(b.ageHours)}
                    <div className="mt-1.5 text-[length:var(--text-label)] font-sans text-ink-meta">
                      open
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={b.cause === "weather" ? "idle" : "warn"} dot>
                        {BLOCKER_CAUSE_LABEL[b.cause]}
                      </Tag>
                      <span className="text-[length:var(--text-title)] text-ink">
                        {b.activityDescription}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[length:var(--text-body)] text-ink-mid">{b.note}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 flex items-center gap-1.5">
                        <Avatar name={b.raisedBy} size="sm" />
                        <span className="text-[length:var(--text-data)] text-ink-mid">
                          {b.raisedBy}
                        </span>
                      </span>
                      <MetaTag>{DISCIPLINE_LABEL[b.discipline]}</MetaTag>
                      <MetaTag>{b.workFront}</MetaTag>
                      {b.activityId && (
                        <span className="font-mono text-[length:var(--text-label)] text-ink-meta">
                          {b.activityId}
                        </span>
                      )}
                      <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                        raised {dayTime(b.raisedAt)}
                      </span>
                      {b.hasPhoto && (
                        <MetaTag>
                          <Camera size={12} aria-hidden />
                          Photo
                        </MetaTag>
                      )}
                      {b.hasVoiceNote && (
                        <MetaTag>
                          <Microphone size={12} aria-hidden />
                          Voice note
                        </MetaTag>
                      )}
                      {b.owner && (
                        <Tag tone="accent">
                          <UserCircle size={12} weight="fill" aria-hidden />
                          {b.owner} owns it
                        </Tag>
                      )}
                    </div>
                  </div>

                  <InertAction
                    variant="primary"
                    size="sm"
                    note="Nothing is written: this build has no database behind it. Resolving would close the blocker and notify the supervisor, which is one of only four notifications the product allows itself."
                  >
                    <CheckCircle size={14} weight="fill" aria-hidden />
                    Resolve
                  </InertAction>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {resolved.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-[length:var(--text-title)] text-ink">
              Resolved, still on the record
            </h2>
            <ul className="flex flex-col gap-3">
              {resolved.map((b) => (
                <li key={b.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Tag tone="ok" dot>
                        Resolved
                      </Tag>
                      <span className="text-[length:var(--text-body)] text-ink-mid">
                        {b.activityDescription}
                      </span>
                      <span className="text-[length:var(--text-data)] text-ink-mid">
                        {b.resolutionNote}
                      </span>
                      <span className="ml-auto font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                        closed {dayTime(b.resolvedAt!)} after {age(b.ageHours)}
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
