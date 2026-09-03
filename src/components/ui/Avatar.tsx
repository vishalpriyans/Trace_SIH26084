import type { ReactNode } from "react";

/**
 * Initials, not photographs.
 *
 * Every person in this build is synthetic, hand authored against an Assam
 * appropriate name list. Rendering them as stock portraits would dress
 * invented people as real ones on a screen whose whole argument is that its
 * provenance is honest. Initials on a deterministic tint carry the same
 * scanning affordance the reference's avatar stack does, and claim nothing.
 */
/* A dedicated tint set, not the ordinal ramp. The ramp encodes order and
   climbs straight through the text-contrast band, so no single ink reads on
   all four of its steps; these four all clear 4.5:1 against --avatar-ink in
   both grounds. Order is meaningless for a person anyway. */
const TINTS = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const SIZES = {
  sm: "size-6 text-[length:var(--text-label)]",
  md: "size-8 text-[length:var(--text-data)]",
  lg: "size-10 text-[length:var(--text-body)]",
};

export function Avatar({
  name,
  size = "md",
  ring = false,
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-[var(--radius-pill)] font-medium text-avatar-ink ${
        SIZES[size]
      } ${tintFor(name)} ${ring ? "ring-2 ring-surface" : ""} ${className}`}
    >
      <span aria-hidden>{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function AvatarStack({
  names,
  max = 4,
  size = "sm",
}: {
  names: string[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <Avatar key={n} name={n} size={size} ring className={i > 0 ? "-ml-2" : ""} />
      ))}
      {rest > 0 && (
        <span
          className={`-ml-2 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-raised font-medium text-ink-mid ring-2 ring-surface ${SIZES[size]}`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/** Person plus one line about them. The reference's activity rows. */
export function Person({
  name,
  meta,
  children,
}: {
  name: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[length:var(--text-body)] font-medium text-ink">{name}</span>
          {meta && <span className="text-[length:var(--text-data)] text-ink-meta">{meta}</span>}
        </div>
        {children && <div className="mt-0.5 text-[length:var(--text-data)] text-ink-mid">{children}</div>}
      </div>
    </div>
  );
}
