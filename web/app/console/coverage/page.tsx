import { PhoneCall, BellRinging } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Provenance } from "@/components/ui/Provenance";
import { Card, Figure } from "@/components/ui/Control";
import { InertAction } from "@/components/ui/InertAction";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { Proportion } from "@/components/ui/Gauge";
import { getCounts, getCoverage } from "@/lib/data";
import { DISCIPLINE_LABEL } from "@/lib/status";
import { time } from "@/lib/format";

export const metadata = { title: "W2 Coverage - TRACE" };

const STATE = {
  reported: { label: "Reported", tone: "ok" as const },
  partial: { label: "Partly reported", tone: "warn" as const },
  silent: { label: "Nothing logged", tone: "crit" as const },
  excused: { label: "Excused", tone: "idle" as const },
};

/**
 * W2. Where silence becomes visible.
 *
 * Missing data is the failure mode most teams never design for, and it is the
 * one that matters most here: a supervisor who reported nothing looks exactly
 * like a supervisor with nothing to report, and the schedule cannot tell the
 * difference.
 *
 * The partly reported state is the important one. The automated end of shift
 * call deliberately skips anyone who logged anything at all, so a supervisor
 * who accounted for two of five activities is invisible to the system and
 * visible only here, to a human. If partial reporting turns out to be common
 * in the field, that rule is the first thing to revisit.
 */
export default async function CoveragePage() {
  const [coverage, counts] = await Promise.all([getCoverage(), getCounts()]);

  const by = (s: string) => coverage.filter((c) => c.state === s);
  const order = ["silent", "partial", "reported", "excused"] as const;

  return (
    <>
      <TopBar
        crumbs={["Console", "Clear", "W2 Coverage"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead
        title="Coverage"
        standfirst="Who has accounted for their work this shift and who has not. Silence is a signal, so it is ranked above everything that did arrive."
      />

      <div className="px-5 pb-10">
        <div className="mb-5">
          <Provenance>
            Coverage counts are derived from the eight supervisors in the fixture directory, not from a shift of real reports.
          </Provenance>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <Figure
              value={by("silent").length}
              label="Logged nothing at all"
              note="Chased by the automated call at shift end"
              tone="text-crit"
              size="hero"
            />
          </Card>
          <Card className="p-4">
            <Figure
              value={by("partial").length}
              label="Partly reported"
              note="Not chased by the system. This board is the only place they surface"
              tone="text-warn"
            />
          </Card>
          <Card className="p-4">
            <Figure value={by("reported").length} label="Fully accounted" tone="text-ok" />
          </Card>
          <Card className="p-4">
            <Figure value={by("excused").length} label="Excused" tone="text-ink-mid" />
          </Card>
        </div>

        <Card className="mb-5 p-4">
          <Proportion
            series={order.map((s) => ({
              label: STATE[s].label,
              value: by(s).length,
              className: "",
              swatch:
                s === "silent"
                  ? "var(--crit)"
                  : s === "partial"
                    ? "var(--warn)"
                    : s === "reported"
                      ? "var(--ok)"
                      : "var(--idle)",
            }))}
          />
        </Card>

        <ul className="flex flex-col gap-3">
          {order.flatMap((s) =>
            by(s).map((row) => (
              <li key={row.supervisor.id}>
                <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <Avatar name={row.supervisor.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[length:var(--text-title)] text-ink">
                        {row.supervisor.name}
                      </span>
                      <Tag tone={STATE[row.state].tone} dot>
                        {STATE[row.state].label}
                      </Tag>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <MetaTag>{DISCIPLINE_LABEL[row.supervisor.discipline]}</MetaTag>
                      {row.supervisor.workFronts.map((f) => (
                        <MetaTag key={f}>{f}</MetaTag>
                      ))}
                      <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                        {row.supervisor.phone}
                      </span>
                    </div>
                    {row.supervisor.excused && (
                      <p className="mt-1.5 text-[length:var(--text-data)] text-ink-mid">
                        {row.supervisor.excused}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-[length:var(--text-title)] text-ink tnum">
                      {row.supervisor.reportedToday} of {row.supervisor.expectedToday}
                    </div>
                    <div className="text-[length:var(--text-label)] text-ink-meta">
                      {row.lastAt ? `last at ${time(row.lastAt)}` : "no entry today"}
                    </div>
                  </div>

                  {row.state !== "excused" && row.state !== "reported" && (
                    <div className="flex flex-wrap gap-2">
                      <InertAction
                        size="sm"
                        note="No push is sent from this build. A nudge is one of the four notifications the product allows itself, and nudging twice with no response escalates to the Section Engineer, who has no seat here yet."
                      >
                        <BellRinging size={14} aria-hidden />
                        Nudge
                      </InertAction>
                      <InertAction
                        variant="primary"
                        size="sm"
                        note="No call is placed from this build. The voice pipe is real and runs from the terminal; the trigger is what is missing."
                      >
                        <PhoneCall size={14} weight="fill" aria-hidden />
                        Call now
                      </InertAction>
                    </div>
                  )}
                </Card>
              </li>
            )),
          )}
        </ul>

        <p className="mt-5 max-w-[70ch] text-[length:var(--text-data)] text-ink-meta">
          Nudging twice with no response escalates to the supervisor&apos;s Section Engineer, who
          has no login in this build. Whether that rung gets a seat of its own or the planner
          absorbs it is still open.
        </p>
      </div>
    </>
  );
}
