"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Icon } from "@phosphor-icons/react";
import { CaretUpDown, SidebarSimple } from "@phosphor-icons/react/ssr";

export interface RailItem {
  href: string;
  screen?: string;
  label: string;
  icon: Icon;
  count?: number | null;
  tone?: "warn" | "crit" | "accent";
}

export interface RailGroup {
  title: string;
  items: RailItem[];
}

const STORAGE = "trace.rail.collapsed";

/**
 * The collapsed flag as an external store rather than component state.
 *
 * localStorage is exactly what `useSyncExternalStore` is for: a value that
 * lives outside React, has no server equivalent, and can change from somewhere
 * React is not watching. Reading it in an effect and calling `setState` would
 * render the wrong width first and then correct it, which is the render loop
 * React 19 lints against.
 *
 * Subscribing to `storage` is not decoration either. A planner with the queue
 * on one monitor and an audit trail on the other has two tabs open, and a rail
 * that collapses in one and not the other is two products.
 */
const listeners = new Set<() => void>();
let cache: boolean | null = null;

function stored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE) === "1";
  } catch {
    /* Private mode, or storage disabled. The rail opens expanded and works. */
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE) return;
    cache = null;
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  /* Cached because getSnapshot runs on every render and has to return a
     stable value, and because localStorage reads are synchronous. */
  if (cache === null) cache = stored();
  return cache;
}

/* The server has no rail preference to know about, so it renders expanded. A
   planner who collapsed it sees one frame of the wide rail, which is the same
   trade the theme switch already makes. */
function getServerSnapshot(): boolean {
  return false;
}

function persist(next: boolean) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE, next ? "1" : "0");
  } catch {
    /* Not persisting is survivable. Not toggling is not. */
  }
  listeners.forEach((l) => l());
}

/**
 * The left rail.
 *
 * Screen codes sit beside the labels on the console and the manager view on
 * purpose: W1, W2, M1 are how the specification and the team already talk
 * about these screens, and a demonstrator standing in front of judges needs to
 * be able to say "this is W1" and have the screen agree. The field surface
 * passes no codes, because that vocabulary is not the supervisor's.
 *
 * The count badges are the reason the rail exists rather than a top nav: queue
 * depth, uncovered supervisors and aged blockers are the three numbers a
 * planner needs in peripheral vision while looking at something else.
 *
 * COLLAPSE. Two separate things drive the narrow state and they are not the
 * same thing. Below `lg` the rail is narrow because there is no room, and that
 * is pure CSS so it holds with JavaScript disabled. At `lg` and above it is
 * narrow because the planner asked for it, persisted per browser, because
 * clearing forty rows is worth the 184px and reading an audit trail is not.
 *
 * The collapsed rail keeps its count badges. Dropping them would make collapse
 * cost the planner the three numbers the rail exists to carry, which is the
 * opposite of what someone reclaiming width for the queue wants.
 *
 * Labels go to `sr-only` rather than `hidden` in both narrow states. A hidden
 * label takes the link's accessible name with it, leaving a screen reader user
 * with a row of unnamed icons and a `title` they cannot reach.
 *
 * Nothing animates. Width is a layout property, and this product's motion
 * grammar is transform and opacity only, so the rail snaps. For a planner
 * reclaiming space mid task, arriving is better than sliding anyway.
 */
