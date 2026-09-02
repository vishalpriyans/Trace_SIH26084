import Link from "next/link";
import { Compass } from "@phosphor-icons/react/ssr";

export const metadata = { title: "Not found - TRACE" };

/**
 * The parts nobody draws still carry the design.
 *
 * Without this, a mistyped activity id or any wrong path dropped an unstyled
 * white system-font page into a near-black product. It was reachable today,
 * not hypothetically, because the activity detail route calls notFound() on an
 * id it cannot resolve.
 *
 * No dead ends is one of this product's stated principles, so this names what
 * happened and offers the route back for each seat rather than a generic
 * apology.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-5 py-16">
      <div className="w-full max-w-[520px]">
        <div className="card p-6">
          <span className="flex size-11 items-center justify-center rounded-[12px] bg-raised text-accent">
            <Compass size={22} aria-hidden />
          </span>
          <h1 className="mt-4 text-[length:var(--text-figure)] leading-tight text-ink">
            That page is not here
          </h1>
          <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">
            The address does not match a screen in this build. If you followed an activity id,
            check it against the registry: this build carries a synthetic slice of the schedule,
            not the whole thing.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/console"
              className="flex h-11 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[length:var(--text-body)] font-medium text-accent-ink"
            >
              W1 review queue
            </Link>
            <div className="flex gap-2">
              <Link
                href="/manager"
                className="flex h-11 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
              >
                M1 exceptions
              </Link>
              <Link
                href="/field"
                className="flex h-11 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
              >
                Field, Today
              </Link>
            </div>
            <Link
              href="/signin"
              className="flex h-11 items-center justify-center text-[length:var(--text-data)] font-medium text-ink-mid hover:text-ink"
            >
              Back to the role desk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
