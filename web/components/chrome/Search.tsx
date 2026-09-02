"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react/ssr";

/**
 * Real search, scoped to the queue.
 *
 * It was previously an input with a placeholder and no handler, sitting in the
 * first viewport of the hero screen: the control a demo audience reaches for
 * first, doing nothing and saying nothing. The build already ships a component
 * for admitting that (`InertAction`), and the bell beside this uses it, so
 * leaving one live looking control undisclosed was an inconsistency in the
 * build's own doctrine rather than a gap in it.
 *
 * Wiring it was cheaper than disclosing it. The queue is the only list worth
 * searching and the fixture set is small, so the query lives in the URL, the
 * server filters, and a search from any other console screen lands in the
 * queue with the query applied. A shareable URL is a better answer than a
 * client side filter here, because a planner asking a colleague to look at
 * something can send them the row.
 */
export function Search({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  /* Uncontrolled, keyed on the query. The value already lives in the URL, so
     mirroring it into component state and syncing it back in an effect is the
     cascading render React warns about, and it buys nothing here: the form
     reads its own field on submit. */

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
        router.push(next ? `/console?q=${encodeURIComponent(next)}` : "/console");
      }}
      className="relative"
    >
      <MagnifyingGlass
        size={15}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-meta"
      />
      <input
        type="search"
        name="q"
        key={q}
        defaultValue={q}
        placeholder={placeholder}
        aria-label="Search the review queue"
        className="h-9 w-full rounded-[var(--radius-pill)] border border-line bg-surface pl-9 pr-9 text-[length:var(--text-data)] text-ink placeholder:text-ink-meta transition-colors duration-150 focus:border-accent"
      />
      {q && (
        <button
          type="button"
          onClick={() => router.push(path === "/console" ? "/console" : path)}
          aria-label="Clear the search"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] text-ink-meta hover:text-ink"
        >
          <X size={13} aria-hidden />
        </button>
      )}
    </form>
  );
}