export function Rail({
  seatRole,
  groups,
  unbuilt,
  footer,
}: {
  seatRole: string;
  groups: RailGroup[];
  unbuilt?: { screen: string; label: string }[];
  footer?: React.ReactNode;
}) {
  const current = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [announce, setAnnounce] = useState("");

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    persist(next);
    setAnnounce(next ? "Rail collapsed." : "Rail expanded.");
  }, []);

  /* Square bracket, the shortcut every editor already uses for this, and free
     in the queue's key map. Guarded so it does not fire while a planner is
     typing a search or a clarification. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      toggle();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <nav
      id="rail"
      aria-label="Sections"
      data-collapsed={collapsed ? "true" : "false"}
      className="group/rail sticky top-0 flex h-dvh w-16 shrink-0 flex-col gap-1 bg-ground px-2 py-3 lg:w-[248px] lg:px-3 data-[collapsed=true]:lg:w-16 data-[collapsed=true]:lg:px-2"
    >
      <Link
        href="/signin"
        className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-1 py-2 transition-colors duration-150 hover:bg-surface lg:px-2 group-data-[collapsed=true]/rail:lg:px-1"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent font-mono text-[length:var(--text-body)] font-medium text-accent-ink">
          TR
        </span>
        <span className="sr-only min-w-0 flex-1 lg:not-sr-only lg:block group-data-[collapsed=true]/rail:lg:sr-only">
          <span className="block truncate text-[length:var(--text-body)] font-semibold text-ink">
            TRACE
          </span>
          <span className="block truncate text-[length:var(--text-data)] text-ink-meta">
            {seatRole}
          </span>
        </span>
        <CaretUpDown
          size={14}
          className="hidden shrink-0 text-ink-meta lg:block group-data-[collapsed=true]/rail:lg:hidden"
          aria-hidden
        />
      </Link>

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title} role="group" aria-labelledby={`rg-${group.title}`} className="mb-4">
            <div
              id={`rg-${group.title}`}
              className="sr-only px-2 pb-1.5 pt-1 text-[length:var(--text-label)] font-medium tracking-[0.1em] uppercase text-ink-meta lg:not-sr-only lg:block group-data-[collapsed=true]/rail:lg:sr-only"
            >
              {group.title}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = current === item.href;
                const I = item.icon;
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={`group flex items-center justify-center gap-2.5 rounded-[var(--radius-control)] px-2 py-[9px] text-[length:var(--text-body)] transition-colors duration-150 lg:justify-start lg:py-[7px] group-data-[collapsed=true]/rail:lg:justify-center group-data-[collapsed=true]/rail:lg:py-[9px] ${
                        active
                          ? "bg-surface font-medium text-ink"
                          : "text-ink-mid hover:bg-surface/60 hover:text-ink"
                      }`}
                    >
                      <I
                        size={17}
                        weight={active ? "fill" : "regular"}
                        aria-hidden
                        className={active ? "shrink-0 text-accent" : "shrink-0 text-ink-meta"}
                      />
                      <span className="sr-only min-w-0 flex-1 truncate lg:not-sr-only lg:block group-data-[collapsed=true]/rail:lg:sr-only">
                        {item.label}
                      </span>
                      {item.screen && (
                        <span className="hidden shrink-0 font-mono text-[length:var(--text-label)] text-ink-meta tnum lg:block group-data-[collapsed=true]/rail:lg:hidden">
                          {item.screen}
                        </span>
                      )}
                      {typeof item.count === "number" && item.count > 0 && (
                        <span
                          className={`absolute right-1 top-1 shrink-0 rounded-[var(--radius-chip)] px-1.5 py-px font-mono text-[length:var(--text-label)] font-medium tnum lg:static group-data-[collapsed=true]/rail:lg:absolute group-data-[collapsed=true]/rail:lg:right-1 group-data-[collapsed=true]/rail:lg:top-1 ${
                            item.tone === "crit"
                              ? "bg-crit-wash text-crit"
                              : item.tone === "warn"
                                ? "bg-warn-wash text-warn"
                                : "bg-accent-wash text-accent"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Named rather than hidden. A rail that silently omits four specified
            screens reads as a complete product missing nothing, which is the
            same class of dishonesty as an unlabelled fixture number.

            This is the one block collapse genuinely drops. It is a standing
            disclosure rather than navigation, there is no icon that could
            carry "specified, not built" honestly at 16px, and it returns the
            moment the rail is expanded. */}
        {unbuilt && unbuilt.length > 0 && (
          <div className="mb-4 hidden lg:block group-data-[collapsed=true]/rail:lg:hidden">
            <div className="px-2 pb-1.5 pt-1 text-[length:var(--text-label)] font-medium tracking-[0.1em] uppercase text-ink-meta">
              Specified, not built
            </div>
            <ul className="flex flex-col gap-0.5">
              {unbuilt.map((u) => (
                <li
                  key={u.screen}
                  className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-[7px] text-[length:var(--text-data)] text-ink-meta"
                >
                  <span aria-hidden className="ml-[3px] size-2.5 rounded-[3px] border border-line-firm" />
                  <span className="min-w-0 flex-1 truncate">{u.label}</span>
                  <span className="shrink-0 font-mono text-[length:var(--text-label)] tnum">
                    {u.screen}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {footer && <div className="shrink-0">{footer}</div>}

      {/* Below lg the rail is narrow because there is no room, so offering a
          control that cannot widen it would be a lie. It appears at lg. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="rail"
        className="mt-1 hidden shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-[7px] text-[length:var(--text-data)] text-ink-mid transition-colors duration-150 hover:bg-surface hover:text-ink lg:flex group-data-[collapsed=true]/rail:lg:justify-center"
      >
        <SidebarSimple size={17} aria-hidden className="shrink-0 text-ink-meta" />
        <span className="min-w-0 flex-1 truncate text-left group-data-[collapsed=true]/rail:lg:sr-only">
          {collapsed ? "Expand" : "Collapse"}
        </span>
        <span
          aria-hidden
          className="shrink-0 rounded-[var(--radius-chip)] border border-line px-1.5 py-px font-mono text-[length:var(--text-label)] text-ink-meta group-data-[collapsed=true]/rail:lg:hidden"
        >
          [
        </span>
      </button>

      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </nav>
  );
}
