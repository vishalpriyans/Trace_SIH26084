import type { ReactNode } from "react";
import type { Tone } from "@/lib/status";

/**
 * The tinted pill tag, taken from the reference.
 *
 * Colour never carries meaning alone anywhere in this build: every tag also
 * carries its word. A tag distinguished only by hue is unreadable to a planner
 * with a colour vision deficiency and unreadable to anyone holding a phone in
 * direct sun, which between them covers both of this product's surfaces.
 */
const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-ok-wash text-ok",
  warn: "bg-warn-wash text-warn",
  crit: "bg-crit-wash text-crit",
  idle: "bg-idle-wash text-idle",
  accent: "bg-accent-wash text-accent",
};

export function Tag({
  children,
  tone = "idle",
  size = "sm",
  dot = false,
  title,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  dot?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] font-medium ${TONE_CLASS[tone]} ${
        size === "md"
          ? "px-2.5 py-1 text-[length:var(--text-body)]"
          : "px-2 py-[3px] text-[length:var(--text-data)]"
      } ${className}`}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** A neutral tag for facts that carry no state: a discipline, a work front, a
 *  channel. Kept visually quieter than the toned tags so status stays the
 *  loudest thing on a row. */
export function MetaTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-line bg-raised px-2 py-[3px] text-[length:var(--text-data)] text-ink-mid ${className}`}
    >
      {children}
    </span>
  );
}
