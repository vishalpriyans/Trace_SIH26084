"use client";

import Link from "next/link";
import { WarningOctagon, ArrowClockwise } from "@phosphor-icons/react/ssr";

/**
 * The same reasoning as not-found: an unhandled error must not drop a white
 * system-font page into a near-black product.
 *
 * It says what is known and no more. `digest` is the only identifier a client
 * error boundary is given in production, so it is shown rather than dressed up
 * as a support code that leads nowhere.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-5 py-16">
      <div className="w-full max-w-[520px]">
        <div className="card p-6">
          <span className="flex size-11 items-center justify-center rounded-[12px] bg-crit-wash text-crit">
            <WarningOctagon size={22} weight="fill" aria-hidden />
          </span>
          <h1 className="mt-4 text-[length:var(--text-figure)] leading-tight text-ink">
            This screen failed to render
          </h1>
          <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">
            Nothing you did caused data loss: this build reads fixtures and writes nowhere. Try
            the screen again, and if it keeps failing the queue and the coverage board are
            independent of each other.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-[length:var(--text-data)] text-ink-meta">
              digest {error.digest}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-[length:var(--text-body)] font-medium text-accent-ink"
            >
              <ArrowClockwise size={16} aria-hidden />
              Try again
            </button>
            <Link
              href="/console"
              className="flex h-11 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
            >
              Review queue
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
