import { TopBar, PageHead } from "@/components/chrome/TopBar";
import { Card, CardHead } from "@/components/ui/Control";
import { Tag } from "@/components/ui/Tag";
import { Proportion } from "@/components/ui/Gauge";
import { Provenance } from "@/components/ui/Provenance";
import { getCounts, getMetrics, getTierMix } from "@/lib/data";
import { TIER_LABEL } from "@/lib/status";

export const metadata = { title: "W10 System health - TRACE" };

/**
 * W10. The answer to the hardest question a judge asks, which is not "does it
 * work" but "how would you know".
 *
 * The discipline this screen exists to hold: a metric that has not been
 * measured reads "not measured". It does not read zero, it does not read a
 * plausible round number, and it does not borrow a figure from a fixture and
 * present it as production. Seven of the ten below are unmeasured, and saying
 * so is the point rather than an embarrassment: every one of them needs a pre
 * deployment baseline captured in the first two weeks, and without that
 * baseline a latency figure means nothing anyway.
 */
export default async function HealthPage() {
  const [metrics, tierMix, counts] = await Promise.all([
    getMetrics(),
    getTierMix(),
    getCounts(),
  ]);

  const measured = metrics.filter((m) => m.value !== null);
  const unmeasured = metrics.filter((m) => m.value === null);
  const swatches = ["var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)"];

  /* Counted, never written down. These sentences describe how many metrics
     carry a figure and how many rows they were counted from, and both change
     the moment the data source or the seed does. Hardcoding them is how a
     provenance line ends up contradicting the number directly above it. */
  const rowsCounted = tierMix.reduce((sum, t) => sum + t.count, 0);

  return (
    <>
      <TopBar
        crumbs={["Console", "Inspect", "W10 System health"]}
        user="Anjali Sharma"
        userMeta="Planning engineer, project controls"
        notifications={counts.answered}
      />
      <PageHead
        title="System health"
        standfirst={`Whether this system is earning its place. ${metrics.length} metrics are specified; ${measured.length} can be counted from what is on screen and the rest need production history, so they say so.`}
      />

      <div className="px-5 pb-10">
        <div className="mb-5">
          <Provenance>
            Nothing on this screen is a production measurement. The {measured.length} figures with
            values are counted from the {rowsCounted} hand authored rows now in the database, and
            are labelled as counts, not results.
          </Provenance>
        </div>

        <Card className="mb-5">
          <CardHead
            title="Which tier resolved it"
            note="Reported as a metric because 'tiers 0 and 1 resolved N percent' is a far stronger claim than 'we used AI'."
          />
          <div className="px-4 pb-4">
            <Proportion
              series={tierMix.map((t, i) => ({
                label: TIER_LABEL[t.tier],
                value: t.count,
                className: "",
                swatch: swatches[i],
              }))}
            />
          </div>
        </Card>

        <h2 className="mb-3 text-[length:var(--text-title)] text-ink">
          Countable from what is on screen
        </h2>
        <div className="mb-8 grid gap-3 md:grid-cols-3">
          {measured.map((m) => (
            <Card key={m.key} className="flex flex-col p-4">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[length:var(--text-figure)] leading-none text-ink tnum">
                  {m.value}
                </span>
                <span className="font-mono text-[length:var(--text-body)] text-ink-mid">
                  {m.unit}
                </span>
              </div>
              <div className="mt-2 text-[length:var(--text-body)] font-medium text-ink">
                {m.label}
              </div>
              <p className="mt-1.5 text-[length:var(--text-data)] text-ink-mid">{m.definition}</p>
              <p className="mt-auto pt-3 text-[length:var(--text-data)] text-ink-meta">{m.note}</p>
            </Card>
          ))}
        </div>

        <h2 className="mb-1 text-[length:var(--text-title)] text-ink">Not measured</h2>
        <p className="mb-3 max-w-[70ch] text-[length:var(--text-data)] text-ink-mid">
          Each of these needs a pre deployment baseline captured in the first two weeks. Without
          one, a reconciliation latency of six hours is a number with nothing to beat.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {unmeasured.map((m) => (
            <Card key={m.key} className="flex flex-col p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[length:var(--text-body)] font-medium text-ink">
                  {m.label}
                </span>
                <Tag tone="idle">Not measured</Tag>
              </div>
              <p className="mt-1.5 text-[length:var(--text-data)] text-ink-mid">{m.definition}</p>
              <p className="mt-auto pt-3 text-[length:var(--text-data)] text-ink-meta">{m.note}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
