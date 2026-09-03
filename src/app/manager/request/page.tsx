import { PhoneCall, WarningOctagon, Clock } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Button, Card, CardHead } from "@/components/ui/Control";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { getCalls, getCounts, getCoverage, MID_CALL_TOOL_VERIFIED } from "@/server/data";
import { DISCIPLINE_LABEL } from "@/domain/status";
import { dayTime } from "@/lib/format";

export const metadata = { title: "M2 Request an update - TRACE" };

/**
 * M2. The demonstration moment, and the one screen in this build with a hard
 * engineering dependency written on its face.
 *
 * Items appear in a live call panel row by row only because our own mid call
 * tool writes each one as the agent confirms it. That tool has never fired on
 * a live call: the trigger paragraph is missing from the agent's system
 * prompt. Rendering an empty live panel anyway would look like a bug in the
 * demo and would quietly overclaim in the meantime, so the panel states the
 * dependency instead and the call trigger stays disabled until it is fixed.
 *
 * Be precise about what would be live even once it works. Items appear live.
 * The transcript and the recording arrive after the call from the analytics
 * API, and a live streaming transcript is not verified as available and is
 * never promised.
 */
export default async function RequestPage() {
  const [coverage, calls, counts] = await Promise.all([
    getCoverage(),
    getCalls(),
    getCounts(),
  ]);

  const candidates = coverage.filter((c) => c.state !== "excused");

  return (
    <>
      <TopBar
        crumbs={["Manager", "M2 Request an update"]}
        user="Ravi Kumar"
        userMeta="Engineer in Charge"
        notifications={counts.notReported}
      />
      <PageHead
        title="Request an update"
        standfirst="Pick a supervisor and the system pre selects what to ask about: overdue, stale, blocked, or sitting unresolved in the review queue. The call is placed outbound so the candidate activity set is loaded before anyone speaks."
      />

      <div className="grid gap-5 px-5 pb-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Card>
            <CardHead
              title="Who to call"
              note="Ordered by how little they have accounted for. Rate limited per supervisor, and shift hours are respected unless overridden."
            />
            <ul className="divide-y divide-line border-t border-line">
              {candidates.map((c) => (
                <li key={c.supervisor.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
                  <Avatar name={c.supervisor.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[length:var(--text-body)] text-ink">
                      {c.supervisor.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <MetaTag>{DISCIPLINE_LABEL[c.supervisor.discipline]}</MetaTag>
                      <MetaTag>{c.supervisor.workFronts.join(", ")}</MetaTag>
                      <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                        {c.supervisor.phone}
                      </span>
                    </div>
                  </div>
                  <Tag tone={c.state === "silent" ? "crit" : c.state === "partial" ? "warn" : "ok"} dot>
                    {c.supervisor.reportedToday} of {c.supervisor.expectedToday}
                  </Tag>
                  <Button variant="primary" size="sm" disabled={!MID_CALL_TOOL_VERIFIED}>
                    <PhoneCall size={14} weight="fill" aria-hidden />
                    Call now
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-4">
            <CardHead title="Calls placed" note="Everything already captured through the voice pipe." />
            <ul className="divide-y divide-line border-t border-line">
              {calls.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <Avatar name={c.supervisor} size="sm" />
                  <span className="text-[length:var(--text-body)] text-ink">{c.supervisor}</span>
                  <MetaTag>
                    {c.trigger === "supervisor"
                      ? "They called"
                      : c.trigger === "manager"
                        ? `Triggered by ${c.triggeredBy}`
                        : c.trigger === "missed_call"
                          ? "Missed call callback"
                          : "End of shift"}
                  </MetaTag>
                  {c.language && <MetaTag>{c.language}</MetaTag>}
                  <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                    {dayTime(c.placedAt)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {c.durationSec && (
                      <span className="flex items-center gap-1 font-mono text-[length:var(--text-data)] text-ink-mid tnum">
                        <Clock size={12} aria-hidden />
                        {c.durationSec}s
                      </span>
                    )}
                    <Tag tone={c.disposition === "completed" ? "ok" : "crit"} dot>
                      {c.disposition === "completed" ? "Completed" : "No answer"}
                    </Tag>
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-[length:var(--text-data)] text-ink-meta">
              One of these is real. The 106 second call from Ramesh Bora on 31 August was captured
              end to end through the voice pipe into the database. The other three are hand
              authored.
            </p>
          </Card>
        </div>

        <aside className="min-w-0">
          <Card className="border border-warn/30">
            <div className="flex items-start gap-2.5 border-b border-line bg-warn-wash px-4 py-3">
              <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <div>
                <h2 className="text-[length:var(--text-body)] font-medium text-warn">
                  The live panel is blocked
                </h2>
                <p className="mt-1 text-[length:var(--text-data)] text-ink-mid">
                  Call now is disabled on purpose.
                </p>
              </div>
            </div>
            <div className="px-4 py-4 text-[length:var(--text-data)] text-ink-mid">
              <p>
                Captured items appear in this panel one row at a time only because our own mid
                call tool writes each one as the agent confirms it. That tool has never fired on a
                live call: the trigger paragraph is missing from the agent&apos;s system prompt.
              </p>
              <p className="mt-3">
                Rendering the panel anyway would give you an empty frame that looks broken, and
                would claim a capability that has not been demonstrated once. So the trigger stays
                off until the prompt is fixed, and this card is what sits in its place.
              </p>
              <div className="mt-4 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2.5">
                <div className="text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta">
                  What would be live, precisely
                </div>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex gap-2">
                    <span className="text-ok">Live</span>
                    <span>each captured item, as the agent confirms it</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-ink-meta">After</span>
                    <span>transcript and recording, from the analytics API</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-crit">Never</span>
                    <span>a streaming transcript. Not verified, so not promised</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
