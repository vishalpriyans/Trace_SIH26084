"use client";

import { useId, useState } from "react";
import { Info } from "@phosphor-icons/react/ssr";
import { Button } from "./Control";

/**
 * A control that is designed and not wired, saying so when you press it.
 *
 * This build has no database behind it and does not place calls, so a number
 * of primary actions cannot do the thing they name. There are three ways to
 * handle that and only one of them is honest.
 *
 * Deleting them misrepresents the design, because the flow really does have a
 * primary action there. Leaving them inert and silent is worse: a control that
 * looks live, is pressed, and does nothing reads as a broken product rather
 * than an unfinished one, and it quietly claims a capability that has not been
 * demonstrated. Disabling them outright makes the surfaces undemonstrable.
 *
 * So they press, and they tell you exactly where the edge is. This is the same
 * pattern the manager's live call panel already uses for the mid call tool,
 * and the queue uses when it says nothing was written.
 */
export function InertAction({
  children,
  note,
  variant = "secondary",
  size = "md",
  className = "",
  unstyled = false,
}: {
  children?: React.ReactNode;
  /** What is actually true. Name the real boundary, not "coming soon". */
  note: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Render a bare button carrying `className` instead of the Button
   *  primitive, for controls with their own shape such as the field surface's
   *  88px primary block. A render prop would be the obvious API here and
   *  cannot be used: these are called from Server Components, and a function
   *  cannot cross that boundary. */
  unstyled?: boolean;
}) {
  const [shown, setShown] = useState(false);
  /* Derived from React rather than from the note text: two notes on one page
     that open with the same phrase would otherwise share an id and break
     aria-describedby for both. */
  const id = useId();

  return (
    <>
      {unstyled ? (
        <button
          type="button"
          className={className}
          onClick={() => setShown((v) => !v)}
          aria-describedby={shown ? id : undefined}
        >
          {children}
        </button>
      ) : (
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => setShown((v) => !v)}
          aria-describedby={shown ? id : undefined}
        >
          {children}
        </Button>
      )}
      {shown && (
        <p
          id={id}
          role="status"
          className="mt-2 flex w-full items-start gap-2 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-[length:var(--text-data)] text-ink-mid"
        >
          <Info size={15} className="mt-0.5 shrink-0 text-ink-meta" aria-hidden />
          {note}
        </p>
      )}
    </>
  );
}
