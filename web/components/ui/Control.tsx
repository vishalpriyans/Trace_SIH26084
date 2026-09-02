import type { ReactNode } from "react";

/**
 * The card world's primitives.
 *
 * Elevation is declared once per element class and never twice on the same
 * element: a card is a tonal step plus a soft shadow, a panel nested inside a
 * card is a hairline and no shadow. That rule is what keeps a dense console
 * from turning into cards inside cards inside cards.
 */

export function Card({
  children,
  className = "",
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return <As className={`card ${className}`}>{children}</As>;
}

/** A card's own header band. Sits inside the card's radius, so it clips. */
export function CardHead({
  title,
  note,
  right,
  className = "",
}: {
  title: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 px-4 pt-4 pb-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[length:var(--text-title)] leading-tight text-ink">{title}</h2>
        {note && (
          <p className="mt-1 text-[length:var(--text-data)] text-ink-mid">{note}</p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-baseline justify-between gap-3 text-[length:var(--text-data)] font-medium text-ink-mid"
    >
      <span>{children}</span>
      {hint && <span className="text-ink-meta">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-[length:var(--text-body)] text-ink placeholder:text-ink-meta transition-colors duration-150 focus:border-accent";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${inputClass} ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${inputClass} ${className}`} />;
}

const BTN_SIZE = {
  sm: "h-7 gap-1.5 px-2.5 text-[length:var(--text-data)]",
  md: "h-9 gap-2 px-3.5 text-[length:var(--text-body)]",
  lg: "h-14 gap-2.5 px-5 text-[length:var(--text-title)]",
  xl: "h-[68px] gap-3 px-6 text-[length:var(--text-lead)]",
};

const BTN_VARIANT = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "border border-line bg-raised text-ink hover:border-line-firm hover:bg-surface",
  ghost: "text-ink-mid hover:bg-raised hover:text-ink",
  danger: "border border-crit/40 bg-crit-wash text-crit hover:border-crit",
  quiet: "bg-sunken text-ink-mid hover:text-ink",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANT;
  size?: keyof typeof BTN_SIZE;
}) {
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] font-medium transition-[background-color,border-color,filter,transform] duration-150 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-40 ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${className}`}
    />
  );
}

/** A figure with its label. Never a figure alone: a number with no definition
 *  beside it cannot be checked by the person reading it. */
export function Figure({
  value,
  label,
  note,
  tone = "text-ink",
  size = "figure",
}: {
  value: ReactNode;
  label: string;
  note?: ReactNode;
  tone?: string;
  size?: "figure" | "hero";
}) {
  return (
    <div>
      <div
        className={`font-mono leading-none tnum ${tone} ${
          size === "hero"
            ? "text-[length:var(--text-hero)]"
            : "text-[length:var(--text-figure)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[length:var(--text-data)] font-medium text-ink-mid">{label}</div>
      {note && <div className="mt-1 text-[length:var(--text-data)] text-ink-meta">{note}</div>}
    </div>
  );
}

/** The keyboard hint. A planner clearing forty items with a mouse will abandon
 *  the tool, so every queue action shows its key rather than hiding it in a
 *  help modal nobody opens. */
export function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line-firm bg-sunken px-1 font-mono text-[length:var(--text-label)] leading-none text-ink-mid">
      {children}
    </kbd>
  );
}
