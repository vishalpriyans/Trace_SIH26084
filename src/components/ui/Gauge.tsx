/**
 * The semicircular gauge from the reference, carrying a real split rather than
 * decoration.
 *
 * Two rules it has to satisfy that the reference does not. Every series
 * carries a legend with its word and its figure, because colour alone is not
 * a label. And that legend, not the arc, is the accessible route: the svg is
 * aria-hidden and every number is real text in the list beneath it, because
 * an arc cannot be read by a screen reader and should not have to be.
 */

const CX = 100;
const CY = 96;
const R = 78;

function point(fraction: number) {
  const a = (180 - fraction * 180) * (Math.PI / 180);
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)] as const;
}

function arc(from: number, to: number) {
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export interface GaugeSeries {
  label: string;
  value: number;
  className: string;
  swatch: string;
}

export function Gauge({
  series,
  caption,
  centreLabel,
}: {
  series: GaugeSeries[];
  caption?: string;
  centreLabel?: string;
}) {
  const total = series.reduce((s, x) => s + x.value, 0) || 1;
  const segments = series.map((s, i) => {
    const before = series.slice(0, i).reduce((acc, x) => acc + x.value, 0);
    return { ...s, from: before / total, to: (before + s.value) / total };
  });
  const lead = segments[0];
  const leadPct = Math.round((lead.value / total) * 100);

  return (
    <div>
      <div className="relative">
        <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
          <path
            d={arc(0, 1)}
            fill="none"
            stroke="var(--sunken)"
            strokeWidth="15"
            strokeLinecap="round"
          />
          {segments.map((s) => (
            <path
              key={s.label}
              d={arc(s.from + 0.006, s.to - 0.006)}
              fill="none"
              stroke={s.swatch}
              strokeWidth="15"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
          <div className="font-mono text-[length:var(--text-figure)] leading-none text-ink tnum">
            {leadPct}%
          </div>
          {centreLabel && (
            <div className="mt-1 text-[length:var(--text-data)] text-ink-mid">{centreLabel}</div>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: s.swatch }}
            />
            <span className="text-[length:var(--text-data)] text-ink-mid">{s.label}</span>
            <span className="font-mono text-[length:var(--text-body)] text-ink tnum">
              {s.value}
            </span>
          </li>
        ))}
      </ul>

      {caption && (
        <p className="mt-3 text-[length:var(--text-data)] text-ink-meta">{caption}</p>
      )}
    </div>
  );
}

/**
 * The horizontal proportion bar, for anything that is a split rather than a
 * dial: tier mix, coverage, quantity rollup. Same legend discipline.
 */
export function Proportion({
  series,
  showLegend = true,
}: {
  series: GaugeSeries[];
  showLegend?: boolean;
}) {
  const total = series.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-[var(--radius-chip)] bg-sunken">
        {series.map((s) => (
          <span
            key={s.label}
            title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.swatch }}
          />
        ))}
      </div>
      {showLegend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ background: s.swatch }} />
              <span className="text-[length:var(--text-data)] text-ink-mid">{s.label}</span>
              <span className="font-mono text-[length:var(--text-data)] text-ink tnum">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
