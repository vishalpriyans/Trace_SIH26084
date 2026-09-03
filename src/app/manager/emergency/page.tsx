import { Siren, Megaphone, CheckCircle, Circle } from "@phosphor-icons/react/ssr";
import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Provenance } from "@/components/ui/Provenance";
import { Card, CardHead, Figure } from "@/components/ui/Control";
import { InertAction } from "@/components/ui/InertAction";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { getCounts, getSosEvents } from "@/server/data";
import { dayTime, time } from "@/lib/format";

export const metadata = { title: "M3 Emergency - TRACE" };

/**
 * Emergency is two features, not one button.
 *
 * A supervisor SOS travels upward: something is wrong here, now. A manager
 * broadcast travels downward: everyone needs to know something. One control
 * doing both would be ambiguous at the exact moment ambiguity is most
 * dangerous, so they are separate flows with separate records.
 *
 * The read receipt board is the actual product value of a broadcast. Not "we
 * sent it" but "41 of 47 acknowledged, and these 6 have not". In an evacuation
 * the unacknowledged list is the only thing that matters, which is why it
 * never auto clears.
 */
export default async function EmergencyPage() {
  const [events, counts] = await Promise.all([getSosEvents(), getCounts()]);
  const broadcast = events.find((e) => e.kind === "broadcast");
  const incidents = events.filter((e) => e.kind === "incident");

  const seen = broadcast?.recipients?.filter((r) => r.seenAt) ?? [];
  const unseen = broadcast?.recipients?.filter((r) => !r.seenAt) ?? [];

  return (
    <>
      <TopBar
        crumbs={["Manager", "M3 Emergency"]}
        user="Ravi Kumar"
        userMeta="Engineer in Charge"
        notifications={counts.notReported}
      />
      <PageHead
        title="Emergency"
        standfirst="Broadcasting is manager only. That is about consequence, not seniority: accidentally alerting an entire refinery to an evacuation is a serious event in itself."
        actions={
          <InertAction
            variant="danger"
            size="md"
            note="No broadcast is sent from this build. The real flow requires a message, a scope, an explicit drill or real toggle, and a two step confirmation naming the recipient count, because accidentally alerting a refinery to an evacuation is a serious event in itself."
          >
            <Megaphone size={16} weight="fill" aria-hidden />
            Compose a broadcast
          </InertAction>
        }
      />

      <div className="grid gap-5 px-5 pb-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="mb-5">
          <Provenance>
            Coordinates, acknowledgement times and the read receipt board are hand authored. No SOS in this build was ever raised.
          </Provenance>
        </div>

        <div className="min-w-0 flex flex-col gap-4">
          <Card>
            <CardHead
              title="Incidents raised from site"
              note="These bypass matching, scoring and every queue. Separate table, separate screen, separate notification path."
            />
            <ul className="divide-y divide-line border-t border-line">
              {incidents.map((e) => (
                <li key={e.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Siren size={16} weight="fill" className="text-crit" aria-hidden />
                    <span className="text-[length:var(--text-title)] text-ink">
                      {e.category.charAt(0).toUpperCase() + e.category.slice(1)}
                    </span>
                    <Tag tone="crit" dot>
                      {e.severity ?? "raised"}
                    </Tag>
                    {e.resolvedAt && <Tag tone="ok">Resolved</Tag>}
                    <span className="ml-auto font-mono text-[length:var(--text-label)] text-ink-meta tnum">
                      {dayTime(e.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">{e.message}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Avatar name={e.raisedBy} size="sm" />
                    <span className="text-[length:var(--text-data)] text-ink-mid">
                      {e.raisedBy}
                    </span>
                    {e.workFront && <MetaTag>{e.workFront}</MetaTag>}
                    {e.lat && (
                      <MetaTag>
                        {e.lat.toFixed(4)}, {e.lng?.toFixed(4)} to {e.accuracyM}m
                      </MetaTag>
                    )}
                    <MetaTag>via {e.channelUsed}</MetaTag>
                  </div>

                  {e.escalation && (
                    <ol className="mt-3 border-l border-line pl-4">
                      {e.escalation.map((s, i) => (
                        <li key={i} className="py-1 text-[length:var(--text-data)]">
                          <span className="font-mono text-ink-meta tnum">{time(s.at)}</span>{" "}
                          <span className="text-ink-mid">{s.step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {e.resolutionNote && (
                    <p className="mt-3 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-[length:var(--text-data)] text-ink-mid">
                      {e.resolutionNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-[length:var(--text-data)] text-ink-meta">
              No acknowledgement inside 60 seconds escalates to the next person up, and at 120
              seconds to every manager on every channel. Silence is never the end state of an
              emergency. There is no rate limit on raising one, ever: a false alarm is cheap and a
              suppressed real one is not.
            </p>
          </Card>
        </div>

        <aside className="min-w-0 flex flex-col gap-4">
          {broadcast && (
            <Card>
              <div className="flex items-center gap-2 border-b border-line bg-warn-wash px-4 py-2.5">
                <Megaphone size={15} weight="fill" className="text-warn" aria-hidden />
                <span className="text-[length:var(--text-data)] font-medium text-warn">
                  Drill, {dayTime(broadcast.createdAt)}
                </span>
              </div>
              <div className="px-4 py-4">
                <p className="text-[length:var(--text-body)] text-ink">{broadcast.message}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Figure value={seen.length} label="Acknowledged" tone="text-ok" />
                  <Figure value={unseen.length} label="Have not" tone="text-crit" />
                </div>
              </div>

              <div className="border-t border-line">
                <div className="px-4 py-2.5 text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta">
                  The list that matters
                </div>
                <ul className="divide-y divide-line">
                  {[...unseen, ...seen].map((r) => (
                    <li key={r.userId} className="flex items-center gap-2.5 px-4 py-2.5">
                      <Avatar name={r.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[length:var(--text-data)] text-ink">
                        {r.name}
                      </span>
                      {r.seenAt ? (
                        <span className="flex items-center gap-1.5 font-mono text-[length:var(--text-label)] text-ok tnum">
                          <CheckCircle size={13} weight="fill" aria-hidden />
                          {time(r.seenAt)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[length:var(--text-label)] text-crit">
                          <Circle size={13} aria-hidden />
                          Not seen
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="border-t border-line px-4 py-3 text-[length:var(--text-data)] text-ink-meta">
                  This list never auto clears. Someone who never acknowledges stays on it.
                </p>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
