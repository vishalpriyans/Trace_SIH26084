import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card, CardHead } from "@/components/ui/Control";
import { Tag } from "@/components/ui/Tag";
import { Provenance } from "@/components/ui/Provenance";
import { getCounts, getGateSettings } from "@/server/data";
import { DISCIPLINE_LABEL, type Discipline } from "@/domain/status";
import { score } from "@/lib/format";

export const metadata = { title: "W9 Thresholds - TRACE" };

/**
 * W9. Thresholds and synonyms are data, not code.
 *
 * The rule this screen has to enforce: never move a threshold without the
 * historical number in front of you. A threshold is chosen by target
 * precision, not by intuition. You set the auto apply threshold at the lowest
 * confidence that still yields the precision you are willing to defend, and
 * you report whatever auto apply rate falls out of that. Stating it in that
 * order is what makes the number credible, and it is why "why 0.86?" has an
 * answer rather than a shrug.
 *
 * In this build there is no historical number, because the evaluation set is
 * not built. So every threshold here is labelled as a guess, which is exactly
 * what it is.
 */
export default async function SettingsPage() {
  const [gate, counts] = await Promise.all([getGateSettings(), getCounts()]);

  const SYNONYMS = [
    { term: "spool up", means: "erect", discipline: "piping" },
    { term: "boxed up", means: "hydro test complete", discipline: "piping" },
    { term: "shuttering", means: "formwork", discipline: "civil" },
    { term: "megger", means: "insulation resistance test", discipline: "electrical" },
    { term: "loop check", means: "loop test", discipline: "instrumentation" },
  ];

  return (
    <>
      <TopBar
        crumbs={["Console", "Configure", "W9 Thresholds and synonyms"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead
        title="Thresholds and synonyms"
        standfirst="Per discipline, because a new discipline starts conservative and loosens as its correction rate falls. A single global threshold would be a lie about all of them."
      />

      <div className="px-5 pb-10">
        <div className="mb-5">
          <Provenance>
            No threshold here was calibrated. The evaluation set of roughly 200 hand labelled
            pairs is the first build step and is not done, so these are starting guesses and the
            historical effect column is empty by necessity.
          </Provenance>
        </div>

        <Card className="mb-5">
          <CardHead
            title="The gate, per discipline"
            note="Auto apply requires confidence at or above the threshold AND margin at or above its floor. Both conditions, because two candidates at 0.91 and 0.89 mean the model has no idea which."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-y border-line bg-sunken">
                  {["Discipline", "Threshold", "Minimum margin", "Historical effect"].map((h) => (
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
                {(Object.keys(gate) as Discipline[]).map((d) => (
                  <tr key={d} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-[length:var(--text-body)] text-ink">
                      {DISCIPLINE_LABEL[d]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative block h-1.5 w-32 overflow-hidden rounded-full bg-sunken">
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${gate[d].threshold * 100}%` }}
                          />
                        </span>
                        <span className="font-mono text-[length:var(--text-body)] text-ink tnum">
                          {score(gate[d].threshold)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[length:var(--text-body)] text-ink-mid tnum">
                      {score(gate[d].minMargin)}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone="idle">No data yet</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-[length:var(--text-data)] text-ink-meta">
            Go live with these at effectively 1.0 for the first week so nothing auto applies. Every
            planner correction that week becomes a training pair, and one wrong auto apply in week
            one costs planner trust permanently.
          </p>
        </Card>

        <Card>
          <CardHead
            title="Discipline synonym table"
            note="Nothing in a P6 export knows that spool up means erect. This comes from a site engineer, not a planner: the words differ from the schedule's."
          />
          <ul className="divide-y divide-line">
            {SYNONYMS.map((s) => (
              <li key={s.term} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-[length:var(--text-body)] text-ink">
                  {s.term}
                </span>
                <span className="text-ink-meta">means</span>
                <span className="text-[length:var(--text-body)] text-ink">{s.means}</span>
                <Tag tone="idle" className="ml-auto">
                  {DISCIPLINE_LABEL[s.discipline as Discipline]}
                </Tag>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-[length:var(--text-data)] text-ink-meta">
            This table grows on its own. Every match a planner corrects becomes a correction pair
            and feeds back into retrieval, which is the mechanism by which month three is better
            than week one.
          </p>
        </Card>
      </div>
    </>
  );
}
