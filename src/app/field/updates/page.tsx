import { WifiSlash, Phone, DeviceMobile } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Control";
import { StatusChip } from "@/components/ui/StatusChip";
import { Tag } from "@/components/ui/Tag";
import { getDisputes, getMyQuestions, getMyUpdates } from "@/server/data";
import { DisputeControl } from "@/components/field/Dispute";
import { AnswerInline } from "@/components/field/AnswerInline";
import { SCHEDULE_LABEL, STATUS } from "@/domain/status";
import { dayTime, time } from "@/lib/format";

export const metadata = { title: "My updates - TRACE" };

/**
 * S7. The receipt, and the reason a reluctant user keeps opening this at all.
 *
 * Nobody at this rung gets promoted for filing better reports. If the app
 * costs more than half a minute it gets abandoned and the data dies with it,
 * so it has to give something back. This screen is the largest part of that:
 * visible proof they reported, so they cannot be blamed later when someone
 * asks where something stands.
 *
 * Two things it never does. It never shows an activity id. And it never tells
 * them an entry is uncertain: needs_review reads as "Sent" here, because
 * confidence is the planner's problem and handing it to the supervisor would
 * be asking them to do a job that is not theirs with information they cannot
 * act on.
 */
export default async function UpdatesPage() {
  const [updates, disputes, questions] = await Promise.all([
    getMyUpdates(),
    getDisputes(),
    getMyQuestions(),
  ]);

  return (
    <div className="px-4 py-4">
      <h1 className="mb-1 px-1 text-[length:var(--text-figure)] leading-tight text-ink">
        My updates
      </h1>
      <p className="mb-4 px-1 text-[length:var(--text-body)] text-ink-mid">
        Everything you have sent, newest first. This is your proof.
      </p>

      <ul className="flex flex-col gap-3">
        {updates.map((u) => {
          const actionable = STATUS[u.status].fieldActionable;
          return (
            <li key={u.id}>
              <Card className={`p-4 ${actionable ? "ring-1 ring-accent/50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[length:var(--text-title)] leading-snug text-ink">
                    {u.activityDescription}
                  </h2>
                  <StatusChip status={u.status} surface="field" />
                </div>

                <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">{u.what}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[length:var(--text-body)] text-ink-meta">
                    {u.channel === "call" ? (
                      <Phone size={16} aria-hidden />
                    ) : u.channel === "offline" ? (
                      <WifiSlash size={16} aria-hidden />
                    ) : (
                      <DeviceMobile size={16} aria-hidden />
                    )}
                    {dayTime(u.at)}
                  </span>
                  {u.actualStart && (
                    <span className="font-mono text-[length:var(--text-body)] text-ink-mid tnum">
                      start {time(u.actualStart)}
                    </span>
                  )}
                  {u.actualFinish && (
                    <span className="font-mono text-[length:var(--text-body)] text-ink-mid tnum">
                      finish {time(u.actualFinish)}
                    </span>
                  )}
                  {u.quantity && (
                    <span className="font-mono text-[length:var(--text-body)] text-ink-mid tnum">
                      {u.quantity}
                    </span>
                  )}
                  {u.scheduleLabel && (
                    <Tag tone={SCHEDULE_LABEL[u.scheduleLabel].tone}>
                      {SCHEDULE_LABEL[u.scheduleLabel].text}
                    </Tag>
                  )}
                </div>

                {u.syncState === "saved_on_device" && (
                  <p className="mt-3 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2.5 text-[length:var(--text-body)] text-ink-mid">
                    Saved on this phone. It sends itself the moment you have signal. Nothing is
                    lost to a dead zone.
                  </p>
                )}

                {u.status === "rejected" && (
                  <>
                    <div className="mt-3 rounded-[var(--radius-control)] border border-crit/40 bg-crit-wash px-3 py-2.5">
                      <div className="text-[length:var(--text-body)] font-medium text-crit">
                        Not accepted: {u.rejectReason}
                      </div>
                      {u.plannerNote && (
                        <p className="mt-1 text-[length:var(--text-body)] text-ink-mid">
                          {u.plannerNote}
                        </p>
                      )}
                    </div>
                    {/* The way back. Told no is not the end of it. */}
                    <DisputeControl
                      activityDescription={u.activityDescription}
                      existing={disputes.find((d) => d.updateId === u.id)}
                    />
                  </>
                )}

                {u.status === "clarification" && u.plannerNote && (
                  <div className="mt-3 rounded-[var(--radius-control)] border border-accent/40 bg-accent-wash px-3 py-2.5">
                    <div className="text-[length:var(--text-body)] font-medium text-accent">
                      The planner asked
                    </div>
                    <p className="mt-1 text-[length:var(--text-body)] text-ink">{u.plannerNote}</p>
                    {/* Answerable here rather than on another tab. The question
                        is in front of them; the answer should be too. */}
                    {(() => {
                      const q = questions.find((x) => x.updateId === u.id);
                      return q && !q.answer && q.options ? (
                        <AnswerInline options={q.options} />
                      ) : null;
                    })()}
                  </div>
                )}

                {u.status !== "clarification" && u.status !== "rejected" && u.plannerNote && (
                  <p className="mt-3 text-[length:var(--text-body)] text-ink-meta">
                    {u.plannerNote}
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
