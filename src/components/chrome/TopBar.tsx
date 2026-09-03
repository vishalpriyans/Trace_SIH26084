import { Suspense } from "react";
import { Bell } from "@phosphor-icons/react/ssr";
import { ThemeSwitch } from "./Theme";
import { Search } from "./Search";
import { Avatar } from "@/components/ui/Avatar";

/**
 * The top bar: where you are, what you can find, who you are signed in as.
 *
 * The breadcrumb carries the screen code as its last crumb rather than setting
 * it as a label above the heading. A small tracked line above a title is the
 * eyebrow this system does not use; a breadcrumb is wayfinding and earns its
 * place.
 */
export function TopBar({
  crumbs,
  user,
  userMeta,
  searchPlaceholder = "Search the queue by phrase, reporter or activity",
  preferred = "dark",
  notifications,
}: {
  crumbs: string[];
  user: string;
  userMeta: string;
  searchPlaceholder?: string;
  preferred?: "dark" | "light";
  notifications?: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-ground px-4 py-2 lg:flex-nowrap lg:px-5 lg:py-0">
      <nav aria-label="Breadcrumb" className="min-w-0 shrink-0">
        <ol className="flex items-center gap-1.5 text-[length:var(--text-data)]">
          {crumbs.map((c, i) => (
            <li key={c} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-meta">/</span>}
              <span className={i === crumbs.length - 1 ? "text-ink" : "text-ink-meta"}>{c}</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto hidden w-full max-w-md lg:block">
        {/* Search reads the query from the URL, so it needs a boundary for the
            render passes where search params are not yet known. */}
        <Suspense fallback={<div className="h-9" />}>
          <Search placeholder={searchPlaceholder} />
        </Suspense>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
        <ThemeSwitch preferred={preferred} />

        {/* Marked rather than silent: a bell that looks live and does nothing
            reads as a broken product instead of an unfinished one. */}
        <span
          title="Not wired in this build. Notification delivery belongs to the mobile app, and the product allows itself only four types."
          aria-label={
            notifications
              ? `Notifications, ${notifications} unread. Not wired in this build.`
              : "Notifications, none unread. Not wired in this build."
          }
          role="img"
          className="relative flex size-8 items-center justify-center rounded-[var(--radius-pill)] text-ink-meta"
        >
          <Bell size={17} aria-hidden />
          {notifications ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
          ) : null}
        </span>

        <div className="flex items-center gap-2.5 border-l border-line pl-2 lg:pl-3">
          <Avatar name={user} size="md" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-[length:var(--text-data)] font-medium text-ink">
              {user}
            </div>
            <div className="truncate text-[length:var(--text-label)] text-ink-meta">{userMeta}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The page heading band that sits under the top bar. Title, one line of what
 * this screen is for, an optional figure, and the screen's own actions.
 */
export function PageHead({
  title,
  standfirst,
  actions,
  tabs,
}: {
  title: string;
  standfirst?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}) {
  return (
    <div className="px-5 pb-4 pt-1">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[length:var(--text-hero)] leading-[1.05] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {standfirst && (
            <p className="mt-2 max-w-[70ch] text-[length:var(--text-body)] text-ink-mid">
              {standfirst}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}
